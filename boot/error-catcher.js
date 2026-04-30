/* GradeBlaze — pre-import error catcher.
 *
 * Loaded as a classic <script> BEFORE any module script. Installs global
 * "error" and "unhandledrejection" listeners synchronously, so even
 * module-graph failures (a missing export, a syntax error in an imported
 * file, a blocked import URL) surface to the page instead of leaving a
 * silent "Loading…" stub forever.
 *
 * Deliberately:
 *   - No ?v=YYYYMMDD on the script tag — this file must always be the
 *     freshest copy, so a stuck cache can't take the safety net with it.
 *   - No module syntax — this is a plain script that runs immediately.
 *   - Keeps DOM mutations to a minimum until an error actually fires.
 *
 * Public API on window:
 *   window.GBErr              — reference to this module's helpers
 *   window.GBErr.paint(stage, message)  — paint a fatal-error card
 *
 * Pages that already paint their own error UI (e.g. via paintError in
 * a runner) keep doing so — this catcher is the LAST resort, only
 * triggered when nothing else has caught the failure.
 */

(function () {
  "use strict";

  // The element we paint into. Pages mount their main content under one
  // of these ids — we look up whichever exists, falling back to <body>
  // appended at the end so the user always sees something.
  // Per-page root element ids. Must match the actual ids in HTML files.
  // (QA found "dashboardRoot" was wrong — the real id is "coachRoot".)
  var ROOT_IDS = [
    "learnRoot", "warmupRoot", "sprintRoot", "paperRoot",
    "coachRoot", "welcomeRoot", "homeRoot"
  ];

  function findRoot() {
    for (var i = 0; i < ROOT_IDS.length; i++) {
      var el = document.getElementById(ROOT_IDS[i]);
      if (el) return el;
    }
    var main = document.querySelector("main");
    return main || document.body;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function paint(stage, message) {
    if (window.GBErr && window.GBErr._painted) return; // never paint twice
    var root = findRoot();
    if (!root) return;
    if (window.GBErr) window.GBErr._painted = true;

    var safeStage = escapeHtml(stage || "unknown");
    var safeMsg = escapeHtml(message || "Unknown error");

    // Style is inline so this works even if mock.css failed to load.
    root.innerHTML =
      "<section style=\"" +
        "max-width:560px;margin:2rem auto;padding:1.5rem;" +
        "background:rgba(20,20,26,0.95);border:1px solid #fca5a5;" +
        "border-radius:14px;color:#fafafa;" +
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;" +
        "line-height:1.5;\">" +
        "<h2 style=\"margin:0 0 0.6rem;color:#fca5a5;font-size:1.3rem\">" +
          "Something didn't load" +
        "</h2>" +
        "<p style=\"margin:0 0 1rem;color:#c4c4d1\">" +
          "GradeBlaze hit a snag while starting up. Try one of these:" +
        "</p>" +
        "<div style=\"display:flex;flex-wrap:wrap;gap:0.6rem;margin-bottom:1rem\">" +
          "<button id=\"gb-err-reload\" style=\"" +
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
        "<details style=\"margin-top:0.5rem\">" +
          "<summary style=\"cursor:pointer;color:#7a7a8c;font-size:0.85rem;" +
            "user-select:none\">Why?</summary>" +
          "<div style=\"margin-top:0.6rem;font-size:0.8rem;color:#7a7a8c\">" +
            "<div><strong>Stage:</strong> " + safeStage + "</div>" +
            "<div><strong>Page:</strong> " + escapeHtml(location.pathname) + "</div>" +
            "<div><strong>Time:</strong> " + new Date().toISOString() + "</div>" +
            "<pre style=\"" +
              "margin-top:0.5rem;padding:0.6rem;background:rgba(255,255,255,0.04);" +
              "border-radius:0.4rem;font-family:ui-monospace,monospace;" +
              "font-size:0.78rem;color:#c4c4d1;white-space:pre-wrap;" +
              "word-break:break-word;max-height:240px;overflow:auto\">" +
              safeMsg +
            "</pre>" +
            "<p style=\"margin-top:0.6rem\">" +
              "If reloading and resetting both fail, your network may be " +
              "blocking GradeBlaze's scripts (some school filters do). " +
              "Try a different network." +
            "</p>" +
          "</div>" +
        "</details>" +
      "</section>";

    // Wire reload — done after innerHTML is set so the button exists.
    var reloadBtn = document.getElementById("gb-err-reload");
    if (reloadBtn) {
      reloadBtn.addEventListener("click", function () {
        location.reload();
      });
    }
  }

  // Install global handlers. We mark "painted" the first time so a
  // cascade of follow-on errors doesn't redraw the card repeatedly.
  function onError(e) {
    var loc = (e.filename || "") + ":" + (e.lineno || "?") + ":" + (e.colno || "?");
    var msg = (e.message || "?") + " @ " + loc;
    // Browsers report "Script error." for cross-origin script failures
    // with empty filename/line/col. The location string is then ":?:?",
    // which is useless. Substitute a human-readable message.
    if ((e.message === "Script error." || e.message === "Script error")
        && !e.filename) {
      msg = "A script failed to load. This is often caused by a network " +
            "filter or browser extension blocking GradeBlaze's scripts. " +
            "Try reloading on a different network, or opening the page " +
            "in a private/incognito window.";
    }
    if (e.error && e.error.stack) msg += "\n\n" + e.error.stack;
    paint("uncaught error", msg);
  }

  function onRejection(e) {
    var r = e.reason;
    var msg = "Promise rejected";
    if (r) {
      if (typeof r === "string") msg = r;
      else if (r.message) msg = r.message;
      else { try { msg = JSON.stringify(r); } catch (x) {} }
      if (r.stack) msg += "\n\n" + r.stack;
    }
    paint("unhandled rejection", msg);
  }

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  // Expose a small API so application code (e.g. a runner's catch
  // block) can paint a fatal error explicitly when it knows the
  // page can't recover. paintError() in the runners is for "we
  // failed to load the question pool" — application-level. paint()
  // here is for "the JavaScript itself broke" — system-level.
  window.GBErr = { paint: paint, _painted: false };
})();
