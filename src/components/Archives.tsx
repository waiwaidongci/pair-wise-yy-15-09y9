import { useMemo, useState } from "react";
import type { Health, Pairing, Pigeon, PigeonFormInput, Sex, TrainingRecord } from "../types";
import { HEALTHS, fmtDateTime, fmtSpeed } from "../store";

interface Props {
  pigeons: Pigeon[];
  records: TrainingRecord[];
  pairings: Pairing[];
  bloodlineFilter: string;
  onFilterChange: (f: string) => void;
  onAddPigeon: (input: PigeonFormInput) => { ok: boolean; message: string };
  notify: (msg: string) => void;
}

export default function Archives({ pigeons, records, pairings, bloodlineFilter, onFilterChange, onAddPigeon, notify }: Props) {
  const [search, setSearch] = useState("");
  const [selectedBand, setSelectedBand] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // 新增赛鸽表单
  const [band, setBand] = useState("");
  const [bloodline, setBloodline] = useState("");
  const [sex, setSex] = useState<Sex>("雄");
  const [birthYear, setBirthYear] = useState(String(new Date().getFullYear()));
  const [sireBand, setSireBand] = useState("");
  const [damBand, setDamBand] = useState("");
  const [health, setHealth] = useState<Health>("健康");
  const [breeder, setBreeder] = useState(false);
  const [error, setError] = useState("");

  const bloodlines = useMemo(() => {
    const m = new Map<string, number>();
    pigeons.forEach((p) => m.set(p.bloodline, (m.get(p.bloodline) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [pigeons]);

  const filtered = useMemo(
    () =>
      pigeons.filter(
        (p) =>
          (bloodlineFilter === "全部" || p.bloodline === bloodlineFilter) &&
          (!search.trim() || p.band.toLowerCase().includes(search.trim().toLowerCase()))
      ),
    [pigeons, bloodlineFilter, search]
  );

  const selected = pigeons.find((p) => p.band === selectedBand) ?? null;

  const statsOf = (b: string) => {
    const valid = records.filter((r) => r.band === b && r.status === "valid");
    const returned = valid.filter((r) => r.speed != null);
    const best = returned.length ? Math.max(...returned.map((r) => r.speed ?? 0)) : null;
    return { count: valid.length, best };
  };

  const submitPigeon = () => {
    const year = Number(birthYear);
    if (!Number.isInteger(year) || year < 1990 || year > new Date().getFullYear())
      return setError("请填写有效的出生年份");
    const result = onAddPigeon({
      band: band.trim(),
      bloodline: bloodline.trim(),
      sex,
      birthYear: year,
      sireBand,
      damBand,
      health,
      breeder,
    });
    if (!result.ok) return setError(result.message);
    setError("");
    notify(result.message);
    setBand("");
    setBloodline("");
    setSireBand("");
    setDamBand("");
    setBreeder(false);
    setShowForm(false);
  };

  const males = pigeons.filter((p) => p.sex === "雄");
  const females = pigeons.filter((p) => p.sex === "雌");

  return (
    <div className="stack">
      <section className="panel">
        <div className="heading">
          <div>
            <p>鸽舍档案</p>
            <h2>按血统筛选（{filtered.length}/{pigeons.length} 羽）</h2>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "收起表单" : "＋ 登记赛鸽"}
          </button>
        </div>

        <div className="chips">
          <button className={bloodlineFilter === "全部" ? "chip active" : "chip"} onClick={() => onFilterChange("全部")}>
            全部（{pigeons.length}）
          </button>
          {bloodlines.map(([bl, count]) => (
            <button key={bl} className={bloodlineFilter === bl ? "chip active" : "chip"} onClick={() => onFilterChange(bl)}>
              {bl}（{count}）
            </button>
          ))}
        </div>

        <div className="search-row">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="按足环号搜索…" />
        </div>

        {showForm && (
          <div className="sub-panel">
            <h3>登记新赛鸽</h3>
            <div className="form-grid">
              <label>
                <span>足环号 *</span>
                <input value={band} onChange={(e) => setBand(e.target.value)} placeholder="如：CHN-26-001001" />
              </label>
              <label>
                <span>血统 *</span>
                <input value={bloodline} onChange={(e) => setBloodline(e.target.value)} list="bloodline-list" placeholder="如：詹森系" />
                <datalist id="bloodline-list">
                  {bloodlines.map(([bl]) => (
                    <option key={bl} value={bl} />
                  ))}
                </datalist>
              </label>
              <label>
                <span>性别</span>
                <select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
                  <option>雄</option>
                  <option>雌</option>
                </select>
              </label>
              <label>
                <span>出生年份</span>
                <input type="number" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} />
              </label>
              <label>
                <span>父足环号（用于近亲校验）</span>
                <select value={sireBand} onChange={(e) => setSireBand(e.target.value)}>
                  <option value="">未知</option>
                  {males.map((p) => (
                    <option key={p.band} value={p.band}>{p.band}（{p.bloodline}）</option>
                  ))}
                </select>
              </label>
              <label>
                <span>母足环号（用于近亲校验）</span>
                <select value={damBand} onChange={(e) => setDamBand(e.target.value)}>
                  <option value="">未知</option>
                  {females.map((p) => (
                    <option key={p.band} value={p.band}>{p.band}（{p.bloodline}）</option>
                  ))}
                </select>
              </label>
              <label>
                <span>健康状态</span>
                <select value={health} onChange={(e) => setHealth(e.target.value as Health)}>
                  {HEALTHS.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </label>
              <label className="check check-inline">
                <input type="checkbox" checked={breeder} onChange={(e) => setBreeder(e.target.checked)} />
                登记为种鸽
              </label>
            </div>
            {error && <p className="error-box">{error}</p>}
            <div className="actions">
              <button className="btn btn-primary" onClick={submitPigeon}>保存档案</button>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="empty">当前筛选下没有赛鸽</p>
        ) : (
          <div className="cards">
            {filtered.map((p) => {
              const s = statsOf(p.band);
              return (
                <article
                  key={p.band}
                  className={selectedBand === p.band ? "card card-selected" : "card"}
                  onClick={() => setSelectedBand(selectedBand === p.band ? null : p.band)}
                  role="button"
                >
                  <div className="card-head">
                    <span className="mono strong">{p.band}</span>
                    <span className={`tag tag-health-${p.health}`}>{p.health}</span>
                  </div>
                  <p className="muted">
                    {p.bloodline} · {p.sex} · {p.birthYear} 年{p.breeder ? " · 种鸽" : ""}
                  </p>
                  <p className="muted small">
                    有效成绩 {s.count} 条{s.best != null ? ` · 最佳分速 ${s.best.toFixed(1)}` : ""}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {selected && (
        <section className="panel">
          <div className="heading">
            <div>
              <p>单羽档案</p>
              <h2 className="mono">{selected.band}</h2>
            </div>
            <button className="btn" onClick={() => setSelectedBand(null)}>关闭</button>
          </div>
          <div className="detail-grid">
            <div>
              <h3>基本信息</h3>
              <dl className="kv">
                <dt>血统</dt><dd>{selected.bloodline}</dd>
                <dt>性别</dt><dd>{selected.sex}</dd>
                <dt>出生年份</dt><dd>{selected.birthYear}</dd>
                <dt>健康状态</dt><dd><span className={`tag tag-health-${selected.health}`}>{selected.health}</span></dd>
                <dt>用途</dt><dd>{selected.breeder ? "种鸽" : "赛鸽"}</dd>
                <dt>父</dt><dd className="mono">{selected.sireBand ?? "未知"}</dd>
                <dt>母</dt><dd className="mono">{selected.damBand ?? "未知"}</dd>
              </dl>
            </div>
            <div>
              <h3>配对记录</h3>
              {pairings.filter((pr) => pr.sireBand === selected.band || pr.damBand === selected.band).length === 0 ? (
                <p className="muted">暂无配对</p>
              ) : (
                <ul className="plain-list">
                  {pairings
                    .filter((pr) => pr.sireBand === selected.band || pr.damBand === selected.band)
                    .map((pr) => (
                      <li key={pr.id}>
                        <span className="mono">{pr.sireBand === selected.band ? pr.damBand : pr.sireBand}</span>
                        <span className="muted"> · {pr.date}{pr.note ? ` · ${pr.note}` : ""}</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>

          <h3>有效成绩</h3>
          <RecordTable records={records.filter((r) => r.band === selected.band && r.status === "valid")} emptyText="暂无有效成绩" />

          <h3>已更正历史</h3>
          <RecordTable records={records.filter((r) => r.band === selected.band && r.status === "superseded")} emptyText="无已更正记录" dimmed />
        </section>
      )}
    </div>
  );
}

function RecordTable({ records, emptyText, dimmed }: { records: TrainingRecord[]; emptyText: string; dimmed?: boolean }) {
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  if (sorted.length === 0) return <p className="empty">{emptyText}</p>;
  return (
    <div className="table-wrap">
      <table className={dimmed ? "table-dimmed" : ""}>
        <thead>
          <tr>
            <th>日期</th>
            <th>地点</th>
            <th>距离</th>
            <th>天气</th>
            <th>归巢时间</th>
            <th>分速</th>
            <th>健康</th>
            <th>配对</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id}>
              <td>{r.date}</td>
              <td>{r.location}</td>
              <td>{r.distanceKm} km</td>
              <td>{r.weather}</td>
              <td>{r.returnAt ? fmtDateTime(r.returnAt) : <span className="tag tag-alert">未归巢</span>}</td>
              <td className="mono">{fmtSpeed(r.speed)}</td>
              <td><span className={`tag tag-health-${r.health}`}>{r.health}</span></td>
              <td className="mono">{r.mateBand ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
