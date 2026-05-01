// GradeBlaze — Learn mode.
//
// "Learn first, test second" — the part that no other revision app has
// in this form. Browse subjects, pick a topic, read a plain-English
// explainer with examples + tips + (where useful) a diagram, then jump
// straight into a 5-question drill on that topic.
//
// Targets the "Developing" tier: simple vocabulary, short sentences,
// no assumed prior knowledge, GCSE-friendly framing where applicable.
//
// Routes by URL params:
//   (none)            → subject picker (7 tiles)
//   ?s=<id>           → topic list for that subject
//   ?s=<id>&t=<topic> → topic detail page (read + drill)

// Visible-error fallback. Installed BEFORE imports run so module-graph
// failures (e.g. one of the imports rejects) get surfaced to the page
// instead of leaving the user stuck on "Loading…" forever.
const root = document.getElementById("learnRoot");
function paintFatalError(stage, err) {
  if (!root) return;
  const msg = (err && (err.message || err.toString())) || "Unknown error";
  const safe = String(msg).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  root.innerHTML =
    "<section class=\"mock-stub-card\" style=\"border-color:#fca5a5\">" +
      "<h2 style=\"color:#fca5a5\">Couldn't start LEARN</h2>" +
      "<p>Stage: <strong>" + stage + "</strong></p>" +
      "<pre style=\"font-family:ui-monospace,monospace;font-size:0.85rem;color:#c4c4d1;background:rgba(255,255,255,0.04);padding:0.6rem;border-radius:0.4rem;white-space:pre-wrap;word-break:break-word\">" + safe + "</pre>" +
      "<p>Try the reset page: <a href=\"reset.html\" style=\"color:#00f5d4\">gradeblaze.co.uk/reset.html</a></p>" +
      "<a class=\"mock-button mock-button-ghost\" href=\"index.html\">&larr; Home</a>" +
    "</section>";
}
if (typeof window !== "undefined") {
  window.addEventListener("error", function (e) {
    paintFatalError("uncaught error", e.error || new Error((e.message || "?") + " @ " + (e.filename || "") + ":" + (e.lineno || "?")));
  });
  window.addEventListener("unhandledrejection", function (e) {
    paintFatalError("unhandled rejection", e.reason || new Error("Promise rejected"));
  });
}

import "./mock.js?v=20260606"; // shared header behaviour
import { listSubjects, subjectName, topicsForSubject, loadAllQuestions } from "./questions.js?v=20260606";
import { topicLadder, weakTopics } from "./engagement.js?v=20260606";
import { getVisual } from "./visuals.js?v=20260606";
import { validateLearning, reportProblems } from "./diagnostics/schema-validator.js?v=20260606";
import { escapeHtml, match } from "./shared/dom.js?v=20260606";
import { subjectTone, prettyTopic } from "./shared/subjects.js?v=20260606";
import { readString, writeString } from "./platform/storage.js?v=20260606";

// Study Smart completion key — same string is set by study-smart.js when
// the kid reaches the final card. Used here only to swap "Start here" for
// "Re-take" copy on the LEARN hub tile, so we read directly from storage
// and avoid importing the whole onboarding module on the LEARN page.
const STUDY_SMART_KEY = "aimhigh-mock-study-smart-complete";

// Phase 3 storage keys — per-topic teach-back answers + confidence ratings.
// See design/learn-module-audit.md §6.3 for rationale (Feynman + protégé
// effect for teach_back; metacognitive self-monitoring for confidence_check
// — confidence ratings will feed the spaced-recap schedule once that lands
// in Phase 5).
function teachBackKey(subjectId, topic) {
  return "aimhigh-mock-learn-teachback-" + subjectId + "-" + topic;
}
function confidenceKey(subjectId, topic) {
  return "aimhigh-mock-learn-confidence-" + subjectId + "-" + topic;
}

let learning = null; // array of learning entries from data/learning.json
let pool = null;     // question pool from data/<subject>.json — used to enumerate topics

// start() resolves after its first real paint (success or error). Either
// way, cancel the loading guard so the user doesn't see the timeout card.
start()
  .catch(function (e) { paintFatalError("start() threw", e); })
  .finally(function () {
    if (typeof window.GBReady === "function") window.GBReady();
  });

