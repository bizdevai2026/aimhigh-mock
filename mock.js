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
  todayIso
} from "./engagement.js";

import { readSoundOn, toggleSound } from "./sounds.js";
import { profileName, requireProfileOrRedirect, clearProfile } from "./profile.js";
import { todaysSubjects, dayName, isSchoolDay } from "./timetable.js";

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

function paintProfileLine() {
  const name = profileName();
  const greetEl = document.getElementById("heroGreeting");
  if (greetEl && name) {
    greetEl.textContent = "Hi, " + name + ".";
  }
  const dashEl = document.getElementById("dashGreeting");
  if (dashEl && name) {
    dashEl.textContent = name + "'s training";
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

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function injectProfileChip() {
  const inner = document.querySelector(".mock-header-inner");
  if (!inner) return;
  if (inner.querySelector(".mock-profile-wrap")) return;
  const name = profileName();
  if (!name) return;

  // Wrapper anchors the absolute-positioned panel under the chip.
  const wrap = document.createElement("div");
  wrap.className = "mock-profile-wrap";

  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "mock-profile-chip";
  chip.setAttribute("aria-label", "Profile menu");
  chip.setAttribute("aria-haspopup", "true");
  chip.setAttribute("aria-expanded", "false");
  chip.title = "Profile menu";
  chip.textContent = name.charAt(0).toUpperCase();

  // Two-tap sign-out: panel with explicit Sign out / Cancel buttons,
  // dismissed by an outside click. iOS' native confirm() is risky on a
  // single tap (and confusing for kids), so we own the affordance.
  const panel = document.createElement("div");
  panel.className = "mock-profile-panel";
  panel.setAttribute("role", "menu");
  panel.style.display = "none";

  const signedAs = document.createElement("p");
  signedAs.className = "mock-profile-panel-name";
  signedAs.textContent = "Signed in as ";
  const nameStrong = document.createElement("strong");
  nameStrong.textContent = name;
  signedAs.appendChild(nameStrong);

  const signOutBtn = document.createElement("button");
  signOutBtn.type = "button";
  signOutBtn.className = "mock-profile-signout";
  signOutBtn.textContent = "Sign out";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "mock-profile-cancel";
  cancelBtn.textContent = "Cancel";

  const warn = document.createElement("p");
  warn.className = "mock-profile-warn";
  warn.textContent = "Signs you out. Your saved progress stays — sign back in with your PIN.";

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

function boot() {
  // Profile gate — anyone without a profile gets sent to welcome.html.
  // Welcome page itself never loads mock.js so there's no loop.
  if (!requireProfileOrRedirect()) return;

  // Hero card lives on the landing page only. Header streak chip on
  // multiple pages — paintHero is safe (id checks short-circuit).
  paintHero();
  wireExamDateSetter();
  injectSoundToggle();
  injectProfileChip();
  paintProfileLine();
  paintTodayStrip();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
