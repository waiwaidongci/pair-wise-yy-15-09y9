import type { LoftStore } from "../lib/store";
import {
  allLineages,
  allLocations,
  distanceBand,
  fmtTime,
  rankRows,
} from "../lib/loft";
import { Badge, EmptyState, Select } from "./ui";

export function Ranking({ store }: { store: LoftStore }) {
  const { state, prefs, patchPrefs } = store;
  const lineages = allLineages(state);
  const locations = allLocations(state);

  const rows = rankRows(state, {
    lineage: prefs.lineage,
    location: prefs.rankLocation,
    bandKey: prefs.rankBand,
  });

  // 每羽赛鸽在当前筛选下只展示其最佳一条有效成绩
  const bestByPigeon = new Map<string, (typeof rows)[number]>();
  rows.forEach((r) => {
    if (!bestByPigeon.has(r.pigeon.id)) bestByPigeon.set(r.pigeon.id, r);
  });
  const best = Array.from(bestByPigeon.values());

  return (
    <div className="stack-lg">
      <section className="panel">
        <div className="panel-head wrap">
          <div>
            <p className="eyebrow">按分速排序</p>
            <h2>成绩排行榜</h2>
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
            <Select
              value={prefs.rankBand}
              onChange={(e) => patchPrefs({ rankBand: e.target.value })}
              aria-label="按距离筛选"
            >
              <option value="all">全部距离</option>
              <option value="short">短距离 &lt;100km</option>
              <option value="mid">中距离 100–300km</option>
              <option value="long">长距离 &gt;300km</option>
            </Select>
            <Select
              value={prefs.rankLocation}
              onChange={(e) => patchPrefs({ rankLocation: e.target.value })}
              aria-label="按地点筛选"
            >
              <option value="all">全部地点</option>
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="banner-info">
          仅统计状态为「有效」的归巢成绩；<b>未归巢</b>与<b>已失效（被更正）</b>的记录一律不参与排行。
          排行与总览、记录、提醒、档案共用同一数据源。
        </div>

        {best.length === 0 ? (
          <EmptyState text="当前筛选条件下暂无可排名的有效成绩。" />
        ) : (
          <div className="podium-wrap">
            <ol className="podium-list">
              {best.map((r, i) => (
                <li key={r.flight.id} className={i < 3 ? `podium podium-${i + 1}` : "podium"}>
                  <span className="rank-no-lg">{i + 1}</span>
                  <div className="podium-main">
                    <div className="podium-title">
                      <b>{r.pigeon.ring}</b>
                      <Badge tone="blue">{r.pigeon.lineage}</Badge>
                      {r.pigeon.health === "异常" && <Badge tone="red">鸽体异常</Badge>}
                      {r.pigeon.health === "观察" && <Badge tone="amber">观察中</Badge>}
                    </div>
                    <p className="muted">
                      {r.flight.date} · {r.flight.location} · {r.flight.distance}km（
                      {distanceBand(r.flight.distance)}） · {r.flight.weather}
                    </p>
                    <p className="muted small">
                      司放 {fmtTime(r.flight.releaseTime)} → 归巢 {fmtTime(r.flight.homeTime)}
                    </p>
                  </div>
                  <div className="podium-speed">
                    <strong>{r.speed}</strong>
                    <span>米/分</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {rows.length > best.length && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">全部有效场次</p>
              <h2>同鸽多场成绩</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>足环号</th>
                  <th>血统</th>
                  <th>日期</th>
                  <th>地点</th>
                  <th>距离</th>
                  <th>天气</th>
                  <th>分速</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.flight.id}>
                    <td>{i + 1}</td>
                    <td>{r.pigeon.ring}</td>
                    <td>{r.pigeon.lineage}</td>
                    <td>{r.flight.date}</td>
                    <td>{r.flight.location}</td>
                    <td>{r.flight.distance}km</td>
                    <td>{r.flight.weather}</td>
                    <td>
                      <b>{r.speed}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
