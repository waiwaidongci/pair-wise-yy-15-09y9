import type {
  Flight,
  FlightStatus,
  Health,
  LoftState,
  Pair,
  Pigeon,
  Weather,
} from "../types";

// ---------- 常量 ----------

export const WEATHERS: Weather[] = [
  "晴",
  "多云",
  "阴",
  "小雨",
  "雨",
  "雾",
  "顺风",
  "逆风",
  "侧风",
];

export const HEALTHES: Health[] = ["健康", "观察", "异常"];

export const LINEAGES = ["詹森系", "凡龙系", "胡本系", "盖比系", "狄尔巴系"];

export const DISTANCE_BANDS: { key: string; label: string; min: number; max: number }[] = [
  { key: "short", label: "短距离 <100km", min: 0, max: 99.999 },
  { key: "mid", label: "中距离 100–300km", min: 100, max: 300 },
  { key: "long", label: "长距离 >300km", min: 300.001, max: Infinity },
];

// ---------- 基础工具 ----------

let seq = 0;
export function uid(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq}`;
}

export function distanceBand(km: number): string {
  const hit = DISTANCE_BANDS.find((b) => km >= b.min && km <= b.max);
  return hit ? hit.label : "";
}

export function bandOfKey(key: string) {
  return DISTANCE_BANDS.find((b) => b.key === key);
}

/** 分速（米/分）= 距离(km)*1000 / 飞行分钟数 */
export function calcSpeed(
  distanceKm: number,
  release?: string,
  home?: string
): number | undefined {
  if (!release || !home) return undefined;
  const r = new Date(release).getTime();
  const h = new Date(home).getTime();
  if (!Number.isFinite(r) || !Number.isFinite(h) || h <= r) return undefined;
  return Math.round((distanceKm * 1000) / ((h - r) / 60000));
}

export function fmtTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
}

export function shortTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes()
  )}`;
}

export function flightKey(f: Pick<Flight, "pigeonId" | "date" | "location">): string {
  return `${f.pigeonId}|${f.date}|${f.location.trim()}`;
}

// ---------- 血统 / 鸽群索引 ----------

export function allLineages(state: LoftState): string[] {
  const set = new Set<string>();
  state.pigeons.forEach((p) => set.add(p.lineage));
  LINEAGES.forEach((l) => set.add(l));
  return Array.from(set);
}

export function pigeonById(state: LoftState, id?: string | null): Pigeon | undefined {
  if (!id) return undefined;
  return state.pigeons.find((p) => p.id === id);
}

// ---------- 有效成绩与“同日同地点只留一条有效” ----------

/** 同一赛鸽、同一日期、同一地点：归巢后只允许一条「有效」成绩，新记录顶替旧记录 */
export function findValidForKey(
  state: LoftState,
  key: string,
  excludeId?: string
): Flight | undefined {
  return state.flights.find(
    (f) =>
      flightKey(f) === key &&
      f.status === "有效" &&
      (!excludeId || f.id !== excludeId)
  );
}

/** 提交归巢成绩时返回会被顶替的旧成绩；若存在未归巢占位则直接顶替它 */
export function findSupersedeTarget(
  state: LoftState,
  input: Pick<Flight, "pigeonId" | "date" | "location">,
  excludeId?: string
): Flight | undefined {
  const key = flightKey(input);
  const open = state.flights.find(
    (f) =>
      flightKey(f) === key &&
      f.status === "未归巢" &&
      (!excludeId || f.id !== excludeId)
  );
  if (open) return open;
  return findValidForKey(state, key, excludeId);
}

/** 应用一条新记录后，规范化整组记录的有效/失效状态 */
export function normalizeFlights(state: LoftState): LoftState {
  const flights = state.flights;
  const groups = new Map<string, Flight[]>();
  flights.forEach((f) => {
    const k = flightKey(f);
    const arr = groups.get(k) ?? [];
    arr.push(f);
    groups.set(k, arr);
  });

  const result = new Map<string, { status: FlightStatus; supersededBy: string | null }>();
  groups.forEach((arr) => {
    const homed = arr
      .filter((f) => f.status !== "未归巢")
      .sort((a, b) => b.createdAt - a.createdAt);
    const winner = homed[0];
    arr.forEach((f) => {
      if (f.status === "未归巢") {
        // 若同组已有归巢记录，未归巢占位视为被顶替
        result.set(f.id, {
          status: winner ? "失效" : "未归巢",
          supersededBy: winner ? winner.id : f.supersededBy ?? null,
        });
      } else if (winner && f.id === winner.id) {
        result.set(f.id, { status: "有效", supersededBy: null });
      } else {
        result.set(f.id, {
          status: "失效",
          supersededBy: winner ? winner.id : f.supersededBy ?? null,
        });
      }
    });
  });

  return {
    ...state,
    flights: flights.map((f) => {
      const r = result.get(f.id);
      return r
        ? { ...f, status: r.status, supersededBy: r.supersededBy }
        : f;
    }),
  };
}

