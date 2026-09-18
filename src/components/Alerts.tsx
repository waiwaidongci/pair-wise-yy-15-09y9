import { useMemo, useState } from "react";
import type { TrainingRecord } from "../types";
import { elapsedText, fmtDateTime } from "../store";

interface Props {
  records: TrainingRecord[];
  onComplete: (id: string, returnAt: string) => string;
  notify: (msg: string) => void;
}

function AlertRow({ record, onComplete, notify }: { record: TrainingRecord; onComplete: Props["onComplete"]; notify: (m: string) => void }) {
  const [returnAt, setReturnAt] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!returnAt) return setError("请选择归巢时间");
    const msg = onComplete(record.id, returnAt);
    if (msg.includes("必须")) return setError(msg);
    setError("");
    notify(msg);
  };

  return (
    <article className="alert-item">
      <div className="alert-main">
        <div className="alert-title">
          <span className="mono strong">{record.band}</span>
          <span className="tag">{record.bloodline}</span>
          <span className="tag tag-alert">已放飞 {elapsedText(record.releaseAt)}</span>
        </div>
        <p className="muted">
          {record.date} {record.location} · {record.distanceKm} km · {record.weather} · 放飞 {fmtDateTime(record.releaseAt)}
        </p>
      </div>
      <div className="alert-action">
        <input type="datetime-local" value={returnAt} onChange={(e) => setReturnAt(e.target.value)} />
        <button className="btn btn-primary" onClick={submit}>补录归巢</button>
        {error && <p className="error-box">{error}</p>}
      </div>
    </article>
  );
}

export default function Alerts({ records, onComplete, notify }: Props) {
  const outstanding = useMemo(
    () =>
      records
        .filter((r) => r.status === "valid" && !r.returnAt)
        .sort((a, b) => a.releaseAt.localeCompare(b.releaseAt)),
    [records]
  );

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>未归巢提醒</p>
          <h2>{outstanding.length > 0 ? `${outstanding.length} 羽尚未归巢` : "全部归巢"}</h2>
        </div>
        <span className="muted small">仅统计有效记录；补录归巢后自动进入速度排行</span>
      </div>
      {outstanding.length === 0 ? (
        <p className="empty">当前没有未归巢的赛鸽，棚舍一切正常 🕊️</p>
      ) : (
        <div className="stack-sm">
          {outstanding.map((r) => (
            <AlertRow key={r.id} record={r} onComplete={onComplete} notify={notify} />
          ))}
        </div>
      )}
    </section>
  );
}
