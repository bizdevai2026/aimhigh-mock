// GradeBlaze — trial instrumentation.
//
// Local-first event tracker for the 1-week single-user beta. Captures
// route changes, taps, scroll depth, time-on-screen, and key product
// events. Never sends anything off-device. Export-only via the
// diagnostic panel.
//
// Privacy posture: this is a single-kid beta. No analytics SaaS, no
// telemetry endpoints, no cookies. Events live entirely in localStorage
// under a date-stamped key. The Coach (or the kid) can wipe at any time.
//
// Activation:
//   - Default: OFF. The tracker imports cleanly but binds nothing
//     unless trial mode is explicitly enabled.
//   - Toggle: setTrialActive(true) — writes a flag to localStorage.
//     The flag persists across sessions.
//   - Auto-bind: bindGlobal() called from mock.js once at boot;
//     attaches root-level listeners only when trial mode is active.
//
// Storage:
//   aimhigh-mock-trial-active        = "1" / "0"
//   aimhigh-mock-trial-events-YYYY-MM-DD = [ {t, type, surface, target, meta}... ]
// Daily key roll-over keeps growth bounded; old days can be exported
// then cleared.
//
// Reporting deliverable (end of week 1): a markdown report covering
// navigation heatmap, session counts, top-tapped buttons, abandonment
// hotspots, rage-click hotspots — all derived from the exported JSON.

import {
  readString as storageReadString,
  writeString as storageWriteString,
  readJson as storageReadJson,
  writeJson as storageWriteJson,
  remove as storageRemove,
  keys as storageKeys
} from "../platform/storage.js?v=20260613";

const PREFIX = "aimhigh-mock-";
const KEY_ACTIVE = PREFIX + "trial-active";
const KEY_EVENTS_PREFIX = PREFIX + "trial-events-";

// Cap one day's event log so a kid who taps 50,000 times in one
// session doesn't fill localStorage. Older events get dropped.
const MAX_EVENTS_PER_DAY = 5000;

// Rage-click detection window — 3 taps on the same target within this
// many ms = "rage click" event. Tunable.
const RAGE_WINDOW_MS = 1000;
const RAGE_TAP_THRESHOLD = 3;

// In-memory state. Module-singleton — bind only once.
let bound = false;
let lastTaps = []; // [{ts, target}, ...] for rage-click detection
let lastSurface = null;
let lastSurfaceEnter = null;

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return KEY_EVENTS_PREFIX + y + "-" + m + "-" + day;
}

export function isTrialActive() {
  try { return storageReadString(KEY_ACTIVE) === "1"; }
  catch (e) { return false; }
}

export function setTrialActive(on) {
  try { storageWriteString(KEY_ACTIVE, on ? "1" : "0"); } catch (e) { /* storage off */ }
}

