// AimHigh Mock Prep — daily warm-up runner.
//
// Renders into <main id="warmupRoot">. Picks 10 mixed-subject questions
// using questions.js (anti-repeat aware), shows them one at a time
// with tap-to-answer + instant feedback, and finalises the session
// via engagement.noteSessionResult so streak/XP/tier update correctly.

import "./mock.js?v=20260505"; // shared header behaviour (sound toggle, streak chip)
import { loadAllQuestions, pickWarmupQuestions, subjectName } from "./questions.js?v=20260505";
import { noteSessionResult, readStreak, readXpToday } from "./engagement.js?v=20260505";
import { playCorrect, playWrong, playLevelUp, playStreak3, playStreak5, playPerfect, playTap, playModeStartWarmup, makeListenButton, frenchSpellMatches, speechRecognitionAvailable, recordFrench, frenchSpeechMatches, hapticCorrect, hapticWrong, hapticStreak, hapticPerfect } from "./sounds.js?v=20260505";
import { getVisual } from "./visuals.js?v=20260505";
import { isParentRole } from "./profile.js?v=20260505";

if (isParentRole()) { location.replace("dashboard.html"); }

const ROUND_SIZE = 10;
const CORRECT_AUTOADVANCE_MS = 850;
const LETTERS = ["A", "B", "C", "D", "E", "F"];

const RESUME_KEY = "aimhigh-mock-resume-warmup";
const RESUME_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

const root = document.getElementById("warmupRoot");

let session = null;

start();

async function start() {
  if (!root) return;
  paintLoading();
  let pool;
  try {
    pool = await loadAllQuestions();
  } catch (e) {
    paintError("Couldn't load questions. Check your connection and refresh.");
    return;
  }
  if (!pool || pool.length === 0) {
    paintError("No questions available yet. Content is being added.");
    return;
  }
  // Mid-session resume — accidental refresh shouldn't bin progress.
  const saved = loadResumeState();
  if (saved) {
    const items = reconstituteItems(pool, saved.items);
    if (items) { paintResumePrompt(pool, items, saved); return; }
    clearResumeState();
  }
  beginSession(pool);
}

function paintResumePrompt(pool, items, saved) {
  const answered = saved.results ? saved.results.length : 0;
  const total = items.length;
  root.innerHTML =
    "<section class=\"mock-stub-card mock-resume-card\">" +
      "<h2>Resume your warm-up?</h2>" +
      "<p class=\"mock-resume-meta\">You'd answered <strong>" + answered + " of " + total + "</strong>. Pick up where you left off?</p>" +
      "<div class=\"mock-resume-actions\">" +
        "<button type=\"button\" class=\"mock-button\" id=\"resumeBtn\">Resume</button>" +
        "<button type=\"button\" class=\"mock-button mock-button-ghost\" id=\"freshBtn\">Start fresh</button>" +
      "</div>" +
    "</section>";
  document.getElementById("resumeBtn").addEventListener("click", function () {
    session = {
      pool: pool,
      items: items,
      index: saved.index,
      results: saved.results || [],
      streak: saved.streak || 0,
      startedAt: saved.startedAt || Date.now()
    };
    paintQuestion();
  });
  document.getElementById("freshBtn").addEventListener("click", function () {
    clearResumeState();
    beginSession(pool);
  });
}

// --- Resume helpers --------------------------------------------------------

function saveResumeState() {
  if (!session) return;
  try {
    const payload = {
      items: session.items.map(function (q) { return q.id; }),
      index: session.results.length, // next question to ask
      results: session.results,
      streak: session.streak || 0,
      startedAt: session.startedAt,
      savedAt: Date.now()
    };
    localStorage.setItem(RESUME_KEY, JSON.stringify(payload));
  } catch (e) {}
}

function loadResumeState() {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.savedAt) return null;
    if (Date.now() - data.savedAt > RESUME_TTL_MS) return null;
    if (!Array.isArray(data.items) || data.items.length === 0) return null;
    return data;
  } catch (e) { return null; }
}

function clearResumeState() {
  try { localStorage.removeItem(RESUME_KEY); } catch (e) {}
}