async function start() {
  if (!root) {
    if (window.GBErr) window.GBErr.paint("missing root", "learnRoot element not found in learn.html");
    return;
  }
  paintLoading();

  // Always need learning.json — it's small and used by every view.
  try {
    const r = await fetch("data/learning.json", { cache: "no-cache" });
    if (!r.ok) {
      paintFatalError("fetch data/learning.json (HTTP " + r.status + ")", new Error("HTTP " + r.status + " " + r.statusText));
      return;
    }
    learning = await r.json();
  } catch (e) {
    paintFatalError("fetch data/learning.json", e);
    return;
  }
  if (!Array.isArray(learning)) {
    paintFatalError("learning.json shape", new Error("Expected an array, got " + typeof learning));
    return;
  }
  // Runtime schema validation — filter to valid entries only so a single
  // malformed topic doesn't render a broken card mid-flow.
  const learningValidation = validateLearning(learning);
  reportProblems("schema", "learning", learningValidation);
  if (learningValidation.validItems.length !== learning.length) {
    learning = learningValidation.validItems;
  }

  const params = readParams();

  // Topic detail and hub views don't need the question pool — paint
  // immediately. loadAllQuestions() fetches 7 JSON files which on a
  // cold cache makes the page feel sluggish; only the subject view
  // (which lists ALL topics including non-learn ones) needs it.
  try {
    if (params.s && params.t) { paintTopic(params.s, params.t); return; }
    if (params.s) {
      try { pool = await loadAllQuestions(); }
      catch (e) { pool = []; }
      paintSubject(params.s);
      return;
    }
    paintHub();
  } catch (e) {
    paintFatalError("paint", e);
  }
}

function paintLoading() {
  if (!root) return;
  root.innerHTML = "<section class=\"mock-stub-card\"><p class=\"mock-coach-empty\">Loading&hellip;</p></section>";
}

// ---- Paint: hub (subject picker) ------------------------------------------

