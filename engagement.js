// AimHigh Mock Prep — engagement state.
//
// Readers and writers for the localStorage-backed engagement loop:
// streak (with freezes), today's XP toward the daily goal, weekly
// tier (BRONZE → SILVER → GOLD → DIAMOND), exam date, and the
// per-session results log used by the Coach dashboard and the
// weakness tracker.
//
// All keys live under the "aimhigh-mock-" namespace so they never
// collide with the AimHigh app on the same origin.

const PREFIX = "aimhigh-mock-";

const KEYS = {
  streak:    PREFIX + "streak",
  xpToday:   PREFIX + "xp-today",
  week:      PREFIX + "week",
  examDate:  PREFIX + "exam-date",
  results:   PREFIX + "results",
  seen:      PREFIX + "seen",
  misses:    PREFIX + "misses"
};

const DEFAULTS = {
  streak: { current: 0, longest: 0, lastDateIso: null, freezes: 2 },
  xpToday: { dateIso: null, earned: 0, goal: 30 },
  week: { weekStartIso: null, daysHit: 0, tier: "BRONZE" }
};

const TIER_ORDER = ["BRONZE", "SILVER", "GOLD", "DIAMOND"];

// --- Storage primitives -----------------------------------------------------

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return cloneDefault(fallback);
    const parsed = JSON.parse(raw);
    if (fallback && typeof fallback === "object" && !Array.isArray(fallback)) {
      return Object.assign({}, fallback, parsed);
    }
    return parsed;
  } catch (e) {
    return cloneDefault(fallback);
  }
}

function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* quota */ }
}

function readString(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

function writeString(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* quota */ }
}

function cloneDefault(v) {
  if (v == null) return v;
  return JSON.parse(JSON.stringify(v));
}

// --- Date helpers -----------------------------------------------------------

export function todayIso() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}

export function isoOffset(iso, days) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}

// ISO week start = Monday. Returns the Monday of the week containing `iso`.
export function isoWeekStart(iso) {
  const d = new Date(iso + "T00:00:00");
  const dow = d.getDay(); // 0 Sun .. 6 Sat
  const diffToMonday = (dow === 0 ? -6 : 1 - dow);
  d.setDate(d.getDate() + diffToMonday);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}

// --- Streak -----------------------------------------------------------------

export function readStreak() {
  return readJson(KEYS.streak, DEFAULTS.streak);
}

function writeStreak(s) { writeJson(KEYS.streak, s); }

// Called when the daily goal is hit. Updates streak with grace-day logic.
function bumpStreakIfFirstHitToday() {
  const today = todayIso();
  const s = readStreak();

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

function daysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return null;
  const from = new Date(fromIso + "T00:00:00");
  const to = new Date(toIso + "T00:00:00");
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

// --- XP today ---------------------------------------------------------------

export function readXpToday() {
  const x = readJson(KEYS.xpToday, DEFAULTS.xpToday);
  if (x.dateIso !== todayIso()) {
    return Object.assign({}, DEFAULTS.xpToday, { dateIso: todayIso() });
  }
  return x;
}

function addXpToday(delta) {
  const today = todayIso();
  const cur = readXpToday();
  if (cur.dateIso !== today) {
    cur.dateIso = today;
    cur.earned = 0;
  }
  const before = cur.earned;
  cur.earned = (cur.earned || 0) + delta;
  writeJson(KEYS.xpToday, cur);
  return { before: before, after: cur.earned, goal: cur.goal };
}

// --- Weekly tier ------------------------------------------------------------

export function readWeek() {
  const w = readJson(KEYS.week, DEFAULTS.week);
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
    writeJson(KEYS.week, w);
  }
  return w;
}

function bumpWeekIfFirstHitToday() {
  const w = readWeek();
  const today = todayIso();
  const lastHit = readString(PREFIX + "week-last-hit-day");
  if (lastHit !== today) {
    w.daysHit = (w.daysHit || 0) + 1;
    writeJson(KEYS.week, w);
    writeString(PREFIX + "week-last-hit-day", today);
  }
  return w;
}

