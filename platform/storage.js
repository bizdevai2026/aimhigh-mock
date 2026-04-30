// GradeBlaze — platform: localStorage wrapper.
//
// THE ONLY MODULE THAT IS ALLOWED TO TOUCH window.localStorage.
//
// Why this exists
// ---------------
// Before this file: 32 direct calls to localStorage.getItem / setItem /
// removeItem scattered across 8 modules, each duplicating its own try /
// catch quota guard. A single quirk (Safari private mode, storage full,
// disabled by enterprise policy) had to be handled correctly in 32
// places. It mostly was. Mostly is not good enough for the data layer.
//
// Now: every read/write goes through this module. Quota and availability
// failures are handled once, here, and silent — callers get null/no-op
// behaviour and don't have to think about it.
//
// API
// ---
//   readJson(key, fallback?)    — JSON parse with fallback merge
//   writeJson(key, value)
//   readString(key)             — raw string, null on miss
//   writeString(key, value)
//   remove(key)
//   keys(prefix?)               — keys with prefix (default: "aimhigh-mock-")
//   snapshot(prefix?)           — { key: rawValue } map for export tools
//   available()                 — does this device have working storage?
//
// Storage key prefix is "aimhigh-mock-" to keep continuity with existing
// installs. Renaming would silently lose every user's progress; that's a
// migration job, not a refactor job.

const DEFAULT_PREFIX = "aimhigh-mock-";

function safeStorage() {
  try { return window.localStorage; } catch (e) { return null; }
}

export function available() {
  const ls = safeStorage();
  if (!ls) return false;
  // Some browsers expose localStorage but throw on every operation
  // (Safari private mode pre-iOS 11, locked-down enterprise). Probe
  // with a key we can clean up immediately.
  try {
    const probe = "__gb_probe__";
    ls.setItem(probe, "1");
    ls.removeItem(probe);
    return true;
  } catch (e) { return false; }
}

export function readJson(key, fallback) {
  const ls = safeStorage();
  if (!ls) return cloneDefault(fallback);
  try {
    const raw = ls.getItem(key);
    if (raw == null) return cloneDefault(fallback);
    const parsed = JSON.parse(raw);
    // For plain-object fallbacks, shallow-merge so newly-added fields
    // surface their defaults when a stored payload pre-dates them.
    if (isPlainObject(fallback) && isPlainObject(parsed)) {
      return Object.assign(cloneDefault(fallback), parsed);
    }
    return parsed;
  } catch (e) {
    return cloneDefault(fallback);
  }
}

export function writeJson(key, value) {
  const ls = safeStorage();
  if (!ls) return;
  try { ls.setItem(key, JSON.stringify(value)); } catch (e) { /* quota / disabled */ }
}

export function readString(key) {
  const ls = safeStorage();
  if (!ls) return null;
  try { return ls.getItem(key); } catch (e) { return null; }
}

export function writeString(key, value) {
  const ls = safeStorage();
  if (!ls) return;
  try { ls.setItem(key, String(value)); } catch (e) { /* quota / disabled */ }
}

export function remove(key) {
  const ls = safeStorage();
  if (!ls) return;
  try { ls.removeItem(key); } catch (e) { /* disabled */ }
}

// Returns the array of keys whose name starts with `prefix` (default:
// the GradeBlaze namespace). Used by the data-export tool in the Coach.
export function keys(prefix) {
  const ls = safeStorage();
  if (!ls) return [];
  const p = prefix == null ? DEFAULT_PREFIX : String(prefix);
  const out = [];
  try {
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && k.indexOf(p) === 0) out.push(k);
    }
  } catch (e) { /* disabled */ }
  return out;
}

// Returns { key: rawString } for every key with the prefix. Used by the
// Coach's export-progress feature so the JSON download is self-contained.
export function snapshot(prefix) {
  const ls = safeStorage();
  if (!ls) return {};
  const ks = keys(prefix);
  const out = {};
  ks.forEach(function (k) {
    try { out[k] = ls.getItem(k); } catch (e) { /* skip unreadable key */ }
  });
  return out;
}

// --- helpers --------------------------------------------------------------

function isPlainObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function cloneDefault(fallback) {
  if (fallback == null) return fallback === undefined ? null : fallback;
  try { return JSON.parse(JSON.stringify(fallback)); } catch (e) { return fallback; }
}
