import type { LoftState } from "../types";
import { normalizeFlights } from "./loft";

/**
 * 内置演示数据（首次打开时写入 localStorage）。
 * 刻意覆盖：有效成绩、未归巢、更正失效、健康异常、近亲/健康拒配等场景。
 */
export function seedState(): LoftState {
  const now = Date.now();
  const p2 = (n: number) => String(n).padStart(2, "0");
  /** 相对当前时刻若干小时前的本地时间（YYYY-MM-DDTHH:mm），保证“未归巢”提醒在演示当天可见 */
  const hoursAgo = (h: number) => {
    const d = new Date(now - h * 3600000);
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(
      d.getHours()
    )}:${p2(d.getMinutes())}`;
  };

  const pigeons = [
    // 詹森系家族（用于三代近亲演示）
    {
      id: "p_g1_sire",
      ring: "CHN-18-000001",
      name: "老詹森",
      lineage: "詹森系",
      sex: "雄" as const,
      birthYear: 2018,
      health: "健康" as const,
      sireId: null,
      damId: null,
      note: "基础种公",
    },
    {
      id: "p_g1_dam",
      ring: "CHN-18-000002",
      name: "詹森金母",
      lineage: "詹森系",
      sex: "雌" as const,
      birthYear: 2018,
      health: "健康" as const,
      sireId: null,
      damId: null,
    },
    {
      id: "p_sire_a",
      ring: "CHN-21-001001",
      name: "詹森公子",
      lineage: "詹森系",
      sex: "雄" as const,
      birthYear: 2021,
      health: "健康" as const,
      sireId: "p_g1_sire",
      damId: "p_g1_dam",
    },
    {
      id: "p_dam_b",
      ring: "CHN-21-001002",
      name: "詹森公主",
      lineage: "詹森系",
      sex: "雌" as const,
      birthYear: 2021,
      health: "观察" as const,
      sireId: "p_g1_sire",
      damId: "p_g1_dam",
      note: "呼吸道观察中",
    },
    {
      id: "p_001839",
      ring: "CHN-24-001839",
      name: "闪电",
      lineage: "詹森系",
      sex: "雄" as const,
      birthYear: 2024,
      health: "健康" as const,
      sireId: "p_sire_a",
      damId: "p_dam_b",
    },
    {
      id: "p_002114",
      ring: "CHN-24-002114",
      name: "逆风",
      lineage: "凡龙系",
      sex: "雌" as const,
      birthYear: 2024,
      health: "异常" as const,
      sireId: null,
      damId: null,
      note: "归巢后右翼外伤，治疗中",
    },
    {
      id: "p_003320",
      ring: "CHN-24-003320",
      name: "小雨点",
      lineage: "凡龙系",
      sex: "雌" as const,
      birthYear: 2024,
      health: "健康" as const,
    },
    {
      id: "p_004512",
      ring: "CHN-23-008771",
      name: "胡本金刚",
      lineage: "胡本系",
      sex: "雄" as const,
      birthYear: 2023,
      health: "健康" as const,
    },
    {
      id: "p_005618",
      ring: "CHN-23-009612",
      name: "盖比皇后",
      lineage: "盖比系",
      sex: "雌" as const,
      birthYear: 2023,
      health: "健康" as const,
    },
  ];

  const openRelease = hoursAgo(7);
  const openDate = openRelease.slice(0, 10);
  const flights = [
    {
      id: "f_old_1",
      pigeonId: "p_001839",
      date: "2026-09-06",
      location: "新乡放飞点",
      distance: 80,
      weather: "晴" as const,
      releaseTime: "2026-09-06T07:30",
      homeTime: "2026-09-06T08:42",
      speed: 1111, // 旧成绩：将被下方更正记录顶替
      health: "健康" as const,
      status: "失效" as const,
      supersededBy: "f_fix_1",
      note: "初次填报分速有误",
      createdAt: now - 10 * 86400000,
    },
    {
      id: "f_fix_1",
      pigeonId: "p_001839",
      date: "2026-09-06",
      location: "新乡放飞点",
      distance: 80,
      weather: "晴" as const,
      releaseTime: "2026-09-06T07:30",
      homeTime: "2026-09-06T08:38",
      speed: 1176, // 更正后有效成绩
      health: "健康" as const,
      status: "有效" as const,
      supersededBy: null,
      note: "核对 GPS 空距后更正",
      createdAt: now - 9 * 86400000,
    },
    {
      id: "f_2",
      pigeonId: "p_001839",
      date: "2026-09-13",
      location: "郑州放飞点",
      distance: 200,
      weather: "侧风" as const,
      releaseTime: "2026-09-13T07:00",
      homeTime: "2026-09-13T10:11",
      speed: 1047,
      health: "健康" as const,
      status: "有效" as const,
      supersededBy: null,
      createdAt: now - 5 * 86400000,
    },
    {
      id: "f_3",
      pigeonId: "p_004512",
      date: "2026-09-13",
      location: "郑州放飞点",
      distance: 200,
      weather: "侧风" as const,
      releaseTime: "2026-09-13T07:00",
      homeTime: "2026-09-13T09:52",
      speed: 1081,
      health: "健康" as const,
      status: "有效" as const,
      supersededBy: null,
      createdAt: now - 5 * 86400000 + 1000,
    },
    {
      id: "f_4",
      pigeonId: "p_005618",
      date: "2026-09-13",
      location: "郑州放飞点",
      distance: 200,
      weather: "侧风" as const,
      releaseTime: "2026-09-13T07:00",
      homeTime: "2026-09-13T10:40",
      speed: 1000,
      health: "观察" as const,
      status: "有效" as const,
      supersededBy: null,
      createdAt: now - 5 * 86400000 + 2000,
    },
    {
      id: "f_5",
      pigeonId: "p_003320",
      date: openDate,
      location: "邯郸放飞点",
      distance: 120,
      weather: "雾" as const,
      releaseTime: openRelease, // 今晨放飞，逾期未归巢
      homeTime: undefined,
      speed: undefined,
      health: "未知" as const,
      status: "未归巢" as const,
      supersededBy: null,
      createdAt: now - 7 * 3600000,
    },
    {
      id: "f_6",
      pigeonId: "p_002114",
      date: "2026-09-16",
      location: "邯郸放飞点",
      distance: 120,
      weather: "雾" as const,
      releaseTime: "2026-09-16T06:50",
      homeTime: "2026-09-16T12:40",
      speed: 305,
      health: "异常" as const,
      status: "有效" as const,
      supersededBy: null,
      note: "带伤归巢，速度垫底",
      createdAt: now - 20 * 3600000,
    },
  ];

  const pairs = [
    {
      id: "pair_1",
      cockId: "p_004512",
      henId: "p_005618",
      pairedAt: "2026-03-01",
      active: true,
      note: "胡本 × 盖比，主力杂交配对",
    },
  ];

  return normalizeFlights({
    pigeons,
    flights: flights as LoftState["flights"],
    pairs,
    attempts: [],
  });
}