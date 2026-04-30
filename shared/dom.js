// GradeBlaze — DOM + string helpers (shared, pure).
//
// Tiny zero-dependency utilities used across multiple modules. Each
// of these used to be redefined in every runner; consolidating them
// here removes ~60 lines of duplication and gives the next developer
// (or AI) a single search target.

// Escape an arbitrary string for safe interpolation into an HTML
// fragment via innerHTML. Covers the five characters that break tags
// or attribute boundaries.
export function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Escape for use inside an HTML attribute value (broader than escapeHtml
// because backticks can break some legacy parsers — keep them intact
// since we never use backtick-delimited attributes).
export function escapeAttr(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Shorthand DOM lookup. Returns null if not found (matches getElementById).
export function byId(id) { return document.getElementById(id); }

// First-match URL param parser. Used by every runner that routes by
// query string (?s=, ?t=, ?run=). Returns null on no match.
//
//   match(location.search, /[?&]s=([a-z\-]+)/i) → "science" or null
export function match(s, re) {
  const m = String(s || "").match(re);
  return m ? m[1] : null;
}
