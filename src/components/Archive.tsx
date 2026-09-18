import { useMemo, useState } from "react";
import type { Health, Pigeon, Sex } from "../types";
import type { LoftStore } from "../lib/store";
import {
  activePairOf,
  allLineages,
  distanceBand,
  LINEAGES,
  pigeonFlights,
  shortTime,
} from "../lib/loft";
import { Badge, Button, EmptyState, Field, healthTone, Modal, Select, TextInput } from "./ui";

const HEALTHES: Health[] = ["健康", "观察", "异常"];

export function Archive({ store }: { store: LoftStore }) {
  const { state, prefs, patchPrefs } = store;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const lineages = allLineages(state);
  const birds = useMemo(
    () =>
      state.pigeons
        .filter((p) => prefs.lineage === "all" || p.lineage === prefs.lineage)
        .sort((a, b) => a.ring.localeCompare(b.ring)),
    [state.pigeons, prefs.lineage]
  );

  const selected = state.pigeons.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="stack-lg">
      <section className="panel">
        <div className="panel-head wrap">
          <div>
            <p className="eyebrow">逐羽建档</p>
            <h2>赛鸽档案</h2>
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
            <Button variant="primary" onClick={() => setAdding(true)}>
              + 新建档案
            </Button>
          </div>
        </div>

        {birds.length === 0 ? (
          <EmptyState text="当前血统下暂无赛鸽，点击「新建档案」录入足环号与血统。" />
        ) : (
          <div className="pigeon-grid">
            {birds.map((p) => {
              const open = state.flights.some(
                (f) => f.pigeonId === p.id && f.status === "未归巢"
              );
              const pair = activePairOf(state, p.id);
              return (
                <button
                  key={p.id}
                  className={selectedId === p.id ? "pigeon-card pigeon-card-on" : "pigeon-card"}
                  onClick={() => setSelectedId(p.id)}
                >
                  <div className="pigeon-card-top">
                    <Badge tone="blue">{p.lineage}</Badge>
                    {open && <Badge tone="red">未归巢</Badge>}
                  </div>
                  <h3>{p.ring}</h3>
                  <p className="muted">
                    {p.name || "未命名"} · {p.sex} · {p.birthYear} 年
                  </p>
                  <div className="pigeon-card-foot">
                    <Badge tone={healthTone(p.health)}>{p.health}</Badge>
                    {pair && <Badge tone="green">配对中</Badge>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selected && (
        <PigeonDetail key={selected.id} store={store} pigeon={selected} onClose={() => setSelectedId(null)} />
      )}

      {adding && (
        <Modal open wide title="新建赛鸽档案" onClose={() => setAdding(false)}>
          <PigeonForm
            store={store}
            onDone={() => setAdding(false)}
          />
        </Modal>
      )}
    </div>
  );
}

function PigeonDetail({
  store,
  pigeon,
  onClose,
}: {
  store: LoftStore;
  pigeon: Pigeon;
  onClose: () => void;
}) {
  const { state } = store;
  const flights = pigeonFlights(state, pigeon.id);
  const pair = activePairOf(state, pigeon.id);
  const validCount = flights.filter((f) => f.status === "有效").length;
  const best = flights
    .filter((f) => f.status === "有效" && typeof f.speed === "number")
    .sort((a, b) => (b.speed ?? 0) - (a.speed ?? 0))[0];
  const mate = pair
    ? state.pigeons.find((p) => p.id === (pair.cockId === pigeon.id ? pair.henId : pair.cockId))
    : undefined;

  return (
    <section className="panel detail-panel">
      <div className="panel-head wrap">
        <div>
          <p className="eyebrow">单羽档案</p>
          <h2>
            {pigeon.ring} <small className="muted">{pigeon.name}</small>
          </h2>
        </div>
        <Button variant="ghost" onClick={onClose}>
          收起 ×
        </Button>
      </div>

      <div className="detail-grid">
        <div className="stack-md">
          <dl className="info-grid">
            <div>
              <dt>血统</dt>
              <dd>
                <Badge tone="blue">{pigeon.lineage}</Badge>
              </dd>
            </div>
            <div>
              <dt>性别</dt>
              <dd>{pigeon.sex}</dd>
            </div>
            <div>
              <dt>出生年份</dt>
              <dd>{pigeon.birthYear}</dd>
            </div>
            <div>
              <dt>当前健康</dt>
              <dd>
                <Select
                  value={pigeon.health}
                  onChange={(e) =>
                    store.updatePigeon(pigeon.id, { health: e.target.value as Health })
                  }
                >
                  {HEALTHES.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </Select>
              </dd>
            </div>
            <div>
              <dt>有效场次</dt>
              <dd>{validCount}</dd>
            </div>
            <div>
              <dt>最快分速</dt>
              <dd>{best ? `${best.speed} 米/分` : "—"}</dd>
            </div>
          </dl>
          {pigeon.note && <p className="muted">备注：{pigeon.note}</p>}
          {pair && mate && (
            <div className="pair-current">
              <Badge tone="green">配对中</Badge>
              <span>
                与 <b>{mate.ring}</b>（{mate.lineage}）· 自 {pair.pairedAt} 起
                {pair.note ? ` · ${pair.note}` : ""}
              </span>
              <Button variant="ghost" onClick={() => store.unPair(pair.id)}>
                解除配对
              </Button>
            </div>
          )}

          <div>
            <h3 className="sub-title">三代血统</h3>
            <Pedigree store={store} pigeon={pigeon} />
          </div>
        </div>

        <div>
          <h3 className="sub-title">历史训放（含失效留档）</h3>
          {flights.length === 0 ? (
            <p className="muted">暂无训放记录。</p>
          ) : (
            <ul className="flight-history">
              {flights.map((f) => (
                <li key={f.id} className={f.status === "失效" ? "fh-invalid" : f.status === "未归巢" ? "fh-open" : ""}>
                  <div className="fh-head">
                    <b>
                      {f.date} · {f.location}
                    </b>
                    {f.status === "有效" && <Badge tone="green">有效</Badge>}
                    {f.status === "未归巢" && <Badge tone="red">未归巢</Badge>}
                    {f.status === "失效" && <Badge tone="gray">已失效</Badge>}
                  </div>
                  <p className="muted small">
                    {f.distance}km（{distanceBand(f.distance)}）· {f.weather} · 司放{" "}
                    {shortTime(f.releaseTime)}
                  </p>
                  <p className="small">
                    {f.status === "未归巢" ? (
                      <span className="text-danger">尚未归巢，不计入速度排行</span>
                    ) : (
                      <>
                        归巢 {shortTime(f.homeTime)} · 分速 <b>{f.speed}</b> 米/分 ·{" "}
                        <Badge tone={healthTone(f.health)}>{f.health}</Badge>
                      </>
                    )}
                  </p>
                  {f.note && <p className="muted small">📝 {f.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function PedigreeNode({
  store,
  pigeon,
  depth,
}: {
  store: LoftStore;
  pigeon?: Pigeon;
  depth: number;
}) {
  if (!pigeon)
    return (
      <div className="pedigree-node pedigree-empty">
        <span>未知祖先</span>
      </div>
    );
  const sire = store.state.pigeons.find((p) => p.id === pigeon.sireId);
  const dam = store.state.pigeons.find((p) => p.id === pigeon.damId);
  return (
    <div className="pedigree-node">
      <div className={`pedigree-self ped-depth-${depth}`}>
        <b>{pigeon.ring}</b>
        <span>
          {pigeon.lineage} · {pigeon.sex}
        </span>
        <Badge tone={healthTone(pigeon.health)}>{pigeon.health}</Badge>
      </div>
      {depth < 3 && (
        <div className="pedigree-children">
          <PedigreeNode store={store} pigeon={sire} depth={depth + 1} />
          <PedigreeNode store={store} pigeon={dam} depth={depth + 1} />
        </div>
      )}
    </div>
  );
}

function Pedigree({ store, pigeon }: { store: LoftStore; pigeon: Pigeon }) {
  return (
    <div className="pedigree">
      <PedigreeNode store={store} pigeon={pigeon} depth={0} />
    </div>
  );
}

function PigeonForm({ store, onDone }: { store: LoftStore; onDone: () => void }) {
  const { state } = store;
  const [ring, setRing] = useState("");
  const [name, setName] = useState("");
  const [lineage, setLineage] = useState(LINEAGES[0]);
  const [customLineage, setCustomLineage] = useState("");
  const [sex, setSex] = useState<Sex>("雄");
  const [birthYear, setBirthYear] = useState(String(new Date().getFullYear() - 1));
  const [health, setHealth] = useState<Health>("健康");
  const [sireId, setSireId] = useState("");
  const [damId, setDamId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const finalLineage = lineage === "__custom" ? customLineage.trim() : lineage;
  const cocks = state.pigeons.filter((p) => p.sex === "雄");
  const hens = state.pigeons.filter((p) => p.sex === "雌");

  const submit = () => {
    if (!ring.trim()) return setError("足环号必填。");
    if (state.pigeons.some((p) => p.ring.trim() === ring.trim()))
      return setError(`足环号 ${ring.trim()} 已存在。`);
    if (!finalLineage) return setError("请选择或填写血统。");
    const year = Number(birthYear);
    if (!year || year < 1990 || year > new Date().getFullYear() + 1)
      return setError("出生年份不合理。");
    try {
      store.addPigeon({
        ring: ring.trim(),
        name: name.trim(),
        lineage: finalLineage,
        sex,
        birthYear: year,
        health,
        sireId: sireId || null,
        damId: damId || null,
        note: note.trim() || undefined,
      });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="stack-md">
      <div className="form-grid">
        <Field label="足环号" required>
          <TextInput placeholder="CHN-26-000001" value={ring} onChange={(e) => setRing(e.target.value)} />
        </Field>
        <Field label="鸽舍名号">
          <TextInput placeholder="如：闪电" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="血统" required>
          <Select value={lineage} onChange={(e) => setLineage(e.target.value)}>
            {LINEAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
            <option value="__custom">自定义血统…</option>
          </Select>
        </Field>
        {lineage === "__custom" && (
          <Field label="自定义血统名称" required>
            <TextInput value={customLineage} onChange={(e) => setCustomLineage(e.target.value)} />
          </Field>
        )}
        <Field label="性别" required>
          <Select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
            <option value="雄">雄</option>
            <option value="雌">雌</option>
          </Select>
        </Field>
        <Field label="出生年份" required>
          <TextInput type="number" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} />
        </Field>
        <Field label="当前健康" required hint="异常的种鸽将被禁止配对">
          <Select value={health} onChange={(e) => setHealth(e.target.value as Health)}>
            {HEALTHES.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </Select>
        </Field>
        <Field label="父亲（可选）">
          <Select value={sireId} onChange={(e) => setSireId(e.target.value)}>
            <option value="">— 未登记 —</option>
            {cocks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.ring} · {p.lineage}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="母亲（可选）">
          <Select value={damId} onChange={(e) => setDamId(e.target.value)}>
            <option value="">— 未登记 —</option>
            {hens.map((p) => (
              <option key={p.id} value={p.id}>
                {p.ring} · {p.lineage}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="备注（伤情/用药等）">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      {error && <div className="form-error">⚠ {error}</div>}
      <div className="form-actions">
        <Button variant="primary" onClick={submit}>
          建立档案
        </Button>
      </div>
    </div>
  );
}