// Push a single event. Caller is responsible for deciding what's worth
// recording — keep this cheap. No-ops silently if trial mode is off.
export function track(type, meta) {
  if (!isTrialActive()) return;
  const key = todayKey();
  const list = storageReadJson(key, []);
  if (!Array.isArray(list)) return;
  const ev = {
    t: Date.now(),
    type: String(type || "unknown"),
    surface: window.location.pathname.replace(/^\//, "") + (window.location.search || ""),
    target: (meta && meta.target) || null,
    meta: meta && Object.keys(meta).length ? scrub(meta) : null
  };
  list.push(ev);
  // Drop the oldest if we've hit the cap. Keeps storage bounded.
  if (list.length > MAX_EVENTS_PER_DAY) {
    list.splice(0, list.length - MAX_EVENTS_PER_DAY);
  }
  try { storageWriteJson(key, list); } catch (e) { /* quota — drop the event */ }
}

// Strip target keys we don't want in the meta payload (event objects,
// big DOM nodes, sensitive values from typed inputs).
function scrub(meta) {
  const out = {};
  Object.keys(meta).forEach(function (k) {
    if (k === "target") return; // already promoted to ev.target
    const v = meta[k];
    if (typeof v === "string") {
      out[k] = v.length > 120 ? v.slice(0, 117) + "..." : v;
    } else if (typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    } else if (v && typeof v === "object" && !v.nodeType) {
      // Shallow copy of plain objects only
      try { out[k] = JSON.parse(JSON.stringify(v)); }
      catch (e) { out[k] = "[unserialisable]"; }
    }
  });
  return out;
}

// Compose a stable selector-ish identifier for a clicked element.
// Prefers data-action, then id, then className+tag, then tag.
function describeTarget(el) {
  if (!el || el.nodeType !== 1) return null;
  const action = el.getAttribute && el.getAttribute("data-action");
  if (action) return "action:" + action;
  if (el.id) return "#" + el.id;
  const cls = (el.className && typeof el.className === "string" && el.className.trim()) || "";
  const firstClass = cls.split(/\s+/)[0];
  if (firstClass) return el.tagName.toLowerCase() + "." + firstClass;
  // Fallback: walk up to find a labelled ancestor
  if (el.parentElement) {
    const up = describeTarget(el.parentElement);
    if (up) return "in " + up;
  }
  return el.tagName.toLowerCase();
}

// Bind the root-level listeners. Idempotent. No-ops if trial mode is
// off — but importantly we still call it on every page so it picks
// up state changes (toggle on mid-session and the next page captures).
export function bindGlobal() {
  if (bound) return;
  bound = true;
  if (typeof window === "undefined") return;

  // Page enter/exit timing.
  recordSurfaceEnter();
  window.addEventListener("beforeunload", function () {
    recordSurfaceExit();
  });

  // Click capture — every tap gets a row.
  document.addEventListener("click", function (e) {
    if (!isTrialActive()) return;
    const target = describeTarget(e.target);
    track("click", { target: target });
    detectRageClick(target);
  }, { capture: true });

  // Form submit capture — useful for the welcome/auth flows.
  document.addEventListener("submit", function (e) {
    if (!isTrialActive()) return;
    const f = e.target;
    const id = (f && f.id) ? "#" + f.id : "form";
    track("submit", { target: id });
  }, { capture: true });

  // Visibility change — captures the kid switching tabs / minimising,
  // which is signal in a 1-week trial about whether sessions are
  // sustained or constantly interrupted.
  document.addEventListener("visibilitychange", function () {
    if (!isTrialActive()) return;
    track("visibility", { state: document.visibilityState });
  });

  // Scroll depth — record max scroll Y per surface. Lightweight: only
  // updates on scroll-end (debounced).
  let maxScroll = 0;
  let scrollTimer = null;
  window.addEventListener("scroll", function () {
    const y = window.scrollY || 0;
    if (y > maxScroll) maxScroll = y;
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () {
      if (!isTrialActive()) return;
      track("scroll", { maxY: maxScroll, viewportH: window.innerHeight });
    }, 200);
  }, { passive: true });

  // Errors — useful to correlate "kid bailed" events with broken state.
  window.addEventListener("error", function (e) {
    if (!isTrialActive()) return;
    track("error", { msg: String(e.message || ""), src: String(e.filename || ""), line: e.lineno });
  });
}

function recordSurfaceEnter() {
  if (!isTrialActive()) return;
  lastSurface = window.location.pathname;
  lastSurfaceEnter = Date.now();
  track("enter", { url: window.location.pathname + window.location.search });
}

function recordSurfaceExit() {
  if (!isTrialActive()) return;
  if (!lastSurfaceEnter) return;
  const dwellMs = Date.now() - lastSurfaceEnter;
  track("exit", { url: lastSurface, dwellMs: dwellMs });
}

function detectRageClick(target) {
  const now = Date.now();
  // Drop taps older than the rage window
  lastTaps = lastTaps.filter(function (t) { return now - t.ts < RAGE_WINDOW_MS; });
  lastTaps.push({ ts: now, target: target });
  // Count consecutive taps on the same target inside the window
  const sameTarget = lastTaps.filter(function (t) { return t.target === target; });
  if (sameTarget.length >= RAGE_TAP_THRESHOLD) {
    track("rage", { target: target, taps: sameTarget.length, windowMs: RAGE_WINDOW_MS });
    // Reset so we don't fire on every subsequent tap in the same burst
    lastTaps = [];
  }
}

// === Export / wipe — used by the diag panel UI ===========================

export function listEventDays() {
  return storageKeys(KEY_EVENTS_PREFIX).map(function (k) {
    return k.replace(KEY_EVENTS_PREFIX, "");
  }).sort();
}

export function readEventsForDay(dayKey) {
  return storageReadJson(KEY_EVENTS_PREFIX + dayKey, []);
}

// Bundle every captured day into one downloadable JSON. Returns a
// string; caller decides what to do with it (download, copy, console).
export function exportEvents() {
  const bundle = {
    capturedAt: new Date().toISOString(),
    builtAt: BUILD_VERSION_HINT(),
    deviceUserAgent: navigator.userAgent,
    days: {}
  };
  listEventDays().forEach(function (day) {
    bundle.days[day] = readEventsForDay(day);
  });
  return JSON.stringify(bundle, null, 2);
}

// Best-effort build version pull.
function BUILD_VERSION_HINT() {
  try {
    const m = String(import.meta.url || "").match(/\?v=(\d{8})/);
    return m ? m[1] : "unknown";
  } catch (e) { return "unknown"; }
}

export function wipeAllEvents() {
  storageKeys(KEY_EVENTS_PREFIX).forEach(function (k) {
    try { storageRemove(k); } catch (e) { /* ignore */ }
  });
}

export function totalEventCount() {
  let total = 0;
  listEventDays().forEach(function (day) {
    total += (readEventsForDay(day) || []).length;
  });
  return total;
}
