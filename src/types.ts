// 离线赛鸽训放台 · 数据模型

export type Sex = "雄" | "雌";

export type Health = "健康" | "观察" | "异常";

export type Weather =
  | "晴"
  | "多云"
  | "阴"
  | "小雨"
  | "雨"
  | "雾"
  | "顺风"
  | "逆风"
  | "侧风";

/** 训放记录状态：未放飞时只有「未归巢」；归巢后由系统判定「有效」或「失效」 */
export type FlightStatus = "未归巢" | "有效" | "失效";

export interface Pigeon {
  id: string;
  ring: string; // 足环号
  name: string; // 鸽舍名号（可选，展示用）
  lineage: string; // 血统
  sex: Sex;
  birthYear: number;
  health: Health; // 当前健康状态
  sireId?: string | null; // 父
  damId?: string | null; // 母
  note?: string;
}

export interface Flight {
  id: string;
  pigeonId: string;
  date: string; // 训放日期 YYYY-MM-DD
  location: string; // 训放地点
  distance: number; // 空距 km
  weather: Weather;
  releaseTime?: string; // 司放时间
  homeTime?: string; // 归巢时间（完整时间）
  speed?: number; // 分速 米/分，未归巢为空
  health: Health | "未知"; // 归巢时健康
  note?: string;
  status: FlightStatus;
  supersededBy?: string | null; // 被哪条更正记录顶替
  createdAt: number;
}

export interface Pair {
  id: string;
  cockId: string; // 雄
  henId: string; // 雌
  pairedAt: string; // 配对日期
  active: boolean;
  note?: string;
}

export interface PairAttempt {
  id: string;
  cockId: string;
  henId: string;
  at: number;
  ok: boolean;
  reasons: string[]; // 被拒绝时的逐条原因
  pairId?: string; // 成功后对应的配对 id
}

export interface LoftState {
  pigeons: Pigeon[];
  flights: Flight[];
  pairs: Pair[];
  attempts: PairAttempt[];
}

export interface Preferences {
  tab: string;
  lineage: string; // 全局血统筛选，"all" 表示全部
  recordStatus: string;
  rankLocation: string;
  rankBand: string;
}
