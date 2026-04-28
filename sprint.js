// AimHigh Mock Prep — Sprint runner (single-subject mock).
//
// subject.html loads this. If the URL has ?s=<subject_id>, this runs
// a 15-question session drawn entirely from that subject (anti-repeat
// aware via questions.pickSubjectQuestions). Otherwise it renders a
// subject picker — 7 tiles, click one to start.

import { loadAllQuestions, pickSubjectQuestions, listSubjects, subjectName } from "./questions.js";
import { noteSessionResult, readStreak } from "./engagement.js";

const ROUND_SIZE = 15;
const CORRECT_AUTOADVANCE_MS = 700;
const LETTERS = ["A", "B", "C", "D", "E", "F"];

const root = document.getElementById("sprintRoot");

let session = null;
let pool = null;

start();

async function start() {
  if (!root) return;
  paintLoading();
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

  const subjectId = readSubjectParam();
  if (subjectId) {
    runSubject(subjectId);
  } else {
    paintPicker();
  }
}

function readSubjectParam() {
  const m = location.search.match(/[?&]s=([a-z-]+)/i);
  return m ? m[1] : null;
}

// ---------- Picker ---------------------------------------------------------

function paintPicker() {
  const subjects = listSubjects();
  const counts = countBySubject(pool);
  let tilesHtml = "";
  subjects.forEach(function (s) {
    const count = counts[s.id] || 0;
    const tone = subjectTone(s.id);
    tilesHtml +=
      "<a class=\"mock-tile\" style=\"--tile-color:" + tone + "\" href=\"subject.html?s=" + encodeURIComponent(s.id) + "\">" +
        "<span class=\"mock-tile-tag\">Sprint</span>" +
        "<span class=\"mock-tile-title\">" + escapeHtml(s.name.toUpperCase()) + "</span>" +
        "<span class=\"mock-tile-meta\">" + count + " question" + (count === 1 ? "" : "s") + " in pool</span>" +
        "<span class=\"mock-tile-quote\">15 questions &middot; ~15 min</span>" +
        "<span class=\"mock-tile-arrow\" aria-hidden=\"true\">&rarr;</span>" +
      "</a>";
  });
  root.innerHTML =
    "<section class=\"mock-stub-hero\">" +
      "<span class=\"mock-stub-tag\">Closer to exam</span>" +
      "<h1 class=\"mock-stub-title\">SPRINT</h1>" +
      "<p class=\"mock-stub-quote\">\"One subject, full focus.\"</p>" +
    "</section>" +
    "<section class=\"mock-mission\">" +
      "<h2 class=\"mock-mission-title\">Pick a subject</h2>" +
      "<p class=\"mock-mission-sub\">15 questions from one subject &mdash; mixed topics, exam shape.</p>" +
    "</section>" +
    "<nav class=\"mock-tiles\" aria-label=\"Subjects\">" + tilesHtml + "</nav>";
}

function countBySubject(p) {
  const out = {};
  p.forEach(function (q) { out[q.subject] = (out[q.subject] || 0) + 1; });
  return out;
}

// ---------- Sprint -----------------------------------------------------------

function runSubject(subjectId) {
  const items = pickSubjectQuestions(pool, subjectId, ROUND_SIZE);
  if (items.length === 0) {
    paintError("No questions yet for " + subjectName(subjectId) + ". Pick another subject.");
    return;
  }
  // Apply per-mode tile colour to the body for the sprint runner
  document.body.style.setProperty("--tile-color", subjectTone(subjectId));
  session = {
    subjectId: subjectId,
    items: items,
    index: 0,
    results: [],
    startedAt: Date.now()
  };
  paintQuestion();
}

function paintLoading() {
  root.innerHTML =
    "<section class=\"mock-stub-card\">" +
      "<p class=\"mock-coach-empty\">Loading&hellip;</p>" +
    "</section>";
}

function paintError(msg) {
  root.innerHTML =
    "<section class=\"mock-stub-card\">" +
      "<h2>Not ready yet</h2>" +
      "<p>" + escapeHtml(msg) + "</p>" +
      "<a class=\"mock-button\" href=\"subject.html\">Pick a subject</a>" +
    "</section>";
}

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
        "<span class=\"mock-session-progress-text\">" + (i + 1) + "/" + total + "</span>" +
      "</div>" +
      "<div class=\"mock-session-card\" id=\"sessionCard\">" +
        "<span class=\"mock-session-subject\">" + escapeHtml(subjectLabel(q)) + "</span>" +
        "<p class=\"mock-session-prompt\">" + escapeHtml(q.prompt) + "</p>" +
        "<div class=\"mock-session-options\" id=\"sessionOptions\"></div>" +
      "</div>" +
    "</section>";

  const optsEl = document.getElementById("sessionOptions");
  q.options.forEach(function (opt, idx) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mock-session-option";
    btn.dataset.idx = String(idx);
    btn.innerHTML =
      "<span class=\"mock-session-option-letter\">" + LETTERS[idx] + "</span>" +
      "<span>" + escapeHtml(opt) + "</span>";
    btn.addEventListener("click", function () { onAnswer(idx, btn); });
    optsEl.appendChild(btn);
  });
}

