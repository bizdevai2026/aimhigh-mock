/* GradeBlaze — loading guard.
 *
 * Sets a 7-second alarm. If the application hasn't called
 * `window.GBReady()` by the time the alarm fires, the page paints a
 * "this is taking a while" recovery card with reload + reset.
 *
 * Why 7 seconds: long enough that a normal-but-slow network completes
 * (most warm-up loads are 1–2s on Slow 3G), short enough that a frozen
 * page doesn't waste the user's patience. We'll tune from real data.
 *
 * Application code calls window.GBReady() once it has painted real
 * content. Multiple calls are safe (idempotent).
 *
 * Loaded as a classic <script> AFTER error-catcher.js but BEFORE the
 * module script. No ?v= so it's always the freshest copy.
 */

(function () {
  "use strict";

  var TIMEOUT_MS = 7000;
  var ready = false;

  function findRoot() {
    var ids = ["learnRoot", "warmupRoot", "sprintRoot", "paperRoot", "coachRoot", "welcomeRoot", "homeRoot"];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el) return el;
    }
    var main = document.querySelector("main");
    return main || document.body || document.documentElement;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function paintTimeout() {
    if (ready) return;
    if (window.GBErr && window.GBErr._painted) return; // error catcher already painted
    var root = findRoot();
    if (!root) return;
    // Mark as painted so a late-firing error catcher doesn't clobber
    // this card with its own. Whichever fires first wins.
    if (window.GBErr) window.GBErr._painted = true;

    root.innerHTML =
      "<section style=\"" +
        "max-width:560px;margin:2rem auto;padding:1.5rem;" +
        "background:rgba(20,20,26,0.95);border:1px solid #fbbf24;" +
        "border-radius:14px;color:#fafafa;" +
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;" +
        "line-height:1.5;\">" +
        "<h2 style=\"margin:0 0 0.6rem;color:#fbbf24;font-size:1.3rem\">" +
          "Taking longer than usual" +
        "</h2>" +
        "<p style=\"margin:0 0 1rem;color:#c4c4d1\">" +
          "GradeBlaze hasn't finished loading after 7 seconds. Your network " +
          "might be slow, or something might be blocking GradeBlaze's scripts " +
          "(some school filters do). Try one of these:" +
        "</p>" +
        "<div style=\"display:flex;flex-wrap:wrap;gap:0.6rem\">" +
          "<button id=\"gb-tmo-reload\" style=\"" +
            "background:linear-gradient(135deg,#ff3d00,#ffb300);color:#0a0a0f;" +
            "border:0;padding:0.7rem 1.2rem;border-radius:0.5rem;" +
            "font-size:1rem;font-weight:700;cursor:pointer\">Reload</button>" +
          "<a href=\"reset.html\" style=\"" +
            "background:transparent;color:#00f5d4;text-decoration:none;" +
            "border:1px solid #00f5d4;padding:0.7rem 1.2rem;border-radius:0.5rem;" +
            "font-weight:600\">Reset GradeBlaze</a>" +
          "<a href=\"index.html\" style=\"" +
            "background:transparent;color:#c4c4d1;text-decoration:none;" +
            "border:1px solid #2a2a35;padding:0.7rem 1.2rem;border-radius:0.5rem;" +
            "font-weight:500\">&larr; Home</a>" +
        "</div>" +
        "<p style=\"margin-top:1rem;color:#7a7a8c;font-size:0.85rem\">" +
          "Page: " + escapeHtml(location.pathname) +
        "</p>" +
      "</section>";

    var btn = document.getElementById("gb-tmo-reload");
    if (btn) btn.addEventListener("click", function () { location.reload(); });
  }

  // Schedule the alarm. window.GBReady() cancels it.
  var alarm = setTimeout(paintTimeout, TIMEOUT_MS);

  window.GBReady = function () {
    ready = true;
    clearTimeout(alarm);
  };
})();
