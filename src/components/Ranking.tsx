import { useMemo } from "react";
import type { TrainingRecord } from "../types";
import { DISTANCE_FILTERS, distanceCategory, fmtDateTime, fmtSpeed } from "../store";

interface Props {
  records: TrainingRecord[];
  distanceFilter: string;
  onFilterChange: (f: string) => void;
}

export default function Ranking({ records, distanceFilter, onFilterChange }: Props) {
  const ranked = useMemo(() => {
    return records
      .filter((r) => r.status === "valid" && r.returnAt && r.speed != null)
      .filter((r) => distanceFilter === "全部" || distanceCategory(r.distanceKm) === distanceFilter)
      .sort((a, b) => (b.speed ?? 0) - (a.speed ?? 0));
  }, [records, distanceFilter]);

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>成绩排行</p>
          <h2>分速排行榜</h2>
        </div>
        <span className="muted small">仅统计有效且已归巢的成绩；未归巢与已更正成绩不参与排行</span>
      </div>
      <div className="chips">
        {DISTANCE_FILTERS.map((f) => (
          <button
            key={f}
            className={distanceFilter === f ? "chip active" : "chip"}
            onClick={() => onFilterChange(f)}
          >
            {f === "全部" ? "全部距离" : f === "短距离" ? "短距离 <300km" : f === "中距离" ? "中距离 300-600km" : "长距离 >600km"}
          </button>
        ))}
      </div>
      {ranked.length === 0 ? (
        <p className="empty">当前筛选下暂无有效成绩</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>名次</th>
                <th>足环号</th>
                <th>血统</th>
                <th>日期</th>
                <th>地点</th>
                <th>距离</th>
                <th>天气</th>
                <th>归巢时间</th>
                <th>分速</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => (
                <tr key={r.id} className={i < 3 ? `rank-${i + 1}` : ""}>
                  <td>
                    <span className={`rank-no rank-no-${i + 1}`}>{i + 1}</span>
                  </td>
                  <td className="mono">{r.band}</td>
                  <td>{r.bloodline}</td>
                  <td>{r.date}</td>
                  <td>{r.location}</td>
                  <td>{r.distanceKm} km</td>
                  <td>{r.weather}</td>
                  <td>{fmtDateTime(r.returnAt)}</td>
                  <td className="mono strong">{fmtSpeed(r.speed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
