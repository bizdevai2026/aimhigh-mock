// AimHigh Mock Prep — Coach (parent dashboard).
//
// Reads the engagement state from localStorage and renders three blocks:
//   - Today's session (latest session done today, if any)
//   - Weak topics (last 7 days, ranked)
//   - 7-day history (one row per day)
//
// All read-only — never mutates state from here.

import "./mock.js?v=20260526"; // shared header behaviour (sound toggle)
import {
  readResults,
  weakTopics,
  todayIso,
  isoOffset,
  isoWeekStart,
  subjectLadder,
  isPaused,
  setPaused
} from "./engagement.js?v=20260526";

import { subjectName, listSubjects } from "./questions.js?v=20260526";
import { playCoachEnter } from "./sounds.js?v=20260526";
import { isParentRole } from "./profile.js?v=20260526";
import {
  remove as storageRemove,
  writeString as storageWriteString,
  keys as storageKeys,
  snapshot as storageSnapshot
} from "./platform/storage.js?v=20260526";
import { escapeHtml } from "./shared/dom.js?v=20260526";
import { prettyTopic } from "./shared/subjects.js?v=20260526";

// Wrap paint() in try/finally so a single broken painter doesn't strand
// the page. The error catcher will surface the throw; finally guarantees
// the loading guard is cancelled either way.
try { paint(); }
finally {
  if (typeof window.GBReady === "function") window.GBReady();
}

function paint() {
  paintRoleBadge();
  paintLadderBySubject();
  paintToday();
  paintWeak();
  paintHistory();
  paintCalendar();
  paintDataTools();
  // Audio is gesture-locked on mobile until first tap — playing here will
  // be silent on a cold-load Coach view and fire on subsequent taps. That
  // is the right behaviour: no surprise audio on a parent-only page.
  playCoachEnter();
}

// --- Calendar heatmap ------------------------------------------------------
//
// Six-week grid (rows = weeks, oldest at top; columns = Mon–Sun) where
// each cell's intensity reflects XP earned that day. Lets a parent
// spot rhythm and consistency at a glance — not just "did he train",
// but "which days, how heavily, with what regularity".
//
// Read-only: aggregates from readResults(), never writes state.
// Auto-injects after the 7-day history block; safe to re-run (idempotent).

