import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Flight, LoftState, Pair, Pigeon, Preferences } from "../types";
import {
  checkPair,
  findSupersedeTarget,
  normalizeFlights,
  uid,
} from "./loft";
import { seedState } from "./seed";

const STATE_KEY = "loft.state.v1";
const PREFS_KEY = "loft.prefs.v1";

function loadState(): LoftState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LoftState;
      if (parsed && Array.isArray(parsed.pigeons) && Array.isArray(parsed.flights))
        return normalizeFlights(parsed);    }
  } catch {
    /* 损坏数据则回落到演示数据 */
  }
  return seedState();
}

const DEFAULT_PREFS: Preferences = {
  tab: "overview",
  lineage: "all",
  recordStatus: "all",
  rankLocation: "all",
  rankBand: "all",
};

function loadPrefs(): Preferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Preferences) };
  } catch {
    /* ignore */
  }
  return DEFAULT_PREFS;
}

export interface FlightDraft {
  id?: string; // 更正已有记录时传入
  pigeonId: string;
  date: string;
  location: string;
  distance: number;
  weather: Flight["weather"];
  releaseTime: string;
  homeTime?: string;
  speed?: number;
  health: Flight["health"];
  note?: string;
  missing?: boolean; // true = 登记未归巢
}

export interface FlightSubmitResult {
  ok: boolean;
  message: string;
  superseded?: Flight;
}

export interface PairSubmitResult {
  ok: boolean;
  reasons: string[];
}

