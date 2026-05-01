// GradeBlaze — practice answer-feedback helpers.
//
// The audio + haptic + visual feedback that fires on every correct/wrong
// answer in warmup and sprint modes. Single source of truth for "which
// chime plays at which streak count" — bug fixes and tuning happen here,
// not duplicated across the runners.
//
// Paper mode (the timed full mock) deliberately uses a different,
// silent flow — see paper.js. It does NOT call into this module.
//
// Escalation policy:
//   Every correct  → pulseCorrect ripple on the chosen answer (CSS,
//                    fired by the runner adding .is-correct) + correct
//                    chime + light haptic. The "spark".
//   Streak peak    → adds the lightning bolt overlay on the session card
//                    + streak chime + sharper haptic. The "strike".
//                    Streak peaks are 3, 5, then every odd from 7 — so
//                    every right answer feels rewarding, but big runs
//                    feel earned (avoid the wow-becomes-wallpaper trap).
//
// Public API:
//   onAnswerCorrect(streakCount) — play correct + haptic + (on peaks)
//                                  the strike + streak chime.
//   onAnswerWrong()              — play wrong tone + haptic.
//
// `streakCount` is the running count of in-a-row correct answers IN
// THIS SESSION (resets to 0 on every wrong answer). The caller owns
// the counter; this helper just decides what to play given the count.

import {
  playCorrect,
  playWrong,
  playStreak3,
  playStreak5
} from "../media/sounds.js?v=20260609";

import {
  hapticCorrect,
  hapticWrong,
  hapticStrike
} from "../media/haptics.js?v=20260609";

import { triggerBolt } from "./strike.js?v=20260609";

function isStreakPeak(n) {
  if (n === 3) return true;
  if (n === 5) return true;
  return n >= 7 && (n % 2 === 1);
}

export function onAnswerCorrect(streakCount) {
  playCorrect();
  hapticCorrect();
  if (!isStreakPeak(streakCount)) return;

  // Streak peak: chime + sharp haptic + lightning bolt over the card.
  if (streakCount === 5) playStreak5(); else playStreak3();
  hapticStrike();
  if (typeof document !== "undefined") {
    triggerBolt(document.getElementById("sessionCard"));
  }
}

export function onAnswerWrong() {
  playWrong();
  hapticWrong();
}
