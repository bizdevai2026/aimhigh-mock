// AimHigh Mock Prep — Subject hub + Sprint runner + Topic drill.
//
// subject.html mounts this and routes by URL params:
//   (none)            -> subject picker (7 tiles)
//   ?s=<id>           -> subject hub: ladder, stats, topic list, sprint button
//   ?s=<id>&run=1     -> sprint runner (15 mixed-topic questions)
//   ?s=<id>&t=<topic> -> topic drill (5 questions on one topic)
//
// All three runner shapes share rendering, just differ in question pool
// and round size.

import "./mock.js?v=20260605"; // shared header (sound toggle, profile chip)
import {
  loadAllQuestions,
  pickSubjectQuestions,
  pickTopicQuestions,
  listSubjects,
  subjectName,
  topicsForSubject,
  topicCounts
} from "./questions.js?v=20260605";
import {
  noteSessionResult,
  readStreak,
  topicLadder,
  subjectLadder
} from "./engagement.js?v=20260605";
// Sound + haptic imports narrowed to what this file directly needs.
// Per-answer feedback (correct/wrong/streak chimes) moved to
// practice/feedback.js. Per-question MC card rendering moved to
// practice/render.js — those modules import their own audio names.
import { playLevelUp, playPerfect, playModeStartSprint, playModeStartWarmup, makeListenButton, frenchSpellMatches, speechRecognitionAvailable, recordFrench, frenchSpeechMatches, hapticStreak, hapticPerfect } from "./sounds.js?v=20260605";
import { isParentRole } from "./profile.js?v=20260605";
import { readJson as storageReadJson, writeJson as storageWriteJson, remove as storageRemove } from "./platform/storage.js?v=20260605";
import { escapeHtml, match } from "./shared/dom.js?v=20260605";
import { subjectTone, prettyTopic } from "./shared/subjects.js?v=20260605";
import { onAnswerCorrect, onAnswerWrong } from "./practice/feedback.js?v=20260605";
import { renderQuestionCard, subjectLabel } from "./practice/render.js?v=20260605";

const SPRINT_SIZE = 15;
const DRILL_SIZE = 5;
const CORRECT_AUTOADVANCE_MS = 700;
// LETTERS removed — option button rendering moved to practice/render.js

const RESUME_KEY = "aimhigh-mock-resume-sprint";
const RESUME_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

const root = document.getElementById("sprintRoot");

let pool = null;
let session = null;

start().finally(function () {
  if (typeof window.GBReady === "function") window.GBReady();
});

async function start() {
  if (!root) {
    if (window.GBErr) window.GBErr.paint("missing root", "sprintRoot element not found in subject.html");
    return;
  }
  // Parent can browse the subject picker / hub but cannot run sprints
  // or topic drills. mock.js boot also redirects on those URLs; this is
  // defence in depth.
  const params = readParams();
  if (isParentRole() && (params.run || params.t)) {
    location.replace("dashboard.html");
    return;
  }
  paintLoading();
  try { pool = await loadAllQuestions(); }
  catch (e) { paintError("Couldn't load questions. Refresh the page."); return; }
  if (!pool || pool.length === 0) { paintError("No questions available yet."); return; }

  if (!params.s) { paintPicker(); return; }

  // Try resuming a matching in-flight session (same subject + same mode).
  if (params.run || params.t) {
    const saved = loadResumeState();
    if (saved && resumeMatches(saved, params)) {
      const items = reconstituteItems(pool, saved.items);
      if (items) { paintResumePrompt(items, saved); return; }
    }
    // Saved state doesn't match this URL — bin it.
    if (saved) clearResumeState();
  }

  if (params.t) { runTopicDrill(params.s, params.t); return; }
  if (params.run) { runSprint(params.s); return; }
  paintSubjectHub(params.s);
}

function resumeMatches(saved, params) {
  if (saved.subjectId !== params.s) return false;
  if (params.t) return saved.mode === "drill" && saved.topic === params.t;
  if (params.run) return saved.mode === "sprint" && !saved.topic;
  return false;
}

