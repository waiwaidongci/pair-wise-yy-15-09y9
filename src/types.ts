export type Health = "健康" | "亚健康" | "异常";
export type Sex = "雄" | "雌";
export type RecordStatus = "valid" | "superseded";

export interface Pigeon {
  band: string; // 足环号（唯一）
  bloodline: string; // 血统
  sex: Sex;
  birthYear: number;
  health: Health;
  sireBand?: string; // 父足环号
  damBand?: string; // 母足环号
  breeder: boolean; // 是否种鸽
}

export interface TrainingRecord {
  id: string;
  band: string; // 足环号
  bloodline: string; // 血统快照
  date: string; // 放飞日期 YYYY-MM-DD
  location: string; // 训放地点
  distanceKm: number; // 放飞距离
  weather: string; // 天气
  releaseAt: string; // 放飞时间 datetime-local
  returnAt: string | null; // 归巢时间，null = 未归巢
  speed: number | null; // 分速 m/min，未归巢为 null
  health: Health; // 记录时健康状态
  mateBand: string | null; // 配对对象足环号
  status: RecordStatus; // valid 有效 / superseded 已更正
  supersededBy?: string; // 被哪条记录更正
  createdAt: number;
  note?: string;
}

export interface Pairing {
  id: string;
  sireBand: string; // 雄鸽
  damBand: string; // 雌鸽
  date: string;
  note?: string;
  createdAt: number;
}

export interface LoftState {
  pigeons: Pigeon[];
  records: TrainingRecord[];
  pairings: Pairing[];
}

export interface UiPrefs {
  tab: string;
  bloodlineFilter: string; // 档案页血统筛选
  distanceFilter: string; // 排行页距离筛选
  showHistory: boolean; // 记录页是否显示已更正历史
}

export interface RecordFormInput {
  band: string;
  date: string;
  location: string;
  distanceKm: number;
  weather: string;
  releaseTime: string; // HH:MM
  returnAt: string; // datetime-local，空串 = 未归巢
  health: Health;
  mateBand: string; // 空串 = 无配对
  note: string;
}

export interface PigeonFormInput {
  band: string;
  bloodline: string;
  sex: Sex;
  birthYear: number;
  sireBand: string;
  damBand: string;
  health: Health;
  breeder: boolean;
}
