/* GradeBlaze — pre-CSS theme bootstrap.
 *
 * Classic <script> that runs synchronously BEFORE mock.css loads, so the
 * correct theme is already on <html> when the browser starts evaluating
 * styles. Without this, the page would paint dark first, then flash to
 * light (or vice versa) — the classic FOUC for theme systems.
 *
 * Resolution order on every page load:
 *   1. localStorage["aimhigh-mock-theme"] if it's a known value
 *   2. window.matchMedia("(prefers-color-scheme: dark)") if dark
 *   3. Default: "light"
 *
 * Public API on window.GBTheme:
 *   set("light" | "dark")   — apply + persist
 *   toggle()                — flip and return new theme
 *   current()               — read what's applied right now
 *
 * Light is the default because: testers reported the dark mode caused
 * reading fatigue on sustained LEARN sessions. Dark stays available
 * via the toggle and via prefers-color-scheme on devices set to dark.
 */

(function () {
  "use strict";

  var KEY = "aimhigh-mock-theme";
  var VALID = { light: true, dark: true };

  function readStored() {
    try {
      var v = localStorage.getItem(KEY);
      return VALID[v] ? v : null;
    } catch (e) { return null; }
  }

  function persist(theme) {
    try { localStorage.setItem(KEY, theme); } catch (e) { /* quota / disabled */ }
  }

  function systemPref() {
    try {
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    } catch (e) {}
    return "light";
  }

  function apply(theme) {
    if (!VALID[theme]) theme = "light";
    var html = document.documentElement;
    if (html) html.setAttribute("data-theme", theme);
    // Sync the iOS / Android browser-chrome colour to match the theme.
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "dark" ? "#0a0a0f" : "#faf9f6");
    }
  }

  // First-paint resolution.
  var stored = readStored();
  var initial = stored || systemPref();
  apply(initial);

  // Public API for the runtime toggle button (injected later by mock.js).
  window.GBTheme = {
    current: function () {
      var html = document.documentElement;
      return (html && html.getAttribute("data-theme")) || "light";
    },
    set: function (theme) {
      if (!VALID[theme]) return;
      apply(theme);
      persist(theme);
    },
    toggle: function () {
      var next = this.current() === "dark" ? "light" : "dark";
      this.set(next);
      return next;
    }
  };
})();