function paintResumePrompt(items, saved) {
  const answered = saved.results ? saved.results.length : 0;
  const total = items.length;
  const heading = saved.mode === "drill"
    ? "Resume your topic drill?"
    : "Resume your sprint?";
  document.body.style.setProperty("--tile-color", subjectTone(saved.subjectId));
  root.innerHTML =
    "<section class=\"mock-stub-card mock-resume-card\">" +
      "<h2>" + heading + "</h2>" +
      "<p class=\"mock-resume-meta\">" + escapeHtml(subjectName(saved.subjectId)) +
        (saved.topic ? " &middot; " + escapeHtml(prettyTopic(saved.topic)) : "") +
        " &mdash; you'd answered <strong>" + answered + " of " + total + "</strong>." +
      "</p>" +
      "<div class=\"mock-resume-actions\">" +
        "<button type=\"button\" class=\"mock-button\" id=\"resumeBtn\">Resume</button>" +
        "<button type=\"button\" class=\"mock-button mock-button-ghost\" id=\"freshBtn\">Start fresh</button>" +
      "</div>" +
    "</section>";
  document.getElementById("resumeBtn").addEventListener("click", function () {
    session = {
      mode: saved.mode,
      subjectId: saved.subjectId,
      topic: saved.topic,
      items: items,
      index: saved.index,
      results: saved.results || [],
      streak: saved.streak || 0,
      startedAt: saved.startedAt || Date.now(),
      titleEyebrow: saved.titleEyebrow || "",
      backHref: saved.backHref || ("subject.html?s=" + encodeURIComponent(saved.subjectId))
    };
    paintQuestion();
  });
  document.getElementById("freshBtn").addEventListener("click", function () {
    clearResumeState();
    if (saved.mode === "drill") runTopicDrill(saved.subjectId, saved.topic);
    else runSprint(saved.subjectId);
  });
}

// --- Resume helpers --------------------------------------------------------

function saveResumeState() {
  if (!session) return;
  storageWriteJson(RESUME_KEY, {
    mode: session.mode,
    subjectId: session.subjectId,
    topic: session.topic,
    items: session.items.map(function (q) { return q.id; }),
    index: session.results.length,
    results: session.results,
    streak: session.streak || 0,
    startedAt: session.startedAt,
    titleEyebrow: session.titleEyebrow,
    backHref: session.backHref,
    savedAt: Date.now()
  });
}

