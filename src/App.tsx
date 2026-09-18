import { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import type { LoftState, Pairing, Pigeon, PigeonFormInput, RecordFormInput, TrainingRecord, UiPrefs } from "./types";
import {
  checkPairing,
  computeSpeed,
  loadState,
  loadUi,
  newId,
  saveState,
  saveUi,
  seedState,
} from "./store";
import Overview from "./components/Overview";
import Records from "./components/Records";
import Alerts from "./components/Alerts";
import Ranking from "./components/Ranking";
import Archives from "./components/Archives";
import PairingView from "./components/Pairing";

const TABS = [
  { id: "overview", label: "鸽棚总览" },
  { id: "records", label: "训放记录" },
  { id: "alerts", label: "未归巢提醒" },
  { id: "ranking", label: "成绩排行" },
  { id: "archives", label: "鸽舍档案" },
  { id: "pairing", label: "配对管理" },
];

function App() {
  const [state, setState] = useState<LoftState>(loadState);
  const [ui, setUi] = useState<UiPrefs>(loadUi);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  // 所有数据与筛选条件持久化到 localStorage，刷新后保持一致
  useEffect(() => saveState(state), [state]);
  useEffect(() => saveUi(ui), [ui]);

  const notify = (msg: string) => {
    setToast(msg);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3600);
  };

  const setTab = (tab: string) => setUi((u) => ({ ...u, tab }));

  const outstandingCount = useMemo(
    () => state.records.filter((r) => r.status === "valid" && !r.returnAt).length,
    [state.records]
  );

  /** 新增训放记录：同鸽同日同地点只保留最新有效成绩，旧成绩标记已更正但保留可查 */
  const addRecord = (input: RecordFormInput): string => {
    const pigeon = state.pigeons.find((p) => p.band === input.band);
    if (!pigeon) return "足环号不存在，请先在档案中登记";
    const releaseAt = `${input.date}T${input.releaseTime}`;
    const returnAt = input.returnAt ? input.returnAt : null;
    const rec: TrainingRecord = {
      id: newId(),
      band: input.band,
      bloodline: pigeon.bloodline,
      date: input.date,
      location: input.location.trim(),
      distanceKm: input.distanceKm,
      weather: input.weather,
      releaseAt,
      returnAt,
      speed: returnAt ? computeSpeed(input.distanceKm, releaseAt, returnAt) : null,
      health: input.health,
      mateBand: input.mateBand || null,
      status: "valid",
      createdAt: Date.now(),
      note: input.note.trim() || undefined,
    };
    const isDup = (r: TrainingRecord) =>
      r.status === "valid" && r.band === rec.band && r.date === rec.date && r.location === rec.location;
    const corrected = state.records.some(isDup);
    setState((prev) => ({
      ...prev,
      // 记录中的健康状态同步为该鸽当前健康状态
      pigeons: prev.pigeons.map((p) => (p.band === rec.band ? { ...p, health: rec.health } : p)),
      records: [
        ...prev.records.map((r) =>
          isDup(r) ? { ...r, status: "superseded" as const, supersededBy: rec.id } : r
        ),
        rec,
      ],
    }));
    return corrected
      ? `已保存更正：${rec.band} 在 ${rec.date} ${rec.location} 的旧成绩已标记「已更正」，历史仍可查询`
      : "训放记录已保存";
  };

  /** 补录归巢时间：提醒消除，成绩进入排行 */
  const completeReturn = (id: string, returnAt: string): string => {
    const rec = state.records.find((r) => r.id === id);
    if (!rec) return "记录不存在";
    if (new Date(returnAt).getTime() <= new Date(rec.releaseAt).getTime())
      return "归巢时间必须晚于放飞时间";
    setState((prev) => ({
      ...prev,
      records: prev.records.map((r) =>
        r.id === id ? { ...r, returnAt, speed: computeSpeed(r.distanceKm, r.releaseAt, returnAt) } : r
      ),
    }));
    return `${rec.band} 归巢已补录，成绩进入排行`;
  };

  const addPigeon = (input: PigeonFormInput): { ok: boolean; message: string } => {
    if (!input.band) return { ok: false, message: "足环号不能为空" };
    if (state.pigeons.some((p) => p.band === input.band))
      return { ok: false, message: `足环号 ${input.band} 已存在` };
    if (!input.bloodline) return { ok: false, message: "血统不能为空" };
    const pigeon: Pigeon = {
      band: input.band,
      bloodline: input.bloodline,
      sex: input.sex,
      birthYear: input.birthYear,
      health: input.health,
      sireBand: input.sireBand || undefined,
      damBand: input.damBand || undefined,
      breeder: input.breeder,
    };
    setState((prev) => ({ ...prev, pigeons: [...prev.pigeons, pigeon] }));
    return { ok: true, message: `赛鸽 ${input.band} 已登记入档` };
  };

  /** 配对：亲本健康异常或三代内近亲时拒绝并说明原因 */
  const addPairing = (sireBand: string, damBand: string, date: string, note: string) => {
    const result = checkPairing(state.pigeons, sireBand, damBand);
    if (!result.ok) return result;
    const pairing: Pairing = {
      id: newId(),
      sireBand,
      damBand,
      date,
      note: note.trim() || undefined,
      createdAt: Date.now(),
    };
    setState((prev) => ({ ...prev, pairings: [...prev.pairings, pairing] }));
    return { ok: true, reasons: [] as string[] };
  };

  const removePairing = (id: string) => {
    setState((prev) => ({ ...prev, pairings: prev.pairings.filter((p) => p.id !== id) }));
    notify("配对记录已删除");
  };

  const resetAll = () => {
    if (window.confirm("确定清空当前全部数据并恢复示例数据吗？")) {
      setState(seedState());
      notify("已恢复示例数据");
    }
  };

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">离线可用 · 数据保存在本机浏览器 · 刷新不丢失</p>
          <h1>赛鸽训放台</h1>
        </div>
        <button className="btn" onClick={resetAll}>恢复示例数据</button>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={ui.tab === t.id ? "tab active" : "tab"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === "alerts" && outstandingCount > 0 && (
              <span className="badge">{outstandingCount}</span>
            )}
          </button>
        ))}
      </nav>

      {ui.tab === "overview" && <Overview state={state} onGoTab={setTab} />}
      {ui.tab === "records" && (
        <Records
          pigeons={state.pigeons}
          records={state.records}
          pairings={state.pairings}
          showHistory={ui.showHistory}
          onToggleHistory={(v) => setUi((u) => ({ ...u, showHistory: v }))}
          onAdd={addRecord}
          notify={notify}
        />
      )}
      {ui.tab === "alerts" && (
        <Alerts records={state.records} onComplete={completeReturn} notify={notify} />
      )}
      {ui.tab === "ranking" && (
        <Ranking
          records={state.records}
          distanceFilter={ui.distanceFilter}
          onFilterChange={(f) => setUi((u) => ({ ...u, distanceFilter: f }))}
        />
      )}
      {ui.tab === "archives" && (
        <Archives
          pigeons={state.pigeons}
          records={state.records}
          pairings={state.pairings}
          bloodlineFilter={ui.bloodlineFilter}
          onFilterChange={(f) => setUi((u) => ({ ...u, bloodlineFilter: f }))}
          onAddPigeon={addPigeon}
          notify={notify}
        />
      )}
      {ui.tab === "pairing" && (
        <PairingView
          pigeons={state.pigeons}
          pairings={state.pairings}
          onAdd={addPairing}
          onRemove={removePairing}
          notify={notify}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

export default App;
