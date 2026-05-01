// GradeBlaze — Cheat Cards deck.
//
// The named mnemonics every top-1% Year-7 student knows by heart. One
// flippable card per shortcut: front is the name (BIDMAS, OIL RIG,
// MRS GREN, MRS VANDERTRAMP...), back is the decode + when-to-use + a
// concrete example. Tap "I've got this" to add the card to a Memorised
// pile — the kid sees the pile growing as the proxy for progress.
//
// Routes:
//   (none)            → subject hub (7 tiles + total memorised)
//   ?s=<subject>      → deck for that subject
//
// Data lives at data/cheat-cards.json — ~94 cards across 7 subjects.
// Source content: design/learn-module-audit.md §5 (the mnemonic bank).

import "./mock.js?v=20260604";
import { listSubjects, subjectName } from "./questions.js?v=20260604";
import { subjectTone } from "./shared/subjects.js?v=20260604";
import { escapeHtml, match } from "./shared/dom.js?v=20260604";
import { readJson, writeJson } from "./platform/storage.js?v=20260604";

const MEMORISED_KEY = "aimhigh-mock-cheat-cards-memorised";

const root = document.getElementById("cheatCardsRoot");
let cards = null; // loaded from data/cheat-cards.json

function paintFatalError(stage, err) {
  if (!root) return;
  const msg = (err && (err.message || err.toString())) || "Unknown error";
  const safe = String(msg).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  root.innerHTML =
    "<section class=\"mock-stub-card\" style=\"border-color:#ff5e3a\">" +
      "<h2 style=\"color:#ff5e3a\">Couldn't load Cheat Cards</h2>" +
      "<p>Stage: <strong>" + stage + "</strong></p>" +
      "<pre style=\"font-family:ui-monospace,monospace;font-size:0.85rem;color:#c4cce0;background:rgba(255,255,255,0.04);padding:0.6rem;border-radius:0.4rem;white-space:pre-wrap;word-break:break-word\">" + safe + "</pre>" +
      "<a class=\"mock-button mock-button-ghost\" href=\"learn.html\">&larr; Back to LEARN</a>" +
    "</section>";
}
window.addEventListener("error", function (e) {
  paintFatalError("uncaught error", e.error || new Error(e.message || "?"));
});
window.addEventListener("unhandledrejection", function (e) {
  paintFatalError("unhandled rejection", e.reason || new Error("Promise rejected"));
});

start().catch(function (e) { paintFatalError("start() threw", e); }).finally(function () {
  if (typeof window.GBReady === "function") window.GBReady();
});

async function start() {
  if (!root) return;
  paintLoading();

  try {
    const r = await fetch("data/cheat-cards.json", { cache: "no-cache" });
    if (!r.ok) {
      paintFatalError("fetch cheat-cards.json (HTTP " + r.status + ")", new Error("HTTP " + r.status + " " + r.statusText));
      return;
    }
    cards = await r.json();
  } catch (e) {
    paintFatalError("fetch cheat-cards.json", e);
    return;
  }
  if (!Array.isArray(cards)) {
    paintFatalError("cheat-cards shape", new Error("Expected array, got " + typeof cards));
    return;
  }

  const params = readParams();
  if (params.s) {
    paintDeck(params.s);
  } else {
    paintHub();
  }
}

function paintLoading() {
  root.innerHTML = "<section class=\"mock-stub-card\"><p class=\"mock-coach-empty\">Loading&hellip;</p></section>";
}

function readParams() {
  const q = location.search;
  const s = match(q, /[?&]s=([a-z\-]+)/i);
  return { s: s };
}

// ---- Memorised pile -----------------------------------------------------

function readMemorised() {
  try {
    const v = readJson(MEMORISED_KEY, []);
    return Array.isArray(v) ? v : [];
  } catch (e) { return []; }
}

function writeMemorised(arr) {
  try { writeJson(MEMORISED_KEY, arr); } catch (e) { /* storage off */ }
}

function isMemorised(cardId) {
  return readMemorised().indexOf(cardId) >= 0;
}

function setMemorised(cardId, on) {
  const list = readMemorised();
  const idx = list.indexOf(cardId);
  if (on && idx < 0) list.push(cardId);
  if (!on && idx >= 0) list.splice(idx, 1);
  writeMemorised(list);
}

// ---- Hub: subject picker ------------------------------------------------

