import { useState } from "react";
import type { PairSubmitResult } from "../lib/store";
import { checkPair, pigeonById } from "../lib/loft";
import type { LoftStore } from "../lib/store";
import { Badge, Button, Field, Select } from "./ui";

function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function Pairing({ store }: { store: LoftStore }) {
  const { state } = store;
  const cocks = state.pigeons.filter((p) => p.sex === "雄");
  const hens = state.pigeons.filter((p) => p.sex === "雌");
  const [cockId, setCockId] = useState(cocks.find((c) => c.health === "健康")?.id ?? cocks[0]?.id ?? "");
  const [henId, setHenId] = useState(hens.find((h) => h.health === "健康")?.id ?? hens[0]?.id ?? "");
  const [pairedAt, setPairedAt] = useState(today());
  const [note, setNote] = useState("");
  const [result, setResult] = useState<PairSubmitResult | null>(null);
  const [okFlash, setOkFlash] = useState<string | null>(null);

  const preview = cockId && henId ? checkPair(state, cockId, henId) : null;
  const cock = pigeonById(state, cockId);
  const hen = pigeonById(state, henId);

  const submit = () => {
    const r = store.submitPair(cockId, henId, pairedAt, note);
    setResult(r);
    setOkFlash(null);
    if (r.ok) {
      setOkFlash(`配对成功：${cock?.ring} × ${hen?.ring}`);
      setNote("");
    }
  };

  const activePairs = state.pairs.filter((p) => p.active);
  const pastPairs = state.pairs.filter((p) => !p.active);

  return (
    <div className="stack-lg">
      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">育种规则</p>
            <h2>配对管理</h2>
          </div>
        </div>
        <div className="banner-info">
          系统在配对前强制执行：<b>① 亲本健康异常（异常状态）直接拒绝</b>；
          <b>② 三代以内共同祖先（近亲繁殖）直接拒绝</b>。被拒绝时会逐条说明原因与血缘路径。
          解除配对后可重新选配，全部判定记录留档可查。
        </div>

        <div className="pair-form">
          <div className="pair-side">
            <Field label="雄鸽（父本）" required>
              <Select value={cockId} onChange={(e) => { setCockId(e.target.value); setResult(null); }}>
                <option value="">请选择…</option>
                {cocks.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.ring} · {p.lineage}
                    {p.health !== "健康" ? ` · ${p.health}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            {cock && <PigeonMiniCheck store={store} id={cock.id} />}
          </div>

          <div className="pair-cross">×</div>

          <div className="pair-side">
            <Field label="雌鸽（母本）" required>
              <Select value={henId} onChange={(e) => { setHenId(e.target.value); setResult(null); }}>
                <option value="">请选择…</option>
                {hens.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.ring} · {p.lineage}
                    {p.health !== "健康" ? ` · ${p.health}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            {hen && <PigeonMiniCheck store={store} id={hen.id} />}
          </div>

          <Field label="配对日期">
            <input
              className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              type="date"
              value={pairedAt}
              onChange={(e) => setPairedAt(e.target.value)}
            />
          </Field>
          <Field label="配对备注">
            <input
              className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              placeholder="如：主力杂交、留种"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </div>

        {preview && (
          <div className={preview.ok ? "verdict verdict-ok" : "verdict verdict-bad"}>
            <b>{preview.ok ? "✅ 预检通过，可以配对" : "⛔ 预检不通过，配对将被拒绝"}</b>
            <ul>
              {preview.ok ? (
                <li>两羽赛鸽健康状态允许，且三代以内无共同祖先。</li>
              ) : (
                preview.reasons.map((r, i) => <li key={i}>{r}</li>)
              )}
            </ul>
          </div>
        )}

        <div className="form-actions">
          <Button variant="primary" onClick={submit} disabled={!cockId || !henId}>
            确认配对
          </Button>
          {okFlash && <span className="text-green">{okFlash}</span>}
        </div>

        {result && !result.ok && (
          <div className="verdict verdict-bad">
            <b>配对被拒绝，原因如下：</b>
            <ul>
              {result.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="panel">
        <h3 className="sub-title">进行中的配对（{activePairs.length}）</h3>
        {activePairs.length === 0 ? (
          <p className="muted">暂无进行中的配对。</p>
        ) : (
          <ul className="pair-list">
            {activePairs.map((p) => {
              const c = pigeonById(state, p.cockId);
              const h = pigeonById(state, p.henId);
              return (
                <li key={p.id}>
                  <Badge tone="blue">{c?.lineage}</Badge>
                  <b>{c?.ring ?? "?"}</b>
                  <span className="pair-cross-sm">×</span>
                  <b>{h?.ring ?? "?"}</b>
                  <Badge tone="blue">{h?.lineage}</Badge>
                  <span className="muted small">
                    自 {p.pairedAt} 起{p.note ? ` · ${p.note}` : ""}
                  </span>
                  <Button variant="ghost" onClick={() => store.unPair(p.id)}>
                    解除配对
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <h3 className="sub-title">配对判定记录</h3>
        {state.attempts.length === 0 ? (
          <p className="muted">暂无判定记录。</p>
        ) : (
          <ul className="attempt-list">
            {state.attempts.map((a) => {
              const c = pigeonById(state, a.cockId);
              const h = pigeonById(state, a.henId);
              return (
                <li key={a.id} className={a.ok ? "" : "attempt-bad"}>
                  <div className="attempt-head">
                    {a.ok ? <Badge tone="green">已配对</Badge> : <Badge tone="red">已拒绝</Badge>}
                    <span>
                      <b>{c?.ring ?? "?"}</b> × <b>{h?.ring ?? "?"}</b>
                    </span>
                    <time>{new Date(a.at).toLocaleString("zh-CN", { hour12: false })}</time>
                  </div>
                  {!a.ok && (
                    <ul className="attempt-reasons">
                      {a.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {pastPairs.length > 0 && (
          <>
            <h3 className="sub-title">历史配对（已解除）</h3>
            <ul className="pair-list pair-past">
              {pastPairs.map((p) => {
                const c = pigeonById(state, p.cockId);
                const h = pigeonById(state, p.henId);
                return (
                  <li key={p.id}>
                    <Badge tone="gray">已解除</Badge>
                    <span className="strike">
                      {c?.ring ?? "?"} × {h?.ring ?? "?"}
                    </span>
                    <span className="muted small">自 {p.pairedAt} 起</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

function PigeonMiniCheck({ store, id }: { store: LoftStore; id: string }) {
  const p = pigeonById(store.state, id);
  if (!p) return null;
  const sire = pigeonById(store.state, p.sireId);
  const dam = pigeonById(store.state, p.damId);
  return (
    <div className="mini-check">
      <span>
        当前健康：
        <Badge tone={p.health === "健康" ? "green" : p.health === "观察" ? "amber" : "red"}>
          {p.health}
        </Badge>
        {p.note ? <em className="muted small">（{p.note}）</em> : null}
      </span>
      <span className="muted small">
        父 {sire?.ring ?? "未登记"} · 母 {dam?.ring ?? "未登记"}
      </span>
    </div>
  );
}