function paintHub() {
  const subjects = listSubjects();
  const weak = weakTopics(7).slice(0, 3); // up to 3 most-missed topics
  const studySmartDone = (function () {
    try { return !!readString(STUDY_SMART_KEY); }
    catch (e) { return false; }
  })();

  // Study Smart tile — the meta-skill onboarding (HOW to study, not WHAT).
  // First-time visitors see a big "Start here" CTA; returning kids who've
  // already finished it see a slim certified strip with re-take + exam-day
  // links. Source: design/learn-module-audit.md §6.1.
  let studySmartHtml = "";
  if (!studySmartDone) {
    studySmartHtml =
      "<a class=\"study-smart-tile study-smart-tile-start\" href=\"study-smart.html\">" +
        "<span class=\"study-smart-tile-eyebrow\">Start here &middot; 8 mins</span>" +
        "<span class=\"study-smart-tile-title\">Study Smart</span>" +
        "<span class=\"study-smart-tile-body\">The 7 cheat codes top students use to ace exams. Learn HOW to study, not just what.</span>" +
        "<span class=\"study-smart-tile-cta\">Open the toolkit &rarr;</span>" +
      "</a>";
  } else {
    studySmartHtml =
      "<div class=\"study-smart-strip\">" +
        "<span class=\"study-smart-strip-badge\" aria-hidden=\"true\">&#10003;</span>" +
        "<span class=\"study-smart-strip-title\">Study Smart certified</span>" +
        "<a class=\"study-smart-strip-link\" href=\"study-smart.html\">Re-take</a>" +
        "<span class=\"study-smart-strip-sep\" aria-hidden=\"true\">&middot;</span>" +
        "<a class=\"study-smart-strip-link\" href=\"exam-day.html\">Exam-Day Drill</a>" +
        "<span class=\"study-smart-strip-sep\" aria-hidden=\"true\">&middot;</span>" +
        "<a class=\"study-smart-strip-link\" href=\"cheat-cards.html\">Cheat Cards</a>" +
      "</div>";
  }

  // Cheat Cards tile — promoted on the LEARN hub for everyone (whether or
  // not they've completed Study Smart). Lives between the Study Smart
  // tile/strip and the weak-topics block.
  const cheatCardsTileHtml =
    "<a class=\"cheat-cards-tile\" href=\"cheat-cards.html\">" +
      "<span class=\"cheat-cards-tile-eyebrow\">The named shortcuts</span>" +
      "<span class=\"cheat-cards-tile-title\">Cheat Cards</span>" +
      "<span class=\"cheat-cards-tile-body\">BIDMAS, OIL RIG, PEEL, MRS VANDERTRAMP&hellip; the mnemonics top students load before the test.</span>" +
      "<span class=\"cheat-cards-tile-cta\">Open the deck &rarr;</span>" +
    "</a>";

  let weakHtml = "";
  if (weak.length > 0) {
    weakHtml =
      "<section class=\"mock-coach-block\">" +
        "<h2>Start with what's weak</h2>" +
        "<ul class=\"mock-coach-list\">" +
          weak.map(function (w) {
            const href = "learn.html?s=" + encodeURIComponent(w.subject) + "&t=" + encodeURIComponent(w.topic);
            return "<li class=\"mock-coach-row mock-coach-row-link\">" +
              "<a class=\"mock-coach-row-anchor\" href=\"" + href + "\">" +
                "<div class=\"mock-coach-row-left\">" +
                  "<span class=\"mock-coach-row-subject\">" + escapeHtml(subjectName(w.subject)) + "</span>" +
                  "<span class=\"mock-coach-row-topic\">" + escapeHtml(prettyTopic(w.topic)) + "</span>" +
                "</div>" +
                "<span class=\"mock-coach-row-stat\">" + w.missCount + " miss" + (w.missCount === 1 ? "" : "es") + "</span>" +
              "</a>" +
            "</li>";
          }).join("") +
        "</ul>" +
      "</section>";
  }

  let tilesHtml = "";
  subjects.forEach(function (s) {
    const tone = subjectTone(s.id);
    const learnCount = learning.filter(function (e) { return e.subject === s.id; }).length;
    tilesHtml +=
      "<a class=\"mock-tile mock-learn-subject-tile\" style=\"--tile-color:" + tone + "\" href=\"learn.html?s=" + encodeURIComponent(s.id) + "\">" +
        "<span class=\"mock-tile-tag\">Read &amp; watch</span>" +
        "<span class=\"mock-tile-title\">" + escapeHtml(s.name.toUpperCase()) + "</span>" +
        "<span class=\"mock-tile-meta\">" + learnCount + " topic" + (learnCount === 1 ? "" : "s") + " ready</span>" +
        "<span class=\"mock-tile-arrow\" aria-hidden=\"true\">&rarr;</span>" +
      "</a>";
  });

  root.innerHTML =
    "<section class=\"mock-stub-hero\">" +
      "<span class=\"mock-stub-tag\">LEARN</span>" +
      "<h1 class=\"mock-stub-title\">READ, WATCH, GET THE BASICS</h1>" +
      "<p class=\"mock-stub-quote\">Pick a subject. Examples, visuals and tips in plain English — then test what stuck.</p>" +
    "</section>" +
    studySmartHtml +
    cheatCardsTileHtml +
    weakHtml +
    "<nav class=\"mock-tiles\" aria-label=\"Learning subjects\">" + tilesHtml + "</nav>";
}

// ---- Paint: subject (topic list) ------------------------------------------

