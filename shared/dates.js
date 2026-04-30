// GradeBlaze — date helpers (shared, pure).
//
// Pure date functions used across the engagement domain. ISO format
// throughout (YYYY-MM-DD) so date strings sort lexicographically and
// can be passed around as plain values.
//
// No imports — leaf module.

export function todayIso() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}

export function isoOffset(iso, days) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}

// ISO week start = Monday. Returns the Monday of the week containing `iso`.
export function isoWeekStart(iso) {
  const d = new Date(iso + "T00:00:00");
  const dow = d.getDay(); // 0 Sun .. 6 Sat
  const diffToMonday = (dow === 0 ? -6 : 1 - dow);
  d.setDate(d.getDate() + diffToMonday);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}

export function daysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return null;
  const from = new Date(fromIso + "T00:00:00");
  const to = new Date(toIso + "T00:00:00");
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}
