// GradeBlaze — Cheat Cards (focus mode v2).
//
// Why the rewrite
// ===============
// v1 shipped the deck as a wall of flippable cards in a 1/2/3-col grid.
// Two parallel critiques (specialist UX + Year-7 perspective) landed the
// same diagnosis: the front was a Pokemon poster but the back was a
// textbook page, the flip was wasted on every navigation tap, the
// "I've got this" memorise tap was self-attestation without proof, and
// the wall had no session shape so kids had no reason to come back.
//
// v2 redesign in one paragraph
// ============================
// One card on screen at a time. The front is a retrieval PROMPT
// ("Can you name the 7 letters of MRS GREN?") not a passive name. The
// kid attempts the answer in their head, taps Reveal, and sees the
// decode + a one-line "when to use" — that's it. No WHY-IT-MATTERS
// section, no four labelled blocks. A "See it in action" chip slides up
// a bottom sheet with the worked example only on demand. After the
// reveal the kid taps Got it ↑ or Try again ↻ — that's the rating that
// drives the memorisation state. "Memorised" is earned by 3 consecutive
// Got-its, not claimed by a single tap.
//
// Stories-style segmented progress bar at the top tells the kid where
// they are in the session. Sessions default to 5 cards, adjustable.
//
// State model
// ===========
// Per-card state in localStorage v2:
//   { state: "new" | "practising" | "memorised",
//     streak: number,           // consecutive Got-its
//     lastSeenAt: ISOdate }
// Migration from v1 (string[] of memorised ids) on first load.
//
// Routes
// ======
//   (no params)        → subject hub (binder-style; 7 tiles + total)
//   ?s=<subject>       → focus session for that subject (single-card)
//   ?s=<subject>&i=N   → resume at the N-th card in the session
//
// Source data: data/cheat-cards.json — 94 cards, 22 with rich
// worked examples. Front prompt comes from card.prompt or is derived
// from the mnemonic at runtime.

import "./mock.js?v=20260606";
import { listSubjects, subjectName } from "./questions.js?v=20260606";
import { subjectTone } from "./shared/subjects.js?v=20260606";
import { escapeHtml, match } from "./shared/dom.js?v=20260606";
import { readJson, writeJson } from "./platform/storage.js?v=20260606";

const STATE_KEY_V1 = "aimhigh-mock-cheat-cards-memorised";        // legacy
const STATE_KEY_V2 = "aimhigh-mock-cheat-cards-state-v2";
const SESSION_SIZE = 5;
const STREAK_TO_MEMORISE = 3;

const root = document.getElementById("cheatCardsRoot");
let cards = null;

// ---- Error fallback ------------------------------------------------------

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

// ---- Boot ----------------------------------------------------------------

start().catch(function (e) { paintFatalError("start() threw", e); }).finally(function () {
  if (typeof window.GBReady === "function") window.GBReady();
});

