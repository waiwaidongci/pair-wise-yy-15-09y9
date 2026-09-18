import type { Health, LoftState, Pigeon, UiPrefs } from "./types";

const STATE_KEY = "pigeon-loft-state-v1";
const UI_KEY = "pigeon-loft-ui-v1";

export const WEATHERS = ["晴", "多云", "阴", "雾", "小雨", "中雨", "顺风", "逆风", "侧风"];
export const HEALTHS: Health[] = ["健康", "亚健康", "异常"];
export const DISTANCE_FILTERS = ["全部", "短距离", "中距离", "长距离"];

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 分速 m/min，保留 1 位小数；无效返回 null */
export function computeSpeed(distanceKm: number, releaseAt: string, returnAt: string): number | null {
  const mins = (new Date(returnAt).getTime() - new Date(releaseAt).getTime()) / 60000;
  if (!Number.isFinite(mins) || mins <= 0 || distanceKm <= 0) return null;
  return Math.round(((distanceKm * 1000) / mins) * 10) / 10;
}

export function distanceCategory(km: number): "短距离" | "中距离" | "长距离" {
  if (km < 300) return "短距离";
  if (km <= 600) return "中距离";
  return "长距离";
}

export function fmtSpeed(s: number | null): string {
  return s == null ? "—" : `${s.toFixed(1)} m/min`;
}

export function fmtDateTime(iso: string | null | undefined): string {
  return iso ? iso.replace("T", " ") : "—";
}

export function elapsedText(fromIso: string): string {
  const ms = Date.now() - new Date(fromIso).getTime();
  if (ms < 0) return "未到放飞时间";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} 分钟`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} 小时`;
  return `${Math.floor(hours / 24)} 天 ${hours % 24} 小时`;
}

/**
 * 三代内祖先表：key = 祖先足环号，value = 亲缘路径（如 ["父", "父之母"]）
 */
export function ancestorMap(pigeons: Pigeon[], band: string, maxDepth = 3): Map<string, string[]> {
  const byBand = new Map(pigeons.map((p) => [p.band, p]));
  const result = new Map<string, string[]>();
  const walk = (b: string | undefined, path: string[], depth: number) => {
    if (!b || depth > maxDepth) return;
    const p = byBand.get(b);
    if (!p) return;
    const label = path.join("之");
    const list = result.get(b) ?? [];
    list.push(label);
    result.set(b, list);
    walk(p.sireBand, [...path, "父"], depth + 1);
    walk(p.damBand, [...path, "母"], depth + 1);
  };
  const root = byBand.get(band);
  if (root) {
    walk(root.sireBand, ["父"], 1);
    walk(root.damBand, ["母"], 1);
  }
  return result;
}

/** 配对校验：亲本健康异常或三代内近亲时拒绝，并给出原因 */
export function checkPairing(
  pigeons: Pigeon[],
  sireBand: string,
  damBand: string
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const sire = pigeons.find((p) => p.band === sireBand);
  const dam = pigeons.find((p) => p.band === damBand);
  if (!sire || !dam) return { ok: false, reasons: ["请选择有效的雄鸽与雌鸽"] };
  if (sireBand === damBand) reasons.push(`足环号 ${sireBand} 不能与自身配对`);
  if (sire.sex !== "雄") reasons.push(`${sireBand} 不是雄鸽，不能作为父本`);
  if (dam.sex !== "雌") reasons.push(`${damBand} 不是雌鸽，不能作为母本`);
  if (sire.health === "异常")
    reasons.push(`亲本健康异常：雄鸽 ${sireBand} 当前健康状态为「异常」，禁止配对`);
  if (dam.health === "异常")
    reasons.push(`亲本健康异常：雌鸽 ${damBand} 当前健康状态为「异常」，禁止配对`);

  const sireAnc = ancestorMap(pigeons, sireBand, 3);
  const damAnc = ancestorMap(pigeons, damBand, 3);
  const sirePaths = damAnc.get(sireBand);
  if (sirePaths)
    reasons.push(`三代内近亲：雄鸽 ${sireBand} 是雌鸽的${sirePaths.join("、")}（直系血亲），禁止配对`);
  const damPaths = sireAnc.get(damBand);
  if (damPaths)
    reasons.push(`三代内近亲：雌鸽 ${damBand} 是雄鸽的${damPaths.join("、")}（直系血亲），禁止配对`);
  for (const [anc, sPaths] of sireAnc) {
    const dPaths = damAnc.get(anc);
    if (dPaths) {
      reasons.push(
        `三代内近亲：共同祖先 ${anc}（雄鸽之${sPaths.join("、")}；雌鸽之${dPaths.join("、")}），禁止配对`
      );
    }
  }
  return { ok: reasons.length === 0, reasons };
}

