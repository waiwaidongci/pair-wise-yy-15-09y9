import { useMemo } from "react";
import type { LoftState } from "../types";
import { elapsedText, fmtDateTime, fmtSpeed } from "../store";

interface Props {
  state: LoftState;
  onGoTab: (tab: string) => void;
}

export default function Overview({ state, onGoTab }: Props) {
  const stats = useMemo(() => {
    const valid = state.records.filter((r) => r.status === "valid");
    const returned = valid.filter((r) => r.returnAt && r.speed != null);
    const outstanding = valid.filter((r) => !r.returnAt);
    const avgSpeed =
      returned.length > 0
        ? Math.round((returned.reduce((s, r) => s + (r.speed ?? 0), 0) / returned.length) * 10) / 10
        : null;
    const returnRate = valid.length > 0 ? Math.round((returned.length / valid.length) * 1000) / 10 : null;
    const bloodlines = new Map<string, number>();
    state.pigeons.forEach((p) => bloodlines.set(p.bloodline, (bloodlines.get(p.bloodline) ?? 0) + 1));
    const recent = [...valid].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    return { valid, returned, outstanding, avgSpeed, returnRate, bloodlines, recent };
  }, [state]);

  return (
    <div className="stack">
      <section className="metrics">
        <article className="metric">
          <small>在棚赛鸽</small>
          <strong>{state.pigeons.length}</strong>
          <span className="metric-sub">羽</span>
        </article>
        <article className="metric">
          <small>有效训放记录</small>
          <strong>{stats.valid.length}</strong>
          <span className="metric-sub">条</span>
        </article>
        <article className="metric">
          <small>归巢率</small>
          <strong>{stats.returnRate == null ? "—" : `${stats.returnRate}%`}</strong>
          <span className="metric-sub">{stats.returned.length}/{stats.valid.length} 归巢</span>
        </article>
        <article className="metric">
          <small>平均分速</small>
          <strong>{stats.avgSpeed == null ? "—" : stats.avgSpeed.toFixed(1)}</strong>
          <span className="metric-sub">m/min</span>
        </article>
        <article className="metric metric-alert" onClick={() => onGoTab("alerts")} role="button">
          <small>当前未归巢</small>
          <strong>{stats.outstanding.length}</strong>
          <span className="metric-sub">点击查看提醒 →</span>
        </article>
        <article className="metric">
          <small>血统档案</small>
          <strong>{stats.bloodlines.size}</strong>
          <span className="metric-sub">个品系</span>
        </article>
      </section>

      {stats.outstanding.length > 0 && (
        <section className="panel panel-warn">
          <div className="heading">
            <div>
              <p>未归巢提醒</p>
              <h2>{stats.outstanding.length} 羽尚未归巢</h2>
            </div>
            <button className="btn" onClick={() => onGoTab("alerts")}>处理提醒</button>
          </div>
          <div className="mini-list">
            {stats.outstanding.slice(0, 3).map((r) => (
              <div key={r.id} className="mini-item">
                <span className="mono strong">{r.band}</span>
                <span>{r.date} {r.location} · {r.distanceKm}km</span>
                <span className="tag tag-alert">已放飞 {elapsedText(r.releaseAt)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="two-col">
        <section className="panel">
          <div className="heading">
            <div>
              <p>近期动态</p>
              <h2>最新有效记录</h2>
            </div>
            <button className="btn" onClick={() => onGoTab("records")}>全部记录</button>
          </div>
          {stats.recent.length === 0 ? (
            <p className="empty">暂无训放记录</p>
          ) : (
            <div className="mini-list">
              {stats.recent.map((r) => (
                <div key={r.id} className="mini-item">
                  <span className="mono strong">{r.band}</span>
                  <span>
                    {r.date} {r.location} · {r.distanceKm}km · {r.weather}
                  </span>
                  {r.returnAt ? (
                    <span className="tag tag-valid">{fmtSpeed(r.speed)}</span>
                  ) : (
                    <span className="tag tag-alert">未归巢</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="heading">
            <div>
              <p>品系构成</p>
              <h2>血统分布</h2>
            </div>
            <button className="btn" onClick={() => onGoTab("archives")}>查看档案</button>
          </div>
          <div className="mini-list">
            {[...stats.bloodlines.entries()].map(([bl, count]) => (
              <div key={bl} className="mini-item">
                <span className="strong">{bl}</span>
                <span className="muted">{count} 羽</span>
                <span className="bar">
                  <span
                    className="bar-fill"
                    style={{ width: `${Math.max(8, (count / state.pigeons.length) * 100)}%` }}
                  />
                </span>
              </div>
            ))}
          </div>
          <p className="muted small">
            种鸽 {state.pigeons.filter((p) => p.breeder).length} 羽 · 健康异常{" "}
            {state.pigeons.filter((p) => p.health === "异常").length} 羽 · 配对{" "}
            {state.pairings.length} 对
          </p>
          <p className="muted small">
            最近归巢：{stats.recent.find((r) => r.returnAt) ? fmtDateTime(stats.recent.find((r) => r.returnAt)!.returnAt) : "—"}
          </p>
        </section>
      </div>
    </div>
  );
}