function paintHub() {
  const memorised = readMemorised();
  const total = cards.length;
  const memTotal = memorised.length;

  const subjects = listSubjects();
  let tilesHtml = "";
  subjects.forEach(function (s) {
    const subjCards = cards.filter(function (c) { return c.subject === s.id; });
    if (subjCards.length === 0) return;
    const subjMem = subjCards.filter(function (c) { return memorised.indexOf(c.id) >= 0; }).length;
    const tone = subjectTone(s.id);
    const href = "cheat-cards.html?s=" + encodeURIComponent(s.id);
    tilesHtml +=
      "<a class=\"cheat-subject-tile\" style=\"--tile-color:" + tone + "\" href=\"" + href + "\">" +
        "<span class=\"cheat-subject-tile-tag\">Cheat Cards</span>" +
        "<span class=\"cheat-subject-tile-title\">" + escapeHtml(s.name.toUpperCase()) + "</span>" +
        "<span class=\"cheat-subject-tile-count\">" + subjMem + " / " + subjCards.length + " memorised</span>" +
        "<span class=\"cheat-subject-tile-arrow\" aria-hidden=\"true\">&rarr;</span>" +
      "</a>";
  });

  root.innerHTML =
    "<section class=\"mock-stub-hero\">" +
      "<span class=\"mock-stub-tag\">Cheat Cards</span>" +
      "<h1 class=\"mock-stub-title\">THE NAMED SHORTCUTS</h1>" +
      "<p class=\"mock-stub-quote\">The mnemonics top students load before the test. BIDMAS, OIL RIG, PEEL, MRS VANDERTRAMP&hellip; one card each.</p>" +
    "</section>" +
    "<div class=\"cheat-progress-banner\">" +
      "<span class=\"cheat-progress-banner-num\">" + memTotal + " / " + total + "</span>" +
      "<span class=\"cheat-progress-banner-label\">memorised across all subjects</span>" +
    "</div>" +
    "<nav class=\"mock-tiles cheat-subject-tiles\" aria-label=\"Cheat Card subjects\">" + tilesHtml + "</nav>" +
    "<p class=\"mock-back-row\"><a class=\"mock-button mock-button-ghost\" href=\"learn.html\">&larr; Back to LEARN</a></p>";
}

// ---- Deck: cards for one subject ----------------------------------------

function paintDeck(subjectId) {
  const subjCards = cards.filter(function (c) { return c.subject === subjectId; });
  const tone = subjectTone(subjectId);
  document.body.style.setProperty("--tile-color", tone);

  if (subjCards.length === 0) {
    root.innerHTML =
      "<section class=\"mock-stub-card\">" +
        "<h2>No cheat cards yet</h2>" +
        "<p>This subject doesn't have any cheat cards in the deck.</p>" +
        "<a class=\"mock-button mock-button-ghost\" href=\"cheat-cards.html\">&larr; All decks</a>" +
      "</section>";
    return;
  }

  // Sort so priority cards come first, then memorised cards last (so the
  // kid always sees the most-leveraged ones up top, and finished ones
  // don't crowd the active study set).
  subjCards.sort(function (a, b) {
    const aMem = isMemorised(a.id) ? 1 : 0;
    const bMem = isMemorised(b.id) ? 1 : 0;
    if (aMem !== bMem) return aMem - bMem; // memorised last
    const aP = a.priority ? 0 : 1;
    const bP = b.priority ? 0 : 1;
    return aP - bP; // priority first
  });

  const memCount = subjCards.filter(function (c) { return isMemorised(c.id); }).length;

  let cardsHtml = "";
  subjCards.forEach(function (c) {
    cardsHtml += renderCard(c, tone);
  });

  root.innerHTML =
    "<section class=\"mock-stub-hero\" style=\"border-left-color:" + tone + "\">" +
      "<span class=\"mock-stub-tag\">" + escapeHtml(subjectName(subjectId).toUpperCase()) + "</span>" +
      "<h1 class=\"mock-stub-title\">CHEAT CARDS</h1>" +
      "<p class=\"mock-stub-quote\">Tap a card to flip. \"I've got this\" moves it to your Memorised pile.</p>" +
    "</section>" +
    "<div class=\"cheat-deck-meta\">" +
      "<span class=\"cheat-deck-count\">" + memCount + " / " + subjCards.length + " memorised</span>" +
    "</div>" +
    "<div class=\"cheat-deck\">" + cardsHtml + "</div>" +
    "<p class=\"mock-back-row\">" +
      "<a class=\"mock-button mock-button-ghost\" href=\"cheat-cards.html\">&larr; All subjects</a>" +
    "</p>";

  // Wire up flip + memorise interactions.
  bindCardEvents();
}

