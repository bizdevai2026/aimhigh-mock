// GradeBlaze — practice answer-feedback helpers.
//
// The audio + haptic feedback that fires on every correct/wrong answer
// in warmup and sprint modes. Single source of truth for "which chime
// plays at which streak count" — bug fixes and tuning happen here, not
// duplicated across the runners.
//
// Paper mode (the timed full mock) deliberately uses a different,
// silent flow — see paper.js. It does NOT call into this module.
//
// Public API:
//   onAnswerCorrect(streakCount) — play correct + haptic + streak chime
//                                  (fires on streak counts 3, 5, 7, 9...
//                                  i.e. 3 then every odd from 5).
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
} from "../media/sounds.js?v=20260526";

import {
  hapticCorrect,
  hapticWrong,
  hapticStreak
} from "../media/haptics.js?v=20260526";

export function onAnswerCorrect(streakCount) {
  playCorrect();
  hapticCorrect();
  // Streak chimes — escalating only at 3 and 5, then a softer reprise
  // every two correct beyond that so a long run doesn't fatigue the ear.
  if (streakCount === 3) {
    playStreak3();
    hapticStreak();
  } else if (streakCount === 5) {
    playStreak5();
    hapticStreak();
  } else if (streakCount >= 7 && streakCount % 2 === 1) {
    playStreak3();
    hapticStreak();
  }
}

export function onAnswerWrong() {
  playWrong();
  hapticWrong();
}
