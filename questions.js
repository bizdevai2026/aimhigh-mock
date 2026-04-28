// AimHigh Mock Prep — question pool loader and warm-up picker.
//
// Questions live in data/<subject>.json files. Each subject's file is a
// JSON array of MCQ objects:
//   { id, subject, topic, prompt, options[4], answer, explainer? }
//
// loadAllQuestions() fetches every subject in parallel, stamps the
// subject id in case it's missing, and caches the merged pool.
//
// pickWarmupQuestions(pool, n) returns n questions, prioritising
// items the learner has not seen in the last 7 days, then balancing
// across subjects so a warm-up doesn't end up as 10 maths questions.

import { readSeen } from "./engagement.js";

const SUBJECTS = [
  { id: "science",   name: "Science"          },
  { id: "maths",     name: "Maths"            },
  { id: "english",   name: "English"          },
  { id: "french",    name: "French"           },
  { id: "history",   name: "History"          },
  { id: "geography", name: "Geography"        },
  { id: "computing", name: "Computer Science" }
];

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const PER_SUBJECT_CAP = 2;

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

  const fresh = [];
  const stale = [];
  const recent = [];

  pool.forEach(function (q) {
    const s = seen[q.id];
    if (!s) { fresh.push(q); return; }
    if ((now - s.lastSeenAt) > SEVEN_DAYS_MS) { stale.push(q); return; }
    recent.push(q);
  });

  const ordered = shuffle(fresh).concat(shuffle(stale)).concat(shuffle(recent));

  // Pass 1 — at most PER_SUBJECT_CAP per subject, to keep mix wide
  const picked = [];
  const subjectCounts = {};
  for (let i = 0; i < ordered.length && picked.length < n; i++) {
    const q = ordered[i];
    const c = subjectCounts[q.subject] || 0;
    if (c >= PER_SUBJECT_CAP) continue;
    picked.push(q);
    subjectCounts[q.subject] = c + 1;
  }

  // Pass 2 — top up if cap was too tight
  for (let i = 0; i < ordered.length && picked.length < n; i++) {
    const q = ordered[i];
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
  const stale = [];
  const recent = [];
  sub.forEach(function (q) {
    const s = seen[q.id];
    if (!s) { fresh.push(q); return; }
    if ((now - s.lastSeenAt) > SEVEN_DAYS_MS) { stale.push(q); return; }
    recent.push(q);
  });
  const ordered = shuffle(fresh).concat(shuffle(stale)).concat(shuffle(recent));
  return ordered.slice(0, n);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}
