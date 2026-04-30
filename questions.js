// AimHigh Mock Prep — question pool loader and warm-up picker.
//
// Questions live in data/<subject>.json files. Each subject's file is
// a JSON array of MCQ / spell / speak objects:
//   { id, subject, topic, prompt, options[4], answer, explainer?,
//     audio?, type? ("mcq"|"spell"|"speak"), alternates? }
//
// loadAllQuestions() fetches every subject in parallel, stamps the
// subject id in case it's missing, and caches the merged pool.
//
// pickWarmupQuestions(pool, n) returns n questions ordered by
// spaced-repetition due-date (fresh → due → not-yet-due) with a
// 60% weak-topic bias and a per-subject cap so a warm-up isn't ten
// maths questions.

import { readSeen, weakTopics } from "./engagement.js?v=20260513";

const SUBJECTS = [
  { id: "science",   name: "Science"          },
  { id: "maths",     name: "Maths"            },
  { id: "english",   name: "English"          },
  { id: "french",    name: "French"           },
  { id: "history",   name: "History"          },
  { id: "geography", name: "Geography"        },
  { id: "computing", name: "Computer Science" }
];

const DAY_MS = 24 * 60 * 60 * 1000;
const LEGACY_COOLDOWN_MS = 7 * DAY_MS;
const PER_SUBJECT_CAP = 2;

// Classify a question against the seen log. The picker uses this to
// build three buckets: fresh (never seen), due (interval elapsed),
// notDue (still in cooldown / not due yet). Falls back to the legacy
// 7-day cooldown when an entry pre-dates the SR upgrade — so this
// stays safe across a revert.
function scheduleBucket(seen, now, q) {
  const e = seen[q.id];
  if (!e) return "fresh";
  let due;
  if (typeof e.dueAt === "number") {
    due = now >= e.dueAt;
  } else if (typeof e.lastSeenAt === "number") {
    due = (now - e.lastSeenAt) >= LEGACY_COOLDOWN_MS;
  } else {
    due = true;
  }
  return due ? "due" : "notDue";
}

let _cache = null;

export function listSubjects() { return SUBJECTS.slice(); }

export function subjectName(id) {
  const s = SUBJECTS.find(function (x) { return x.id === id; });
  return s ? s.name : id;
}

export async function loadAllQuestions() {
  if (_cache) return _cache;
  const fetches = SUBJECTS.map(function (s) {
    return fetch("data/" + s.id + ".json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; });
  });
  const results = await Promise.all(fetches);
  const merged = [];
  results.forEach(function (subjQs, i) {
    if (!Array.isArray(subjQs)) return;
    subjQs.forEach(function (q) {
      // Stamp subject if missing; trust the file otherwise
      const stamped = Object.assign({}, q);
      if (!stamped.subject) stamped.subject = SUBJECTS[i].id;
      merged.push(stamped);
    });
  });
  _cache = merged;
  return merged;
}

export function pickWarmupQuestions(pool, n) {
  if (!Array.isArray(pool) || pool.length === 0) return [];

  const seen = readSeen();
  const now = Date.now();

  // Group the pool by SR schedule state.
  const fresh = [];
  const due = [];
  const notDue = [];
  pool.forEach(function (q) {
    const bucket = scheduleBucket(seen, now, q);
    if (bucket === "fresh") fresh.push(q);
    else if (bucket === "due") due.push(q);
    else notDue.push(q);
  });

  // Identify "weak" subject::topic keys from the last 7 days. Anything
  // with 2+ misses counts. Used to bias the picker.
  const weak = weakTopics(7);
  const weakKeys = {};
  weak.forEach(function (w) {
    if (w.missCount >= 2) {
      weakKeys[w.subject + "::" + w.topic] = true;
    }
  });

  function isWeak(q) { return !!weakKeys[q.subject + "::" + q.topic]; }

  // Aim: ~60% weak / ~40% other when weak topics exist. If no weak
  // topics yet, fall back to plain SR-ordered picking.
  const weakTarget = Object.keys(weakKeys).length > 0 ? Math.ceil(n * 0.6) : 0;

  const orderedFresh = shuffle(fresh);
  const orderedDue = shuffle(due);
  const orderedNotDue = shuffle(notDue);
  const baseOrder = orderedFresh.concat(orderedDue).concat(orderedNotDue);

  // First pass: pick weak items up to weakTarget, respecting per-subject cap.
  const picked = [];
  const subjectCounts = {};
  function tryAdd(q) {
    if (picked.indexOf(q) >= 0) return false;
    const c = subjectCounts[q.subject] || 0;
    if (c >= PER_SUBJECT_CAP) return false;
    picked.push(q);
    subjectCounts[q.subject] = c + 1;
    return true;
  }

  if (weakTarget > 0) {
    for (let i = 0; i < baseOrder.length && picked.length < weakTarget; i++) {
      const q = baseOrder[i];
      if (isWeak(q)) tryAdd(q);
    }
  }

  // Second pass: fill rest with the cooldown-ordered pool, capped per subject.
  for (let i = 0; i < baseOrder.length && picked.length < n; i++) {
    tryAdd(baseOrder[i]);
  }

  // Third pass: top up if the per-subject cap left us short.
  for (let i = 0; i < baseOrder.length && picked.length < n; i++) {
    const q = baseOrder[i];
    if (picked.indexOf(q) >= 0) continue;
    picked.push(q);
  }

  return picked.slice(0, n);
}

export function pickSubjectQuestions(pool, subjectId, n) {
  const sub = pool.filter(function (q) { return q.subject === subjectId; });
  if (sub.length === 0) return [];

  const seen = readSeen();
  const now = Date.now();
  const fresh = [];
  const due = [];
  const notDue = [];
  sub.forEach(function (q) {
    const bucket = scheduleBucket(seen, now, q);
    if (bucket === "fresh") fresh.push(q);
    else if (bucket === "due") due.push(q);
    else notDue.push(q);
  });
  const ordered = shuffle(fresh).concat(shuffle(due)).concat(shuffle(notDue));
  return ordered.slice(0, n);
}

// Topic drill — smaller focused session on a single topic within a subject.
// Falls back to not-yet-due questions if the fresh + due pool is small,
// so a kid drilling the same topic twice in a day still gets questions.
export function pickTopicQuestions(pool, subjectId, topic, n) {
  const filtered = pool.filter(function (q) {
    return q.subject === subjectId && q.topic === topic;
  });
  if (filtered.length === 0) return [];
  const seen = readSeen();
  const now = Date.now();
  const fresh = [];
  const due = [];
  const notDue = [];
  filtered.forEach(function (q) {
    const bucket = scheduleBucket(seen, now, q);
    if (bucket === "fresh") fresh.push(q);
    else if (bucket === "due") due.push(q);
    else notDue.push(q);
  });
  const ordered = shuffle(fresh).concat(shuffle(due)).concat(shuffle(notDue));
  return ordered.slice(0, n);
}

// Returns the unique topic ids present in the pool for a given subject.
export function topicsForSubject(pool, subjectId) {
  const seen = {};
  const out = [];
  pool.forEach(function (q) {
    if (q.subject !== subjectId) return;
    if (!q.topic) return;
    if (seen[q.topic]) return;
    seen[q.topic] = true;
    out.push(q.topic);
  });
  return out;
}

// Returns the question count per topic for a given subject.
export function topicCounts(pool, subjectId) {
  const counts = {};
  pool.forEach(function (q) {
    if (q.subject !== subjectId || !q.topic) return;
    counts[q.topic] = (counts[q.topic] || 0) + 1;
  });
  return counts;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}
