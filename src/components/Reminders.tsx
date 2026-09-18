import { useState } from "react";
import type { Flight } from "../types";
import type { FlightSubmitResult, LoftStore } from "../lib/store";
import {
  allLineages,
  distanceBand,
  fmtTime,
  reminderRows,
} from "../lib/loft";
import { Badge, Button, EmptyState, Modal, Select } from "./ui";
import { FlightForm } from "./FlightForm";

export function Reminders({ store }: { store: LoftStore }) {
  const { state, prefs, patchPrefs } = store;
  const [reporting, setReporting] = useState<Flight | null>(null);
  const rows = reminderRows(state, prefs.lineage);
  const lineages = allLineages(state);

  return (
    <div className="stack-lg">
      <section className="panel">
        <div className="panel-head wrap">
          <div>
            <p className="eyebrow">逐羽追踪</p>
            <h2>未归巢提醒</h2>
          </div>
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
        </div>

        <div className="banner-alert">
          规则：未归巢赛鸽<b>不进入速度排行</b>，也不计入归巢率分子；补报归巢并经校验后，
          自动进入排行，同时从本列表移除。
        </div>

        {rows.length === 0 ? (
          <EmptyState text="当前筛选下没有未归巢记录——全部平安归巢。" />
        ) : (
          <div className="reminder-grid">
            {rows.map((r) => (
              <article key={r.flight.id} className="reminder-card">
                <div className="reminder-top">
                  <Badge tone="red">未归巢 · {r.overdueHours} 小时</Badge>
                  <Badge tone="amber">{distanceBand(r.flight.distance)}</Badge>
                </div>
                <h3>{r.pigeon.ring}</h3>
                <p className="muted">
                  {r.pigeon.name} · {r.pigeon.lineage} · {r.pigeon.sex}
                </p>
                <dl className="kv">
                  <dt>放飞地点</dt>
                  <dd>
                    {r.flight.location} · {r.flight.distance}km
                  </dd>
                  <dt>天气</dt>
                  <dd>{r.flight.weather}</dd>
                  <dt>司放时间</dt>
                  <dd>{fmtTime(r.flight.releaseTime)}</dd>
                  <dt>当前健康</dt>
                  <dd>
                    <Badge tone={r.pigeon.health === "健康" ? "green" : r.pigeon.health === "观察" ? "amber" : "red"}>
                      {r.pigeon.health}
                    </Badge>
                  </dd>
                </dl>
                <div className="reminder-actions">
                  <Button variant="primary" onClick={() => setReporting(r.flight)}>
                    补报归巢
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      confirm("确认该场放弃追踪并删除此未归巢记录？") &&
                      store.deleteFlight(r.flight.id)
                    }
                  >
                    放弃追踪
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {reporting && (
        <Modal open wide title="补报归巢成绩" onClose={() => setReporting(null)}>
          <FlightForm
            store={store}
            initial={reporting}
            onDone={(_r: FlightSubmitResult) => setReporting(null)}
          />
        </Modal>
      )}
    </div>
  );
}
