// GradeBlaze — diagnostics: developer/parent diagnostic panel.
//
// Triggered by visiting any page with ?diag=1 in the URL. Paints a
// floating side panel with:
//   - The build version (so a tester can confirm what they're on)
//   - The 100 most recent events from platform/logger.js
//   - A snapshot of localStorage (every aimhigh-mock-* key)
//   - The current page, role, and signed-in name
//   - A "Copy all" button for handing diagnostics to a developer
//
// Not intended for end users — but harmless if a kid stumbles on it.
// No state mutation, no destructive actions.

import { snapshot as logSnapshot } from "../platform/logger.js?v=20260515";
import { snapshot as storageSnapshot } from "../platform/storage.js?v=20260515";

// Build version is the same string as the cache-bust ?v= used elsewhere.
// Kept in sync by tools/bump-version.py.
const BUILD_VERSION = "20260515";

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function fmtTime(ms) {
  const d = new Date(ms);
  const pad = function (n, w) { return String(n).padStart(w || 2, "0"); };
  return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()) + "." + pad(d.getMilliseconds(), 3);
}

function colourForLevel(level) {
  if (level === "error") return "#fca5a5";
  if (level === "debug") return "#7a7a8c";
  return "#c4c4d1";
}

function renderEvents() {
  const events = logSnapshot();
  if (!events.length) {
    return "<p style=\"color:#7a7a8c;font-size:0.85rem\">No events logged yet.</p>";
  }
  return events.slice().reverse().map(function (e) {
    let dataStr = "";
    if (e.data !== undefined) {
      try { dataStr = JSON.stringify(e.data); } catch (x) { dataStr = String(e.data); }
      if (dataStr.length > 200) dataStr = dataStr.slice(0, 197) + "...";
    }
    return "<div style=\"font-family:ui-monospace,monospace;font-size:0.78rem;" +
      "padding:0.25rem 0.4rem;border-bottom:1px solid #1f1f2a;" +
      "color:" + colourForLevel(e.level) + ";word-break:break-word\">" +
      "<span style=\"color:#7a7a8c\">" + fmtTime(e.t) + "</span> " +
      "<strong>[" + escapeHtml(e.channel) + "]</strong> " +
      escapeHtml(e.message) +
      (dataStr ? " <span style=\"color:#7a7a8c\">" + escapeHtml(dataStr) + "</span>" : "") +
      "</div>";
  }).join("");
}

function renderStorage() {
  const snap = storageSnapshot("aimhigh-mock-");
  const ks = Object.keys(snap).sort();
  if (!ks.length) {
    return "<p style=\"color:#7a7a8c;font-size:0.85rem\">No GradeBlaze keys in localStorage.</p>";
  }
  return ks.map(function (k) {
    let v = snap[k];
    // Try to JSON-pretty-print so structure is readable; fall back to raw.
    let pretty = v;
    try {
      const parsed = JSON.parse(v);
      pretty = JSON.stringify(parsed, null, 2);
    } catch (x) { /* not JSON, leave raw */ }
    if (pretty && pretty.length > 400) pretty = pretty.slice(0, 397) + "...";
    return "<details style=\"margin-bottom:0.4rem\">" +
      "<summary style=\"cursor:pointer;font-family:ui-monospace,monospace;" +
      "font-size:0.78rem;color:#c4c4d1\">" + escapeHtml(k) + "</summary>" +
      "<pre style=\"margin:0.3rem 0 0;padding:0.4rem;background:rgba(255,255,255,0.04);" +
      "border-radius:0.3rem;font-family:ui-monospace,monospace;font-size:0.75rem;" +
      "color:#c4c4d1;white-space:pre-wrap;word-break:break-word\">" + escapeHtml(pretty) + "</pre>" +
      "</details>";
  }).join("");
}

function copyAllToClipboard() {
  const events = logSnapshot();
  const snap = storageSnapshot("aimhigh-mock-");
  const bundle = {
    capturedAt: new Date().toISOString(),
    page: location.pathname + location.search,
    userAgent: navigator.userAgent,
    buildVersion: BUILD_VERSION,
    events: events,
    storage: snap
  };
  const text = JSON.stringify(bundle, null, 2);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      function () { alert("Diagnostics copied to clipboard."); },
      function () { fallbackCopy(text); }
    );
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); alert("Diagnostics copied."); }
  catch (e) { alert("Couldn't copy. Open DevTools console for the full bundle:\n\n" + text.slice(0, 200) + "..."); }
  document.body.removeChild(ta);
}