function reconstituteItems(pool, ids) {
  const byId = {};
  pool.forEach(function (q) { byId[q.id] = q; });
  const out = [];
  for (let i = 0; i < ids.length; i++) {
    const q = byId[ids[i]];
    if (!q) return null;
    out.push(q);
  }
  return out;
}

function beginSession(pool) {
  const items = pickWarmupQuestions(pool, ROUND_SIZE);
  if (items.length === 0) {
    paintError("No questions ready for today's warm-up. Try again tomorrow.");
    return;
  }
  session = {
    pool: pool,
    items: items,
    index: 0,
    results: [], // { id, subject, topic, correct }
    streak: 0,
    startedAt: Date.now()
  };
  playModeStartWarmup();
  paintQuestion();
}

// ---------- Painters --------------------------------------------------------

function paintLoading() {
  root.innerHTML =
    "<section class=\"mock-stub-card\">" +
      "<p class=\"mock-coach-empty\">Loading questions&hellip;</p>" +
    "</section>";
}

function paintError(msg) {
  root.innerHTML =
    "<section class=\"mock-stub-card\">" +
      "<h2>Not ready yet</h2>" +
      "<p>" + escapeHtml(msg) + "</p>" +
      "<a class=\"mock-button\" href=\"index.html\">Back to home</a>" +
    "</section>";
}

function paintQuestion() {
  if (!session) return;
  const q = session.items[session.index];
  if (q.type === "spell") { paintSpellQuestion(q); return; }
  if (q.type === "speak") { paintSpeakQuestion(q); return; }
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
        renderVisual(q) +
        "<p class=\"mock-session-prompt\">" + escapeHtml(q.prompt) + "</p>" +
        "<div class=\"mock-session-options\" id=\"sessionOptions\"></div>" +
      "</div>" +
    "</section>";

  // Apply a per-subject tile-color so the subject label uses the right hue
  const card = document.getElementById("sessionCard");
  if (card) card.style.setProperty("--tile-color", subjectColor(q.subject));

  // Listen button — appears whenever the question carries an `audio`
  // field (used on French questions for KS3 listening practice).
  attachListen(card, q);

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

// Spelling/typing question — listen, type, lenient match. Mirrors the
// MCQ result-recording flow so streaks and resume state stay coherent.
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
  const card = document.getElementById("sessionCard");
  if (card) card.style.setProperty("--tile-color", subjectColor(q.subject));
  attachListen(card, q);
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
    playCorrect();
    hapticCorrect();
    if (session.streak === 3) { playStreak3(); hapticStreak(); }
    else if (session.streak === 5) { playStreak5(); hapticStreak(); }
    else if (session.streak >= 7 && session.streak % 2 === 1) { playStreak3(); hapticStreak(); }
    showSpellFeedback(q, true);
    setTimeout(advance, CORRECT_AUTOADVANCE_MS);
  } else {
    session.streak = 0;
    playWrong();
    hapticWrong();
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
  // Insert just below the subject label so it's discoverable above the prompt.
  const subj = card.querySelector(".mock-session-subject");
  if (subj && subj.nextSibling) card.insertBefore(btn, subj.nextSibling);
  else card.appendChild(btn);
}