function renderCard(c, tone) {
  const memorised = isMemorised(c.id);
  const stateClass = memorised ? " is-memorised" : "";
  const priorityChip = c.priority
    ? "<span class=\"cheat-card-priority\">★ Top 3</span>"
    : "";
  // Optional rich back-of-card content. Priority cards have context +
  // worked_example; non-priority cards fall back to the simple example
  // string. Either way, keep the front identical so the swipe deck reads
  // consistently regardless of how filled-out the back is.
  const contextHtml = c.context
    ? "<p class=\"cheat-card-back-label\">WHY IT MATTERS</p>" +
      "<p class=\"cheat-card-context\">" + escapeHtml(c.context) + "</p>"
    : "";
  let exampleHtml = "";
  if (c.worked_example && typeof c.worked_example === "object") {
    const we = c.worked_example;
    const stepsHtml = (Array.isArray(we.steps) ? we.steps : []).map(function (st) {
      return "<li>" + escapeHtml(st) + "</li>";
    }).join("");
    exampleHtml =
      "<p class=\"cheat-card-back-label\">WORKED EXAMPLE</p>" +
      (we.scenario ? "<p class=\"cheat-card-scenario\">" + escapeHtml(we.scenario) + "</p>" : "") +
      (stepsHtml ? "<ol class=\"cheat-card-steps\">" + stepsHtml + "</ol>" : "") +
      (we.outcome ? "<p class=\"cheat-card-outcome\">" + escapeHtml(we.outcome) + "</p>" : "");
  } else if (c.example) {
    exampleHtml =
      "<p class=\"cheat-card-back-label\">EXAMPLE</p>" +
      "<p class=\"cheat-card-example\">" + escapeHtml(c.example) + "</p>";
  }
  return (
    "<article class=\"cheat-card" + stateClass + "\" data-card-id=\"" + escapeHtml(c.id) + "\" style=\"--tile-color:" + tone + "\">" +
      "<div class=\"cheat-card-inner\">" +
        // FRONT
        "<div class=\"cheat-card-face cheat-card-front\">" +
          priorityChip +
          "<h2 class=\"cheat-card-mnemonic\">" + escapeHtml(c.mnemonic) + "</h2>" +
          "<p class=\"cheat-card-tagline\">" + escapeHtml(c.tagline || "") + "</p>" +
          "<span class=\"cheat-card-flip-hint\">Tap to flip &rarr;</span>" +
        "</div>" +
        // BACK
        "<div class=\"cheat-card-face cheat-card-back\">" +
          "<p class=\"cheat-card-back-label\">DECODE</p>" +
          "<p class=\"cheat-card-decode\">" + escapeHtml(c.decode || "") + "</p>" +
          contextHtml +
          (c.when ? "<p class=\"cheat-card-back-label\">WHEN TO USE</p>" +
                    "<p class=\"cheat-card-when\">" + escapeHtml(c.when) + "</p>" : "") +
          exampleHtml +
          "<div class=\"cheat-card-actions\">" +
            "<button type=\"button\" class=\"cheat-card-mem-btn\" data-action=\"toggle-memorised\">" +
              (memorised ? "&#10003; Memorised &middot; tap to undo" : "I've got this &rarr; memorise") +
            "</button>" +
          "</div>" +
        "</div>" +
      "</div>" +
    "</article>"
  );
}

function bindCardEvents() {
  // Click on the card body flips it (but ignore clicks on the action button).
  const els = document.querySelectorAll(".cheat-card");
  els.forEach(function (el) {
    el.addEventListener("click", function (e) {
      const target = e.target;
      // If the click was on the memorise button, handle that and don't flip.
      if (target.closest && target.closest("[data-action=toggle-memorised]")) {
        e.stopPropagation();
        const id = el.getAttribute("data-card-id");
        const next = !isMemorised(id);
        setMemorised(id, next);
        // Repaint the deck so sort order + counter update.
        const params = readParams();
        if (params.s) paintDeck(params.s);
        return;
      }
      // Otherwise flip.
      el.classList.toggle("is-flipped");
    });
  });
}
