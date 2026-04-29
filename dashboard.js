// AimHigh Mock Prep — Coach (parent dashboard).
//
// Reads the engagement state from localStorage and renders three blocks:
//   - Today's session (latest session done today, if any)
//   - Weak topics (last 7 days, ranked)
//   - 7-day history (one row per day)
//
// All read-only — never mutates state from here.

import "./mock.js"; // shared header behaviour (sound toggle)
import {
  readResults,
  weakTopics,
  todayIso,
  isoOffset,
  subjectLadder
} from "./engagement.js";

import { subjectName, listSubjects } from "./questions.js";
import { playCoachEnter } from "./sounds.js";

paint();

function paint() {
  paintLadderBySubject();
  paintToday();
  paintWeak();
  paintHistory();
  // Audio is gesture-locked on mobile until first tap — playing here will
  // be silent on a cold-load Coach view and fire on subsequent taps. That
  // is the right behaviour: no surprise audio on a parent-only page.
  playCoachEnter();
}

// --- LADDER BY SUBJECT ------------------------------------------------------

function paintLadderBySubject() {
  const block = document.getElementById("coachLadder");
  if (!block) return;
  const subjects = listSubjects();
  let rowsHtml = "";
  let anyData = false;
  subjects.forEach(function (s) {
    const ladder = subjectLadder(s.id);
    if (ladder.attempts > 0) anyData = true;
    rowsHtml +=
      "<li class=\"mock-coach-row\">" +
        "<div class=\"mock-coach-row-left\">" +
          "<span class=\"mock-coach-row-subject\">" + escapeHtml(s.name) + "</span>" +
          "<span class=\"mock-coach-row-topic\">" +
            (ladder.attempts > 0
              ? (ladder.attempts + " attempt" + (ladder.attempts === 1 ? "" : "s") + " &middot; " + Math.round(ladder.accuracy * 100) + "% accuracy")
              : "Not started yet") +
          "</span>" +
        "</div>" +
        "<span class=\"mock-ladder ladder-" + ladder.colour + "\">" + escapeHtml(ladder.tier) + "</span>" +
      "</li>";
  });
  block.innerHTML =
    "<h2>Development by subject</h2>" +
    (anyData
      ? "<ul class=\"mock-coach-list\">" + rowsHtml + "</ul>"
      : "<p class=\"mock-coach-empty\">No attempts yet. Once " + (subjectName("any") || "your child") + " runs a session, the ladder fills in here.</p>" +
        "<ul class=\"mock-coach-list\" style=\"margin-top:0.7rem\">" + rowsHtml + "</ul>");
}

// --- TODAY -----------------------------------------------------------------

function paintToday() {
  const block = document.getElementById("coachToday");
  if (!block) return;
  const today = todayIso();
  const sessions = readResults().filter(function (r) { return r.dateIso === today; });
  if (sessions.length === 0) {
    return; // empty state already in DOM
  }
  // Use the most recent session today
  const latest = sessions[sessions.length - 1];
  const correct = latest.score != null ? latest.score : (latest.items || []).filter(function (i) { return i.correct; }).length;
  const total = latest.total != null ? latest.total : (latest.items || []).length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const minutes = latest.durationSec ? Math.max(1, Math.round(latest.durationSec / 60)) : null;
  const subjectBreakdown = breakdownBySubject(latest.items || []);

  let subjectsHtml = "";
  Object.keys(subjectBreakdown).forEach(function (sid) {
    const b = subjectBreakdown[sid];
    subjectsHtml +=
      "<li class=\"mock-coach-row\">" +
        "<div class=\"mock-coach-row-left\">" +
          "<span class=\"mock-coach-row-subject\">" + escapeHtml(subjectName(sid)) + "</span>" +
          "<span class=\"mock-coach-row-topic\">" + b.correct + " / " + b.total + " correct</span>" +
        "</div>" +
        "<span class=\"mock-coach-row-stat " + (b.correct === b.total ? "ok" : "") + "\">" +
          Math.round((b.correct / b.total) * 100) + "%" +
        "</span>" +
      "</li>";
  });

  block.innerHTML =
    "<h2>Today's session</h2>" +
    "<p class=\"mock-coach-empty\" style=\"color: var(--mock-text-dim)\">" +
      latest.mode.toUpperCase() + " &mdash; " + correct + " / " + total +
      " (" + pct + "%)" +
      (minutes != null ? " &middot; " + minutes + " min" : "") +
    "</p>" +
    (subjectsHtml ? "<ul class=\"mock-coach-list\">" + subjectsHtml + "</ul>" : "");
}

