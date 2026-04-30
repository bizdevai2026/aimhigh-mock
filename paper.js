// AimHigh Mock Prep — Full Distance runner (multi-subject mock paper).
//
// 30 questions across all 7 subjects, 30-minute timer, no second tries,
// no explainer reveal, no "train again". Result card shows the score,
// XP, streak status, and a per-subject breakdown.
//
// Two states: idle (intro + START button) and running (timer + session).

import "./mock.js?v=20260516"; // shared header behaviour (sound toggle)
import { loadAllQuestions, listSubjects, subjectName } from "./questions.js?v=20260516";
import { noteSessionResult, readStreak } from "./engagement.js?v=20260516";
import { playLevelUp, playModeStartMock, makeListenButton, hapticStreak } from "./sounds.js?v=20260516";
import { getVisual } from "./visuals.js?v=20260516";
import { isParentRole } from "./profile.js?v=20260516";
import { readJson as storageReadJson, writeJson as storageWriteJson, remove as storageRemove } from "./platform/storage.js?v=20260516";

if (isParentRole()) { location.replace("dashboard.html"); }

const ROUND_SIZE = 30;
const ROUND_MINUTES = 30;
const LETTERS = ["A", "B", "C", "D", "E", "F"];

const RESUME_KEY = "aimhigh-mock-resume-paper";
// Timer is the gating expiry — no need for a separate TTL on the saved state.
// If endsAt has passed when we restore, we just finalise as timed-out.

const root = document.getElementById("paperRoot");

let pool = null;
let session = null;
let timerInterval = null;
let endsAt = null;

start().finally(function () {
  if (typeof window.GBReady === "function") window.GBReady();
});

async function start() {
  if (!root) {
    if (window.GBErr) window.GBErr.paint("missing root", "paperRoot element not found in paper.html");
    return;
  }
  paintIntroLoading();
  try {
    pool = await loadAllQuestions();
  } catch (e) {
    paintError("Couldn't load questions. Check your connection and refresh.");
    return;
  }
  if (!pool || pool.length === 0) {
    paintError("No questions available yet.");
    return;
  }
  // Mid-session resume — refreshing during a 30-min timed paper shouldn't
  // bin everything. Timer is preserved; if it has already expired, we
  // finalise immediately as a time-out.
  const saved = loadResumeState();
  if (saved) {
    const items = reconstituteItems(pool, saved.items);
    if (items) {
      if (Date.now() >= saved.endsAt) {
        // Timer expired while away — score what they had and stop.
        session = {
          items: items,
          index: saved.results ? saved.results.length : 0,
          results: saved.results || [],
          startedAt: saved.startedAt || Date.now()
        };
        endsAt = saved.endsAt;
        clearResumeState();
        finalise(true);
        return;
      }
      paintResumePrompt(items, saved);
      return;
    }
    clearResumeState();
  }
  paintIntro();
}

function paintResumePrompt(items, saved) {
  const answered = saved.results ? saved.results.length : 0;
  const total = items.length;
  const remainingMs = Math.max(0, saved.endsAt - Date.now());
  const remainingMin = Math.ceil(remainingMs / 60000);
  root.innerHTML =
    "<section class=\"mock-stub-card mock-resume-card\">" +
      "<h2>Resume your full mock?</h2>" +
      "<p class=\"mock-resume-meta\">You'd answered <strong>" + answered + " of " + total + "</strong>. About <strong>" + remainingMin + " minute" + (remainingMin === 1 ? "" : "s") + "</strong> remain on the timer.</p>" +
      "<div class=\"mock-resume-actions\">" +
        "<button type=\"button\" class=\"mock-button\" id=\"resumeBtn\">Resume</button>" +
        "<button type=\"button\" class=\"mock-button mock-button-ghost\" id=\"freshBtn\">Start fresh</button>" +
      "</div>" +
    "</section>";
  document.getElementById("resumeBtn").addEventListener("click", function () {
    session = {
      items: items,
      index: saved.index,
      results: saved.results || [],
      startedAt: saved.startedAt || Date.now()
    };
    endsAt = saved.endsAt;
    startTimer();
    paintQuestion();
  });
  document.getElementById("freshBtn").addEventListener("click", function () {
    clearResumeState();
    paintIntro();
  });
}

