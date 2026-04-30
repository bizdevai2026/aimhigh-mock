// AimHigh Mock Prep — shared boot module.
//
// Responsible for painting the landing-page hero card (streak, freezes,
// XP, weekly tier, exam countdown) and wiring the exam-date setter.
// Stub pages also load this so the header element ids stay populated
// if we ever add header data to those pages.
//
// Reads engagement state via engagement.js. Never writes engagement
// state from here — writes happen at the end of a real session.

import {
  readStreak,
  readXpToday,
  readWeek,
  readExamDate,
  writeExamDate,
  todayIso,
  weakTopics,
  isPaused
} from "./engagement.js?v=20260524";

import { readSoundOn, toggleSound } from "./sounds.js?v=20260524";
import { profileName, requireProfileOrRedirect, clearProfile, isParentRole, isChildRole, isDemoRole, signedInRole } from "./profile.js?v=20260524";
import { todaysSubjects, dayName, isSchoolDay } from "./timetable.js?v=20260524";
import { readString as storageReadString, writeString as storageWriteString } from "./platform/storage.js?v=20260524";
import * as logger from "./platform/logger.js?v=20260524";
import { escapeHtml } from "./shared/dom.js?v=20260524";

// Dev / parent diagnostics panel. ?diag=1 in the URL loads it; otherwise
// the import is never resolved (zero cost on normal page loads).
if (/[?&]diag=1\b/.test(location.search)) {
  import("./diagnostics/panel.js?v=20260524").catch(function (e) {
    logger.error("diag", "panel failed to load", e);
  });
}

function $(id) { return document.getElementById(id); }

function paintHeader(streak) {
  const el = $("headerStreak");
  if (el) el.textContent = String(streak.current);
}

function paintHero() {
  const streak = readStreak();
  const xp = readXpToday();
  const week = readWeek();
  const examDate = readExamDate();

  paintHeader(streak);

  // First-time state = no streak ever started AND no activity this week.
  // Empty-state copy avoids "0 day streak / BRONZE / 1 missed day allowed",
  // which reads as a demoralising scoreboard before any session has run.
  const firstTime =
    (streak.current || 0) === 0 &&
    streak.lastDateIso == null &&
    (week.daysHit || 0) === 0;

  // Hero streak block
  const heroStreakNum = $("heroStreakNum");
  if (heroStreakNum) heroStreakNum.textContent = String(streak.current);

  const heroStreakLabel = $("heroStreakLabel");
  if (heroStreakLabel) {
    heroStreakLabel.textContent = firstTime ? "Day 1 starts here" : "Day streak";
  }

  const heroFreezes = $("heroFreezes");
  if (heroFreezes) {
    if (firstTime) {
      heroFreezes.innerHTML =
        "<span>First warm-up kicks off your streak.</span>";
    } else {
      heroFreezes.innerHTML =
        "<span><strong>" + streak.freezes + "</strong> freezes saved</span>" +
        "<span>1 missed day allowed</span>";
    }
  }

  // XP progress
  const heroXpValue = $("heroXpValue");
  if (heroXpValue) heroXpValue.textContent = xp.earned + "/" + xp.goal + " XP";

  const heroXpFill = $("heroXpFill");
  const heroXpBar = $("heroXpBar");
  if (heroXpFill && heroXpBar) {
    const pct = Math.max(0, Math.min(100, Math.round((xp.earned / xp.goal) * 100)));
    heroXpBar.setAttribute("aria-valuenow", String(xp.earned));
    // Defer the width set so the transition runs on first paint.
    setTimeout(function () { heroXpFill.style.width = pct + "%"; }, 60);
  }

  // Tier
  const heroTier = $("heroTier");
  if (heroTier) {
    if (firstTime) {
      heroTier.textContent = "Get started";
      heroTier.className = "mock-hero-tier-value tier-empty";
    } else {
      const tierName = String(week.tier || "BRONZE").toUpperCase();
      heroTier.textContent = tierName;
      heroTier.className = "mock-hero-tier-value tier-" + tierName.toLowerCase();
    }
  }

  paintCountdown(examDate);
}