// Speaking question — listen, tap mic, speak the phrase. Falls back to
// typing on browsers without SpeechRecognition (Firefox, sometimes
// Safari iOS). Result recorded the same way as MCQ / spell so streaks
// and resume state stay coherent.
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

  const card = document.getElementById("sessionCard");
  if (card) card.style.setProperty("--tile-color", subjectColor(q.subject));
  attachListen(card, q);

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
    playCorrect();
    hapticCorrect();
    if (session.streak === 3) { playStreak3(); hapticStreak(); }
    else if (session.streak === 5) { playStreak5(); hapticStreak(); }
    else if (session.streak >= 7 && session.streak % 2 === 1) { playStreak3(); hapticStreak(); }
    showSpeakFeedback(q, true, heard);
    setTimeout(advance, CORRECT_AUTOADVANCE_MS);
  } else {
    session.streak = 0;
    playWrong();
    hapticWrong();
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

  // Disable all buttons
  const allBtns = root.querySelectorAll(".mock-session-option");
  allBtns.forEach(function (b) { b.disabled = true; });

  // Mark chosen state
  btnEl.classList.add(correct ? "is-correct" : "is-wrong");

  // Always reveal correct answer
  if (!correct) {
    const correctBtn = root.querySelector('.mock-session-option[data-idx="' + q.answer + '"]');
    if (correctBtn) correctBtn.classList.add("is-correct");
  }

  // Record result
  session.results.push({
    id: q.id,
    subject: q.subject,
    topic: q.topic,
    correct: correct
  });
  saveResumeState();

  if (correct) {
    session.streak = (session.streak || 0) + 1;
    playCorrect();
    hapticCorrect();
    if (session.streak === 3) { playStreak3(); hapticStreak(); }
    else if (session.streak === 5) { playStreak5(); hapticStreak(); }
    else if (session.streak >= 7 && session.streak % 2 === 1) { playStreak3(); hapticStreak(); }
    setTimeout(advance, CORRECT_AUTOADVANCE_MS);
  } else {
    session.streak = 0;
    playWrong();
    hapticWrong();
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
  clearResumeState();
  const correctCount = session.results.filter(function (r) { return r.correct; }).length;
  const total = session.items.length;
  const durationSec = Math.round((Date.now() - session.startedAt) / 1000);

  const after = noteSessionResult({
    mode: "warmup",
    subject: null,
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
  const perfect = score === total && total > 0;
  if (perfect) { playPerfect(); hapticPerfect(); }
  else if (goalHitNow) { playLevelUp(); hapticStreak(); }

  let streakLine;
  if (goalHitNow) {
    streakLine =
      "<span>&#128293; <strong>" + streak.current + "-day streak</strong> &mdash; kept it alive</span>";
  } else if (after.xp.after >= after.xp.goal) {
    streakLine =
      "<span>&#128293; <strong>" + streak.current + "-day streak</strong> &mdash; goal already hit today</span>";
  } else {
    const remaining = after.xp.goal - after.xp.after;
    streakLine =
      "<span>" + remaining + " XP to go &mdash; train again to keep the streak</span>";
  }

  root.innerHTML =
    "<section class=\"mock-result\">" +
      "<span class=\"mock-result-eyebrow\">Warm-up complete</span>" +
      "<span class=\"mock-result-score\">" + score + "</span>" +
      "<span class=\"mock-result-score-meta\">out of " + total + "</span>" +
      "<span class=\"mock-result-xp\">+" + xpGained + " XP</span>" +
      "<div class=\"mock-result-streak\">" + streakLine + "</div>" +
      "<div class=\"mock-result-actions\">" +
        "<button type=\"button\" class=\"mock-button\" id=\"trainAgainBtn\">Train again</button>" +
        "<a class=\"mock-button mock-button-ghost\" href=\"index.html\">Done for today</a>" +
      "</div>" +
    "</section>";

  const again = document.getElementById("trainAgainBtn");
  if (again) again.addEventListener("click", function () {
    if (!session) return;
    beginSession(session.pool);
  });
}

// ---------- Helpers ---------------------------------------------------------

function subjectLabel(q) {
  const sub = subjectName(q.subject || "").toUpperCase();
  if (q.topic) {
    return sub + " · " + String(q.topic).replace(/-/g, " ").toUpperCase();
  }
  return sub;
}

function renderVisual(q) {
  if (!q || !q.visual) return "";
  const svg = getVisual(q.visual);
  if (!svg) return "";
  return "<div class=\"mock-session-visual\">" + svg + "</div>";
}

function subjectColor(subject) {
  // Loose subject-to-colour mapping reusing the tile palette in mock.css.
  switch (subject) {
    case "science":   return "#84cc16"; // lime
    case "maths":     return "#22d3ee"; // cyan
    case "english":   return "#f97316"; // coral
    case "french":    return "#fbbf24"; // fire
    case "history":   return "#c2750a"; // bronze
    case "geography": return "#22d3ee"; // cyan
    case "computing": return "#84cc16"; // lime
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
