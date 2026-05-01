// GradeBlaze — session results log + miss tracking + session orchestrator.
//
// One row per completed session. Used by:
//   - the Coach dashboard (today's session, last 7 days, calendar)
//   - the ladder calculator (topic + subject accuracy)
//   - the weakness ranker (most-missed topics)
//
// noteSessionResult is the single entry point that runners (warmup,
// sprint, paper) call when a session completes. It orchestrates:
//   - addXpToday (mark how much XP this session earned)
//   - markSeen (advance the SR scheduler for each question)
//   - noteMiss (record wrong answers for the weakness tracker)
//   - bumpStreakIfFirstHitToday + bumpWeekIfFirstHitToday (only when
//     this session crossed the daily goal)
//   - appendResult (the durable session row)
//
// Pruning: results capped at last 60 sessions, misses at last 200.

import {
  readJson as storageReadJson,
  writeJson as storageWriteJson
} from "../../platform/storage.js?v=20260601";

import { todayIso } from "../../shared/dates.js?v=20260601";
import { shouldSkipWrites } from "./policy.js?v=20260601";
import { addXpToday } from "./xp.js?v=20260601";
import { bumpStreakIfFirstHitToday, readStreak } from "./streak.js?v=20260601";
import { bumpWeekIfFirstHitToday, readWeek } from "./week.js?v=20260601";
import { markSeen } from "./scheduler.js?v=20260601";

const KEY_RESULTS = "aimhigh-mock-results";
const KEY_MISSES  = "aimhigh-mock-misses";

export function readResults() {
  return storageReadJson(KEY_RESULTS, []) || [];
}

export function appendResult(result) {
  if (shouldSkipWrites()) return;
  const all = readResults();
  all.push(result);
  // Prune to last 60 sessions to keep storage bounded
  while (all.length > 60) all.shift();
  storageWriteJson(KEY_RESULTS, all);
}

export function readMisses() {
  return storageReadJson(KEY_MISSES, []) || [];
}

export function noteMiss(subject, topic, questionId) {
  if (shouldSkipWrites()) return;
  const all = readMisses();
  all.push({ subject: subject, topic: topic, questionId: questionId, ts: Date.now() });
  while (all.length > 200) all.shift();
  storageWriteJson(KEY_MISSES, all);
}

// Returns ranked list of { subject, topic, missCount } over the last `days`.
export function weakTopics(days) {
  const cutoff = Date.now() - (days || 7) * 24 * 60 * 60 * 1000;
  const tally = {};
  readMisses().forEach(function (m) {
    if (m.ts < cutoff) return;
    const key = m.subject + "::" + m.topic;
    if (!tally[key]) tally[key] = { subject: m.subject, topic: m.topic, missCount: 0 };
    tally[key].missCount += 1;
  });
  return Object.values(tally).sort(function (a, b) { return b.missCount - a.missCount; });
}

// Single entry point called by every practice runner at session end.
//
// opts: { mode, subject, items: [{ id, subject, topic, correct }],
//         score?, total?, durationSec? }
//
// Returns: { xp, streak, week, xpGained } — the engagement diff the
// runner displays on its result card.
export function noteSessionResult(opts) {
  const correctCount = (opts.items || []).filter(function (it) { return it.correct; }).length;
  const xpGained = correctCount * 10;
  const xpAfter = addXpToday(xpGained);

  // Each correct counts as "seen correct"; each wrong is a miss + seen wrong
  (opts.items || []).forEach(function (it) {
    markSeen(it.id, !!it.correct);
    if (!it.correct) noteMiss(it.subject, it.topic, it.id);
  });

  // If we crossed the daily goal in this session, bump streak + tier
  let streakAfter = readStreak();
  let weekAfter = readWeek();
  if (xpAfter.before < xpAfter.goal && xpAfter.after >= xpAfter.goal) {
    streakAfter = bumpStreakIfFirstHitToday();
    weekAfter = bumpWeekIfFirstHitToday();
  }

  appendResult({
    ts: Date.now(),
    dateIso: todayIso(),
    mode: opts.mode || "warmup",
    subject: opts.subject || null,
    items: (opts.items || []).map(function (it) {
      return { id: it.id, subject: it.subject, topic: it.topic, correct: !!it.correct };
    }),
    score: opts.score != null ? opts.score : correctCount,
    total: opts.total != null ? opts.total : (opts.items || []).length,
    durationSec: opts.durationSec || null
  });

  return { xp: xpAfter, streak: streakAfter, week: weekAfter, xpGained: xpGained };
}