function paintCountdown(examDate) {
  const valueEl = $("heroCountdownValue");
  const setBtn = $("heroCountdownSet");
  const editBtn = $("heroCountdownEdit");
  if (!valueEl || !setBtn || !editBtn) return;

  if (examDate) {
    const days = daysBetween(todayIso(), examDate);
    if (days == null) {
      valueEl.textContent = "—";
    } else if (days < 0) {
      valueEl.textContent = "Done";
    } else if (days === 0) {
      valueEl.textContent = "Today";
    } else if (days === 1) {
      valueEl.textContent = "Tomorrow";
    } else {
      valueEl.textContent = days + " days to go";
    }
    valueEl.style.display = "";
    setBtn.style.display = "none";
    editBtn.style.display = "";
  } else {
    valueEl.style.display = "none";
    setBtn.style.display = "";
    editBtn.style.display = "none";
  }
}

function daysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return null;
  const from = new Date(fromIso + "T00:00:00");
  const to = new Date(toIso + "T00:00:00");
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return null;
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

function wireExamDateSetter() {
  const setBtn = $("heroCountdownSet");
  const editBtn = $("heroCountdownEdit");
  const dateInput = $("heroDateInput");
  if (!dateInput) return;

  function showInput() {
    dateInput.value = readExamDate() || "";
    dateInput.style.display = "";
    dateInput.focus();
    if (typeof dateInput.showPicker === "function") {
      try { dateInput.showPicker(); } catch (e) { /* not supported */ }
    }
  }
  function hideInput() {
    dateInput.style.display = "none";
  }
  function commit() {
    const v = dateInput.value;
    if (v) {
      writeExamDate(v);
      paintCountdown(v);
    }
    hideInput();
  }

  if (setBtn) setBtn.addEventListener("click", showInput);
  if (editBtn) editBtn.addEventListener("click", showInput);
  dateInput.addEventListener("change", commit);
  dateInput.addEventListener("blur", function () {
    // Don't auto-commit on blur if value didn't change; just hide.
    hideInput();
  });
}

function injectSoundToggle() {
  const inner = document.querySelector(".mock-header-inner");
  if (!inner) return;
  if (inner.querySelector(".mock-sound-toggle")) return; // already injected
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mock-sound-toggle";
  btn.setAttribute("aria-label", "Toggle sound");
  btn.title = "Toggle sound";
  function paintBtn() {
    btn.textContent = readSoundOn() ? "🔊" : "🔇"; // 🔊 / 🔇
    btn.setAttribute("aria-pressed", readSoundOn() ? "true" : "false");
  }
  paintBtn();
  btn.addEventListener("click", function () {
    toggleSound();
    paintBtn();
  });
  inner.appendChild(btn);
}

function injectThemeToggle() {
  const inner = document.querySelector(".mock-header-inner");
  if (!inner) return;
  if (inner.querySelector(".mock-theme-toggle")) return;
  // boot/theme.js exposes window.GBTheme. If it didn't load (e.g. blocked
  // by a content filter), gracefully skip — every other page concern
  // continues to work.
  if (!window.GBTheme) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mock-theme-toggle";
  btn.setAttribute("aria-label", "Toggle light or dark theme");
  btn.title = "Toggle light / dark";
  function paintBtn() {
    const t = window.GBTheme.current();
    // Icon shows what a tap WOULD switch TO (sun = "switch to light").
    btn.textContent = t === "dark" ? "☀" : "☾";
    btn.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
  }
  paintBtn();
  btn.addEventListener("click", function () {
    window.GBTheme.toggle();
    paintBtn();
  });
  inner.appendChild(btn);
}

function paintProfileLine() {
  const name = profileName();
  const greetEl = document.getElementById("heroGreeting");
  if (greetEl && name) {
    // First-time greeting points the kid straight at the WARM-UP tile —
    // the home page is otherwise a metrics-heavy scoreboard of zeros
    // before any session has run, which the UX review flagged as
    // demoralising. Returning users get the simple "Hi, name."
    const streak = readStreak();
    const week = readWeek();
    const firstTime =
      (streak.current || 0) === 0 &&
      streak.lastDateIso == null &&
      (week.daysHit || 0) === 0;
    if (firstTime) {
      greetEl.innerHTML = "Welcome, <strong>" + escapeHtml(name) +
        "</strong>. A quick 5-minute warm-up kicks off your streak — when you're ready.";
    } else {
      greetEl.textContent = "Hi, " + name + ".";
    }
  }
  const dashEl = document.getElementById("dashGreeting");
  if (dashEl && name) {
    dashEl.textContent = name + "'s progress";
  }
}

const SUBJECT_NAMES = {
  science: "Science",
  maths: "Maths",
  english: "English",
  french: "French",
  history: "History",
  geography: "Geography",
  computing: "Computer Science"
};

