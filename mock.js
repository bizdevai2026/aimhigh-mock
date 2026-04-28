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

  // Hero streak block
  const heroStreakNum = $("heroStreakNum");
  if (heroStreakNum) heroStreakNum.textContent = String(streak.current);

  const heroFreezes = $("heroFreezes");
  if (heroFreezes) {
    heroFreezes.innerHTML =
      "<span><strong>" + streak.freezes + "</strong> freezes saved</span>" +
      "<span>1 missed day allowed</span>";
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
    const tierName = String(week.tier || "BRONZE").toUpperCase();
    heroTier.textContent = tierName;
    heroTier.className = "mock-hero-tier-value tier-" + tierName.toLowerCase();
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
    if (days != null && days >= 0) {
      valueEl.textContent = "T-" + days;
    } else if (days != null && days < 0) {
      valueEl.textContent = "Done";
    } else {
      valueEl.textContent = "--";
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

function boot() {
  // Hero card lives on the landing page only. Header streak chip on
  // multiple pages — paintHero is safe (id checks short-circuit).
  paintHero();
  wireExamDateSetter();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
