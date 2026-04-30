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

import "./mock.js?v=20260507"; // shared header behaviour
import { listSubjects, subjectName, topicsForSubject, loadAllQuestions } from "./questions.js?v=20260507";
import { topicLadder, weakTopics } from "./engagement.js?v=20260507";
import { getVisual } from "./visuals.js?v=20260507";

let learning = null; // array of learning entries from data/learning.json
let pool = null;     // question pool from data/<subject>.json — used to enumerate topics

try { start(); } catch (e) { paintFatalError("start() threw", e); }

async function start() {
  if (!root) return;
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

  let sectionsHtml = "";
  (entry.sections || []).forEach(function (s) {
    sectionsHtml += renderSection(s);
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
}

// Section renderer — composes the visual elements that make a learning
// page feel CGP-grade rather than a wall of text. A section can mix:
//   heading, body, list             — basic prose
//   callout: { title?, body, tone? } — highlighted aside (Top Tip / Watch Out)
//   example: { title?, intro?, steps[] } — boxed worked example
//   quickfact: { value, label }      — big-number stat highlight
//   visual: <key>                    — inline diagram from visuals.js
// Any combination is valid; missing fields are skipped.
function renderSection(s) {
  let html = "<section class=\"mock-learn-section\">";
  if (s.heading) html += "<h2 class=\"mock-learn-heading\">" + escapeHtml(s.heading) + "</h2>";
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
  html += "</section>";
  return html;
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
function match(s, re) { const m = s.match(re); return m ? m[1] : null; }

function ladderPill(ladder) {
  return "<span class=\"mock-ladder ladder-" + ladder.colour + "\">" + escapeHtml(ladder.tier) + "</span>";
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

function prettyTopic(t) {
  if (!t) return "";
  return String(t).replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
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

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