function paintSubject(subjectId) {
  const tone = subjectTone(subjectId);
  document.body.style.setProperty("--tile-color", tone);

  const allTopics = pool ? topicsForSubject(pool, subjectId) : [];
  const learnEntries = learning.filter(function (e) { return e.subject === subjectId; });
  const learnTopicSet = {};
  learnEntries.forEach(function (e) { learnTopicSet[e.topic] = e; });

  // Show all topics — topics with learning content link to detail; topics
  // without it show "Learning content coming soon" + drill link.
  let rowsHtml = "";
  allTopics.forEach(function (t) {
    const entry = learnTopicSet[t];
    const ladder = topicLadder(subjectId, t);
    if (entry) {
      const href = "learn.html?s=" + encodeURIComponent(subjectId) + "&t=" + encodeURIComponent(t);
      rowsHtml +=
        "<a class=\"mock-topic-tile\" href=\"" + href + "\">" +
          "<div class=\"mock-topic-tile-main\">" +
            "<span class=\"mock-topic-tile-name\">" + escapeHtml(entry.title || prettyTopic(t)) + "</span>" +
            "<span class=\"mock-topic-tile-meta\">" + escapeHtml(entry.subtitle || "Read &middot; ~" + (entry.readTimeMin || 4) + " min") + "</span>" +
          "</div>" +
          ladderPill(ladder) +
          "<span class=\"mock-topic-tile-arrow\" aria-hidden=\"true\">&rarr;</span>" +
        "</a>";
    } else {
      const drillHref = "subject.html?s=" + encodeURIComponent(subjectId) + "&t=" + encodeURIComponent(t);
      rowsHtml +=
        "<a class=\"mock-topic-tile mock-topic-tile-soon\" href=\"" + drillHref + "\">" +
          "<div class=\"mock-topic-tile-main\">" +
            "<span class=\"mock-topic-tile-name\">" + escapeHtml(prettyTopic(t)) + "</span>" +
            "<span class=\"mock-topic-tile-meta\">Learning content coming soon &middot; tap to drill</span>" +
          "</div>" +
          ladderPill(ladder) +
          "<span class=\"mock-topic-tile-arrow\" aria-hidden=\"true\">&rarr;</span>" +
        "</a>";
    }
  });

  root.innerHTML =
    "<section class=\"mock-stub-hero\" style=\"border-left-color:" + tone + "\">" +
      "<span class=\"mock-stub-tag\">Learn</span>" +
      "<h1 class=\"mock-stub-title\">" + escapeHtml(subjectName(subjectId).toUpperCase()) + "</h1>" +
      "<p class=\"mock-stub-quote\">Pick a topic to read the basics. Each one has examples, tips, and a 5-question drill at the end.</p>" +
    "</section>" +
    "<section class=\"mock-mission\">" +
      "<h2 class=\"mock-mission-title\">Topics</h2>" +
    "</section>" +
    "<nav class=\"mock-topic-tiles\" aria-label=\"Topics\">" + rowsHtml + "</nav>" +
    "<p class=\"mock-back-row\"><a class=\"mock-button mock-button-ghost\" href=\"learn.html\">&larr; All subjects</a></p>";
}

// ---- Paint: topic detail (the actual learning content) -------------------

function paintTopic(subjectId, topic) {
  const entry = learning.find(function (e) { return e.subject === subjectId && e.topic === topic; });
  const tone = subjectTone(subjectId);
  document.body.style.setProperty("--tile-color", tone);

  if (!entry) {
    paintNoContent(subjectId, topic);
    return;
  }

  // Per-topic context passed to renderSection so Phase 3 sections
  // (teach_back, confidence_check) can scope their localStorage reads.
  const ctx = { subjectId: subjectId, topic: topic };

  let sectionsHtml = "";
  (entry.sections || []).forEach(function (s) {
    sectionsHtml += renderSection(s, ctx);
  });

  const tipsHtml = (entry.tips && entry.tips.length > 0)
    ? "<section class=\"mock-learn-tips\">" +
        "<h2 class=\"mock-learn-heading\">Tips</h2>" +
        "<ul class=\"mock-learn-list mock-learn-tips-list\">" +
          entry.tips.map(function (t) { return "<li>" + escapeHtml(t) + "</li>"; }).join("") +
        "</ul>" +
      "</section>"
    : "";

  const visualHtml = (entry.visual && getVisual(entry.visual))
    ? "<div class=\"mock-learn-visual\">" + getVisual(entry.visual) + "</div>"
    : "";

  const drillHref = "subject.html?s=" + encodeURIComponent(subjectId) + "&t=" + encodeURIComponent(topic);
  const backHref  = "learn.html?s=" + encodeURIComponent(subjectId);

  root.innerHTML =
    "<section class=\"mock-stub-hero\" style=\"border-left-color:" + tone + "\">" +
      "<span class=\"mock-stub-tag\">" + escapeHtml(subjectName(subjectId).toUpperCase()) + "</span>" +
      "<h1 class=\"mock-stub-title\">" + escapeHtml((entry.title || prettyTopic(topic)).toUpperCase()) + "</h1>" +
      (entry.subtitle ? "<p class=\"mock-stub-quote\">" + escapeHtml(entry.subtitle) + "</p>" : "") +
    "</section>" +
    visualHtml +
    "<article class=\"mock-learn-article\">" +
      sectionsHtml +
      tipsHtml +
    "</article>" +
    "<section class=\"mock-learn-cta\">" +
      "<a class=\"mock-button\" href=\"" + drillHref + "\">Test what stuck &mdash; 5 questions &rarr;</a>" +
      "<a class=\"mock-button mock-button-ghost\" href=\"" + backHref + "\">&larr; Back to topics</a>" +
    "</section>";

  // Phase 3 sections need post-render JS — bind teach-back save + confidence
  // ratings once the DOM exists. predict/why_prompt are <details>/<summary>
  // and need no JS (browser handles tap-to-reveal natively).
  bindLearnInteractions(ctx);
}