function onAnswer(chosenIdx, btnEl) {
  const q = session.items[session.index];
  const correct = chosenIdx === q.answer;
  const allBtns = root.querySelectorAll(".mock-session-option");
  allBtns.forEach(function (b) { b.disabled = true; });
  btnEl.classList.add(correct ? "is-correct" : "is-wrong");
  if (!correct) {
    const correctBtn = root.querySelector('.mock-session-option[data-idx="' + q.answer + '"]');
    if (correctBtn) correctBtn.classList.add("is-correct");
  }
  session.results.push({
    id: q.id,
    subject: q.subject,
    topic: q.topic,
    correct: correct
  });
  if (correct) {
    setTimeout(advance, CORRECT_AUTOADVANCE_MS);
  } else {
    showWrongFeedback(q);
  }
}

function showWrongFeedback(q) {
  const card = document.getElementById("sessionCard");
  if (!card) { advance(); return; }
  const fb = document.createElement("div");
  fb.className = "mock-session-feedback wrong";
  fb.innerHTML = "<span>Not this time</span>";
  if (q.explainer) {
    const ex = document.createElement("div");
    ex.className = "mock-session-feedback-explainer";
    ex.textContent = q.explainer;
    fb.appendChild(ex);
  }
  card.appendChild(fb);

  const cont = document.createElement("button");
  cont.type = "button";
  cont.className = "mock-button";
  cont.textContent = "Continue";
  cont.style.marginTop = "0.5rem";
  cont.addEventListener("click", advance);
  card.appendChild(cont);
}

function advance() {
  session.index += 1;
  if (session.index >= session.items.length) {
    finalise();
  } else {
    paintQuestion();
  }
}

function finalise() {
  const correctCount = session.results.filter(function (r) { return r.correct; }).length;
  const total = session.items.length;
  const durationSec = Math.round((Date.now() - session.startedAt) / 1000);
  const after = noteSessionResult({
    mode: "sprint",
    subject: session.subjectId,
    items: session.results,
    score: correctCount,
    total: total,
    durationSec: durationSec
  });
  paintResult(correctCount, total, after);
}

function paintResult(score, total, after) {
  const xpGained = after.xpGained;
  const goalHitNow = after.xp.before < after.xp.goal && after.xp.after >= after.xp.goal;
  const streak = readStreak();
  let streakLine;
  if (goalHitNow) {
    streakLine = "<span>&#128293; <strong>" + streak.current + "-day streak</strong> &mdash; locked in for today</span>";
  } else if (after.xp.after >= after.xp.goal) {
    streakLine = "<span>&#128293; <strong>" + streak.current + "-day streak</strong> &mdash; goal already hit today</span>";
  } else {
    const remaining = after.xp.goal - after.xp.after;
    streakLine = "<span>" + remaining + " XP to go &mdash; one more session keeps the streak</span>";
  }
  root.innerHTML =
    "<section class=\"mock-result\">" +
      "<span class=\"mock-result-eyebrow\">Sprint complete &middot; " + escapeHtml(subjectName(session.subjectId)) + "</span>" +
      "<span class=\"mock-result-score\">" + score + "</span>" +
      "<span class=\"mock-result-score-meta\">out of " + total + "</span>" +
      "<span class=\"mock-result-xp\">+" + xpGained + " XP</span>" +
      "<div class=\"mock-result-streak\">" + streakLine + "</div>" +
      "<div class=\"mock-result-actions\">" +
        "<a class=\"mock-button\" href=\"subject.html\">Pick another</a>" +
        "<a class=\"mock-button mock-button-ghost\" href=\"index.html\">Done</a>" +
      "</div>" +
    "</section>";
}

// ---------- helpers ---------------------------------------------------------

function subjectLabel(q) {
  const sub = subjectName(q.subject || "").toUpperCase();
  if (q.topic) return sub + " · " + String(q.topic).replace(/-/g, " ").toUpperCase();
  return sub;
}

function subjectTone(subject) {
  switch (subject) {
    case "science":   return "#84cc16";
    case "maths":     return "#22d3ee";
    case "english":   return "#f97316";
    case "french":    return "#fbbf24";
    case "history":   return "#c2750a";
    case "geography": return "#22d3ee";
    case "computing": return "#84cc16";
    default:          return "#84cc16";
  }
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
