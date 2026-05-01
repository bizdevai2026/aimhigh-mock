// GradeBlaze — lightning-strike celebration overlay.
//
// A transient SVG bolt is overlaid on the session card and removed after
// the flash animation completes (~480ms). Fired only on streak peaks
// (3, 5, 7, 9...) — the "spark" on every correct answer is already
// covered by the existing pulseCorrect ripple on .is-correct. This is
// the louder, rarer event.
//
// Reduced-motion: CSS hides the bolt entirely (the haptic + chime + the
// pulse on the answer still fire, so the moment is still confirmed —
// just without the flash).

const BOLT_PATH = "M 30 0 L 12 36 L 22 36 L 8 72 L 32 32 L 22 32 Z";
const BOLT_LIFETIME_MS = 520;

export function triggerBolt(targetEl) {
  if (!targetEl || typeof document === "undefined") return;
  // One bolt at a time per target — replacing mid-flash would feel jittery.
  if (targetEl.querySelector(".mock-strike-bolt")) return;

  const wrap = document.createElement("div");
  wrap.className = "mock-strike-bolt";
  wrap.setAttribute("aria-hidden", "true");
  wrap.innerHTML =
    "<svg viewBox=\"0 0 40 72\" xmlns=\"http://www.w3.org/2000/svg\">" +
      "<path class=\"mock-strike-bolt-path\" d=\"" + BOLT_PATH + "\" />" +
    "</svg>";

  // Make sure the card is a positioning context so the absolute overlay
  // anchors correctly. Most session cards already are; this is defensive.
  const cs = window.getComputedStyle(targetEl);
  if (cs && cs.position === "static") {
    targetEl.style.position = "relative";
  }

  targetEl.appendChild(wrap);
  // Remove after the animation has run; failsafe in case animationend never fires.
  setTimeout(function () {
    if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
  }, BOLT_LIFETIME_MS);
}