function loadResumeState() {
  const data = storageReadJson(RESUME_KEY, null);
  if (!data || !data.savedAt) return null;
  if (Date.now() - data.savedAt > RESUME_TTL_MS) return null;
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

// ---------- URL params -----------------------------------------------------

function readParams() {
  const q = location.search;
  const s = match(q, /[?&]s=([a-z\-]+)/i);
  const t = match(q, /[?&]t=([a-z0-9\-]+)/i);
  const run = match(q, /[?&]run=([01])/i) === "1";
  return { s: s, t: t, run: run };
}
// match() now imported from shared/dom.js

// ---------- Picker (7 subject tiles) ---------------------------------------

function paintPicker() {
  const subjects = listSubjects();
  const counts = countBySubject(pool);
  let tilesHtml = "";
  subjects.forEach(function (s) {
    const count = counts[s.id] || 0;
    const tone = subjectTone(s.id);
    const ladder = subjectLadder(s.id);
    tilesHtml +=
      "<a class=\"mock-tile\" style=\"--tile-color:" + tone + "\" href=\"subject.html?s=" + encodeURIComponent(s.id) + "\">" +
        "<span class=\"mock-tile-tag\">Deep dive</span>" +
        "<span class=\"mock-tile-title\">" + escapeHtml(s.name.toUpperCase()) + "</span>" +
        "<span class=\"mock-tile-meta\">" + count + " question" + (count === 1 ? "" : "s") + " in pool</span>" +
        ladderPill(ladder) +
        "<span class=\"mock-tile-arrow\" aria-hidden=\"true\">&rarr;</span>" +
      "</a>";
  });
  root.innerHTML =
    "<section class=\"mock-stub-hero\">" +
      "<span class=\"mock-stub-tag\">Subjects</span>" +
      "<h1 class=\"mock-stub-title\">PICK A SUBJECT</h1>" +
      "<p class=\"mock-stub-quote\">Drill one subject deep, or sprint a mixed paper.</p>" +
    "</section>" +
    "<nav class=\"mock-tiles\" aria-label=\"Subjects\">" + tilesHtml + "</nav>";
}

function countBySubject(p) {
  const out = {};
  p.forEach(function (q) { out[q.subject] = (out[q.subject] || 0) + 1; });
  return out;
}

// ---------- Subject hub ----------------------------------------------------

function paintSubjectHub(subjectId) {
  const tone = subjectTone(subjectId);
  document.body.style.setProperty("--tile-color", tone);

  const subjLadder = subjectLadder(subjectId);
  const subjQuestionCount = pool.filter(function (q) { return q.subject === subjectId; }).length;
  const topics = topicsForSubject(pool, subjectId);
  const tcounts = topicCounts(pool, subjectId);

  let topicsHtml = "";
  topics.forEach(function (t) {
    const ladder = topicLadder(subjectId, t);
    const cnt = tcounts[t] || 0;
    topicsHtml +=
      "<a class=\"mock-topic-tile\" href=\"subject.html?s=" + encodeURIComponent(subjectId) + "&t=" + encodeURIComponent(t) + "\">" +
        "<div class=\"mock-topic-tile-main\">" +
          "<span class=\"mock-topic-tile-name\">" + escapeHtml(prettyTopic(t)) + "</span>" +
          "<span class=\"mock-topic-tile-meta\">" + cnt + " question" + (cnt === 1 ? "" : "s") + " &middot; drill " + DRILL_SIZE + "</span>" +
        "</div>" +
        ladderPill(ladder) +
        "<span class=\"mock-topic-tile-arrow\" aria-hidden=\"true\">&rarr;</span>" +
      "</a>";
  });

  root.innerHTML =
    "<section class=\"mock-stub-hero\" style=\"border-left-color:" + tone + "\">" +
      "<span class=\"mock-stub-tag\">Subject</span>" +
      "<h1 class=\"mock-stub-title\">" + escapeHtml(subjectName(subjectId).toUpperCase()) + "</h1>" +
      "<div class=\"mock-subject-stats\">" +
        ladderPillLarge(subjLadder) +
        "<span class=\"mock-subject-stat\">" + subjQuestionCount + " questions in pool</span>" +
        "<span class=\"mock-subject-stat\">" + subjLadder.attempts + " attempt" + (subjLadder.attempts === 1 ? "" : "s") + " logged</span>" +
        (subjLadder.attempts > 0 ? "<span class=\"mock-subject-stat\">" + Math.round(subjLadder.accuracy * 100) + "% accuracy</span>" : "") +
      "</div>" +
      "<a class=\"mock-button mock-subject-sprint\" href=\"subject.html?s=" + encodeURIComponent(subjectId) + "&run=1\">Sprint this subject &middot; " + SPRINT_SIZE + " questions</a>" +
    "</section>" +
    "<section class=\"mock-mission\">" +
      "<h2 class=\"mock-mission-title\">Topics</h2>" +
      "<p class=\"mock-mission-sub\">Pick one to drill " + DRILL_SIZE + " focused questions.</p>" +
    "</section>" +
    "<nav class=\"mock-topic-tiles\" aria-label=\"Topics\">" + topicsHtml + "</nav>" +
    "<p class=\"mock-back-row\"><a class=\"mock-button mock-button-ghost\" href=\"subject.html\">&larr; All subjects</a></p>";
}

function ladderPill(ladder) {
  return "<span class=\"mock-ladder ladder-" + ladder.colour + "\">" + escapeHtml(ladder.tier) + "</span>";
}
function ladderPillLarge(ladder) {
  return "<span class=\"mock-ladder mock-ladder-large ladder-" + ladder.colour + "\">" + escapeHtml(ladder.tier) + "</span>";
}

// ---------- Sprint runner --------------------------------------------------

function runSprint(subjectId) {
  const items = pickSubjectQuestions(pool, subjectId, SPRINT_SIZE);
  if (items.length === 0) { paintError("No questions yet for " + subjectName(subjectId) + "."); return; }
  document.body.style.setProperty("--tile-color", subjectTone(subjectId));
  playModeStartSprint();
  beginSession({
    mode: "sprint",
    subjectId: subjectId,
    topic: null,
    items: items,
    titleEyebrow: "Sprint &middot; " + subjectName(subjectId),
    backHref: "subject.html?s=" + encodeURIComponent(subjectId)
  });
}

function runTopicDrill(subjectId, topic) {
  const items = pickTopicQuestions(pool, subjectId, topic, DRILL_SIZE);
  if (items.length === 0) { paintError("No questions yet for " + prettyTopic(topic) + "."); return; }
  document.body.style.setProperty("--tile-color", subjectTone(subjectId));
  playModeStartWarmup();
  beginSession({
    mode: "drill",
    subjectId: subjectId,
    topic: topic,
    items: items,
    titleEyebrow: "Drill &middot; " + prettyTopic(topic),
    backHref: "subject.html?s=" + encodeURIComponent(subjectId)
  });
}

function beginSession(opts) {
  session = {
    mode: opts.mode,
    subjectId: opts.subjectId,
    topic: opts.topic,
    items: opts.items,
    index: 0,
    results: [],
    streak: 0,
    startedAt: Date.now(),
    titleEyebrow: opts.titleEyebrow,
    backHref: opts.backHref
  };
  paintQuestion();
}

// ---------- Painters ------------------------------------------------------

function paintLoading() {
  root.innerHTML =
    "<section class=\"mock-stub-card\"><p class=\"mock-coach-empty\">Loading&hellip;</p></section>";
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
  if (q.type === "spell") { paintSpellQuestion(q); return; }
  if (q.type === "speak") { paintSpeakQuestion(q); return; }
  // Shared MC card markup + option wiring lives in practice/render.js.
  // onAnswer (this file) owns the post-tap policy: reveal correct
  // answer, play feedback chime, autoadvance after CORRECT_AUTOADVANCE_MS.
  renderQuestionCard(root, q, { i: session.index, total: session.items.length }, onAnswer);
}

function paintSpellQuestion(q) {
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
        "<form id=\"spellForm\" class=\"mock-spell-form\" novalidate>" +
          "<input id=\"spellInput\" class=\"mock-spell-input\" type=\"text\" autocomplete=\"off\" autocapitalize=\"off\" autocorrect=\"off\" spellcheck=\"false\" placeholder=\"Type in French\" required autofocus />" +
          "<button type=\"submit\" class=\"mock-button\">Check</button>" +
          "<button type=\"button\" id=\"skipSpellBtn\" class=\"mock-skip-question\">Skip this one</button>" +
        "</form>" +
      "</div>" +
    "</section>";
  attachListen(document.getElementById("sessionCard"), q);
  document.getElementById("spellForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const inp = document.getElementById("spellInput");
    const correct = frenchSpellMatches(inp.value, q);
    inp.disabled = true;
    onSpellAnswered(q, correct);
  });
  document.getElementById("skipSpellBtn").addEventListener("click", function () {
    const inp = document.getElementById("spellInput");
    inp.disabled = true;
    onSpellAnswered(q, false);
  });
}