function paintCalendar() {
  const main = document.querySelector(".mock-main");
  if (!main) return;
  if (document.getElementById("coachCalendar")) return;

  const today = todayIso();
  const xpByDay = dailyXpFromResults();

  // Anchor on this week's Monday and step back five weeks.
  const thisMonday = isoWeekStart(today);
  const firstMonday = isoOffset(thisMonday, -7 * 5);

  let totalSessions = 0;
  let activeDays = 0;
  Object.keys(xpByDay).forEach(function (iso) {
    if (xpByDay[iso] > 0) activeDays += 1;
  });

  let cellsHtml = "";
  for (let w = 0; w < 6; w++) {
    const weekStart = isoOffset(firstMonday, 7 * w);
    for (let d = 0; d < 7; d++) {
      const iso = isoOffset(weekStart, d);
      const xp = xpByDay[iso] || 0;
      const isToday = iso === today;
      const isFuture = iso > today; // ISO YYYY-MM-DD compares lexicographically
      let tier = 0;
      if (!isFuture) {
        if (xp >= 100) tier = 4;
        else if (xp >= 60) tier = 3;
        else if (xp >= 30) tier = 2;
        else if (xp > 0)   tier = 1;
      }
      const cls = "mock-cal-cell cal-" + tier
        + (isToday  ? " is-today"  : "")
        + (isFuture ? " is-future" : "");
      const label = isFuture
        ? iso + " — upcoming"
        : iso + " — " + xp + " XP" + (xp >= 30 ? " (goal hit)" : "");
      cellsHtml += "<div class=\"" + cls + "\" title=\"" + label + "\" aria-label=\"" + label + "\"></div>";
    }
  }

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    .map(function (d) { return "<div class=\"mock-cal-dow\">" + d + "</div>"; })
    .join("");

  // Total sessions over the visible window
  readResults().forEach(function (r) {
    if (!r || !r.dateIso) return;
    if (r.dateIso < firstMonday || r.dateIso > today) return;
    totalSessions += 1;
  });

  const block = document.createElement("section");
  block.id = "coachCalendar";
  block.className = "mock-coach-block";
  block.innerHTML =
    "<h2>Last 6 weeks</h2>" +
    "<p class=\"mock-coach-empty\" style=\"margin-bottom:0.6rem\">" +
      activeDays + " active day" + (activeDays === 1 ? "" : "s") +
      " &middot; " + totalSessions + " session" + (totalSessions === 1 ? "" : "s") +
    "</p>" +
    "<div class=\"mock-cal-grid-head\">" + dayLabels + "</div>" +
    "<div class=\"mock-cal-grid\">" + cellsHtml + "</div>" +
    "<div class=\"mock-cal-legend\">" +
      "<span class=\"mock-cal-legend-text\">Less</span>" +
      "<span class=\"mock-cal-legend-cell cal-0\"></span>" +
      "<span class=\"mock-cal-legend-cell cal-1\"></span>" +
      "<span class=\"mock-cal-legend-cell cal-2\"></span>" +
      "<span class=\"mock-cal-legend-cell cal-3\"></span>" +
      "<span class=\"mock-cal-legend-cell cal-4\"></span>" +
      "<span class=\"mock-cal-legend-text\">More</span>" +
    "</div>";

  // Insert after the History block so it sits below the 7-day list.
  const history = document.getElementById("coachHistory");
  if (history && history.parentNode === main) {
    history.parentNode.insertBefore(block, history.nextSibling);
  } else {
    main.appendChild(block);
  }
}

function dailyXpFromResults() {
  const out = {};
  readResults().forEach(function (r) {
    if (!r || !r.dateIso) return;
    const correct = (r.score != null)
      ? r.score
      : (r.items || []).filter(function (it) { return it.correct; }).length;
    out[r.dateIso] = (out[r.dateIso] || 0) + correct * 10;
  });
  return out;
}

// --- Data tools (parent-only) ----------------------------------------------
//
// Export downloads every aimhigh-mock-* key (except the transient session
// and resume keys) as a single JSON file. Import replaces local state
// with the contents of an export file. Useful for moving between devices
// and as a manual backup.

function paintDataTools() {
  if (!isParentRole()) return;
  const main = document.querySelector(".mock-main");
  if (!main) return;
  if (document.getElementById("coachData")) return;
  const paused = isPaused();
  const block = document.createElement("section");
  block.id = "coachData";
  block.className = "mock-coach-block";
  block.innerHTML =
    "<h2>Parent controls</h2>" +
    "<p class=\"mock-coach-empty\" style=\"margin-bottom: 0.6rem\">Back up, restore, pause for holiday, or reset training data. Your child's name and PIN are always preserved unless you remove them via import.</p>" +
    "<div class=\"mock-data-actions\">" +
      "<button type=\"button\" class=\"mock-button\" id=\"dataExportBtn\">Export progress</button>" +
      "<label class=\"mock-button mock-button-ghost\" for=\"dataImportInput\">Import progress</label>" +
      "<input type=\"file\" id=\"dataImportInput\" accept=\"application/json\" style=\"display:none\" />" +
      "<button type=\"button\" class=\"mock-button mock-button-paused\" id=\"pauseToggleBtn\">" +
        (paused ? "Resume progress" : "Pause progress") +
      "</button>" +
      "<button type=\"button\" class=\"mock-button mock-button-warn\" id=\"resetTrainingBtn\">Reset training data</button>" +
    "</div>" +
    "<p id=\"dataMsg\" class=\"mock-data-msg\" aria-live=\"polite\"></p>";
  main.appendChild(block);
  document.getElementById("dataExportBtn").addEventListener("click", exportProgress);
  document.getElementById("dataImportInput").addEventListener("change", function (e) {
    const file = e.target.files && e.target.files[0];
    if (file) importProgress(file);
    e.target.value = "";
  });
  document.getElementById("pauseToggleBtn").addEventListener("click", togglePause);
  document.getElementById("resetTrainingBtn").addEventListener("click", resetTrainingData);
}