async function start() {
  if (!root) return;
  paintLoading();
  migrateStateIfNeeded();

  try {
    const r = await fetch("data/cheat-cards.json", { cache: "no-cache" });
    if (!r.ok) {
      paintFatalError("fetch cheat-cards.json (HTTP " + r.status + ")", new Error("HTTP " + r.status));
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
    paintSession(params.s, params.i || 0);
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
  const i = match(q, /[?&]i=(\d+)/i);
  return { s: s, i: i == null ? 0 : parseInt(i, 10) };
}

// ---- State (per-card) ----------------------------------------------------

function readState() {
  const v = readJson(STATE_KEY_V2, {});
  return (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
}

function writeState(state) {
  try { writeJson(STATE_KEY_V2, state); } catch (e) { /* storage off */ }
}

// One-shot migration: v1 was an array of memorised ids. Anything in the
// array becomes { state: "memorised", streak: STREAK_TO_MEMORISE } so kids
// don't lose their pile after the rewrite.
function migrateStateIfNeeded() {
  const existing = readJson(STATE_KEY_V2, null);
  if (existing && typeof existing === "object" && !Array.isArray(existing)) return;
  const legacy = readJson(STATE_KEY_V1, null);
  if (!Array.isArray(legacy) || legacy.length === 0) return;
  const next = {};
  const now = new Date().toISOString();
  legacy.forEach(function (id) {
    if (typeof id === "string") {
      next[id] = { state: "memorised", streak: STREAK_TO_MEMORISE, lastSeenAt: now };
    }
  });
  writeState(next);
}

function getCardState(cardId) {
  const all = readState();
  return all[cardId] || { state: "new", streak: 0, lastSeenAt: null };
}

function setCardState(cardId, partial) {
  const all = readState();
  const prev = all[cardId] || { state: "new", streak: 0, lastSeenAt: null };
  all[cardId] = Object.assign({}, prev, partial, { lastSeenAt: new Date().toISOString() });
  writeState(all);
}

function recordRating(cardId, rating) {
  // rating: "got" | "again"
  const cur = getCardState(cardId);
  let nextStreak = rating === "got" ? cur.streak + 1 : 0;
  let nextState = "practising";
  if (nextStreak >= STREAK_TO_MEMORISE) nextState = "memorised";
  setCardState(cardId, { state: nextState, streak: nextStreak });
  return { state: nextState, streak: nextStreak };
}

// ---- Hub: subject picker (binder-lite) -----------------------------------

function paintHub() {
  const stateMap = readState();
  const subjects = listSubjects();

  // Per-subject and overall counts.
  let totalNew = 0, totalPractising = 0, totalMemorised = 0;
  cards.forEach(function (c) {
    const st = (stateMap[c.id] && stateMap[c.id].state) || "new";
    if (st === "new") totalNew++;
    else if (st === "practising") totalPractising++;
    else if (st === "memorised") totalMemorised++;
  });

  let tilesHtml = "";
  subjects.forEach(function (s) {
    const subjCards = cards.filter(function (c) { return c.subject === s.id; });
    if (subjCards.length === 0) return;
    let mem = 0, prac = 0, fresh = 0;
    subjCards.forEach(function (c) {
      const st = (stateMap[c.id] && stateMap[c.id].state) || "new";
      if (st === "memorised") mem++;
      else if (st === "practising") prac++;
      else fresh++;
    });
    const tone = subjectTone(s.id);
    const href = "cheat-cards.html?s=" + encodeURIComponent(s.id);
    const subtitle = mem + " memorised &middot; " + (prac + fresh) + " to go";
    tilesHtml +=
      "<a class=\"cheat-subject-tile\" style=\"--tile-color:" + tone + "\" href=\"" + href + "\">" +
        "<span class=\"cheat-subject-tile-tag\">Cheat Cards</span>" +
        "<span class=\"cheat-subject-tile-title\">" + escapeHtml(s.name.toUpperCase()) + "</span>" +
        "<span class=\"cheat-subject-tile-count\">" + subtitle + "</span>" +
        "<span class=\"cheat-subject-tile-arrow\" aria-hidden=\"true\">&rarr;</span>" +
      "</a>";
  });

  root.innerHTML =
    "<section class=\"mock-stub-hero\">" +
      "<span class=\"mock-stub-tag\">Cheat Cards</span>" +
      "<h1 class=\"mock-stub-title\">THE NAMED SHORTCUTS</h1>" +
      "<p class=\"mock-stub-quote\">The mnemonics top students load before the test. One card at a time. Try first &mdash; THEN reveal.</p>" +
    "</section>" +
    "<div class=\"cheat-progress-banner\">" +
      "<span class=\"cheat-progress-banner-num\">" + totalMemorised + " / " + cards.length + "</span>" +
      "<span class=\"cheat-progress-banner-label\">memorised across all subjects</span>" +
      "<span class=\"cheat-progress-banner-sub\">" + totalPractising + " practising &middot; " + totalNew + " new</span>" +
    "</div>" +
    "<nav class=\"mock-tiles cheat-subject-tiles\" aria-label=\"Cheat Card subjects\">" + tilesHtml + "</nav>" +
    "<p class=\"mock-back-row\"><a class=\"mock-button mock-button-ghost\" href=\"learn.html\">&larr; Back to LEARN</a></p>";
}

// ---- Session: pick which cards to show -----------------------------------

// Build a session of up to SESSION_SIZE cards for this subject, ordered:
// new + practising first (with priority cards bubbled to the top), then
// memorised cards last (so a returning kid can refresh them too if they
// want, but doesn't have to wade through them).
function buildSession(subjectId) {
  const stateMap = readState();
  const subj = cards.filter(function (c) { return c.subject === subjectId; });
  function rank(c) {
    const st = (stateMap[c.id] && stateMap[c.id].state) || "new";
    const stOrder = st === "new" ? 0 : st === "practising" ? 1 : 2;
    const pOrder = c.priority ? 0 : 1;
    return stOrder * 10 + pOrder;
  }
  const ordered = subj.slice().sort(function (a, b) { return rank(a) - rank(b); });
  return ordered.slice(0, SESSION_SIZE);
}

// ---- Focus mode: single card, three states (prompt / reveal / rate) ------

function paintSession(subjectId, startIndex) {
  const tone = subjectTone(subjectId);
  document.body.style.setProperty("--tile-color", tone);

  const session = buildSession(subjectId);
  if (session.length === 0) {
    root.innerHTML =
      "<section class=\"mock-stub-card\">" +
        "<h2>No cheat cards yet</h2>" +
        "<p>This subject doesn't have any cheat cards in the deck.</p>" +
        "<a class=\"mock-button mock-button-ghost\" href=\"cheat-cards.html\">&larr; All decks</a>" +
      "</section>";
    return;
  }

  const i = Math.max(0, Math.min(startIndex, session.length));
  if (i >= session.length) {
    paintSessionComplete(subjectId, session);
    return;
  }

  const card = session[i];
  paintFocusCard(subjectId, session, i, card);
}

function paintFocusCard(subjectId, session, i, card) {
  const tone = subjectTone(subjectId);

  // Stories-style progress segments (1 per session card).
  let segHtml = "";
  for (let s = 0; s < session.length; s++) {
    const cls = s < i ? "is-done" : (s === i ? "is-current" : "");
    segHtml += "<span class=\"cheat-progress-seg " + cls + "\"></span>";
  }

  const promptText = card.prompt || ("What does " + card.mnemonic + " stand for?");
  const subjectLabel = subjectName(subjectId).toUpperCase();
  const priorityChip = card.priority ? "<span class=\"cheat-card-priority\">★ Top 3</span>" : "";
  const stateBadge = renderStateBadge(card);

  // The card body is a state machine driven by class on .cheat-focus-card:
  //   .state-prompt   — front (mnemonic + prompt + Reveal CTA)
  //   .state-revealed — back (decode + when + worked-example chip + rate buttons)
  // Both states are rendered into the DOM; CSS shows whichever class is set.
  const decode = card.decode || "";
  const whenLine = card.when || "";
  const hasWorked = card.worked_example && typeof card.worked_example === "object";

  root.innerHTML =
    "<section class=\"cheat-stage\">" +
      "<a class=\"cheat-stage-exit\" href=\"cheat-cards.html\" aria-label=\"Back to subjects\">&larr;</a>" +
      "<div class=\"cheat-progress\" aria-label=\"Card " + (i + 1) + " of " + session.length + "\">" +
        segHtml +
      "</div>" +
      "<article class=\"cheat-focus-card state-prompt\" data-card-id=\"" + escapeHtml(card.id) + "\" style=\"--tile-color:" + tone + "\">" +
        // Top metadata strip (subject + priority + state)
        "<header class=\"cheat-focus-meta\">" +
          "<span class=\"cheat-focus-subject\">" + escapeHtml(subjectLabel) + "</span>" +
          priorityChip +
          stateBadge +
        "</header>" +
        // === PROMPT STATE ===
        "<div class=\"cheat-focus-prompt-state\">" +
          "<h2 class=\"cheat-focus-mnemonic\">" + escapeHtml(card.mnemonic) + "</h2>" +
          (card.tagline ? "<p class=\"cheat-focus-tagline\">" + escapeHtml(card.tagline) + "</p>" : "") +
          "<div class=\"cheat-focus-prompt-box\">" +
            "<p class=\"cheat-focus-prompt-eyebrow\">Try first</p>" +
            "<p class=\"cheat-focus-prompt-question\">" + escapeHtml(promptText) + "</p>" +
            "<p class=\"cheat-focus-prompt-hint\">Think it through in your head, then tap Reveal.</p>" +
          "</div>" +
        "</div>" +
        // === REVEAL STATE ===
        "<div class=\"cheat-focus-reveal-state\">" +
          "<p class=\"cheat-focus-decode-eyebrow\">Decode</p>" +
          "<p class=\"cheat-focus-decode\">" + escapeHtml(decode) + "</p>" +
          (whenLine ? "<p class=\"cheat-focus-when\">" + escapeHtml(whenLine) + "</p>" : "") +
          (hasWorked
            ? "<button type=\"button\" class=\"cheat-focus-walkthrough\" data-action=\"open-walkthrough\">" +
                "<span aria-hidden=\"true\">▶</span> See it in action" +
              "</button>"
            : "") +
        "</div>" +
      "</article>" +
      // Footer actions sit OUTSIDE the card so they don't move when state flips.
      // Bottom-anchored on phone for thumb reach.
      "<div class=\"cheat-stage-footer\">" +
        // Footer in PROMPT state
        "<div class=\"cheat-stage-footer-prompt\">" +
          "<button type=\"button\" class=\"mock-button cheat-stage-reveal-btn\" data-action=\"reveal\">Reveal answer &rarr;</button>" +
          "<button type=\"button\" class=\"cheat-stage-skip-btn\" data-action=\"skip\">Skip</button>" +
        "</div>" +
        // Footer in REVEAL state
        "<div class=\"cheat-stage-footer-reveal\">" +
          "<button type=\"button\" class=\"cheat-rate-btn cheat-rate-again\" data-action=\"rate-again\">" +
            "<span class=\"cheat-rate-icon\">↻</span>" +
            "<span class=\"cheat-rate-label\">Try again</span>" +
          "</button>" +
          "<button type=\"button\" class=\"cheat-rate-btn cheat-rate-got\" data-action=\"rate-got\">" +
            "<span class=\"cheat-rate-icon\">✓</span>" +
            "<span class=\"cheat-rate-label\">Got it</span>" +
          "</button>" +
        "</div>" +
      "</div>" +
    "</section>" +
    // Bottom sheet (hidden by default; shown when worked example is opened)
    renderWalkthroughSheet(card);

  bindFocusEvents(subjectId, session, i, card);
}

function renderStateBadge(card) {
  const st = getCardState(card.id);
  if (st.state === "memorised") return "<span class=\"cheat-state-badge cheat-state-memorised\">✓ Memorised</span>";
  if (st.state === "practising") return "<span class=\"cheat-state-badge cheat-state-practising\">Practising " + (st.streak || 0) + "/" + STREAK_TO_MEMORISE + "</span>";
  return "<span class=\"cheat-state-badge cheat-state-new\">New</span>";
}

function renderWalkthroughSheet(card) {
  const we = card.worked_example;
  if (!we || typeof we !== "object") return "";
  const stepsHtml = (Array.isArray(we.steps) ? we.steps : []).map(function (s) {
    return "<li>" + escapeHtml(s) + "</li>";
  }).join("");
  return (
    "<div class=\"cheat-sheet-scrim\" data-action=\"close-walkthrough\" hidden></div>" +
    "<aside class=\"cheat-sheet\" hidden aria-hidden=\"true\">" +
      "<header class=\"cheat-sheet-head\">" +
        "<h3>See it in action</h3>" +
        "<button type=\"button\" class=\"cheat-sheet-close\" data-action=\"close-walkthrough\" aria-label=\"Close\">&times;</button>" +
      "</header>" +
      "<div class=\"cheat-sheet-body\">" +
        (we.scenario ? "<p class=\"cheat-sheet-scenario\">" + escapeHtml(we.scenario) + "</p>" : "") +
        (stepsHtml ? "<ol class=\"cheat-sheet-steps\">" + stepsHtml + "</ol>" : "") +
        (we.outcome ? "<p class=\"cheat-sheet-outcome\">" + escapeHtml(we.outcome) + "</p>" : "") +
      "</div>" +
    "</aside>"
  );
}

function bindFocusEvents(subjectId, session, i, card) {
  const stage = root.querySelector(".cheat-stage");
  if (!stage) return;
  const focusCard = stage.querySelector(".cheat-focus-card");

  // Listener lives on `root`, not `stage`. The bottom sheet (.cheat-sheet
  // + .cheat-sheet-scrim) is rendered as a SIBLING of .cheat-stage, not
  // a descendant — so clicks on its close button or scrim don't bubble
  // up through the stage. Binding to root catches both stage clicks
  // (reveal/skip/rate/open) and sheet clicks (close).
  root.addEventListener("click", function (e) {
    const target = e.target;
    if (!target || !target.closest) return;
    const actionEl = target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.getAttribute("data-action");

    if (action === "reveal") {
      focusCard.classList.remove("state-prompt");
      focusCard.classList.add("state-revealed");
      stage.classList.add("is-revealed");
      return;
    }
    if (action === "skip") {
      advance(subjectId, i);
      return;
    }
    if (action === "rate-got") {
      const result = recordRating(card.id, "got");
      stage.classList.add("is-rated", "is-rated-got");
      if (result.state === "memorised" && result.streak === STREAK_TO_MEMORISE) {
        flashMemorised(focusCard);
      }
      setTimeout(function () { advance(subjectId, i); }, 380);
      return;
    }
    if (action === "rate-again") {
      recordRating(card.id, "again");
      stage.classList.add("is-rated", "is-rated-again");
      setTimeout(function () { advance(subjectId, i); }, 280);
      return;
    }
    if (action === "open-walkthrough") {
      const sheet = root.querySelector(".cheat-sheet");
      const scrim = root.querySelector(".cheat-sheet-scrim");
      if (sheet) { sheet.hidden = false; sheet.setAttribute("aria-hidden", "false"); requestAnimationFrame(function () { sheet.classList.add("is-open"); }); }
      if (scrim) { scrim.hidden = false; }
      return;
    }
    if (action === "close-walkthrough") {
      const sheet = root.querySelector(".cheat-sheet");
      const scrim = root.querySelector(".cheat-sheet-scrim");
      if (sheet) {
        sheet.classList.remove("is-open");
        setTimeout(function () { sheet.hidden = true; sheet.setAttribute("aria-hidden", "true"); }, 280);
      }
      if (scrim) { scrim.hidden = true; }
      return;
    }
  });
}

function advance(subjectId, i) {
  const next = i + 1;
  // location.search update — full reload is fine; no API calls on hub.
  const next_url = "cheat-cards.html?s=" + encodeURIComponent(subjectId) + "&i=" + next;
  location.href = next_url;
}

function flashMemorised(focusCard) {
  if (!focusCard) return;
  focusCard.classList.add("just-memorised");
}

function paintSessionComplete(subjectId, session) {
  const tone = subjectTone(subjectId);
  const stateMap = readState();
  let memNow = 0;
  session.forEach(function (c) {
    if ((stateMap[c.id] && stateMap[c.id].state) === "memorised") memNow++;
  });
  const subjLabel = subjectName(subjectId).toUpperCase();

  root.innerHTML =
    "<section class=\"cheat-complete\" style=\"--tile-color:" + tone + "\">" +
      "<div class=\"cheat-complete-burst\" aria-hidden=\"true\">★</div>" +
      "<h1 class=\"cheat-complete-title\">Session done</h1>" +
      "<p class=\"cheat-complete-sub\">" + escapeHtml(subjLabel) + " &middot; " + session.length + " cards reviewed</p>" +
      "<div class=\"cheat-complete-stat\">" +
        "<span class=\"cheat-complete-stat-num\">" + memNow + "</span>" +
        "<span class=\"cheat-complete-stat-label\">memorised so far in this deck</span>" +
      "</div>" +
      "<div class=\"cheat-complete-actions\">" +
        "<a class=\"mock-button\" href=\"cheat-cards.html?s=" + encodeURIComponent(subjectId) + "\">Run another session &rarr;</a>" +
        "<a class=\"mock-button mock-button-ghost\" href=\"cheat-cards.html\">&larr; All subjects</a>" +
      "</div>" +
    "</section>";
}