// Section renderer — composes the visual elements that make a learning
// page feel CGP-grade rather than a wall of text. A section can mix:
//   heading, body, list                  — basic prose
//   callout: { title?, body, tone? }     — highlighted aside
//   example: { title?, intro?, steps[] } — boxed worked example
//   quickfact: { value, label }          — big-number stat highlight
//   visual: <key>                        — inline diagram from visuals.js
//
// Phase 3 section types (cognitive-science-backed):
//   predict: { question, answer }        — pretesting prompt (tap-to-reveal)
//   why_prompt: { question, answer }     — elaborative interrogation (tap-to-reveal)
//   teach_back: { prompt, checklist?,    — protégé-effect free-text
//                 model_answer? }
//   confidence_check: true               — RAG self-rating
//
// Any combination is valid; missing fields are skipped. The `ctx`
// argument carries { subjectId, topic } so the persistent section types
// (teach_back + confidence_check) can scope their localStorage keys.
function renderSection(s, ctx) {
  let html = "<section class=\"mock-learn-section\">";
  if (s.heading) html += "<h2 class=\"mock-learn-heading\">" + escapeHtml(s.heading) + "</h2>";
  if (s.predict) html += renderPredict(s.predict);
  if (s.body) html += "<p class=\"mock-learn-body\">" + paragraphHtml(s.body) + "</p>";
  if (Array.isArray(s.list)) {
    html += "<ul class=\"mock-learn-list\">" + s.list.map(function (x) {
      return "<li>" + escapeHtml(x) + "</li>";
    }).join("") + "</ul>";
  }
  if (s.visual && getVisual(s.visual)) {
    html += "<div class=\"mock-learn-section-visual\">" + getVisual(s.visual) + "</div>";
  }
  if (s.callout) html += renderCallout(s.callout);
  if (s.example) html += renderExample(s.example);
  if (s.quickfact) html += renderQuickfact(s.quickfact);
  if (s.why_prompt) html += renderWhyPrompt(s.why_prompt);
  if (s.teach_back) html += renderTeachBack(s.teach_back, ctx);
  if (s.confidence_check === true) html += renderConfidenceCheck(ctx);
  html += "</section>";
  return html;
}

// ---- Phase 3 section types ------------------------------------------------

// Predict — pretesting effect. Pre-reading "what do you think X does?"
// prompt; tap to reveal the model answer. Native <details> handles the
// tap-to-reveal so no JS needed (works with reduced motion + screen readers).
function renderPredict(p) {
  return (
    "<details class=\"mock-learn-predict\">" +
      "<summary>" +
        "<span class=\"mock-learn-predict-eyebrow\">Before you read</span>" +
        "<span class=\"mock-learn-predict-question\">" + escapeHtml(p.question) + "</span>" +
        "<span class=\"mock-learn-predict-hint\">Tap to reveal</span>" +
      "</summary>" +
      "<p class=\"mock-learn-predict-answer\">" + escapeHtml(p.answer) + "</p>" +
    "</details>"
  );
}

// Why prompt — elaborative interrogation. "Why does this work?" prompt;
// tap to reveal a 1-2 sentence causal explanation. Same pattern as
// predict but distinct visual styling.
function renderWhyPrompt(w) {
  return (
    "<details class=\"mock-learn-why\">" +
      "<summary>" +
        "<span class=\"mock-learn-why-eyebrow\">Why does this work?</span>" +
        "<span class=\"mock-learn-why-question\">" + escapeHtml(w.question) + "</span>" +
        "<span class=\"mock-learn-why-hint\">Tap to reveal</span>" +
      "</summary>" +
      "<p class=\"mock-learn-why-answer\">" + escapeHtml(w.answer) + "</p>" +
    "</details>"
  );
}