// Holiday-mode toggle. While paused, all engagement writers no-op so the
// streak survives an arbitrary gap. On resume, lastDateIso is fast-forwarded
// to yesterday so the next training session continues the streak naturally.
function togglePause() {
  const paused = isPaused();
  const ok = paused
    ? confirm(
        "Resume training?\n\n" +
        "The streak will pick up from where it was. Your child's next " +
        "session that hits the daily goal will continue the streak."
      )
    : confirm(
        "Pause training?\n\n" +
        "Used for holidays — the streak is preserved while paused. Your " +
        "child can still play during the pause but nothing counts " +
        "(no XP, no streak progress, no weak-topic logging).\n\n" +
        "Resume from this same panel when they're back."
      );
  if (!ok) return;
  setPaused(!paused);
  showDataMsg(paused ? "Resumed." : "Paused. Resume when ready.", "ok");
  setTimeout(function () { location.reload(); }, 700);
}

// Wipe training data only — profile + PIN preserved. Useful after a demo
// went into the wrong account, or to start a fresh term.
function resetTrainingData() {
  const ok = confirm(
    "Reset training data?\n\n" +
    "Wipes streak, XP, weekly tier, results log, weak topics, and the " +
    "anti-repeat seen log. Your child's name and PIN are preserved.\n\n" +
    "This cannot be undone unless you exported first."
  );
  if (!ok) return;
  const keysToWipe = [
    "aimhigh-mock-streak",
    "aimhigh-mock-xp-today",
    "aimhigh-mock-week",
    "aimhigh-mock-week-last-hit-day",
    "aimhigh-mock-results",
    "aimhigh-mock-seen",
    "aimhigh-mock-misses",
    "aimhigh-mock-tour-seen",
    "aimhigh-mock-resume-warmup",
    "aimhigh-mock-resume-sprint",
    "aimhigh-mock-resume-paper",
    "aimhigh-mock-pause"
  ];
  keysToWipe.forEach(function (k) { storageRemove(k); });
  showDataMsg("Training data reset. Profile + PIN preserved.", "ok");
  setTimeout(function () { location.reload(); }, 800);
}

function showDataMsg(text, kind) {
  const el = document.getElementById("dataMsg");
  if (!el) return;
  el.textContent = text;
  el.className = "mock-data-msg" + (kind ? " " + kind : "");
}

function exportProgress() {
  const bundle = collectBundle();
  const filename = "gradeblaze-progress-" + todayIso() + ".json";
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  showDataMsg("Saved as " + filename, "ok");
}

function collectBundle() {
  const out = {
    exportedAt: new Date().toISOString(),
    appVersion: "20260429",
    keys: {}
  };
  // Pull every aimhigh-mock-* key, then drop the ones we deliberately
  // never export (device-local session and transient resume buffers).
  const all = storageSnapshot("aimhigh-mock-");
  Object.keys(all).forEach(function (k) {
    if (k === "aimhigh-mock-session") return;             // device-local
    if (k.indexOf("aimhigh-mock-resume-") === 0) return;  // transient
    out.keys[k] = all[k];
  });
  return out;
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    let data;
    try { data = JSON.parse(e.target.result); }
    catch (err) { showDataMsg("Couldn't read that file — not valid JSON.", "err"); return; }
    if (!data || !data.keys || typeof data.keys !== "object") {
      showDataMsg("This doesn't look like a GradeBlaze export.", "err");
      return;
    }
    const keyCount = Object.keys(data.keys).length;
    const ok = confirm(
      "Replace current progress with the imported data?\n\n" +
      keyCount + " keys will be restored. The current profile and history on this device will be overwritten.\n\n" +
      "This cannot be undone unless you exported first."
    );
    if (!ok) { showDataMsg("Import cancelled.", "err"); return; }
    // Wipe existing aimhigh-mock-* keys, then write imported ones
    storageKeys("aimhigh-mock-").forEach(function (k) { storageRemove(k); });
    Object.keys(data.keys).forEach(function (k) {
      storageWriteString(k, data.keys[k]);
    });
    showDataMsg("Imported. Reloading…", "ok");
    setTimeout(function () { location.replace("welcome.html"); }, 800);
  };
  reader.onerror = function () { showDataMsg("Couldn't read the file.", "err"); };
  reader.readAsText(file);
}