export function useLoftStore() {
  const [state, setState] = useState<LoftState>(loadState);
  const [prefs, setPrefs] = useState<Preferences>(loadPrefs);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const patchPrefs = useCallback((patch: Partial<Preferences>) => {
    setPrefs((p) => ({ ...p, ...patch }));
  }, []);

  const resetDemo = useCallback(() => {
    const fresh = seedState();
    setState(fresh);
  }, []);

  const clearAll = useCallback(() => {
    setState({ pigeons: [], flights: [], pairs: [], attempts: [] });
  }, []);

  // ---------- 赛鸽档案 ----------

  const addPigeon = useCallback((data: Omit<Pigeon, "id">) => {
    if (stateRef.current.pigeons.some((p) => p.ring.trim() === data.ring.trim()))
      throw new Error(`足环号 ${data.ring.trim()} 已存在，足环号必须唯一。`);
    const pigeon: Pigeon = { ...data, id: uid("p") };
    setState((s) => ({ ...s, pigeons: [...s.pigeons, pigeon] }));
    return pigeon;
  }, []);

  const updatePigeon = useCallback((id: string, patch: Partial<Pigeon>) => {
    setState((s) => ({
      ...s,
      pigeons: s.pigeons.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }, []);

  // ---------- 训放记录 ----------

  const submitFlight = useCallback((draft: FlightDraft): FlightSubmitResult => {
    const s = stateRef.current;
    const pigeon = s.pigeons.find((p) => p.id === draft.pigeonId);
    if (!pigeon) return { ok: false, message: "请选择赛鸽。" };
    if (!draft.date) return { ok: false, message: "请选择训放日期。" };
    if (!draft.location.trim()) return { ok: false, message: "请填写训放地点。" };
    if (!(draft.distance > 0)) return { ok: false, message: "放飞距离需大于 0。" };
    if (!draft.releaseTime) return { ok: false, message: "请填写司放时间。" };

    const keyBase = {
      pigeonId: draft.pigeonId,
      date: draft.date,
      location: draft.location.trim(),
    };

    if (draft.missing) {
      const existingValid = s.flights.find(
        (f) =>
          `${f.pigeonId}|${f.date}|${f.location}` ===
            `${keyBase.pigeonId}|${keyBase.date}|${keyBase.location}` &&
          f.status === "有效"
      );
      if (existingValid)
        return {
          ok: false,
          message: "该赛鸽当日同地点已有有效归巢成绩，不能重复登记未归巢。",
        };
      const open = s.flights.find(
        (f) =>
          `${f.pigeonId}|${f.date}|${f.location}` ===
            `${keyBase.pigeonId}|${keyBase.date}|${keyBase.location}` &&
          f.status === "未归巢"
      );
      if (open) return { ok: false, message: "该场已存在未归巢记录，可在提醒中补报归巢。" };
    } else {
      if (!draft.homeTime) return { ok: false, message: "请填写归巢时间，或勾选「尚未归巢」。" };
      if (new Date(draft.homeTime).getTime() <= new Date(draft.releaseTime).getTime())
        return { ok: false, message: "归巢时间必须晚于司放时间。" };
      if (typeof draft.speed !== "number" || draft.speed <= 0)
        return { ok: false, message: "分速无效，请检查司放/归巢时间或手填分速。" };
    }

    const target = draft.id
      ? s.flights.find((f) => f.id === draft.id)
      : findSupersedeTarget(s, keyBase);

    // 未归巢不能与“同场已有有效成绩”并存（更正场景除外）
    if (
      draft.missing &&
      target &&
      target.status === "有效" &&
      target.id !== draft.id
    )
      return { ok: false, message: "该场已有有效成绩，不能登记未归巢。" };

    const flight: Flight = {
      id: draft.id ?? uid("f"),
      pigeonId: draft.pigeonId,
      date: draft.date,
      location: draft.location.trim(),
      distance: draft.distance,
      weather: draft.weather,
      releaseTime: draft.releaseTime,
      homeTime: draft.missing ? undefined : draft.homeTime,
      speed: draft.missing ? undefined : draft.speed,
      health: draft.missing ? "未知" : draft.health,
      note: draft.note?.trim() || undefined,
      status: draft.missing ? "未归巢" : "有效",
      supersededBy: null,
      createdAt: draft.id
        ? target?.createdAt ?? Date.now()
        : Date.now(),
    };

    let superseded: Flight | undefined;
    setState((cur) => {
      // 重新在最新状态上定位顶替目标，避免并发覆盖
      const latestTarget = draft.id
        ? cur.flights.find((f) => f.id === draft.id)
        : findSupersedeTarget(cur, keyBase);
      superseded =
        latestTarget && latestTarget.id !== flight.id ? latestTarget : undefined;

      const kept = cur.flights.filter(
        (f) => f.id !== flight.id && (!superseded || f.id !== superseded!.id)
      );
      return normalizeFlights({ ...cur, flights: [...kept, flight] });
    });

    if (draft.missing)
      return { ok: true, message: "已登记未归巢，将出现在未归巢提醒中。" };
    if (superseded)
      return {
        ok: true,
        message: `成绩已保存。同场旧记录（${
          superseded.status === "未归巢" ? "未归巢登记" : `分速 ${superseded.speed ?? "—"} 米/分`
        }）已转为失效，历史仍可在记录中查看。`,
        superseded,
      };
    return { ok: true, message: "训放成绩已保存。" };
  }, []);

  /** 未归巢提醒中补报归巢：占位记录转为正式成绩 */
  const reportHome = useCallback(
    (flightId: string, data: { homeTime: string; speed: number; health: Flight["health"]; weather?: Flight["weather"]; note?: string }): FlightSubmitResult => {
      const s = stateRef.current;
      const f = s.flights.find((x) => x.id === flightId);
      if (!f) return { ok: false, message: "记录不存在。" };
      if (f.status !== "未归巢") return { ok: false, message: "该记录已不在未归巢状态。" };
      return submitFlight({
        id: flightId,
        pigeonId: f.pigeonId,
        date: f.date,
        location: f.location,
        distance: f.distance,
        weather: data.weather ?? f.weather,
        releaseTime: f.releaseTime ?? `${f.date}T08:00`,
        homeTime: data.homeTime,
        speed: data.speed,
        health: data.health,
        note: data.note ?? f.note,
      });
    },
    [submitFlight]
  );

  const deleteFlight = useCallback((id: string) => {
    setState((s) => ({ ...s, flights: s.flights.filter((f) => f.id !== id) }));
  }, []);

  // ---------- 配对 ----------

  const submitPair = useCallback(
    (cockId: string, henId: string, pairedAt: string, note?: string): PairSubmitResult => {
      const s = stateRef.current;
      const check = checkPair(s, cockId, henId);
      if (!check.ok) {
        setState((cur) => ({
          ...cur,
          attempts: [
            { id: uid("a"), cockId, henId, at: Date.now(), ok: false, reasons: check.reasons },
            ...cur.attempts,
          ].slice(0, 50),
        }));
        return { ok: false, reasons: check.reasons };
      }
      const pair: Pair = {
        id: uid("pair"),
        cockId,
        henId,
        pairedAt,
        active: true,
        note: note?.trim() || undefined,
      };
      setState((cur) => ({
        ...cur,
        pairs: [...cur.pairs, pair],
        attempts: [
          { id: uid("a"), cockId, henId, at: Date.now(), ok: true, reasons: [], pairId: pair.id },
          ...cur.attempts,
        ].slice(0, 50),
      }));
      return { ok: true, reasons: [] };
    },
    []
  );

  const unPair = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      pairs: s.pairs.map((p) => (p.id === id ? { ...p, active: false } : p)),
    }));
  }, []);

  const store = useMemo(
    () => ({
      state,
      prefs,
      patchPrefs,
      resetDemo,
      clearAll,
      addPigeon,
      updatePigeon,
      submitFlight,
      reportHome,
      deleteFlight,
      submitPair,
      unPair,
    }),
    [
      state,
      prefs,
      patchPrefs,
      resetDemo,
      clearAll,
      addPigeon,
      updatePigeon,
      submitFlight,
      reportHome,
      deleteFlight,
      submitPair,
      unPair,
    ]
  );

  return store;
}

export type LoftStore = ReturnType<typeof useLoftStore>;