function paintTodayStrip() {
  const target = document.getElementById("todayStrip");
  if (!target) return;
  const subjects = todaysSubjects();
  if (!isSchoolDay()) {
    target.innerHTML =
      "<div class=\"mock-today-head\">" +
        "<span class=\"mock-today-label\">Today &mdash; rest day</span>" +
        "<span class=\"mock-today-day\">" + dayName().toUpperCase() + "</span>" +
      "</div>" +
      "<p class=\"mock-today-empty\">No school today. Use it to keep the streak alive with a warm-up.</p>";
    return;
  }
  let chipsHtml = "";
  subjects.forEach(function (sid) {
    const name = SUBJECT_NAMES[sid] || sid;
    chipsHtml +=
      "<a class=\"mock-today-chip\" href=\"subject.html?s=" + encodeURIComponent(sid) + "\">" +
        escapeHtml(name) +
      "</a>";
  });
  target.innerHTML =
    "<div class=\"mock-today-head\">" +
      "<span class=\"mock-today-label\">Today's lessons &mdash; drill what you just had</span>" +
      "<span class=\"mock-today-day\">" + dayName().toUpperCase() + "</span>" +
    "</div>" +
    "<div class=\"mock-today-chips\">" + chipsHtml + "</div>";
}

// escapeHtml now imported from shared/dom.js

function injectProfileChip() {
  const inner = document.querySelector(".mock-header-inner");
  if (!inner) return;
  if (inner.querySelector(".mock-profile-wrap")) return;
  const role = signedInRole();
  if (!role) return;

  const demo = role === "demo";
  const name = demo ? "Demo" : profileName();
  if (!name) return;

  // Wrapper anchors the absolute-positioned panel under the chip.
  const wrap = document.createElement("div");
  wrap.className = "mock-profile-wrap";

  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "mock-profile-chip" + (demo ? " role-demo" : "");
  chip.setAttribute("aria-label", demo ? "Demo session menu" : "Profile menu");
  chip.setAttribute("aria-haspopup", "true");
  chip.setAttribute("aria-expanded", "false");
  chip.title = demo ? "Demo session — tap to exit" : "Profile menu";
  chip.textContent = demo ? "D" : name.charAt(0).toUpperCase();

  // Two-tap sign-out / exit-demo: panel with explicit confirm + cancel,
  // dismissed by an outside click. iOS' native confirm() is risky on a
  // single tap (and confusing for kids), so we own the affordance.
  const panel = document.createElement("div");
  panel.className = "mock-profile-panel";
  panel.setAttribute("role", "menu");
  panel.style.display = "none";

  const signedAs = document.createElement("p");
  signedAs.className = "mock-profile-panel-name";
  signedAs.textContent = demo ? "" : "Signed in as ";
  const nameStrong = document.createElement("strong");
  nameStrong.textContent = demo ? "Demo session" : name;
  signedAs.appendChild(nameStrong);

  const signOutBtn = document.createElement("button");
  signOutBtn.type = "button";
  signOutBtn.className = "mock-profile-signout";
  signOutBtn.textContent = demo ? "Exit demo" : "Sign out";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "mock-profile-cancel";
  cancelBtn.textContent = "Cancel";

  const warn = document.createElement("p");
  warn.className = "mock-profile-warn";
  warn.textContent = demo
    ? "Exits the demo. Nothing was saved during this session."
    : "Signs you out. Your saved progress stays — sign back in with your PIN.";

  panel.appendChild(signedAs);
  panel.appendChild(signOutBtn);
  panel.appendChild(cancelBtn);
  panel.appendChild(warn);

  function open() {
    panel.style.display = "";
    chip.setAttribute("aria-expanded", "true");
  }
  function close() {
    panel.style.display = "none";
    chip.setAttribute("aria-expanded", "false");
  }

  chip.addEventListener("click", function (e) {
    e.stopPropagation();
    if (panel.style.display === "none") open(); else close();
  });
  panel.addEventListener("click", function (e) { e.stopPropagation(); });
  document.addEventListener("click", function () {
    if (panel.style.display !== "none") close();
  });

  signOutBtn.addEventListener("click", function () {
    clearProfile();
    location.replace("welcome.html");
  });
  cancelBtn.addEventListener("click", close);

  wrap.appendChild(chip);
  wrap.appendChild(panel);
  inner.appendChild(wrap);
}