function onSpellAnswered(q, correct) {
  session.results.push({ id: q.id, subject: q.subject, topic: q.topic, correct: correct });
  saveResumeState();
  if (correct) {
    session.streak = (session.streak || 0) + 1;
    onAnswerCorrect(session.streak);
    showSpellFeedback(q, true);
    setTimeout(advance, CORRECT_AUTOADVANCE_MS);
  } else {
    session.streak = 0;
    onAnswerWrong();
    showSpellFeedback(q, false);
  }
}

function showSpellFeedback(q, correct) {
  const card = document.getElementById("sessionCard");
  if (!card) { advance(); return; }
  const fb = document.createElement("div");
  fb.className = "mock-session-feedback " + (correct ? "correct" : "wrong");
  if (correct) {
    fb.innerHTML = "<span>Nice &mdash; <strong>" + escapeHtml(q.answer) + "</strong></span>";
  } else {
    fb.innerHTML = "<span>Not quite. The answer was: <strong>" + escapeHtml(q.answer) + "</strong></span>";
    if (q.explainer) {
      const ex = document.createElement("div");
      ex.className = "mock-session-feedback-explainer";
      ex.textContent = q.explainer;
      fb.appendChild(ex);
    }
    const cont = document.createElement("button");
    cont.type = "button";
    cont.className = "mock-button";
    cont.textContent = "Continue";
    cont.style.marginTop = "0.5rem";
    cont.addEventListener("click", advance);
    fb.appendChild(cont);
  }
  card.appendChild(fb);
}

function attachListen(card, q) {
  if (!card || !q || !q.audio) return;
  const btn = makeListenButton(q.audio);
  if (!btn) return;
  const subj = card.querySelector(".mock-session-subject");
  if (subj && subj.nextSibling) card.insertBefore(btn, subj.nextSibling);
  else card.appendChild(btn);
}