// Teach-back — Feynman / protégé effect. The kid types a 1-2 sentence
// kid-friendly explanation; we save it. Next visit shows their previous
// answer alongside the model so they spot their own gaps.
function renderTeachBack(t, ctx) {
  const stored = ctx ? safeRead(teachBackKey(ctx.subjectId, ctx.topic)) : null;
  const checklistHtml = (Array.isArray(t.checklist) && t.checklist.length > 0)
    ? "<ul class=\"mock-learn-teachback-checklist\">" +
        t.checklist.map(function (item) {
          return "<li>" + escapeHtml(item) + "</li>";
        }).join("") +
      "</ul>"
    : "";
  const previousHtml = stored
    ? "<div class=\"mock-learn-teachback-previous\">" +
        "<p class=\"mock-learn-teachback-label\">Last time you wrote:</p>" +
        "<p class=\"mock-learn-teachback-previous-text\">" + escapeHtml(stored) + "</p>" +
      "</div>"
    : "";
  const modelAnswerHtml = (stored && t.model_answer)
    ? "<div class=\"mock-learn-teachback-model\">" +
        "<p class=\"mock-learn-teachback-label\">A 7-year-old version:</p>" +
        "<p class=\"mock-learn-teachback-model-text\">" + escapeHtml(t.model_answer) + "</p>" +
      "</div>"
    : "";
  return (
    "<aside class=\"mock-learn-teachback\" data-teachback=\"1\">" +
      "<p class=\"mock-learn-teachback-eyebrow\">Teach the goldfish</p>" +
      "<p class=\"mock-learn-teachback-prompt\">" + escapeHtml(t.prompt) + "</p>" +
      checklistHtml +
      previousHtml +
      "<textarea class=\"mock-learn-teachback-input\" rows=\"3\" placeholder=\"In your own words…\">" + escapeHtml(stored || "") + "</textarea>" +
      "<div class=\"mock-learn-teachback-actions\">" +
        "<button type=\"button\" class=\"mock-button mock-button-sm\" data-teachback-save>Save my answer</button>" +
        "<span class=\"mock-learn-teachback-status\" data-teachback-status>" + (stored ? "&#10003; Saved" : "") + "</span>" +
      "</div>" +
      modelAnswerHtml +
    "</aside>"
  );
}

// Confidence check — three-button RAG. Feeds the spaced-recap schedule
// once Phase 5 lands; for now just persists the rating per topic so the
// kid + parent dashboard can see what's shaky.
function renderConfidenceCheck(ctx) {
  const stored = ctx ? safeRead(confidenceKey(ctx.subjectId, ctx.topic)) : null;
  function btn(value, label, hint) {
    const isActive = stored === value;
    const cls = "mock-learn-confidence-btn mock-learn-confidence-" + value + (isActive ? " is-active" : "");
    return (
      "<button type=\"button\" class=\"" + cls + "\" data-confidence=\"" + value + "\">" +
        "<span class=\"mock-learn-confidence-label\">" + escapeHtml(label) + "</span>" +
        "<span class=\"mock-learn-confidence-hint\">" + escapeHtml(hint) + "</span>" +
      "</button>"
    );
  }
  return (
    "<aside class=\"mock-learn-confidence\" data-confidence-check=\"1\">" +
      "<p class=\"mock-learn-confidence-eyebrow\">RAG yourself</p>" +
      "<p class=\"mock-learn-confidence-prompt\">How confident are you on this topic?</p>" +
      "<div class=\"mock-learn-confidence-row\">" +
        btn("got",   "Got it",    "Could explain it") +
        btn("shaky", "Bit shaky", "Mostly there") +
        btn("lost",  "Lost",      "Re-learn this") +
      "</div>" +
      "<p class=\"mock-learn-confidence-status\" data-confidence-status>" +
        (stored ? "&#10003; Saved as <strong>" + escapeHtml(stored) + "</strong> — shaky/lost topics will resurface sooner." : "") +
      "</p>" +
    "</aside>"
  );
}

function safeRead(key) {
  try { return readString(key); } catch (e) { return null; }
}

// Wires up post-render interactions for the Phase 3 sections. Idempotent
// — if there are no teach-back / confidence sections on the page, this
// silently no-ops.
function bindLearnInteractions(ctx) {
  // Teach-back save buttons.
  const saveBtns = document.querySelectorAll("[data-teachback-save]");
  saveBtns.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      const wrap = btn.closest("[data-teachback]");
      if (!wrap) return;
      const input = wrap.querySelector(".mock-learn-teachback-input");
      const status = wrap.querySelector("[data-teachback-status]");
      if (!input) return;
      const value = (input.value || "").trim();
      try { writeString(teachBackKey(ctx.subjectId, ctx.topic), value); } catch (e2) { /* storage off */ }
      if (status) {
        status.innerHTML = value ? "&#10003; Saved" : "Cleared";
        // Briefly highlight that the save fired.
        status.classList.add("is-flash");
        setTimeout(function () { status.classList.remove("is-flash"); }, 1200);
      }
    });
  });
  // Confidence-check buttons.
  const confBtns = document.querySelectorAll("[data-confidence]");
  confBtns.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      const wrap = btn.closest("[data-confidence-check]");
      if (!wrap) return;
      const value = btn.getAttribute("data-confidence");
      try { writeString(confidenceKey(ctx.subjectId, ctx.topic), value); } catch (e2) { /* storage off */ }
      // Update active state across the row.
      wrap.querySelectorAll("[data-confidence]").forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });
      const status = wrap.querySelector("[data-confidence-status]");
      if (status) {
        status.innerHTML = "&#10003; Saved as <strong>" + escapeHtml(value) + "</strong> — shaky/lost topics will resurface sooner.";
      }
    });
  });
}

