import { useMemo, useState } from "react";
import type { Flight } from "../types";
import type { FlightSubmitResult, LoftStore } from "../lib/store";
import { calcSpeed, fmtTime, WEATHERS } from "../lib/loft";
import { Button, Field, Select, TextInput } from "./ui";

const HEALTHES = ["健康", "观察", "异常"] as const;

function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function FlightForm({
  store,
  initial,
  onDone,
  defaultPigeonId,
}: {
  store: LoftStore;
  /** 更正某条记录（含未归巢补报） */
  initial?: Flight;
  onDone: (r: FlightSubmitResult) => void;
  defaultPigeonId?: string;
}) {
  const birds = store.state.pigeons;
  const [pigeonId, setPigeonId] = useState(
    initial?.pigeonId ?? defaultPigeonId ?? birds[0]?.id ?? ""
  );
  const [date, setDate] = useState(initial?.date ?? today());
  const [location, setLocation] = useState(initial?.location ?? "");
  const [distance, setDistance] = useState<string>(
    initial ? String(initial.distance) : "80"
  );
  const [weather, setWeather] = useState<Flight["weather"]>(initial?.weather ?? "晴");
  const [releaseTime, setReleaseTime] = useState(
    initial?.releaseTime ?? `${today()}T07:30`
  );
  const [homeTime, setHomeTime] = useState(
    initial && initial.status !== "未归巢" ? initial.homeTime ?? "" : ""
  );
  const [manualSpeed, setManualSpeed] = useState<string>(
    initial && typeof initial.speed === "number" ? String(initial.speed) : ""
  );
  const [speedEdited, setSpeedEdited] = useState(false);
  const [health, setHealth] = useState<(typeof HEALTHES)[number]>(
    initial && initial.health !== "未知" ? initial.health : "健康"
  );
  const [missing, setMissing] = useState(initial?.status === "未归巢");
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const autoSpeed = useMemo(
    () =>
      calcSpeed(Number(distance) || 0, releaseTime || undefined, homeTime || undefined),
    [distance, releaseTime, homeTime]
  );
  const finalSpeed = speedEdited && manualSpeed
    ? Number(manualSpeed)
    : autoSpeed;

  const isReportHome = initial?.status === "未归巢";
  const title = isReportHome
    ? "补报归巢"
    : initial
      ? `更正成绩 · ${initial.date} ${initial.location}`
      : "登记训放成绩";

  const submit = () => {
    if (!pigeonId) {
      setError("请先在「档案」中建立赛鸽，再登记训放。");
      return;
    }
    const res = store.submitFlight({
      id: initial?.id,
      pigeonId,
      date,
      location,
      distance: Number(distance),
      weather,
      releaseTime,
      homeTime: missing ? undefined : homeTime || undefined,
      speed: missing ? undefined : finalSpeed,
      health,
      note,
      missing,
    });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onDone(res);
  };

  return (
    <div className="stack-md">
      <div className="form-title">{title}</div>
      {initial && (
        <p className="form-note">
          更正后：本条成为该赛鸽当日同地点的<b>唯一有效成绩</b>，原成绩自动转为「失效」，
          但仍保留在训放记录中可随时查阅。
        </p>
      )}

      <div className="form-grid">
        <Field label="赛鸽（足环号）" required>
          <Select value={pigeonId} onChange={(e) => setPigeonId(e.target.value)}>
            {birds.map((p) => (
              <option key={p.id} value={p.id}>
                {p.ring} · {p.name} · {p.lineage} · {p.sex}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="训放日期" required>
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="训放地点" required>
          <TextInput
            placeholder="如：新乡放飞点"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </Field>
        <Field label="放飞空距 (km)" required>
          <TextInput
            type="number"
            min="1"
            step="0.1"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
        </Field>
        <Field label="天气 / 风向" required>
          <Select value={weather} onChange={(e) => setWeather(e.target.value as Flight["weather"])}>
            {WEATHERS.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </Select>
        </Field>
        <Field label="司放时间" required>
          <TextInput
            type="datetime-local"
            value={releaseTime}
            onChange={(e) => setReleaseTime(e.target.value)}
          />
        </Field>
      </div>

      <label className={`switch-row ${missing ? "switch-on" : ""}`}>
        <input
          type="checkbox"
          checked={missing}
          disabled={!!initial && initial.status !== "未归巢"}
          onChange={(e) => setMissing(e.target.checked)}
        />
        <span>
          尚未归巢（仅登记放飞，进入「未归巢提醒」；不参与速度排行）
          {initial && initial.status !== "未归巢" && (
            <small>已归巢成绩不能改回未归巢，如需调整请更正时间与分速。</small>
          )}
        </span>
      </label>

      {!missing && (
        <div className="form-grid">
          <Field label="归巢时间" required>
            <TextInput
              type="datetime-local"
              value={homeTime}
              onChange={(e) => {
                setHomeTime(e.target.value);
                setSpeedEdited(false);
              }}
            />
          </Field>
          <Field
            label="飞行速度（米/分）"
            required
            hint={autoSpeed ? "按司放—归巢时长自动计算，可手填覆盖" : "填写归巢时间后自动计算"}
          >
            <TextInput
              type="number"
              min="1"
              placeholder={autoSpeed ? String(autoSpeed) : "—"}
              value={speedEdited ? manualSpeed : autoSpeed ? String(autoSpeed) : ""}
              onChange={(e) => {
                setManualSpeed(e.target.value);
                setSpeedEdited(true);
              }}
            />
          </Field>
          <Field label="归巢时健康" required>
            <Select value={health} onChange={(e) => setHealth(e.target.value as typeof health)}>
              {HEALTHES.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </Select>
          </Field>
          <Field label="备注">
            <TextInput
              placeholder="如：核对 GPS 空距后更正"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </div>
      )}

      {initial && (
        <div className="old-flight">
          <span>原记录：</span>
          {fmtTime(initial.releaseTime)} 司放 ·{" "}
          {initial.status === "未归巢"
            ? "未归巢"
            : `${fmtTime(initial.homeTime)} 归巢 · 分速 ${initial.speed ?? "—"}`}
        </div>
      )}

      {error && <div className="form-error">⚠ {error}</div>}

      <div className="form-actions">
        <Button variant="primary" onClick={submit}>
          {missing ? "登记未归巢" : isReportHome ? "确认归巢并计算成绩" : "保存成绩"}
        </Button>
      </div>
    </div>
  );
}