// Speaking question (KS3 MFL speaking practice). Falls back to typing
// when SpeechRecognition isn't available so the kid still gets a path
// through the question on Firefox / older Safari.
function paintSpeakQuestion(q) {
  const total = session.items.length;
  const i = session.index;
  const pct = Math.round((i / total) * 100);
  const supported = speechRecognitionAvailable();
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
        (supported
          ? "<div class=\"mock-speak-stage\">" +
              "<button type=\"button\" class=\"mock-mic-btn\" id=\"micBtn\" aria-label=\"Tap to speak in French\">" +
                "<span class=\"mock-mic-icon\" aria-hidden=\"true\">&#127908;</span>" +
                "<span class=\"mock-mic-label\">Tap to speak</span>" +
              "</button>" +
              "<p class=\"mock-speak-status\" id=\"speakStatus\" aria-live=\"polite\"></p>" +
              "<button type=\"button\" id=\"skipSpeakBtn\" class=\"mock-skip-question\">Skip this one</button>" +
            "</div>"
          : "<div class=\"mock-speak-fallback\">" +
              "<p class=\"mock-coach-empty\">Speaking exercises need Chrome or Edge. Type the phrase instead:</p>" +
              "<form id=\"spellForm\" class=\"mock-spell-form\" novalidate>" +
                "<input id=\"spellInput\" class=\"mock-spell-input\" type=\"text\" autocomplete=\"off\" autocapitalize=\"off\" autocorrect=\"off\" spellcheck=\"false\" placeholder=\"Type in French\" required autofocus />" +
                "<button type=\"submit\" class=\"mock-button\">Check</button>" +
                "<button type=\"button\" id=\"skipSpellBtn\" class=\"mock-skip-question\">Skip this one</button>" +
              "</form>" +
            "</div>") +
      "</div>" +
    "</section>";

  attachListen(document.getElementById("sessionCard"), q);
  if (supported) {
    wireMic(q);
    document.getElementById("skipSpeakBtn").addEventListener("click", function () {
      onSpeakAnswered(q, false, "");
    });
  } else {
    document.getElementById("spellForm").addEventListener("submit", function (e) {
      e.preventDefault();
      const inp = document.getElementById("spellInput");
      const correct = frenchSpellMatches(inp.value, q);
      inp.disabled = true;
      onSpellAnswered(q, correct);
    });
    document.getElementById("skipSpellBtn").addEventListener("click", function () {
      const inp = document.getElementById("spellInput");
      inp.disabled = true;
      onSpellAnswered(q, false);
    });
  }
}

function wireMic(q) {
  const btn = document.getElementById("micBtn");
  const status = document.getElementById("speakStatus");
  if (!btn || !status) return;
  let busy = false;
  btn.addEventListener("click", function () {
    if (busy) return;
    busy = true;
    btn.classList.add("recording");
    btn.querySelector(".mock-mic-label").textContent = "Listening…";
    status.textContent = "Speak the phrase, then pause.";
    recordFrench({
      onResult: function (alts) {
        const result = frenchSpeechMatches(alts, q);
        btn.classList.remove("recording");
        btn.disabled = true;
        btn.querySelector(".mock-mic-label").textContent = "Done";
        status.textContent = result.heard ? "We heard: “" + result.heard + "”" : "";
        onSpeakAnswered(q, result.matched, result.heard);
      },
      onError: function (err) {
        btn.classList.remove("recording");
        busy = false;
        btn.querySelector(".mock-mic-label").textContent = "Try again";
        if (err && err.message === "not-allowed") {
          status.textContent = "Microphone permission needed. Allow it in browser settings, then retry.";
        } else if (err && err.message === "no-speech") {
          status.textContent = "Didn't catch that — tap mic and try again.";
        } else {
          status.textContent = "Couldn't capture audio. Try again.";
        }
      }
    });
  });
}

function onSpeakAnswered(q, correct, heard) {
  session.results.push({ id: q.id, subject: q.subject, topic: q.topic, correct: correct });
  saveResumeState();
  if (correct) {
    session.streak = (session.streak || 0) + 1;
    onAnswerCorrect(session.streak);
    showSpeakFeedback(q, true, heard);
    setTimeout(advance, CORRECT_AUTOADVANCE_MS);
  } else {
    session.streak = 0;
    onAnswerWrong();
    showSpeakFeedback(q, false, heard);
  }
}