function renderCallout(c) {
  const tone = c.tone || "tip"; // "tip" | "warn" | "note"
  const icon = tone === "warn" ? "⚠️" : tone === "note" ? "📘" : "💡";
  const title = c.title || (tone === "warn" ? "Watch out" : tone === "note" ? "Note" : "Top tip");
  return "<aside class=\"mock-learn-callout mock-learn-callout-" + tone + "\">" +
    "<p class=\"mock-learn-callout-title\"><span aria-hidden=\"true\">" + icon + "</span> " + escapeHtml(title) + "</p>" +
    "<p class=\"mock-learn-callout-body\">" + paragraphHtml(c.body || "") + "</p>" +
    "</aside>";
}

function renderExample(e) {
  const stepsHtml = (e.steps || []).map(function (st) {
    return "<li>" + escapeHtml(st) + "</li>";
  }).join("");
  return "<div class=\"mock-learn-example\">" +
    "<p class=\"mock-learn-example-title\">" + escapeHtml(e.title || "Worked example") + "</p>" +
    (e.intro ? "<p class=\"mock-learn-body\">" + escapeHtml(e.intro) + "</p>" : "") +
    (stepsHtml ? "<ol class=\"mock-learn-example-steps\">" + stepsHtml + "</ol>" : "") +
    (e.outro ? "<p class=\"mock-learn-body mock-learn-example-outro\">" + escapeHtml(e.outro) + "</p>" : "") +
    "</div>";
}

function renderQuickfact(q) {
  return "<div class=\"mock-learn-quickfact\">" +
    "<span class=\"mock-learn-quickfact-value\">" + escapeHtml(q.value || "") + "</span>" +
    "<span class=\"mock-learn-quickfact-label\">" + escapeHtml(q.label || "") + "</span>" +
    "</div>";
}

function paintNoContent(subjectId, topic) {
  const drillHref = "subject.html?s=" + encodeURIComponent(subjectId) + "&t=" + encodeURIComponent(topic);
  const backHref  = "learn.html?s=" + encodeURIComponent(subjectId);
  root.innerHTML =
    "<section class=\"mock-stub-card\">" +
      "<h2>Learning content coming soon</h2>" +
      "<p>The reading guide for this topic is still being written. In the meantime, drilling the questions builds familiarity and shows up exactly where you're shaky.</p>" +
      "<div class=\"mock-result-actions\">" +
        "<a class=\"mock-button\" href=\"" + drillHref + "\">Drill 5 questions &rarr;</a>" +
        "<a class=\"mock-button mock-button-ghost\" href=\"" + backHref + "\">&larr; Back to topics</a>" +
      "</div>" +
    "</section>";
}

// ---- Helpers --------------------------------------------------------------

function readParams() {
  const q = location.search;
  const s = match(q, /[?&]s=([a-z\-]+)/i);
  const t = match(q, /[?&]t=([a-z0-9\-]+)/i);
  return { s: s, t: t };
}
// match(), subjectTone(), prettyTopic(), escapeHtml() now imported from
// shared/dom + shared/subjects (see top of file).

function ladderPill(ladder) {
  return "<span class=\"mock-ladder ladder-" + ladder.colour + "\">" + escapeHtml(ladder.tier) + "</span>";
}

// Body text may include double-newlines (paragraph breaks) — render those
// as separate paragraphs. Inline content otherwise treated as plain text
// (escaped) — content is hardcoded by us, no user input here.
function paragraphHtml(s) {
  return String(s || "")
    .split(/\n\s*\n/)
    .map(function (p) { return escapeHtml(p.trim()); })
    .filter(Boolean)
    .join("</p><p class=\"mock-learn-body\">");
}
