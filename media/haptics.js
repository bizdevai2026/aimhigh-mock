// GradeBlaze — haptic feedback (vibration patterns).
//
// Brief vibration patterns to make answers feel tactile on mobile. The
// Vibration API is supported on Android Chrome/Edge/Firefox; iOS Safari
// blocks it for security reasons (the call is harmless there — silent).
// Independent of the in-app sound toggle: a parent who muted sound at
// 8 a.m. still wants the kid to feel the streak buzz.

function buzz(pattern) {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch (e) { /* iOS Safari throws on vibrate — harmless */ }
}

export function hapticCorrect() { buzz(20); }
export function hapticWrong()   { buzz(80); }
// hapticStrike — short sharp pulse, gap, sustained thump. Pairs with the
// lightning bolt visual so the kid feels the strike, not just sees it.
export function hapticStrike()  { buzz([60, 30, 180]); }
export function hapticPerfect() { buzz([60, 80, 60, 80, 120, 80, 220]); }
