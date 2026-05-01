// GradeBlaze — weekly tier (Bronze / Silver / Gold / Diamond).
//
// Each ISO week (Mon-Sun) the kid accrues "days hit" — days where the
// daily goal was crossed. At the end of the week, the tier moves up
// or down based on consistency:
//   ≥ 5 days hit  → tier UP
//   ≤ 2 days hit  → tier DOWN
//   3–4 days hit  → tier holds
//
// Tier is reconciled lazily on the first read of the new week.
//
// Like streak, the week's daysHit is bumped only on the FIRST goal-cross
// of each calendar day (tracked via the "week-last-hit-day" key).

import {
  readJson as storageReadJson,
  writeJson as storageWriteJson,
  readString as storageReadString,
  writeString as storageWriteString
} from "../../platform/storage.js?v=20260604";

import { todayIso, isoWeekStart } from "../../shared/dates.js?v=20260604";
import { shouldSkipWrites } from "./policy.js?v=20260604";

const KEY = "aimhigh-mock-week";
const KEY_LAST_HIT = "aimhigh-mock-week-last-hit-day";
const DEFAULT = { weekStartIso: null, daysHit: 0, tier: "BRONZE" };

const TIER_ORDER = ["BRONZE", "SILVER", "GOLD", "DIAMOND"];

export function readWeek() {
  const w = storageReadJson(KEY, DEFAULT);
  const thisWeekStart = isoWeekStart(todayIso());
  if (w.weekStartIso !== thisWeekStart) {
    // Reconcile last week if any
    if (w.weekStartIso != null) {
      const idx = TIER_ORDER.indexOf(w.tier);
      if (w.daysHit >= 5 && idx < TIER_ORDER.length - 1) {
        w.tier = TIER_ORDER[idx + 1];
      } else if (w.daysHit <= 2 && idx > 0) {
        w.tier = TIER_ORDER[idx - 1];
      }
    }
    w.weekStartIso = thisWeekStart;
    w.daysHit = 0;
    storageWriteJson(KEY, w);
  }
  return w;
}

export function bumpWeekIfFirstHitToday() {
  const w = readWeek();
  if (shouldSkipWrites()) return w;
  const today = todayIso();
  const lastHit = storageReadString(KEY_LAST_HIT);
  if (lastHit !== today) {
    w.daysHit = (w.daysHit || 0) + 1;
    storageWriteJson(KEY, w);
    storageWriteString(KEY_LAST_HIT, today);
  }
  return w;
}