// Block parent role from training pages (defence in depth: each runner
// also self-gates). Returns false if a redirect was triggered.
function gateParentFromTraining() {
  if (!isParentRole()) return true;
  const path = location.pathname;
  const q = location.search;
  let blocked = false;
  if (/daily\.html$/.test(path))   blocked = true;
  if (/paper\.html$/.test(path))   blocked = true;
  if (/subject\.html$/.test(path) && (/[?&]run=1/.test(q) || /[?&]t=/.test(q))) {
    blocked = true;
  }
  if (blocked) {
    location.replace("dashboard.html");
    return false;
  }
  return true;
}

// Parent home page: hide training tiles, show a small banner. Coach
// remains visible. Read-only by design — engagement state is the kid's.
function applyParentHomeView() {
  if (!isParentRole()) return;
  document.body.classList.add("role-parent");
  const trainingTiles = document.querySelectorAll(".mock-tile-warmup, .mock-tile-sprint, .mock-tile-distance");
  trainingTiles.forEach(function (t) { t.style.display = "none"; });
  const main = document.querySelector(".mock-main");
  if (main && !document.querySelector(".mock-parent-banner")) {
    const banner = document.createElement("div");
    banner.className = "mock-parent-banner";
    banner.textContent = "Parent view — read only. Your visit doesn't affect their streak or XP.";
    main.insertBefore(banner, main.firstChild);
  }
}

// Holiday-mode pause: parent-controlled freeze. While active, every
// engagement writer no-ops in engagement.js; this banner is the
// human-facing cue. Visible on every page so the kid always knows
// they're in holiday mode and the streak is safe.
function applyPausedBanner() {
  if (!isPaused()) return;
  document.body.classList.add("is-paused");
  const main = document.querySelector(".mock-main");
  if (main && !document.querySelector(".mock-paused-banner")) {
    const banner = document.createElement("div");
    banner.className = "mock-paused-banner";
    banner.innerHTML =
      "<strong>Holiday mode</strong> &middot; streak paused. Training still " +
      "works but nothing counts. Parent: open Coach to resume.";
    main.insertBefore(banner, main.firstChild);
  }
}

// Demo session: visible on every page so the user always knows
// nothing they do here will be persisted. All engagement writers in
// engagement.js no-op when isDemoMode is true; this banner is the
// human-facing companion.
function applyDemoBanner() {
  if (!isDemoRole()) return;
  document.body.classList.add("role-demo");
  const main = document.querySelector(".mock-main");
  if (main && !document.querySelector(".mock-demo-banner")) {
    const banner = document.createElement("div");
    banner.className = "mock-demo-banner";
    banner.textContent = "Demo session — nothing is saved. Tap “D” top-right to exit.";
    main.insertBefore(banner, main.firstChild);
  }
}

// Personalised onboarding tour — child only, runs once on the first
// visit to the home page after sign-in. Uses the child's name in the
// first card so it feels like the app talking back. Skipping or
// finishing both mark it seen so it never returns.
const TOUR_KEY = "aimhigh-mock-tour-seen";

function maybeShowOnboardingTour() {
  if (!isChildRole()) return;
  if (!document.querySelector(".mock-hero")) return; // home page only
  if (storageReadString(TOUR_KEY) === "true") return;

  const name = profileName() || "there";
  const cards = [
    {
      title: "Hi " + name + "!",
      body: "GradeBlaze is your daily practice app. Show up, hit your goal, build a streak. That's the whole game.",
      next: "OK, what's a streak?"
    },
    {
      title: "Streak = days in a row",
      body: "Hit 30 XP today and your streak starts. Miss a day? You've got cover — just don't miss two.",
      next: "Got it"
    },
    {
      title: "Pick how to practise",
      bullets: [
        "<strong>WARM-UP</strong> &mdash; 10 quick questions, every day",
        "<strong>SPRINT</strong> &mdash; pick one subject, go deep",
        "<strong>FULL MOCK</strong> &mdash; the whole paper, timed",
        "<strong>COACH</strong> &mdash; the parent view of your progress"
      ],
      next: "Let's go"
    }
  ];

  let step = 0;

  const overlay = document.createElement("div");
  overlay.className = "mock-tour-overlay";

  function paintCard() {
    const c = cards[step];
    const dotsHtml = cards.map(function (_, i) {
      return "<span class=\"mock-tour-dot " + (i === step ? "active" : "") + "\"></span>";
    }).join("");
    // Bullets are hardcoded developer content — render as raw HTML so we
    // can use <strong> for emphasis. Body strings still escape (the only
    // dynamic injection is the kid's name in card 1, which is escaped
    // by the title escapeHtml call below).
    let contentHtml;
    if (c.bullets) {
      contentHtml = "<ul class=\"mock-tour-bullets\">" +
        c.bullets.map(function (b) { return "<li>" + b + "</li>"; }).join("") +
        "</ul>";
    } else {
      contentHtml = "<p class=\"mock-tour-body\">" + escapeHtml(c.body) + "</p>";
    }
    overlay.innerHTML =
      "<div class=\"mock-tour-card\" role=\"dialog\" aria-modal=\"true\">" +
        "<div class=\"mock-tour-dots\" aria-hidden=\"true\">" + dotsHtml + "</div>" +
        "<h2 class=\"mock-tour-title\">" + escapeHtml(c.title) + "</h2>" +
        contentHtml +
        "<button type=\"button\" class=\"mock-button mock-tour-next\">" + escapeHtml(c.next) + "</button>" +
        "<button type=\"button\" class=\"mock-tour-skip\">Skip</button>" +
      "</div>";
    overlay.querySelector(".mock-tour-next").addEventListener("click", advance);
    overlay.querySelector(".mock-tour-skip").addEventListener("click", finish);
  }
  function advance() {
    step += 1;
    if (step >= cards.length) { finish(); return; }
    paintCard();
  }
  function finish() {
    storageWriteString(TOUR_KEY, "true");
    overlay.remove();
  }

  paintCard();
  document.body.appendChild(overlay);
}