// Small badge on the Coach hero so the viewer always knows whose lens
// they're looking through.
function paintRoleBadge() {
  const greet = document.getElementById("dashGreeting");
  if (!greet) return;
  // The kid sees their own name as the role badge; parent sees "PARENT VIEW".
  // Keeps the parent registrar tone out of the kid-facing surface.
  const role = isParentRole() ? "PARENT VIEW" : "MY VIEW";
  // Insert badge before the existing greeting line; preserve any name text.
  if (!document.getElementById("dashRoleBadge")) {
    const badge = document.createElement("span");
    badge.id = "dashRoleBadge";
    badge.className = "mock-coach-role-badge " + (isParentRole() ? "is-parent" : "is-child");
    badge.textContent = role;
    greet.parentNode.insertBefore(badge, greet);
  }
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
      modeDisplayName(latest.mode) + " &mdash; " + correct + " / " + total +
      " (" + pct + "%)" +
      (minutes != null ? " &middot; " + minutes + " min" : "") +
    "</p>" +
    (subjectsHtml ? "<ul class=\"mock-coach-list\">" + subjectsHtml + "</ul>" : "");
}

// Map internal mode keys to the display names a parent recognises.
// "distance" is the legacy internal name for the timed full mock — must
// never surface as "DISTANCE" in the Coach UI.
function modeDisplayName(mode) {
  switch (String(mode || "").toLowerCase()) {
    case "warmup":   return "WARM-UP";
    case "sprint":   return "SPRINT";
    case "drill":    return "TOPIC DRILL";
    case "distance": return "FULL MOCK";
    case "paper":    return "FULL MOCK";
    case "mock":     return "FULL MOCK";
    default:         return String(mode || "").toUpperCase();
  }
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

  // Child sees clickable rows that jump straight to a 5-question topic
  // drill. Parent view stays read-only — drilling would imply the parent
  // is training, which it isn't.
  const childCanDrill = !isParentRole();

  let rowsHtml = "";
  weak.slice(0, 8).forEach(function (w) {
    const inner =
      "<div class=\"mock-coach-row-left\">" +
        "<span class=\"mock-coach-row-subject\">" + escapeHtml(subjectName(w.subject)) + "</span>" +
        "<span class=\"mock-coach-row-topic\">" + escapeHtml(prettyTopic(w.topic)) + "</span>" +
      "</div>" +
      "<span class=\"mock-coach-row-stat\">" + w.missCount + " miss" + (w.missCount === 1 ? "" : "es") + "</span>";
    if (childCanDrill) {
      const href = "subject.html?s=" + encodeURIComponent(w.subject) + "&t=" + encodeURIComponent(w.topic);
      rowsHtml +=
        "<li class=\"mock-coach-row mock-coach-row-link\">" +
          "<a class=\"mock-coach-row-anchor\" href=\"" + href + "\">" + inner + "</a>" +
        "</li>";
    } else {
      rowsHtml += "<li class=\"mock-coach-row\">" + inner + "</li>";
    }
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

// prettyTopic + escapeHtml now imported from shared/* — the dashboard's
// previous prettyTopic returned "(no topic)" for empty input vs the
// shared one's "". The difference only manifests on malformed data,
// which the schema validator now flags upstream.

function formatDayLabel(iso) {
  const today = todayIso();
  const yest = isoOffset(today, -1);
  if (iso === today) return "Today";
  if (iso === yest) return "Yesterday";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

