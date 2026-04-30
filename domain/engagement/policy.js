// GradeBlaze — engagement policy.
//
// "Should we be writing engagement state at all right now?"
//
// Two reasons to skip writes:
//   1. DEMO mode — a parent is showing the app to someone without
//      polluting the kid's saved progress.
//   2. PAUSED — parent put the app on holiday hold; the streak is
//      preserved while the kid is away.
//
// Plus: exam date — the parent-set countdown that everything else
// reads as a piece of context.
//
// Storage key prefix kept as "aimhigh-mock-" deliberately (renaming
// would silently lose every existing user's progress).
//
// isDemoMode reads the session key directly via storage rather than
// importing from auth/profile — that way this module has zero
// engagement→auth coupling and the gate is robust to future refactors.
//
// setPaused mutates the streak's lastDateIso on resume so the next
// post-pause session continues the streak naturally. To avoid a
// circular import (streak depends on policy.shouldSkipWrites), we
// reach into the streak's storage key directly here.

import {
  readJson as storageReadJson,
  writeJson as storageWriteJson,
  readString as storageReadString,
  writeString as storageWriteString,
  remove as storageRemove
} from "../../platform/storage.js?v=20260527";

import { todayIso, isoOffset } from "../../shared/dates.js?v=20260527";

const PREFIX = "aimhigh-mock-";
const KEY_PAUSE  = PREFIX + "pause";
const KEY_EXAM   = PREFIX + "exam-date";
const KEY_STREAK = PREFIX + "streak";       // for resume nudge
const KEY_SESSION = PREFIX + "session";

export function isDemoMode() {
  const s = storageReadJson(KEY_SESSION, null);
  return !!(s && s.role === "demo");
}

export function isPaused() {
  return storageReadString(KEY_PAUSE) === "true";
}

export function setPaused(yes) {
  if (yes) {
    storageWriteString(KEY_PAUSE, "true");
    return;
  }
  // Resuming: nudge lastDateIso so the next-day-after-pause counts as
  // continuous. Reach into the streak key directly to avoid importing
  // from streak.js (which imports shouldSkipWrites from here).
  const s = storageReadJson(KEY_STREAK, null);
  if (s && s.lastDateIso) {
    s.lastDateIso = isoOffset(todayIso(), -1); // yesterday
    storageWriteJson(KEY_STREAK, s);
  }
  storageRemove(KEY_PAUSE);
}

// Single guard used by every engagement writer.
export function shouldSkipWrites() {
  return isDemoMode() || isPaused();
}

// --- Exam date -------------------------------------------------------------

export function readExamDate() {
  return storageReadString(KEY_EXAM);
}

export function writeExamDate(iso) {
  if (shouldSkipWrites()) return;
  storageWriteString(KEY_EXAM, iso);
}