// Home-page shortcut for the kid: "Your weakest right now — drill it."
// Reads the same weakTopics(7) ranking the Coach uses; only paints if
// at least one miss has been logged in the last 7 days. Card links
// straight to a 5-question topic drill.
function paintWeakestShortcut() {
  if (!isChildRole()) return;
  const tilesNav = document.querySelector(".mock-tiles");
  if (!tilesNav) return;
  if (document.getElementById("weakestShortcut")) return;
  const weak = weakTopics(7);
  if (!weak.length) return;
  const top = weak[0];
  if (!top || top.missCount < 1) return;

  const subjectLabel = SUBJECT_NAMES[top.subject] || top.subject;
  const topicLabel = String(top.topic).replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  const href = "subject.html?s=" + encodeURIComponent(top.subject) + "&t=" + encodeURIComponent(top.topic);

  const card = document.createElement("a");
  card.id = "weakestShortcut";
  card.className = "mock-weakest-shortcut";
  card.href = href;
  card.innerHTML =
    "<div class=\"mock-weakest-head\">" +
      "<span class=\"mock-weakest-eyebrow\">Drill your weakest</span>" +
      "<span class=\"mock-weakest-arrow\" aria-hidden=\"true\">&rarr;</span>" +
    "</div>" +
    "<div class=\"mock-weakest-body\">" +
      "<span class=\"mock-weakest-subject\">" + escapeHtml(subjectLabel) + "</span>" +
      "<span class=\"mock-weakest-topic\">" + escapeHtml(topicLabel) + "</span>" +
    "</div>" +
    "<div class=\"mock-weakest-meta\">" + top.missCount + " miss" + (top.missCount === 1 ? "" : "es") + " in last 7 days &middot; 5-question drill</div>";
  tilesNav.parentNode.insertBefore(card, tilesNav);
}

function boot() {
  // Auth gate — anyone without a session gets sent to welcome.html.
  // Welcome page itself never loads mock.js so there's no loop.
  // Cancel the loading guard on every early-return path: location.replace
  // is asynchronous, and on a slow redirect target the timeout card can
  // briefly flash on the old page before navigation completes.
  if (!requireProfileOrRedirect()) {
    if (typeof window.GBReady === "function") window.GBReady();
    return;
  }
  if (!gateParentFromTraining()) {
    if (typeof window.GBReady === "function") window.GBReady();
    return;
  }

  // Hero card lives on the landing page only. Header streak chip on
  // multiple pages — paintHero is safe (id checks short-circuit).
  paintHero();
  wireExamDateSetter();
  injectSoundToggle();
  injectThemeToggle();
  injectProfileChip();
  paintProfileLine();
  paintTodayStrip();
  applyParentHomeView();
  applyDemoBanner();
  applyPausedBanner();
  paintWeakestShortcut();
  maybeShowOnboardingTour();

  // Tell the loading guard the page reached its first real paint.
  if (typeof window.GBReady === "function") window.GBReady();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

// Service worker decommissioned (see sw.js). We deliberately do NOT
// register a new one — that's what was causing "stuck on stale cache"
// loads during development. We DO let any previously-installed SW load
// once so it can self-unregister via its activate handler. New visitors
// never see one.