// ---------- 排行 / 提醒 / 统计（单一数据源派生，保证各模块一致） ----------

export interface RankRow {
  flight: Flight;
  pigeon: Pigeon;
  speed: number;
}

/** 速度排行：仅取「有效」成绩，未归巢 / 失效均不进入 */
export function rankRows(
  state: LoftState,
  opts: { lineage?: string; location?: string; bandKey?: string } = {}
): RankRow[] {
  const band = opts.bandKey ? bandOfKey(opts.bandKey) : undefined;
  const rows: RankRow[] = [];
  state.flights.forEach((f) => {
    if (f.status !== "有效" || typeof f.speed !== "number") return;
    const pg = pigeonById(state, f.pigeonId);
    if (!pg) return;
    if (opts.lineage && opts.lineage !== "all" && pg.lineage !== opts.lineage)
      return;
    if (opts.location && opts.location !== "all" && f.location !== opts.location)
      return;
    if (band && !(f.distance >= band.min && f.distance <= band.max)) return;
    rows.push({ flight: f, pigeon: pg, speed: f.speed });
  });
  return rows.sort((a, b) => b.speed - a.speed || a.flight.date.localeCompare(b.flight.date));
}

export interface ReminderRow {
  flight: Flight;
  pigeon: Pigeon;
  overdueHours: number;
}

/** 未归巢提醒：状态仍为「未归巢」的记录（补报/更正后自动消失） */
export function reminderRows(state: LoftState, lineage?: string): ReminderRow[] {
  const rows: ReminderRow[] = [];
  const now = Date.now();
  state.flights.forEach((f) => {
    if (f.status !== "未归巢") return;
    const pg = pigeonById(state, f.pigeonId);
    if (!pg) return;
    if (lineage && lineage !== "all" && pg.lineage !== lineage) return;
    const start = f.releaseTime
      ? new Date(f.releaseTime).getTime()
      : new Date(`${f.date}T08:00`).getTime();
    rows.push({
      flight: f,
      pigeon: pg,
      overdueHours: Math.max(0, Math.round((now - start) / 3600000)),
    });
  });
  return rows.sort((a, b) => b.overdueHours - a.overdueHours);
}

export interface LoftStats {
  total: number;
  cocks: number;
  hens: number;
  healthy: number;
  watching: number;
  sick: number;
  activePairs: number;
  released: number; // 有效放飞（含未归巢）
  homed: number; // 有效归巢
  homeRate: number; // 归巢率 %
  avgSpeed: number; // 有效成绩平均分速
  open: number; // 未归巢
}

export function loftStats(state: LoftState, lineage?: string): LoftStats {
  const birds =
    lineage && lineage !== "all"
      ? state.pigeons.filter((p) => p.lineage === lineage)
      : state.pigeons;
  const ids = new Set(birds.map((p) => p.id));
  const relevant = state.flights.filter((f) => ids.has(f.pigeonId));
  const open = relevant.filter((f) => f.status === "未归巢").length;
  const validHomed = relevant.filter((f) => f.status === "有效");
  const released = validHomed.length + open;
  const speeds = validHomed
    .map((f) => f.speed)
    .filter((s): s is number => typeof s === "number");
  const activePairs = state.pairs.filter(
    (p) =>
      p.active &&
      (ids.has(p.cockId) || ids.has(p.henId))
  ).length;
  return {
    total: birds.length,
    cocks: birds.filter((p) => p.sex === "雄").length,
    hens: birds.filter((p) => p.sex === "雌").length,
    healthy: birds.filter((p) => p.health === "健康").length,
    watching: birds.filter((p) => p.health === "观察").length,
    sick: birds.filter((p) => p.health === "异常").length,
    activePairs,
    released,
    homed: validHomed.length,
    homeRate: released ? Math.round((validHomed.length / released) * 1000) / 10 : 0,
    avgSpeed: speeds.length
      ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length)
      : 0,
    open,
  };
}

// ---------- 配对规则：亲本健康异常 / 三代内近亲 拒绝 ----------

interface AncestorHit {
  ancestor: Pigeon;
  cockPath: Pigeon[]; // 从雄鸽到共同祖先（含两端）
  henPath: Pigeon[]; // 从雌鸽到共同祖先（含两端）
}

