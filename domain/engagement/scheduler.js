// GradeBlaze — spaced repetition scheduler (SM-2-lite).
//
// Each question gets an entry: { lastSeenAt, lastResult, stage, dueAt, streak }
//
// Each correct answer advances the question's stage and pushes the next
// "due" date further out. A wrong answer resets the stage to 0 so the
// question resurfaces tomorrow.
//
// Backward compatibility: pre-SR entries don't have stage or dueAt.
// isDue falls back to the old 7-day cooldown when those are missing,
// so reverting this commit is harmless — the existing data still works.
//
// Intervals tuned to a six-week revision window:
//   stage 0 →  1 day   (just learned, see again tomorrow)
//   stage 1 →  2 days
//   stage 2 →  4 days
//   stage 3 →  8 days
//   stage 4+ → 14 days  (mastered — surface only occasionally)

import {
  readJson as storageReadJson,
  writeJson as storageWriteJson
} from "../../platform/storage.js?v=20260530";

import { shouldSkipWrites } from "./policy.js?v=20260530";

const KEY = "aimhigh-mock-seen";
const DAY_MS = 24 * 60 * 60 * 1000;
const SR_INTERVALS_DAYS = [1, 2, 4, 8, 14];
const LEGACY_COOLDOWN_DAYS = 7;

function intervalForStage(stage) {
  if (stage == null || stage < 0) stage = 0;
  if (stage >= SR_INTERVALS_DAYS.length) stage = SR_INTERVALS_DAYS.length - 1;
  return SR_INTERVALS_DAYS[stage];
}

export function readSeen() {
  return storageReadJson(KEY, {}) || {};
}

export function markSeen(questionId, correct) {
  if (shouldSkipWrites()) return;
  const s = readSeen();
  const prev = s[questionId] || {};
  let nextStage;
  let nextStreak;
  if (correct) {
    nextStage = Math.min((prev.stage || 0) + 1, SR_INTERVALS_DAYS.length - 1);
    nextStreak = (prev.streak || 0) + 1;
  } else {
    nextStage = 0;
    nextStreak = 0;
  }
  const now = Date.now();
  s[questionId] = {
    lastSeenAt: now,
    lastResult: correct ? "correct" : "wrong",
    stage: nextStage,
    streak: nextStreak,
    dueAt: now + intervalForStage(nextStage) * DAY_MS
  };
  storageWriteJson(KEY, s);
}

// True when a question is eligible to surface in a session pick. New
// questions (no entry) are always due. Pre-SR entries fall back to the
// legacy 7-day cooldown so this remains safe across a revert.
export function isDue(questionId, now) {
  const s = readSeen();
  const e = s[questionId];
  if (!e) return true;
  if (typeof e.dueAt === "number") return now >= e.dueAt;
  if (typeof e.lastSeenAt === "number") {
    return (now - e.lastSeenAt) >= LEGACY_COOLDOWN_DAYS * DAY_MS;
  }
  return true;
}