// --- Resume helpers --------------------------------------------------------

function saveResumeState() {
  if (!session || !endsAt) return;
  storageWriteJson(RESUME_KEY, {
    items: session.items.map(function (q) { return q.id; }),
    index: session.results.length,
    results: session.results,
    startedAt: session.startedAt,
    endsAt: endsAt
  });
}

function loadResumeState() {
  const data = storageReadJson(RESUME_KEY, null);
  if (!data || !data.endsAt) return null;
  if (!Array.isArray(data.items) || data.items.length === 0) return null;
  return data;
}

function clearResumeState() {
  storageRemove(RESUME_KEY);
}

function reconstituteItems(p, ids) {
  const byId = {};
  p.forEach(function (q) { byId[q.id] = q; });
  const out = [];
  for (let i = 0; i < ids.length; i++) {
    const q = byId[ids[i]];
    if (!q) return null;
    out.push(q);
  }
  return out;
}

// ---------- Intro ----------------------------------------------------------

function paintIntroLoading() {
  root.innerHTML =
    "<section class=\"mock-stub-card\"><p class=\"mock-coach-empty\">Loading&hellip;</p></section>";
}

function paintIntro() {
  root.innerHTML =
    "<section class=\"mock-stub-hero\">" +
      "<span class=\"mock-stub-tag\">Final week</span>" +
      "<h1 class=\"mock-stub-title\">FULL MOCK</h1>" +
      "<p class=\"mock-stub-quote\">\"Race-day simulation.\"</p>" +
    "</section>" +
    "<section class=\"mock-stub-card\">" +
      "<h2>Before you start</h2>" +
      "<ul class=\"mock-stub-list\">" +
        "<li><strong>30 questions</strong>, across all 7 subjects</li>" +
        "<li><strong>30-minute timer</strong> &mdash; finishes automatically when it runs out</li>" +
        "<li>No second tries. No explainers between questions.</li>" +
        "<li>This is closest to real exam conditions &mdash; do it once or twice in the final week before the test.</li>" +
      "</ul>" +
      "<button type=\"button\" class=\"mock-button\" id=\"paperStartBtn\">Start the paper</button>" +
      " " +
      "<a class=\"mock-button mock-button-ghost\" href=\"index.html\">Back</a>" +
    "</section>";

  const btn = document.getElementById("paperStartBtn");
  if (btn) btn.addEventListener("click", begin);
}

function paintError(msg) {
  root.innerHTML =
    "<section class=\"mock-stub-card\">" +
      "<h2>Not ready yet</h2>" +
      "<p>" + escapeHtml(msg) + "</p>" +
      "<a class=\"mock-button\" href=\"index.html\">Back</a>" +
    "</section>";
}

// ---------- Begin ----------------------------------------------------------

function begin() {
  const items = pickPaperQuestions(pool, ROUND_SIZE);
  if (items.length === 0) {
    paintError("No questions available.");
    return;
  }
  session = {
    items: items,
    index: 0,
    results: [],
    startedAt: Date.now()
  };
  endsAt = Date.now() + ROUND_MINUTES * 60 * 1000;
  saveResumeState();
  playModeStartMock();
  startTimer();
  paintQuestion();
}

