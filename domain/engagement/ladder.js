// GradeBlaze — per-topic and per-subject ladder (Developing → Accomplished).
//
// Mirrors the school's tier language (Secure / Extending / Accomplished),
// derived from accuracy in the results log. Adds a "Developing" tier
// below Secure for low-attempt or low-accuracy topics so beginners
// aren't immediately labelled "Secure" on day one.
//
// Thresholds:
//   < 3 attempts                        → Developing
//   accuracy < 50%                      → Developing
//   accuracy 50–69%                     → Secure
//   accuracy 70–84%                     → Extending
//   accuracy ≥ 85% AND attempts ≥ 5     → Accomplished

import { readResults } from "./results.js?v=20260612";

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
