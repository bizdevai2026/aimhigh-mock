// GradeBlaze — engagement compatibility shim.
//
// The engagement state code that used to live here has been split into
// six single-responsibility modules under domain/engagement/:
//
//   policy.js     — pause / demo / shouldSkipWrites / exam date
//   streak.js     — daily streak with freezes
//   xp.js         — today's XP toward the daily goal
//   week.js       — weekly tier (Bronze..Diamond) + days hit
//   scheduler.js  — SM-2-lite spaced repetition (seen / markSeen / isDue)
//   results.js    — session log + misses + weakTopics + noteSessionResult
//   ladder.js     — per-topic / per-subject tier (Developing..Accomplished)
//
// Plus shared/dates.js for the pure date helpers (todayIso, isoOffset,
// isoWeekStart, daysBetween) that several of the above use.
//
// This file is a re-export shim so the existing consumers (mock.js,
// dashboard.js, sprint.js, warmup.js, paper.js, learn.js, questions.js)
// keep working without an import-path migration. Future PRs should
// migrate consumers to import directly from domain/engagement/<area>.js;
// once the last consumer moves over, this file can be deleted.

export { todayIso, isoOffset, isoWeekStart } from "./shared/dates.js?v=20260606";

export {
  isDemoMode,
  isPaused,
  setPaused,
  shouldSkipWrites,
  readExamDate,
  writeExamDate
} from "./domain/engagement/policy.js?v=20260606";

export { readStreak } from "./domain/engagement/streak.js?v=20260606";
export { readXpToday } from "./domain/engagement/xp.js?v=20260606";
export { readWeek } from "./domain/engagement/week.js?v=20260606";

export {
  readSeen,
  markSeen,
  isDue
} from "./domain/engagement/scheduler.js?v=20260606";

export {
  readResults,
  appendResult,
  readMisses,
  noteMiss,
  weakTopics,
  noteSessionResult
} from "./domain/engagement/results.js?v=20260606";

export {
  topicLadder,
  subjectLadder
} from "./domain/engagement/ladder.js?v=20260606";