// Mixed-subject picker for the paper. Goal: every subject represented,
// then top up with whatever else is fresh (cooldown-aware).
//
// Spell + speak questions (typing / speaking French) are filtered out
// here — the mock paper is a multi-subject MCQ paper, mixing them in
// would be jarring. They still surface in WARM-UP and SPRINT.
function pickPaperQuestions(p, n) {
  const subjects = listSubjects();
  const bySubject = {};
  subjects.forEach(function (s) { bySubject[s.id] = []; });
  p.forEach(function (q) {
    if (q && (q.type === "spell" || q.type === "speak")) return;
    if (bySubject[q.subject]) bySubject[q.subject].push(q);
  });
  // shuffle each subject's pool
  Object.keys(bySubject).forEach(function (k) { bySubject[k] = shuffle(bySubject[k]); });
  // round-robin draw to balance
  const out = [];
  let drained = false;
  while (!drained && out.length < n) {
    drained = true;
    for (let i = 0; i < subjects.length && out.length < n; i++) {
      const sid = subjects[i].id;
      const arr = bySubject[sid];
      if (arr.length > 0) {
        out.push(arr.shift());
        drained = false;
      }
    }
  }
  return out;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

// ---------- Timer ----------------------------------------------------------

function startTimer() {
  stopTimer();
  timerInterval = setInterval(function () {
    paintTimer();
    if (Date.now() >= endsAt) {
      stopTimer();
      finalise(true);
    }
  }, 500);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function paintTimer() {
  const el = document.getElementById("paperTimer");
  if (!el) return;
  const remaining = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  el.textContent = m + ":" + (s < 10 ? "0" + s : s);
  if (remaining < 60) el.classList.add("urgent");
}

// ---------- Question -------------------------------------------------------

function paintQuestion() {
  if (!session) return;
  const q = session.items[session.index];
  const total = session.items.length;
  const i = session.index;
  const pct = Math.round((i / total) * 100);

  root.innerHTML =
    "<section class=\"mock-session\">" +
      "<div class=\"mock-session-progress\">" +
        "<div class=\"mock-session-progress-bar\">" +
          "<div class=\"mock-session-progress-fill\" style=\"width:" + pct + "%\"></div>" +
        "</div>" +
        "<span class=\"mock-session-progress-text\" id=\"paperTimer\">--:--</span>" +
      "</div>" +
      "<div class=\"mock-session-card\" id=\"sessionCard\">" +
        "<span class=\"mock-session-subject\">" + escapeHtml(subjectLabel(q)) + " &middot; " + (i + 1) + "/" + total + "</span>" +
        renderVisual(q) +
        "<p class=\"mock-session-prompt\">" + escapeHtml(q.prompt) + "</p>" +
        "<div class=\"mock-session-options\" id=\"sessionOptions\"></div>" +
      "</div>" +
    "</section>";

  paintTimer();

  // Listen button on French questions (any with `audio`) — KS3 MFL
  // listening practice survives even in mock-paper conditions.
  const card = document.getElementById("sessionCard");
  if (card && q.audio) {
    const btn = makeListenButton(q.audio);
    if (btn) {
      const subj = card.querySelector(".mock-session-subject");
      if (subj && subj.nextSibling) card.insertBefore(btn, subj.nextSibling);
      else card.appendChild(btn);
    }
  }

  const optsEl = document.getElementById("sessionOptions");
  q.options.forEach(function (opt, idx) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mock-session-option";
    btn.dataset.idx = String(idx);
    btn.innerHTML =
      "<span class=\"mock-session-option-letter\">" + LETTERS[idx] + "</span>" +
      "<span>" + escapeHtml(opt) + "</span>";
    btn.addEventListener("click", function () { onAnswer(idx); });
    optsEl.appendChild(btn);
  });
}

function onAnswer(chosenIdx) {
  if (!session) return;
  const q = session.items[session.index];
  const correct = chosenIdx === q.answer;
  session.results.push({
    id: q.id,
    subject: q.subject,
    topic: q.topic,
    correct: correct
  });
  saveResumeState();
  // No reveal, no second tries — just advance.
  session.index += 1;
  if (session.index >= session.items.length) {
    stopTimer();
    finalise(false);
  } else {
    paintQuestion();
  }
}

// ---------- Finalise + result ---------------------------------------------

function finalise(timedOut) {
  clearResumeState();
  // Pad results with skipped (incorrect) entries if timed out partway through.
  if (session.index < session.items.length) {
    for (let i = session.index; i < session.items.length; i++) {
      const q = session.items[i];
      session.results.push({ id: q.id, subject: q.subject, topic: q.topic, correct: false });
    }
  }
  const correctCount = session.results.filter(function (r) { return r.correct; }).length;
  const total = session.items.length;
  const durationSec = Math.round((Date.now() - session.startedAt) / 1000);
  const after = noteSessionResult({
    mode: "distance",
    subject: null,
    items: session.results,
    score: correctCount,
    total: total,
    durationSec: durationSec
  });
  paintResult(correctCount, total, after, timedOut);
}

function paintResult(score, total, after, timedOut) {
  const xpGained = after.xpGained;
  const goalHitNow = after.xp.before < after.xp.goal && after.xp.after >= after.xp.goal;
  const streak = readStreak();
  if (goalHitNow) { playLevelUp(); hapticStreak(); }
  let streakLine;
  if (goalHitNow) {
    streakLine = "<span>&#128293; <strong>" + streak.current + "-day streak</strong> &mdash; goal hit</span>";
  } else if (after.xp.after >= after.xp.goal) {
    streakLine = "<span>&#128293; <strong>" + streak.current + "-day streak</strong> &mdash; goal already hit today</span>";
  } else {
    const remaining = after.xp.goal - after.xp.after;
    streakLine = "<span>" + remaining + " XP to go for today's streak</span>";
  }

  const breakdown = subjectBreakdown(session.results);
  let breakdownHtml = "";
  Object.keys(breakdown).forEach(function (sid) {
    const b = breakdown[sid];
    const pct = Math.round((b.correct / b.total) * 100);
    breakdownHtml +=
      "<li class=\"mock-coach-row\">" +
        "<div class=\"mock-coach-row-left\">" +
          "<span class=\"mock-coach-row-subject\">" + escapeHtml(subjectName(sid)) + "</span>" +
          "<span class=\"mock-coach-row-topic\">" + b.correct + " / " + b.total + " correct</span>" +
        "</div>" +
        "<span class=\"mock-coach-row-stat " + (pct >= 70 ? "ok" : "") + "\">" + pct + "%</span>" +
      "</li>";
  });

  root.innerHTML =
    "<section class=\"mock-result\">" +
      "<span class=\"mock-result-eyebrow\">" +
        (timedOut ? "Time's up" : "Paper complete") +
      "</span>" +
      "<span class=\"mock-result-score\">" + score + "</span>" +
      "<span class=\"mock-result-score-meta\">out of " + total + "</span>" +
      "<span class=\"mock-result-xp\">+" + xpGained + " XP</span>" +
      "<div class=\"mock-result-streak\">" + streakLine + "</div>" +
      "<div class=\"mock-result-actions\">" +
        "<a class=\"mock-button\" href=\"dashboard.html\">View Coach</a>" +
        "<a class=\"mock-button mock-button-ghost\" href=\"index.html\">Done</a>" +
      "</div>" +
    "</section>" +
    "<section class=\"mock-coach-block\">" +
      "<h2>By subject</h2>" +
      "<ul class=\"mock-coach-list\">" + breakdownHtml + "</ul>" +
    "</section>";
}

function subjectBreakdown(items) {
  const out = {};
  items.forEach(function (it) {
    const s = it.subject || "unknown";
    if (!out[s]) out[s] = { total: 0, correct: 0 };
    out[s].total += 1;
    if (it.correct) out[s].correct += 1;
  });
  return out;
}

// ---------- helpers --------------------------------------------------------

function subjectLabel(q) {
  const sub = subjectName(q.subject || "").toUpperCase();
  if (q.topic) return sub + " · " + String(q.topic).replace(/-/g, " ").toUpperCase();
  return sub;
}

function renderVisual(q) {
  if (!q || !q.visual) return "";
  const svg = getVisual(q.visual);
  if (!svg) return "";
  return "<div class=\"mock-session-visual\">" + svg + "</div>";
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
