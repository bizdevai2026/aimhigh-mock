// GradeBlaze — content registry loader.
//
// Wraps fetch + cache + schema-aware accessors for data/registry.json.
// Replaces the hard-coded SUBJECTS array that used to live at the top
// of questions.js — the registry is now the canonical source of truth
// for subjects, topics, and year-level availability.
//
// One module-scope cache per page load (same pattern as questions.js).

import * as logger from "../../platform/logger.js?v=20260525";

let _cache = null;
let _inFlight = null;

export async function loadRegistry() {
  if (_cache) return _cache;
  if (_inFlight) return _inFlight;
  _inFlight = (async function () {
    const t0 = Date.now();
    try {
      const r = await fetch("data/registry.json", { cache: "no-cache" });
      if (!r.ok) {
        logger.error("registry", "fetch HTTP " + r.status);
        throw new Error("registry HTTP " + r.status);
      }
      const data = await r.json();
      if (!data || !Array.isArray(data.subjects) || !Array.isArray(data.topics)) {
        logger.error("registry", "bad shape", { keys: data ? Object.keys(data) : null });
        throw new Error("registry shape invalid");
      }
      _cache = data;
      logger.info("registry", "loaded in " + (Date.now() - t0) + "ms",
        { subjects: data.subjects.length, topics: data.topics.length, year_levels: data.year_levels });
      return data;
    } finally {
      _inFlight = null;
    }
  })();
  return _inFlight;
}

// Synchronous accessors. Caller must have awaited loadRegistry() first.
export function listSubjects() {
  return (_cache && _cache.subjects) ? _cache.subjects.slice() : [];
}

export function subjectName(id) {
  if (!_cache) return id;
  const s = _cache.subjects.find(function (x) { return x.id === id; });
  return s ? s.name : id;
}

// Topics for a subject, optionally filtered to a year level.
// Order: registry-declared `order` field if present, else alphabetical.
export function topicsForSubject(subjectId, opts) {
  if (!_cache) return [];
  const yearLevel = opts && typeof opts.yearLevel === "number" ? opts.yearLevel : null;
  const filtered = _cache.topics.filter(function (t) {
    if (t.subject !== subjectId) return false;
    if (yearLevel != null && Array.isArray(t.year_levels_available)
        && t.year_levels_available.indexOf(yearLevel) === -1) return false;
    return true;
  });
  filtered.sort(function (a, b) {
    const ao = a.order != null ? a.order : 9999;
    const bo = b.order != null ? b.order : 9999;
    if (ao !== bo) return ao - bo;
    return a.id.localeCompare(b.id);
  });
  return filtered;
}

// Year levels in the registry. Default for the current build is [7].
export function availableYearLevels() {
  return (_cache && _cache.year_levels) ? _cache.year_levels.slice() : [7];
}