function showSpeakFeedback(q, correct, heard) {
  const card = document.getElementById("sessionCard");
  if (!card) { advance(); return; }
  const fb = document.createElement("div");
  fb.className = "mock-session-feedback " + (correct ? "correct" : "wrong");
  if (correct) {
    fb.innerHTML = "<span>Nice &mdash; <strong>" + escapeHtml(q.answer) + "</strong></span>";
  } else {
    fb.innerHTML =
      "<span>Not quite. Target: <strong>" + escapeHtml(q.answer) + "</strong>" +
      (heard ? "<br><span class=\"mock-speak-heard\">we heard: " + escapeHtml(heard) + "</span>" : "") +
      "</span>";
    if (q.explainer) {
      const ex = document.createElement("div");
      ex.className = "mock-session-feedback-explainer";
      ex.textContent = q.explainer;
      fb.appendChild(ex);
    }
    const cont = document.createElement("button");
    cont.type = "button";
    cont.className = "mock-button";
    cont.textContent = "Continue";
    cont.style.marginTop = "0.5rem";
    cont.addEventListener("click", advance);
    fb.appendChild(cont);
  }
  card.appendChild(fb);
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
  session.results.push({ id: q.id, subject: q.subject, topic: q.topic, correct: correct });
  saveResumeState();
  if (correct) {
    session.streak = (session.streak || 0) + 1;
    onAnswerCorrect(session.streak);
    setTimeout(advance, CORRECT_AUTOADVANCE_MS);
  } else {
    session.streak = 0;
    onAnswerWrong();
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
  if (session.index >= session.items.length) { finalise(); }
  else { paintQuestion(); }
}

function finalise() {
  clearResumeState();
  const correctCount = session.results.filter(function (r) { return r.correct; }).length;
  const total = session.items.length;
  const durationSec = Math.round((Date.now() - session.startedAt) / 1000);
  const after = noteSessionResult({
    mode: session.mode,
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
  const perfect = score === total && total > 0;
  if (perfect) { playPerfect(); hapticPerfect(); }
  else if (goalHitNow) { playLevelUp(); hapticStreak(); }
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

  // Show updated ladder for the subject (and topic if drill mode)
  let ladderLine = "";
  if (session.topic) {
    const tl = topicLadder(session.subjectId, session.topic);
    ladderLine = "<div class=\"mock-result-ladder-row\">" +
      "<span>" + escapeHtml(prettyTopic(session.topic)) + " &mdash; now</span>" +
      ladderPillLarge(tl) +
      "</div>";
  } else if (session.subjectId) {
    const sl = subjectLadder(session.subjectId);
    ladderLine = "<div class=\"mock-result-ladder-row\">" +
      "<span>" + escapeHtml(subjectName(session.subjectId)) + " &mdash; now</span>" +
      ladderPillLarge(sl) +
      "</div>";
  }

  const eyebrowText = session.mode === "drill"
    ? "Topic drill complete"
    : ("Sprint complete &middot; " + escapeHtml(subjectName(session.subjectId)));

  root.innerHTML =
    "<section class=\"mock-result\">" +
      "<span class=\"mock-result-eyebrow\">" + eyebrowText + "</span>" +
      "<span class=\"mock-result-score\">" + score + "</span>" +
      "<span class=\"mock-result-score-meta\">out of " + total + "</span>" +
      "<span class=\"mock-result-xp\">+" + xpGained + " XP</span>" +
      "<div class=\"mock-result-streak\">" + streakLine + "</div>" +
      ladderLine +
      "<div class=\"mock-result-actions\">" +
        "<a class=\"mock-button\" href=\"" + session.backHref + "\">Back to subject</a>" +
        "<a class=\"mock-button mock-button-ghost\" href=\"index.html\">Done</a>" +
      "</div>" +
    "</section>";
}

// ---------- helpers --------------------------------------------------------
// subjectLabel + renderVisual + LETTERS + the option-button loop now
// live in practice/render.js (called from paintQuestion above).
// subjectLabel is also imported below for the spell/speak handlers,
// which build their own card markup but keep the same eyebrow text.

// escapeHtml + prettyTopic + subjectTone now imported from shared/* —
// local copies removed in the runner-consolidation migration.
