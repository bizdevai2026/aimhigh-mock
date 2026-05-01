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

import "./mock.js?v=20260612";
import { listSubjects, subjectName } from "./questions.js?v=20260612";
import { subjectTone } from "./shared/subjects.js?v=20260612";
import { escapeHtml, match } from "./shared/dom.js?v=20260612";
import { readJson, writeJson } from "./platform/storage.js?v=20260612";

const STATE_KEY_V1 = "aimhigh-mock-cheat-cards-memorised";        // legacy
const STATE_KEY_V2 = "aimhigh-mock-cheat-cards-state-v2";
const PULL_KEY     = "aimhigh-mock-cheat-todays-pull"; // { date, cardIds[], completedAt? }
const SESSION_SIZE = 5;
const PULL_SIZE    = 3;
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
  if (params.pull === "today") {
    paintTodaysPullSession(params.i || 0);
  } else if (params.s) {
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
  const pull = match(q, /[?&]pull=([a-z]+)/i);
  return {
    s: s,
    i: i == null ? 0 : parseInt(i, 10),
    pull: pull
  };
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

// ---- Today's Pull --------------------------------------------------------
// 3 cards a day, picked across all subjects, deterministic per local day.
// Cached in localStorage so refreshing or re-opening doesn't reroll. The
// daily ritual the audit + Year-7 critique both flagged as missing — gives
// the kid a 90-second floor with a clear "today is done" completion event.

function todayKey() {
  const d = new Date();
  // YYYY-MM-DD in local time. Date-stamping via local clock means the
  // pull rolls over at the kid's midnight, not UTC midnight (which would
  // re-pick mid-evening for UK users).
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

// Read today's cached pull; if it's a different day or doesn't exist,
// build a fresh one and cache it. Returns { date, cardIds, completedAt? }.
function getOrBuildTodaysPull() {
  const cached = readJson(PULL_KEY, null);
  const today = todayKey();
  if (cached && cached.date === today && Array.isArray(cached.cardIds) && cached.cardIds.length > 0) {
    return cached;
  }
  const cardIds = pickPull();
  const fresh = { date: today, cardIds: cardIds };
  try { writeJson(PULL_KEY, fresh); } catch (e) { /* storage off */ }
  return fresh;
}

// Selection rule (specialist recommendation, lightly):
//   1× memorised "due for refresh" (lastSeenAt > 7d ago) if any
//   2× new + practising, priority cards bubbled, max one per subject
// Total = PULL_SIZE (3). Avoids subject-stacking so the daily feels
// varied. Falls back gracefully if there aren't enough candidates of a
// type — fills from the next pool.
function pickPull() {
  const stateMap = readState();
  const out = [];
  const usedSubjects = {};
  function add(card) {
    if (!card) return false;
    if (out.indexOf(card.id) >= 0) return false;
    out.push(card.id);
    usedSubjects[card.subject] = true;
    return true;
  }
  // Bucket the cards.
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const due = [], freshPriority = [], freshOther = [], practising = [];
  cards.forEach(function (c) {
    const st = stateMap[c.id];
    if (st && st.state === "memorised") {
      const ls = st.lastSeenAt ? Date.parse(st.lastSeenAt) : 0;
      if (now - ls > SEVEN_DAYS_MS) due.push(c);
      return;
    }
    if (st && st.state === "practising") {
      practising.push(c);
      return;
    }
    // new
    if (c.priority) freshPriority.push(c);
    else freshOther.push(c);
  });
  // Deterministic-ish shuffle within each bucket using the day as seed
  // — same pool, same day = same order, so the cached pull matches.
  const seed = hashString(todayKey());
  shuffleSeeded(due, seed);
  shuffleSeeded(freshPriority, seed + 1);
  shuffleSeeded(practising, seed + 2);
  shuffleSeeded(freshOther, seed + 3);

  // Prefer one due card if available.
  if (due.length > 0) {
    add(due[0]);
  }
  // Then fill with priority new + practising, no subject repeat where possible.
  function takeAvoidingSubjectRepeat(pool) {
    for (let i = 0; i < pool.length; i++) {
      if (out.length >= PULL_SIZE) return;
      const c = pool[i];
      if (out.indexOf(c.id) >= 0) continue;
      if (usedSubjects[c.subject]) continue;
      add(c);
    }
  }
  takeAvoidingSubjectRepeat(freshPriority);
  if (out.length < PULL_SIZE) takeAvoidingSubjectRepeat(practising);
  if (out.length < PULL_SIZE) takeAvoidingSubjectRepeat(freshOther);
  // Final relaxation — if still under 3, allow subject repeats.
  function takeAnyhow(pool) {
    for (let i = 0; i < pool.length; i++) {
      if (out.length >= PULL_SIZE) return;
      add(pool[i]);
    }
  }
  if (out.length < PULL_SIZE) takeAnyhow(due);
  if (out.length < PULL_SIZE) takeAnyhow(freshPriority);
  if (out.length < PULL_SIZE) takeAnyhow(practising);
  if (out.length < PULL_SIZE) takeAnyhow(freshOther);
  return out;
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function shuffleSeeded(arr, seed) {
  // Simple deterministic shuffle (Fisher-Yates with mulberry32 seed).
  let s = seed >>> 0;
  function rnd() {
    s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
}

function isPullCompletedToday() {
  const pull = readJson(PULL_KEY, null);
  if (!pull || pull.date !== todayKey()) return false;
  return !!pull.completedAt;
}

function markPullCompleted() {
  const pull = readJson(PULL_KEY, null);
  if (!pull) return;
  pull.completedAt = new Date().toISOString();
  try { writeJson(PULL_KEY, pull); } catch (e) { /* storage off */ }
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

  // Today's Pull tile — the daily ritual. Either an inviting CTA or a
  // "done for today" rest state. Sits above the subject tiles because
  // a kid arriving at the hub should default to "do today's 3" rather
  // than choosing a subject (the engagement loop the audit flagged).
  const todaysPull = getOrBuildTodaysPull();
  const pullDone = !!todaysPull.completedAt;
  let pullHtml = "";
  if (pullDone) {
    pullHtml =
      "<div class=\"cheat-pull-tile cheat-pull-done\">" +
        "<span class=\"cheat-pull-eyebrow\">Today's Pull</span>" +
        "<span class=\"cheat-pull-title\">&#10003; Done for today</span>" +
        "<span class=\"cheat-pull-body\">3 cards in the bag. Come back tomorrow for a fresh pull, or pick a subject below to keep going.</span>" +
      "</div>";
  } else {
    // Tease the 3 cards by mnemonic name so the kid knows what they're
    // walking into. Specialist recommendation: bias the front of the
    // entry surface toward action, not toward "pick something".
    const teaseHtml = todaysPull.cardIds.map(function (id) {
      const c = cards.find(function (x) { return x.id === id; });
      if (!c) return "";
      return "<span class=\"cheat-pull-pip\" style=\"--tile-color:" + subjectTone(c.subject) + "\">" +
               escapeHtml(c.mnemonic) +
             "</span>";
    }).join("");
    pullHtml =
      "<a class=\"cheat-pull-tile cheat-pull-go\" href=\"cheat-cards.html?pull=today\">" +
        "<span class=\"cheat-pull-eyebrow\">Today's Pull &middot; 90 seconds</span>" +
        "<span class=\"cheat-pull-title\">3 cards. Try first, then reveal.</span>" +
        "<span class=\"cheat-pull-pips\">" + teaseHtml + "</span>" +
        "<span class=\"cheat-pull-cta\">Start &rarr;</span>" +
      "</a>";
  }

  root.innerHTML =
    "<section class=\"mock-stub-hero\">" +
      "<span class=\"mock-stub-tag\">Cheat Cards</span>" +
      "<h1 class=\"mock-stub-title\">THE NAMED SHORTCUTS</h1>" +
      "<p class=\"mock-stub-quote\">The mnemonics top students load before the test. One card at a time. Try first &mdash; THEN reveal.</p>" +
    "</section>" +
    pullHtml +
    "<div class=\"cheat-progress-banner\">" +
      "<span class=\"cheat-progress-banner-num\">" + totalMemorised + " / " + cards.length + "</span>" +
      "<span class=\"cheat-progress-banner-label\">memorised across all subjects</span>" +
      "<span class=\"cheat-progress-banner-sub\">" + totalPractising + " practising &middot; " + totalNew + " new</span>" +
    "</div>" +
    "<nav class=\"mock-tiles cheat-subject-tiles\" aria-label=\"Cheat Card subjects\">" + tilesHtml + "</nav>" +
    "<p class=\"mock-back-row\"><a class=\"mock-button mock-button-ghost\" href=\"learn.html\">&larr; Back to LEARN</a></p>";
}

// ---- Today's Pull session — same focus stage, but 3 cards, no subject lock ---

function paintTodaysPullSession(startIndex) {
  const todaysPull = getOrBuildTodaysPull();
  const sessionCards = todaysPull.cardIds
    .map(function (id) { return cards.find(function (x) { return x.id === id; }); })
    .filter(Boolean);
  if (sessionCards.length === 0) {
    location.href = "cheat-cards.html";
    return;
  }
  const i = Math.max(0, Math.min(startIndex, sessionCards.length));
  if (i >= sessionCards.length) {
    markPullCompleted();
    paintPullComplete(sessionCards);
    return;
  }
  const card = sessionCards[i];
  // Use the card's subject tone so each card in the pull keeps its
  // identity — pull cards span subjects so this changes per card.
  document.body.style.setProperty("--tile-color", subjectTone(card.subject));
  paintPullCard(sessionCards, i, card);
}

// Same shell as paintFocusCard but the URLs route through ?pull=today
// instead of ?s=<subject>, so the session stays inside the pull flow.
function paintPullCard(session, i, card) {
  const tone = subjectTone(card.subject);
  let segHtml = "";
  for (let s = 0; s < session.length; s++) {
    const cls = s < i ? "is-done" : (s === i ? "is-current" : "");
    segHtml += "<span class=\"cheat-progress-seg " + cls + "\"></span>";
  }
  const promptText = card.prompt || ("What does " + card.mnemonic + " stand for?");
  const subjectLabel = subjectName(card.subject).toUpperCase();
  const priorityChip = card.priority ? "<span class=\"cheat-card-priority\">★ Top 3</span>" : "";
  const stateBadge = renderStateBadge(card);
  const decode = card.decode || "";
  const whenLine = card.when || "";
  const hasWorked = card.worked_example && typeof card.worked_example === "object";

  root.innerHTML =
    "<section class=\"cheat-stage cheat-stage-pull\">" +
      "<a class=\"cheat-stage-exit\" href=\"cheat-cards.html\" aria-label=\"Back to subjects\">&larr;</a>" +
      "<span class=\"cheat-pull-pill\">Today's Pull</span>" +
      "<div class=\"cheat-progress\" aria-label=\"Card " + (i + 1) + " of " + session.length + "\">" +
        segHtml +
      "</div>" +
      "<article class=\"cheat-focus-card state-prompt\" data-card-id=\"" + escapeHtml(card.id) + "\" style=\"--tile-color:" + tone + "\">" +
        "<header class=\"cheat-focus-meta\">" +
          "<span class=\"cheat-focus-subject\">" + escapeHtml(subjectLabel) + "</span>" +
          priorityChip +
          stateBadge +
        "</header>" +
        "<div class=\"cheat-focus-prompt-state\">" +
          "<h2 class=\"cheat-focus-mnemonic\">" + escapeHtml(card.mnemonic) + "</h2>" +
          (card.tagline ? "<p class=\"cheat-focus-tagline\">" + escapeHtml(card.tagline) + "</p>" : "") +
          "<div class=\"cheat-focus-prompt-box\">" +
            "<p class=\"cheat-focus-prompt-eyebrow\">Try first</p>" +
            "<p class=\"cheat-focus-prompt-question\">" + escapeHtml(promptText) + "</p>" +
            "<p class=\"cheat-focus-prompt-hint\">Think it through, then tap Reveal.</p>" +
          "</div>" +
        "</div>" +
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
      "<div class=\"cheat-stage-footer\">" +
        "<div class=\"cheat-stage-footer-prompt\">" +
          "<button type=\"button\" class=\"mock-button cheat-stage-reveal-btn\" data-action=\"reveal\">Reveal answer &rarr;</button>" +
          "<button type=\"button\" class=\"cheat-stage-skip-btn\" data-action=\"skip-pull\">Skip</button>" +
        "</div>" +
        "<div class=\"cheat-stage-footer-reveal\">" +
          "<button type=\"button\" class=\"cheat-rate-btn cheat-rate-again\" data-action=\"rate-again-pull\">" +
            "<span class=\"cheat-rate-icon\">↻</span>" +
            "<span class=\"cheat-rate-label\">Try again</span>" +
          "</button>" +
          "<button type=\"button\" class=\"cheat-rate-btn cheat-rate-got\" data-action=\"rate-got-pull\">" +
            "<span class=\"cheat-rate-icon\">✓</span>" +
            "<span class=\"cheat-rate-label\">Got it</span>" +
          "</button>" +
        "</div>" +
      "</div>" +
    "</section>" +
    renderWalkthroughSheet(card);

  bindPullEvents(session, i, card);
}

function bindPullEvents(session, i, card) {
  const stage = root.querySelector(".cheat-stage");
  if (!stage) return;
  const focusCard = stage.querySelector(".cheat-focus-card");

  // Listener on root — same reasoning as bindFocusEvents (the bottom
  // sheet is a sibling of the stage, not a descendant).
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
    if (action === "skip-pull") {
      advancePull(i);
      return;
    }
    if (action === "rate-got-pull") {
      const result = recordRating(card.id, "got");
      stage.classList.add("is-rated", "is-rated-got");
      if (result.state === "memorised" && result.streak === STREAK_TO_MEMORISE) {
        flashMemorised(focusCard);
      }
      setTimeout(function () { advancePull(i); }, 380);
      return;
    }
    if (action === "rate-again-pull") {
      recordRating(card.id, "again");
      stage.classList.add("is-rated", "is-rated-again");
      setTimeout(function () { advancePull(i); }, 280);
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

function advancePull(i) {
  location.href = "cheat-cards.html?pull=today&i=" + (i + 1);
}

function paintPullComplete(session) {
  const stateMap = readState();
  let memNow = 0;
  session.forEach(function (c) {
    if ((stateMap[c.id] && stateMap[c.id].state) === "memorised") memNow++;
  });
  root.innerHTML =
    "<section class=\"cheat-complete\">" +
      "<div class=\"cheat-complete-burst\" aria-hidden=\"true\">★</div>" +
      "<h1 class=\"cheat-complete-title\">Today's Pull done</h1>" +
      "<p class=\"cheat-complete-sub\">3 cards reviewed &middot; come back tomorrow for a fresh pull</p>" +
      "<div class=\"cheat-complete-stat\">" +
        "<span class=\"cheat-complete-stat-num\">" + memNow + " / " + session.length + "</span>" +
        "<span class=\"cheat-complete-stat-label\">memorised in this pull</span>" +
      "</div>" +
      "<div class=\"cheat-complete-actions\">" +
        "<a class=\"mock-button\" href=\"cheat-cards.html\">Pick a subject &rarr;</a>" +
        "<a class=\"mock-button mock-button-ghost\" href=\"index.html\">&larr; Home</a>" +
      "</div>" +
    "</section>";
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
