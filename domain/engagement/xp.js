// GradeBlaze — today's XP toward the daily goal.
//
// Each correct answer in a session is worth 10 XP. The daily goal is
// 30 XP — three correct answers crosses it. Crossing the goal on a
// given day triggers the streak/week bumps in the orchestrator.
//
// XP rolls over at midnight: if the stored dateIso doesn't match today,
// readXpToday returns a fresh zeroed object without persisting (the
// next addXpToday writes the new day).

import {
  readJson as storageReadJson,
  writeJson as storageWriteJson
} from "../../platform/storage.js?v=20260528";

import { todayIso } from "../../shared/dates.js?v=20260528";
import { shouldSkipWrites } from "./policy.js?v=20260528";

const KEY = "aimhigh-mock-xp-today";
const DEFAULT = { dateIso: null, earned: 0, goal: 30 };

export function readXpToday() {
  const x = storageReadJson(KEY, DEFAULT);
  if (x.dateIso !== todayIso()) {
    // New day — return a fresh shape but don't write yet.
    return Object.assign({}, DEFAULT, { dateIso: todayIso() });
  }
  return x;
}

// Adds delta to today's XP, persisting it (unless paused/demo). Returns
// { before, after, goal } so the orchestrator can detect goal-cross.
export function addXpToday(delta) {
  const today = todayIso();
  const cur = readXpToday();
  if (cur.dateIso !== today) {
    cur.dateIso = today;
    cur.earned = 0;
  }
  const before = cur.earned;
  if (shouldSkipWrites()) {
    // Synthetic after-state for the result screen; never persisted.
    return { before: before, after: before + delta, goal: cur.goal };
  }
  cur.earned = (cur.earned || 0) + delta;
  storageWriteJson(KEY, cur);
  return { before: before, after: cur.earned, goal: cur.goal };
}