export function seedState(): LoftState {
  const now = Date.now();
  const pigeons: Pigeon[] = [
    { band: "CHN-23-008771", bloodline: "詹森系", sex: "雄", birthYear: 2023, health: "健康", breeder: true },
    { band: "CHN-22-005533", bloodline: "詹森系", sex: "雌", birthYear: 2022, health: "健康", breeder: true },
    {
      band: "CHN-24-001839",
      bloodline: "詹森系",
      sex: "雄",
      birthYear: 2024,
      health: "健康",
      sireBand: "CHN-23-008771",
      damBand: "CHN-22-005533",
      breeder: false,
    },
    { band: "CHN-24-002114", bloodline: "凡龙系", sex: "雌", birthYear: 2024, health: "健康", breeder: false },
    { band: "CHN-23-006660", bloodline: "凡龙系", sex: "雄", birthYear: 2023, health: "亚健康", breeder: false },
    {
      band: "CHN-25-000301",
      bloodline: "詹森系",
      sex: "雌",
      birthYear: 2025,
      health: "异常",
      sireBand: "CHN-23-008771",
      damBand: "CHN-22-005533",
      breeder: false,
    },
    { band: "CHN-24-003210", bloodline: "慕利门系", sex: "雄", birthYear: 2024, health: "健康", breeder: false },
    {
      band: "CHN-25-000452",
      bloodline: "詹森系",
      sex: "雌",
      birthYear: 2025,
      health: "健康",
      sireBand: "CHN-23-008771",
      damBand: "CHN-22-005533",
      breeder: false,
    },
  ];

  const mk = (
    id: string,
    band: string,
    bloodline: string,
    date: string,
    location: string,
    distanceKm: number,
    weather: string,
    releaseTime: string,
    returnAt: string | null,
    health: Health,
    mateBand: string | null,
    status: "valid" | "superseded",
    createdAt: number,
    supersededBy?: string
  ) => {
    const releaseAt = `${date}T${releaseTime}`;
    return {
      id,
      band,
      bloodline,
      date,
      location,
      distanceKm,
      weather,
      releaseAt,
      returnAt,
      speed: returnAt ? computeSpeed(distanceKm, releaseAt, returnAt) : null,
      health,
      mateBand,
      status,
      supersededBy,
      createdAt,
    };
  };

  const records = [
    mk("r1", "CHN-24-001839", "詹森系", "2026-09-12", "石家庄站", 320, "晴", "06:30", "2026-09-12T11:12", "健康", "CHN-24-002114", "valid", now - 6 * 86400000),
    // 旧成绩：同鸽同日同地点，已被 r2 更正，历史保留可查
    mk("r5", "CHN-24-002114", "凡龙系", "2026-09-12", "石家庄站", 320, "晴", "06:30", "2026-09-12T13:40", "健康", "CHN-24-001839", "superseded", now - 6 * 86400000 + 1000, "r2"),
    mk("r2", "CHN-24-002114", "凡龙系", "2026-09-12", "石家庄站", 320, "晴", "06:30", "2026-09-12T12:05", "健康", "CHN-24-001839", "valid", now - 6 * 86400000 + 2000),
    mk("r4", "CHN-23-006660", "凡龙系", "2026-09-10", "保定站", 150, "阴", "07:00", "2026-09-10T09:23", "亚健康", null, "valid", now - 8 * 86400000),
    // 未归巢：进入未归巢提醒，不参与速度排行
    mk("r3", "CHN-24-001839", "詹森系", "2026-09-15", "郑州站", 500, "侧风", "06:00", null, "健康", "CHN-24-002114", "valid", now - 3 * 86400000),
  ];

  const pairings = [
    { id: "p1", sireBand: "CHN-23-008771", damBand: "CHN-22-005533", date: "2024-02-10", note: "基础种鸽对", createdAt: now - 200 * 86400000 },
    { id: "p2", sireBand: "CHN-24-001839", damBand: "CHN-24-002114", date: "2025-03-01", note: "赛绩配对", createdAt: now - 150 * 86400000 },
  ];

  return { pigeons, records, pairings };
}

export function loadState(): LoftState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LoftState;
      if (parsed && Array.isArray(parsed.pigeons) && Array.isArray(parsed.records) && Array.isArray(parsed.pairings)) {
        return parsed;
      }
    }
  } catch {
    // 数据损坏时回退到示例数据
  }
  const seeded = seedState();
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(seeded));
  } catch {
    // 存储不可用时仅内存运行
  }
  return seeded;
}

export function saveState(s: LoftState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(s));
  } catch {
    // 忽略存储失败
  }
}

export const defaultUi: UiPrefs = {
  tab: "overview",
  bloodlineFilter: "全部",
  distanceFilter: "全部",
  showHistory: false,
};

export function loadUi(): UiPrefs {
  try {
    const raw = localStorage.getItem(UI_KEY);
    if (raw) return { ...defaultUi, ...(JSON.parse(raw) as Partial<UiPrefs>) };
  } catch {
    // 忽略
  }
  return defaultUi;
}

export function saveUi(u: UiPrefs): void {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(u));
  } catch {
    // 忽略
  }
}
