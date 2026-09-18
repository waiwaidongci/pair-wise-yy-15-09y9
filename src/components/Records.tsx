import { useMemo, useState } from "react";
import type { Flight, LoftState } from "../types";
import type { FlightSubmitResult, LoftStore } from "../lib/store";
import {
  allLineages,
  distanceBand,
  fmtTime,
  pigeonById,
} from "../lib/loft";
import { Badge, Button, EmptyState, healthTone, Modal, Select } from "./ui";
import { FlightForm } from "./FlightForm";

type StatusFilter = "all" | "有效" | "失效" | "未归巢";

export function Records({ store }: { store: LoftStore }) {
  const { state, prefs, patchPrefs } = store;
  const [editing, setEditing] = useState<Flight | null>(null);
  const [creating, setCreating] = useState(false);

  const lineages = allLineages(state);
  const status = (prefs.recordStatus as StatusFilter) || "all";

  const rows = useMemo(() => {
    return state.flights
      .filter((f) => {
        const pg = pigeonById(state, f.pigeonId);
        if (prefs.lineage !== "all" && pg?.lineage !== prefs.lineage) return false;
        if (status !== "all" && f.status !== status) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, [state.flights, prefs.lineage, status]);

  const counts = useMemo(() => {
    const c = { all: state.flights.length, 有效: 0, 失效: 0, 未归巢: 0 };
    state.flights.forEach((f) => {
      c[f.status] += 1;
    });
    return c;
  }, [state.flights]);

  const onDone = (r: FlightSubmitResult) => {
    setEditing(null);
    setCreating(false);
    store.patchPrefs({ recordStatus: "all" });
    // 成功提示交给全局 toast（在 App 层传入更重，这里直接用轻提示）
    flash(r.message);
  };

  return (
    <div className="stack-lg">
      <section className="panel">
        <div className="panel-head wrap">
          <div>
            <p className="eyebrow">训放台账</p>
            <h2>训放记录</h2>
          </div>
          <div className="tools">
            <Select
              value={prefs.lineage}
              onChange={(e) => patchPrefs({ lineage: e.target.value })}
              aria-label="按血统筛选"
            >
              <option value="all">全部血统</option>
              {lineages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
            <Button variant="primary" onClick={() => setCreating(true)}>
              + 登记训放
            </Button>
          </div>
        </div>

        <div className="status-tabs">
          {(["all", "有效", "未归巢", "失效"] as const).map((s) => (
            <button
              key={s}
              className={status === s ? "status-tab status-tab-on" : "status-tab"}
              onClick={() => patchPrefs({ recordStatus: s })}
            >
              {s === "all" ? "全部" : s}
              <em>{s === "all" ? counts.all : counts[s]}</em>
            </button>
          ))}
          <span className="muted small">
            同一赛鸽同日同地点仅保留一条有效成绩；旧成绩更正后自动失效，但历史仍保留在此。
          </span>
        </div>

        {rows.length === 0 ? (
          <EmptyState text="没有符合筛选的训放记录，点击右上角「登记训放」开始。" />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>状态</th>
                  <th>足环号 / 血统</th>
                  <th>日期</th>
                  <th>地点</th>
                  <th>距离</th>
                  <th>天气</th>
                  <th>司放 / 归巢</th>
                  <th>分速(米/分)</th>
                  <th>健康</th>
                  <th>备注 / 沿革</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <RecordRow
                    key={f.id}
                    state={state}
                    flight={f}
                    onCorrect={() => setEditing(f)}
                    onDelete={() => store.deleteFlight(f.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(creating || editing) && (
        <Modal
          open
          wide
          title={editing ? "更正 / 补报" : "登记训放成绩"}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        >
          <FlightForm store={store} initial={editing ?? undefined} onDone={onDone} />
        </Modal>
      )}
    </div>
  );
}

function RecordRow({
  state,
  flight,
  onCorrect,
  onDelete,
}: {
  state: LoftState;
  flight: Flight;
  onCorrect: () => void;
  onDelete: () => void;
}) {
  const pg = pigeonById(state, flight.pigeonId);
  const successor = flight.supersededBy
    ? state.flights.find((f) => f.id === flight.supersededBy)
    : undefined;
  const replaced = state.flights.find((f) => f.supersededBy === flight.id);

  return (
    <tr className={flight.status === "失效" ? "row-invalid" : flight.status === "未归巢" ? "row-open" : ""}>
      <td>
        {flight.status === "有效" && <Badge tone="green">有效</Badge>}
        {flight.status === "未归巢" && <Badge tone="red">未归巢</Badge>}
        {flight.status === "失效" && <Badge tone="gray">已失效</Badge>}
      </td>
      <td>
        <b>{pg?.ring ?? "（已删除）"}</b>
        <small className="block">{pg?.lineage}</small>
      </td>
      <td>{flight.date}</td>
      <td>{flight.location}</td>
      <td>
        {flight.distance}
        <small className="block">{distanceBand(flight.distance)}</small>
      </td>
      <td>{flight.weather}</td>
      <td className="nowrap">
        {fmtTime(flight.releaseTime)}
        <br />
        {flight.status === "未归巢" ? (
          <span className="text-danger">尚未归巢</span>
        ) : (
          fmtTime(flight.homeTime)
        )}
      </td>
      <td>
        {flight.status === "有效" && typeof flight.speed === "number" ? (
          <b>{flight.speed}</b>
        ) : flight.status === "未归巢" ? (
          <span className="muted">—</span>
        ) : (
          <span className="muted strike">{flight.speed ?? "—"}</span>
        )}
      </td>
      <td>
        <Badge tone={healthTone(flight.health)}>{flight.health}</Badge>
      </td>
      <td className="note-cell">
        {flight.note}
        {successor && (
          <small className="block text-danger">
            已被更正记录顶替（新分速 {successor.speed ?? "—"}，{fmtTime(successor.homeTime)} 归巢）
          </small>
        )}
        {replaced && (
          <small className="block text-green">
            此为更正后记录，旧成绩 {replaced.speed ?? "—"} 米/分已失效留档
          </small>
        )}
      </td>
      <td className="nowrap">
        <Button variant="ghost" onClick={onCorrect}>
          {flight.status === "未归巢" ? "补报归巢" : "更正"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            if (confirm("确定删除该条记录？此操作不可撤销。")) onDelete();
          }}
        >
          删除
        </Button>
      </td>
    </tr>
  );
}

// 轻量提示（3 秒后移除），避免再引入全局事件总线
function flash(message: string) {
  const el = document.createElement("div");
  el.className = "flash-toast";
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, 3200);
}
