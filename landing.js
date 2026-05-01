// GradeBlaze — landing page (public marketing).
//
// This is the page strangers see when they hit gradeblaze.co.uk
// without an authenticated session AND without any profile data on
// the device. Anti-copy: scrapers and casual visitors get the pitch,
// not the substance.
//
// The page is intentionally minimal-JS — almost everything is static
// HTML/CSS so it loads instantly and indexes well. This module only
// handles:
//   - Smooth scroll to the Request form when the hero CTA is tapped.
//   - Cancelling the loading guard so the safety-net banner never
//     fires on a slow-network landing.
//   - If a session is already active, kick the user straight into the
//     app (no need to look at marketing copy).

import { signedInRole } from "./auth/session.js?v=20260614";

(function init() {
  // Diag panel access regardless of auth state. The panel hosts the trial
  // tracking toggle, which the Coach must be able to flip on a fresh
  // device or one whose localStorage has been cleared by Safari ITP.
  if (/[?&]diag=1\b/.test(location.search)) {
    import("./diagnostics/panel.js?v=20260614").catch(function (e) {
      console.error("diag panel failed to load", e);
    });
    return; // do NOT redirect away — the Coach is here on purpose
  }

  // Already signed in? Skip the landing entirely.
  const role = signedInRole();
  if (role === "child") { location.replace("index.html"); return; }
  if (role === "coach") { location.replace("dashboard.html"); return; }
  if (role === "demo")  { location.replace("index.html"); return; }

  // Smooth-scroll the hero CTA to #request. Default anchor jump is
  // jarring on phone; smooth-scroll feels intentional.
  const ctas = document.querySelectorAll('a[href="#request"]');
  ctas.forEach(function (a) {
    a.addEventListener("click", function (e) {
      const target = document.getElementById("request");
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  if (typeof window.GBReady === "function") window.GBReady();
})();
