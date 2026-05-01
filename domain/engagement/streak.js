// GradeBlaze — daily streak with freezes.
//
// Streak rules:
//   - Hit the daily 30 XP goal → today counts toward the streak
//   - Continuous day after day → streak grows
//   - Miss exactly one day → a freeze covers the gap (start with 2,
//     earn one back every 5-day streak, max 2)
//   - Miss two or more days → streak resets to 1 on next session
//
// The streak is bumped only on the FIRST session that crosses the
// daily goal — subsequent same-day sessions are no-ops here. The
// orchestrator (results.js noteSessionResult) decides when to call
// bumpStreakIfFirstHitToday based on whether this session's XP
// pushed past the goal.

import {
  readJson as storageReadJson,
  writeJson as storageWriteJson
} from "../../platform/storage.js?v=20260528";

import { todayIso, isoOffset, daysBetween } from "../../shared/dates.js?v=20260528";
import { shouldSkipWrites } from "./policy.js?v=20260528";

const KEY = "aimhigh-mock-streak";
const DEFAULT = { current: 0, longest: 0, lastDateIso: null, freezes: 2 };

export function readStreak() {
  return storageReadJson(KEY, DEFAULT);
}

function writeStreak(s) { storageWriteJson(KEY, s); }

// Called when the daily goal is hit. Updates streak with grace-day logic.
// Returns the post-bump streak object (may be unchanged if already counted
// today or if shouldSkipWrites is true).
export function bumpStreakIfFirstHitToday() {
  const today = todayIso();
  const s = readStreak();
  if (shouldSkipWrites()) return s; // synthetic — don't bump

  if (s.lastDateIso === today) return s; // already counted today

  const yest = isoOffset(today, -1);

  if (s.lastDateIso === yest) {
    // Continuous day-after-day
    s.current = (s.current || 0) + 1;
  } else if (s.lastDateIso == null) {
    // First ever day
    s.current = 1;
  } else {
    // Gap — try a freeze
    const gap = daysBetween(s.lastDateIso, today);
    if (gap === 2 && (s.freezes || 0) > 0) {
      s.freezes -= 1;
      s.current = (s.current || 0) + 1;
    } else {
      s.current = 1;
    }
  }
  if (s.current > (s.longest || 0)) s.longest = s.current;
  s.lastDateIso = today;
  // Slowly accrue freezes — one fresh freeze every 5-day streak, capped at 2
  if (s.current > 0 && s.current % 5 === 0 && (s.freezes || 0) < 2) {
    s.freezes = Math.min(2, (s.freezes || 0) + 1);
  }
  writeStreak(s);
  return s;
}