// --- Exam date --------------------------------------------------------------

export function readExamDate() { return readString(KEYS.examDate); }
export function writeExamDate(iso) { writeString(KEYS.examDate, iso); }

// --- Session results log ----------------------------------------------------
// Each result: { ts, dateIso, mode, subject, items: [{ id, subject, topic, correct }], score, total, durationSec }

export function readResults() {
  return readJson(KEYS.results, []) || [];
}

export function appendResult(result) {
  const all = readResults();
  all.push(result);
  // Prune to last 60 sessions to keep storage bounded
  while (all.length > 60) all.shift();
  writeJson(KEYS.results, all);
}

// --- Seen / cooldown --------------------------------------------------------

export function readSeen() {
  return readJson(KEYS.seen, {}) || {};
}

export function markSeen(questionId, correct) {
  const s = readSeen();
  s[questionId] = { lastSeenAt: Date.now(), lastResult: correct ? "correct" : "wrong" };
  writeJson(KEYS.seen, s);
}

// --- Misses (weakness) ------------------------------------------------------

export function readMisses() {
  return readJson(KEYS.misses, []) || [];
}

export function noteMiss(subject, topic, questionId) {
  const all = readMisses();
  all.push({ subject: subject, topic: topic, questionId: questionId, ts: Date.now() });
  // Prune to last 200
  while (all.length > 200) all.shift();
  writeJson(KEYS.misses, all);
}

// --- Session finalisation ---------------------------------------------------
// Called by warmup.js / sprint.js when a session completes. Updates XP,
// streak (if goal hit), weekly tier, and appends a result row.

export function noteSessionResult(opts) {
  // opts: { mode, subject, items: [...], score, total, durationSec }
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

// --- Convenience: weak topics -----------------------------------------------
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

// --- Ladder achievement -----------------------------------------------------
// Mirrors the school's tier language (Secure / Extending / Accomplished),
// derived from per-topic and per-subject accuracy in the results log.
// Adds a "Developing" tier below Secure for low-attempt or low-accuracy
// topics so beginners aren't immediately labelled "Secure" on day one.
//
// Thresholds:
//   < 3 attempts                                       -> Developing
//   accuracy < 50%                                     -> Developing
//   accuracy 50–69%                                    -> Secure
//   accuracy 70–84%                                    -> Extending
//   accuracy >= 85% AND attempts >= 5                  -> Accomplished

const TIER_DEFAULT = { tier: "Developing", colour: "developing", attempts: 0, correct: 0, accuracy: 0 };

function aggregate(predicate) {
  let total = 0;
  let correct = 0;
  readResults().forEach(function (r) {
    (r.items || []).forEach(function (it) {
      if (!predicate(it)) return;
      total += 1;
      if (it.correct) correct += 1;
    });
  });
  return { attempts: total, correct: correct, accuracy: total ? correct / total : 0 };
}

function ladderFromStats(stats) {
  if (!stats || stats.attempts < 3 || stats.accuracy < 0.50) {
    return { tier: "Developing", colour: "developing", attempts: stats ? stats.attempts : 0, correct: stats ? stats.correct : 0, accuracy: stats ? stats.accuracy : 0 };
  }
  if (stats.accuracy >= 0.85 && stats.attempts >= 5) {
    return { tier: "Accomplished", colour: "accomplished", attempts: stats.attempts, correct: stats.correct, accuracy: stats.accuracy };
  }
  if (stats.accuracy >= 0.70) {
    return { tier: "Extending", colour: "extending", attempts: stats.attempts, correct: stats.correct, accuracy: stats.accuracy };
  }
  return { tier: "Secure", colour: "secure", attempts: stats.attempts, correct: stats.correct, accuracy: stats.accuracy };
}

export function topicLadder(subject, topic) {
  if (!subject || !topic) return TIER_DEFAULT;
  return ladderFromStats(aggregate(function (it) { return it.subject === subject && it.topic === topic; }));
}

export function subjectLadder(subject) {
  if (!subject) return TIER_DEFAULT;
  return ladderFromStats(aggregate(function (it) { return it.subject === subject; }));
}
