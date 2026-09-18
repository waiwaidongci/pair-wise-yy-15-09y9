import { useState } from "react";
import type { Pairing, Pigeon } from "../types";
import { todayStr } from "../store";

interface Props {
  pigeons: Pigeon[];
  pairings: Pairing[];
  onAdd: (sireBand: string, damBand: string, date: string, note: string) => { ok: boolean; reasons: string[] };
  onRemove: (id: string) => void;
  notify: (msg: string) => void;
}

export default function PairingView({ pigeons, pairings, onAdd, onRemove, notify }: Props) {
  const males = pigeons.filter((p) => p.sex === "雄");
  const females = pigeons.filter((p) => p.sex === "雌");

  const [sireBand, setSireBand] = useState(males[0]?.band ?? "");
  const [damBand, setDamBand] = useState(females[0]?.band ?? "");
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);

  const submit = () => {
    const result = onAdd(sireBand, damBand, date, note);
    if (!result.ok) {
      setReasons(result.reasons);
      return;
    }
    setReasons([]);
    setNote("");
    notify(`配对成功：${sireBand} × ${damBand}`);
  };

  const pigeonOf = (band: string) => pigeons.find((p) => p.band === band);

  return (
    <div className="stack">
      <section className="panel">
        <div className="heading">
          <div>
            <p>配对管理</p>
            <h2>新建配对</h2>
          </div>
          <span className="muted small">亲本健康异常或三代内近亲时，系统将拒绝配对并说明原因</span>
        </div>
        {males.length === 0 || females.length === 0 ? (
          <p className="empty">棚内雄鸽或雌鸽不足，请先在「鸽舍档案」中登记</p>
        ) : (
          <>
            <div className="form-grid">
              <label>
                <span>雄鸽（父本）</span>
                <select value={sireBand} onChange={(e) => setSireBand(e.target.value)}>
                  {males.map((p) => (
                    <option key={p.band} value={p.band}>
                      {p.band}（{p.bloodline} · {p.health}）
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>雌鸽（母本）</span>
                <select value={damBand} onChange={(e) => setDamBand(e.target.value)}>
                  {females.map((p) => (
                    <option key={p.band} value={p.band}>
                      {p.band}（{p.bloodline} · {p.health}）
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>配对日期</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label>
                <span>备注</span>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="选填" />
              </label>
            </div>
            {reasons.length > 0 && (
              <div className="error-box">
                <strong>配对被拒绝：</strong>
                <ul>
                  {reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="actions">
              <button className="btn btn-primary" onClick={submit}>校验并保存配对</button>
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>在册配对</p>
            <h2>{pairings.length} 对</h2>
          </div>
        </div>
        {pairings.length === 0 ? (
          <p className="empty">暂无配对记录</p>
        ) : (
          <div className="stack-sm">
            {[...pairings]
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((pr) => {
                const sire = pigeonOf(pr.sireBand);
                const dam = pigeonOf(pr.damBand);
                return (
                  <article key={pr.id} className="pair-item">
                    <div>
                      <span className="mono strong">{pr.sireBand}</span>
                      <span className="muted">（{sire?.bloodline ?? "?"} · {sire?.health ?? "?"}）</span>
                      <span className="pair-x">×</span>
                      <span className="mono strong">{pr.damBand}</span>
                      <span className="muted">（{dam?.bloodline ?? "?"} · {dam?.health ?? "?"}）</span>
                    </div>
                    <div className="pair-meta">
                      <span className="muted small">{pr.date}{pr.note ? ` · ${pr.note}` : ""}</span>
                      <button className="btn btn-small" onClick={() => onRemove(pr.id)}>删除</button>
                    </div>
                  </article>
                );
              })}
          </div>
        )}
      </section>
    </div>
  );
}