function breakdownBySubject(items) {
  const out = {};
  items.forEach(function (it) {
    const s = it.subject || "unknown";
    if (!out[s]) out[s] = { total: 0, correct: 0 };
    out[s].total += 1;
    if (it.correct) out[s].correct += 1;
  });
  return out;
}

// --- WEAK TOPICS ------------------------------------------------------------

function paintWeak() {
  const block = document.getElementById("coachWeak");
  if (!block) return;
  const weak = weakTopics(7);
  if (weak.length === 0) return;

  let rowsHtml = "";
  weak.slice(0, 8).forEach(function (w) {
    rowsHtml +=
      "<li class=\"mock-coach-row\">" +
        "<div class=\"mock-coach-row-left\">" +
          "<span class=\"mock-coach-row-subject\">" + escapeHtml(subjectName(w.subject)) + "</span>" +
          "<span class=\"mock-coach-row-topic\">" + escapeHtml(prettyTopic(w.topic)) + "</span>" +
        "</div>" +
        "<span class=\"mock-coach-row-stat\">" + w.missCount + " miss" + (w.missCount === 1 ? "" : "es") + "</span>" +
      "</li>";
  });
  block.innerHTML =
    "<h2>Weak topics &mdash; last 7 days</h2>" +
    "<ul class=\"mock-coach-list\">" + rowsHtml + "</ul>";
}

// --- 7-DAY HISTORY ----------------------------------------------------------

function paintHistory() {
  const block = document.getElementById("coachHistory");
  if (!block) return;

  // Build a map dateIso -> aggregated stats from the results log
  const allResults = readResults();
  const dayMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = isoOffset(todayIso(), -i);
    dayMap[d] = { dateIso: d, sessions: 0, total: 0, correct: 0 };
  }
  allResults.forEach(function (r) {
    if (!dayMap[r.dateIso]) return;
    dayMap[r.dateIso].sessions += 1;
    dayMap[r.dateIso].total += (r.total != null ? r.total : (r.items || []).length);
    dayMap[r.dateIso].correct += (r.score != null ? r.score : (r.items || []).filter(function (it) { return it.correct; }).length);
  });

  const days = Object.values(dayMap);
  const anyData = days.some(function (d) { return d.sessions > 0; });
  if (!anyData) return;

  let rowsHtml = "";
  days.forEach(function (d) {
    const pct = d.total ? Math.round((d.correct / d.total) * 100) : null;
    const dayLabel = formatDayLabel(d.dateIso);
    let stat;
    if (d.sessions === 0) {
      stat = "&mdash;";
    } else {
      stat = pct + "%";
    }
    rowsHtml +=
      "<li class=\"mock-coach-row\">" +
        "<div class=\"mock-coach-row-left\">" +
          "<span class=\"mock-coach-row-subject\">" + escapeHtml(dayLabel) + "</span>" +
          "<span class=\"mock-coach-row-topic\">" +
            (d.sessions === 0
              ? "No session"
              : (d.correct + " / " + d.total + " correct &middot; " + d.sessions + " session" + (d.sessions === 1 ? "" : "s"))) +
          "</span>" +
        "</div>" +
        "<span class=\"mock-coach-row-stat " + (pct != null && pct >= 70 ? "ok" : "") + "\">" + stat + "</span>" +
      "</li>";
  });
  block.innerHTML =
    "<h2>Last 7 days</h2>" +
    "<ul class=\"mock-coach-list\">" + rowsHtml + "</ul>";
}

// --- helpers ----------------------------------------------------------------

function prettyTopic(t) {
  if (!t) return "(no topic)";
  return String(t).replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

function formatDayLabel(iso) {
  const today = todayIso();
  const yest = isoOffset(today, -1);
  if (iso === today) return "Today";
  if (iso === yest) return "Yesterday";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