/** 取某鸽最多三代内的祖先（第1=父母，第2=祖父母/外祖父母，第3=曾祖辈），路径含起点与祖先；同时包含自身（直系配检测） */
function ancestorsWithin3(pigeon: Pigeon, byId: Map<string, Pigeon>) {
  const map = new Map<string, Pigeon[]>();
  map.set(pigeon.id, [pigeon]); // 自身：若与对方祖先重合，说明互为直系血亲
  const walk = (current: Pigeon, path: Pigeon[], depth: number) => {
    if (depth > 3) return;
    (["sireId", "damId"] as const).forEach((side) => {
      const pid = current[side];
      if (!pid) return;
      const anc = byId.get(pid);
      if (!anc) return;
      const next = [...path, anc];
      const existed = map.get(anc.id);
      // 保留更近（代数更少）的路径
      if (!existed || existed.length > next.length) map.set(anc.id, next);
      walk(anc, next, depth + 1);
    });
  };
  walk(pigeon, [pigeon], 1);
  return map;
}

/** genA / genB 分别为共同祖先距雄、雌的代数（0=自身） */
function relationLabel(genA: number, genB: number): string {
  const lo = Math.min(genA, genB);
  const hi = Math.max(genA, genB);
  if (lo === 0 && hi === 1) return "直系父女/母子配";
  if (lo === 0) return "直系祖孙配";
  if (hi === 1) return "全同胞/半同胞配";
  if (lo === 1 && hi === 2) return "叔侄/舅甥（三代内）";
  if (lo === 2 && hi === 2) return "堂表亲（三代内）";
  return "三代内近亲";
}

function pathNames(path: Pigeon[]): string {
  return path.map((p) => `${p.ring}（${p.lineage}）`).join(" → ");
}

export interface PairCheckResult {
  ok: boolean;
  reasons: string[];
  hits?: AncestorHit[];
}

export function checkPair(state: LoftState, cockId: string, henId: string): PairCheckResult {
  const reasons: string[] = [];
  const cock = state.pigeons.find((p) => p.id === cockId);
  const hen = state.pigeons.find((p) => p.id === henId);
  if (!cock || !hen) return { ok: false, reasons: ["请选择要配对的两羽赛鸽"] };
  if (cockId === henId) reasons.push("不能与自身配对。");
  if (cock.sex !== "雄" || hen.sex !== "雌")
    reasons.push(`配对要求一雄一雌：${cock.ring} 为${cock.sex}，${hen.ring} 为${hen.sex}。`);
  if (cock.health === "异常")
    reasons.push(`亲本健康异常：雄鸽 ${cock.ring} 当前为「异常」（${cock.note ?? "请先调养康复"}），禁止配对。`);
  if (hen.health === "异常")
    reasons.push(`亲本健康异常：雌鸽 ${hen.ring} 当前为「异常」（${hen.note ?? "请先调养康复"}），禁止配对。`);
  if (
    state.pairs.some(
      (p) =>
        p.active &&
        (p.cockId === cockId || p.henId === cockId || p.cockId === henId || p.henId === henId)
    )
  )
    reasons.push("其中一羽已存在进行中的配对，请先解除原配对。");

  // 三代近亲检测（同一羽的情况已在上面拒绝，无需重复报告）
  const byId = new Map(state.pigeons.map((p) => [p.id, p]));
  const hits: AncestorHit[] = [];
  if (cockId !== henId) {
    const cockAnc = ancestorsWithin3(cock, byId);
    const henAnc = ancestorsWithin3(hen, byId);
    cockAnc.forEach((cp, id) => {
      const hp = henAnc.get(id);
      if (hp) {
        const anc = byId.get(id);
        if (anc) hits.push({ ancestor: anc, cockPath: cp, henPath: hp });
      }
    });
  }
  hits.sort(
    (a, b) =>
      Math.min(a.cockPath.length, a.henPath.length) -
      Math.min(b.cockPath.length, b.henPath.length)
  );
  hits.slice(0, 3).forEach((h) => {
    const genA = h.cockPath.length - 1;
    const genB = h.henPath.length - 1;
    reasons.push(
      `三代内近亲（${relationLabel(genA, genB)}）：共同祖先 ${h.ancestor.ring}（${h.ancestor.lineage}）。` +
        `雄鸽血缘 ${pathNames(h.cockPath)}；雌鸽血缘 ${pathNames(h.henPath)}。`
    );
  });

  return { ok: reasons.length === 0, reasons, hits };
}

// ---------- 某羽赛鸽的档案视图 ----------

export function pigeonFlights(state: LoftState, pigeonId: string): Flight[] {
  return state.flights
    .filter((f) => f.pigeonId === pigeonId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

export function activePairOf(state: LoftState, pigeonId: string): Pair | undefined {
  return state.pairs.find(
    (p) => p.active && (p.cockId === pigeonId || p.henId === pigeonId)
  );
}

export function allLocations(state: LoftState): string[] {
  return Array.from(new Set(state.flights.map((f) => f.location))).sort();
}