function mount() {
  if (document.getElementById("gb-diag-panel")) return;
  const panel = document.createElement("aside");
  panel.id = "gb-diag-panel";
  panel.style.cssText =
    "position:fixed;top:0;right:0;bottom:0;width:min(420px,90vw);" +
    "background:rgba(10,10,15,0.97);border-left:1px solid #2a2a35;" +
    "color:#fafafa;padding:1rem;overflow-y:auto;z-index:99999;" +
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;" +
    "font-size:0.9rem;line-height:1.4;box-shadow:-8px 0 24px rgba(0,0,0,0.4);";
  panel.innerHTML =
    "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem\">" +
      "<strong style=\"color:#ffb300\">GradeBlaze diagnostics</strong>" +
      "<button id=\"gb-diag-close\" style=\"background:transparent;border:1px solid #2a2a35;" +
      "color:#c4c4d1;padding:0.3rem 0.6rem;border-radius:0.3rem;cursor:pointer\">Close</button>" +
    "</div>" +
    "<dl style=\"margin:0 0 0.8rem;font-size:0.8rem\">" +
      "<dt style=\"color:#7a7a8c\">Build</dt><dd style=\"margin:0 0 0.3rem\">" + escapeHtml(BUILD_VERSION) + "</dd>" +
      "<dt style=\"color:#7a7a8c\">Page</dt><dd style=\"margin:0 0 0.3rem\">" + escapeHtml(location.pathname + location.search) + "</dd>" +
      "<dt style=\"color:#7a7a8c\">User agent</dt><dd style=\"margin:0;font-family:ui-monospace,monospace;font-size:0.75rem;color:#c4c4d1\">" + escapeHtml(navigator.userAgent) + "</dd>" +
    "</dl>" +
    "<button id=\"gb-diag-copy\" style=\"width:100%;background:linear-gradient(135deg,#ff3d00,#ffb300);" +
    "color:#0a0a0f;border:0;padding:0.5rem;border-radius:0.3rem;font-weight:700;cursor:pointer;" +
    "margin-bottom:0.8rem\">Copy diagnostics to clipboard</button>" +
    "<details open style=\"margin-bottom:0.6rem\">" +
      "<summary style=\"cursor:pointer;color:#fbbf24;font-weight:600\">Events <span style=\"color:#7a7a8c;font-weight:400\">(last 100)</span></summary>" +
      "<div id=\"gb-diag-events\" style=\"margin-top:0.4rem;max-height:50vh;overflow-y:auto\"></div>" +
    "</details>" +
    "<details>" +
      "<summary style=\"cursor:pointer;color:#fbbf24;font-weight:600\">Storage <span style=\"color:#7a7a8c;font-weight:400\">(aimhigh-mock-*)</span></summary>" +
      "<div id=\"gb-diag-storage\" style=\"margin-top:0.4rem\"></div>" +
    "</details>";
  document.body.appendChild(panel);

  document.getElementById("gb-diag-events").innerHTML = renderEvents();
  document.getElementById("gb-diag-storage").innerHTML = renderStorage();

  document.getElementById("gb-diag-close").addEventListener("click", function () {
    panel.remove();
  });
  document.getElementById("gb-diag-copy").addEventListener("click", copyAllToClipboard);

  // Auto-refresh events every 2 seconds while the panel is open.
  const refreshTimer = setInterval(function () {
    if (!document.getElementById("gb-diag-panel")) {
      clearInterval(refreshTimer);
      return;
    }
    const evEl = document.getElementById("gb-diag-events");
    if (evEl) evEl.innerHTML = renderEvents();
  }, 2000);
}

// Auto-mount when ?diag=1 is in the URL. Tolerates being loaded before
// document.body exists by deferring to DOMContentLoaded.
function maybeMount() {
  if (typeof location === "undefined") return;
  if (!/[?&]diag=1\b/.test(location.search)) return;
  if (document.body) {
    mount();
  } else {
    document.addEventListener("DOMContentLoaded", mount);
  }
}

maybeMount();

// Public API for callers that want to open the panel from a tap or
// a keyboard shortcut. Not wired up by default — the URL flag is the
// canonical entry.
export function openDiagnosticsPanel() { mount(); }
