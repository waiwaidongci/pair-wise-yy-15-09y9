import { useMemo, useState } from "react";
import type { Health, Pairing, Pigeon, RecordFormInput, TrainingRecord } from "../types";
import { HEALTHS, WEATHERS, computeSpeed, fmtDateTime, fmtSpeed, todayStr } from "../store";

interface Props {
  pigeons: Pigeon[];
  records: TrainingRecord[];
  pairings: Pairing[];
  showHistory: boolean;
  onToggleHistory: (v: boolean) => void;
  onAdd: (input: RecordFormInput) => string;
  notify: (msg: string) => void;
}

export default function Records({ pigeons, records, pairings, showHistory, onToggleHistory, onAdd, notify }: Props) {
  const [band, setBand] = useState(pigeons[0]?.band ?? "");
  const [date, setDate] = useState(todayStr());
  const [location, setLocation] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [weather, setWeather] = useState(WEATHERS[0]);
  const [releaseTime, setReleaseTime] = useState("06:30");
  const [returnAt, setReturnAt] = useState("");
  const [health, setHealth] = useState<Health>(pigeons[0]?.health ?? "健康");
  const [mateBand, setMateBand] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const pigeon = pigeons.find((p) => p.band === band);

  // 该鸽当前配对对象（来自配对管理）
  const mates = useMemo(() => {
    const list: string[] = [];
    pairings.forEach((pr) => {
      if (pr.sireBand === band) list.push(pr.damBand);
      if (pr.damBand === band) list.push(pr.sireBand);
    });
    return list;
  }, [pairings, band]);

  const speedPreview =
    returnAt && distanceKm && releaseTime
      ? computeSpeed(Number(distanceKm), `${date}T${releaseTime}`, returnAt)
      : null;

  const submit = () => {
    if (!band) return setError("请选择足环号");
    if (!date) return setError("请选择训放日期");
    if (!location.trim()) return setError("请填写训放地点");
    const km = Number(distanceKm);
    if (!Number.isFinite(km) || km <= 0) return setError("请填写有效的放飞距离（km）");
    if (!releaseTime) return setError("请填写放飞时间");
    if (returnAt && new Date(returnAt).getTime() <= new Date(`${date}T${releaseTime}`).getTime())
      return setError("归巢时间必须晚于放飞时间");
    setError("");
    const msg = onAdd({ band, date, location, distanceKm: km, weather, releaseTime, returnAt, health, mateBand, note });
    notify(msg);
    setLocation("");
    setDistanceKm("");
    setReturnAt("");
    setNote("");
  };

  const shown = useMemo(
    () =>
      [...records]
        .filter((r) => showHistory || r.status === "valid")
        .sort((a, b) => b.createdAt - a.createdAt),
    [records, showHistory]
  );

  const exportCsv = () => {
    const header = ["足环号", "血统", "日期", "地点", "距离km", "天气", "放飞时间", "归巢时间", "分速m/min", "健康", "配对", "状态"];
    const rows = shown.map((r) => [
      r.band,
      r.bloodline,
      r.date,
      r.location,
      String(r.distanceKm),
      r.weather,
      fmtDateTime(r.releaseAt),
      r.returnAt ? fmtDateTime(r.returnAt) : "未归巢",
      r.speed == null ? "" : r.speed.toFixed(1),
      r.health,
      r.mateBand ?? "",
      r.status === "valid" ? "有效" : "已更正",
    ]);
    const csv = "\uFEFF" + [header, ...rows].map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "训放记录.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    notify("已导出 CSV");
  };

  return (
    <div className="stack">
      <section className="panel">
        <div className="heading">
          <div>
            <p>新增训放记录</p>
            <h2>记录一次训放</h2>
          </div>
          <span className="muted small">同鸽同日同地点重复保存时，旧成绩自动标记「已更正」</span>
        </div>
        {pigeons.length === 0 ? (
          <p className="empty">请先在「鸽舍档案」中登记赛鸽</p>
        ) : (
          <>
            <div className="form-grid">
              <label>
                <span>足环号 *</span>
                <select
                  value={band}
                  onChange={(e) => {
                    const b = e.target.value;
                    setBand(b);
                    const p = pigeons.find((x) => x.band === b);
                    if (p) setHealth(p.health);
                    setMateBand("");
                  }}
                >
                  {pigeons.map((p) => (
                    <option key={p.band} value={p.band}>
                      {p.band}（{p.bloodline} · {p.sex}）
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>血统（随足环号自动带入）</span>
                <input value={pigeon?.bloodline ?? ""} readOnly className="readonly" />
              </label>
              <label>
                <span>训放日期 *</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label>
                <span>训放地点 *</span>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="如：石家庄站" />
              </label>
              <label>
                <span>放飞距离（km）*</span>
                <input type="number" min="1" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} placeholder="如：320" />
              </label>
              <label>
                <span>天气</span>
                <select value={weather} onChange={(e) => setWeather(e.target.value)}>
                  {WEATHERS.map((w) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>放飞时间 *</span>
                <input type="time" value={releaseTime} onChange={(e) => setReleaseTime(e.target.value)} />
              </label>
              <label>
                <span>归巢时间（留空 = 未归巢）</span>
                <input type="datetime-local" value={returnAt} onChange={(e) => setReturnAt(e.target.value)} />
              </label>
              <label>
                <span>速度（自动计算）</span>
                <input value={returnAt ? (speedPreview != null ? `${speedPreview.toFixed(1)} m/min` : "时间无效") : "未归巢不计速度"} readOnly className="readonly" />
              </label>
              <label>
                <span>健康状态</span>
                <select value={health} onChange={(e) => setHealth(e.target.value as Health)}>
                  {HEALTHS.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>配对</span>
                <select value={mateBand} onChange={(e) => setMateBand(e.target.value)}>
                  <option value="">无配对</option>
                  {mates.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>备注</span>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="选填" />
              </label>
            </div>
            {error && <p className="error-box">{error}</p>}
            <div className="actions">
              <button className="btn btn-primary" onClick={submit}>保存记录</button>
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>训放记录</p>
            <h2>成绩台账（{shown.length} 条）</h2>
          </div>
          <div className="heading-actions">
            <label className="check">
              <input type="checkbox" checked={showHistory} onChange={(e) => onToggleHistory(e.target.checked)} />
              显示已更正历史
            </label>
            <button className="btn" onClick={exportCsv}>导出 CSV</button>
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="empty">暂无记录</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>足环号</th>
                  <th>血统</th>
                  <th>日期</th>
                  <th>地点</th>
                  <th>距离</th>
                  <th>天气</th>
                  <th>归巢时间</th>
                  <th>分速</th>
                  <th>健康</th>
                  <th>配对</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className={r.status === "superseded" ? "row-superseded" : ""}>
                    <td className="mono">{r.band}</td>
                    <td>{r.bloodline}</td>
                    <td>{r.date}</td>
                    <td>{r.location}</td>
                    <td>{r.distanceKm} km</td>
                    <td>{r.weather}</td>
                    <td>{r.returnAt ? fmtDateTime(r.returnAt) : <span className="tag tag-alert">未归巢</span>}</td>
                    <td className="mono">{fmtSpeed(r.speed)}</td>
                    <td>
                      <span className={`tag tag-health-${r.health}`}>{r.health}</span>
                    </td>
                    <td className="mono">{r.mateBand ?? "—"}</td>
                    <td>
                      {r.status === "valid" ? (
                        <span className="tag tag-valid">有效</span>
                      ) : (
                        <span className="tag tag-superseded" title="该成绩已被同鸽同日同地点的新记录更正，仅作历史留存">
                          已更正
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
