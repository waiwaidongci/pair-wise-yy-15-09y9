import type { LoftStore } from "../lib/store";
import { loftStats, rankRows, reminderRows, shortTime } from "../lib/loft";
import { Badge, Button } from "./ui";

export function Overview({ store }: { store: LoftStore }) {
  const { state, prefs, patchPrefs } = store;
  const lineage = prefs.lineage;
  const stats = loftStats(state, lineage);
  const reminders = reminderRows(state, lineage).slice(0, 5);
  const ranks = rankRows(state, { lineage }).slice(0, 5);

  const metricCards: { label: string; value: string | number; sub: string; alert?: boolean }[] = [
    { label: "在棚赛鸽", value: stats.total, sub: `雄 ${stats.cocks} · 雌 ${stats.hens}` },
    { label: "归巢率", value: `${stats.homeRate}%`, sub: `归巢 ${stats.homed} / 放飞 ${stats.released}` },
    { label: "有效平均速度", value: stats.avgSpeed ? `${stats.avgSpeed}` : "—", sub: "米/分，仅有效成绩" },
    { label: "未归巢", value: stats.open, sub: stats.open ? "需要立即关注" : "全部归巢", alert: stats.open > 0 },
    { label: "健康 / 观察 / 异常", value: `${stats.healthy}/${stats.watching}/${stats.sick}`, sub: "当前健康状态" },
    { label: "进行中配对", value: stats.activePairs, sub: "受健康与近亲规则约束" },
  ];

  return (
    <div className="stack-lg">
      <div className="metric-grid">
        {metricCards.map((m) => (
          <article key={m.label} className={m.alert ? "metric metric-alert" : "metric"}>
            <small>{m.label}</small>
            <strong>{m.value}</strong>
            <span>{m.sub}</span>
          </article>
        ))}
      </div>

      <div className="overview-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">实时提醒</p>
              <h2>未归巢关注</h2>
            </div>
            <Button variant="ghost" onClick={() => patchPrefs({ tab: "reminders" })}>
              查看全部 →
            </Button>
          </div>
          {reminders.length === 0 ? (
            <p className="muted">当前没有未归巢赛鸽，鸽群状态良好。</p>
          ) : (
            <ul className="mini-list">
              {reminders.map((r) => (
                <li key={r.flight.id}>
                  <div>
                    <b>{r.pigeon.ring}</b>
                    <span>
                      {r.flight.location} · {r.flight.distance}km ·{" "}
                      {r.flight.weather} · 司放 {shortTime(r.flight.releaseTime)}
                    </span>
                  </div>
                  <Badge tone="red">未归 {r.overdueHours}h</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">TOP 5</p>
              <h2>速度榜速览</h2>
            </div>
            <Button variant="ghost" onClick={() => patchPrefs({ tab: "ranking" })}>
              完整排行 →
            </Button>
          </div>
          {ranks.length === 0 ? (
            <p className="muted">暂无符合筛选的有效成绩。</p>
          ) : (
            <ol className="rank-mini">
              {ranks.map((r, i) => (
                <li key={r.flight.id}>
                  <span className={`rank-no rank-no-${i + 1}`}>{i + 1}</span>
                  <div>
                    <b>{r.pigeon.ring}</b>
                    <span>
                      {r.pigeon.lineage} · {r.flight.location} · {r.flight.distance}km
                    </span>
                  </div>
                  <strong>{r.speed}</strong>
                  <em>米/分</em>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">鸽棚构成</p>
            <h2>血统分布</h2>
          </div>
        </div>
        <LineageDistribution store={store} />
      </section>
    </div>
  );
}

function LineageDistribution({ store }: { store: LoftStore }) {
  const { state, prefs, patchPrefs } = store;
  const groups = new Map<string, number>();
  state.pigeons.forEach((p) => groups.set(p.lineage, (groups.get(p.lineage) ?? 0) + 1));
  const rows = Array.from(groups.entries()).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map((r) => r[1]));

  if (rows.length === 0) return <p className="muted">鸽棚还没有赛鸽档案。</p>;

  return (
    <div className="stack-sm">
      <div className="dist-row dist-head">
        <button
          className={prefs.lineage === "all" ? "chip chip-on" : "chip"}
          onClick={() => patchPrefs({ lineage: "all" })}
        >
          全部血统（{state.pigeons.length}）
        </button>
      </div>
      {rows.map(([lineage, count]) => (
        <button
          key={lineage}
          className={`dist-row ${prefs.lineage === lineage ? "dist-on" : ""}`}
          onClick={() => patchPrefs({ lineage })}
        >
          <span className="dist-name">{lineage}</span>
          <span className="dist-bar">
            <i style={{ width: `${(count / max) * 100}%` }} />
          </span>
          <span className="dist-count">{count} 羽</span>
        </button>
      ))}
    </div>
  );
}
