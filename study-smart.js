// GradeBlaze — Study Smart onboarding.
//
// 8-step meta-skill primer that teaches a Year 7 HOW to study, not WHAT
// to study. The single highest-leverage few minutes the app can give:
// every cognitive-science source and every top-1%-student forum lands
// in the same place — Year 7 is the moment to learn the meta-skill, and
// kids who don't get this content end up cramming in Year 11 wishing
// they had.
//
// Routes via ?step=N in the URL (N = 0..8). Step 0 is the intro / cover,
// steps 1-7 are the techniques (Output, Spacing, Feynman, RAG, BUG, Plan,
// Traps), step 8 is the certified-complete card.
//
// Persists completion to localStorage under STUDY_SMART_KEY so the LEARN
// hub can swap the "Start here" tile for a "Re-take" badge once done.
//
// Design notes:
//   - Icons are inline SVG, drawn in the cobalt-premium register that
//     matches the rest of the app post-redraw.
//   - Each step is intentionally one-screen-no-scroll on a phone in
//     portrait, so the kid can swipe through without losing context.
//   - "Got it" advances; "Skip the toolkit" exists but is buried.

import "./mock.js?v=20260611";
import { readString, writeString } from "./platform/storage.js?v=20260611";
import { escapeHtml, match } from "./shared/dom.js?v=20260611";

const STUDY_SMART_KEY = "aimhigh-mock-study-smart-complete";

const root = document.getElementById("studySmartRoot");

function paintFatalError(stage, err) {
  if (!root) return;
  const msg = (err && (err.message || err.toString())) || "Unknown error";
  const safe = String(msg).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  root.innerHTML =
    "<section class=\"mock-stub-card\" style=\"border-color:#ff5e3a\">" +
      "<h2 style=\"color:#ff5e3a\">Couldn't start Study Smart</h2>" +
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

// === STEP CONTENT =========================================================
// Eight techniques + an intro + a certified card. Each step is a small
// screen the kid taps through — Outfit display heading, one paragraph,
// one "try it" example or visual, navigation. Source content from the
// LEARN module audit (design/learn-module-audit.md §6.1) which itself
// distils the cognitive-science evidence base + top-1%-student forum
// research.

const STEPS = [
  {
    id: "intro",
    eyebrow: "Welcome",
    title: "Top students don't have bigger brains",
    icon: iconBolt(),
    body:
      "They have more cheat codes loaded.\n\n" +
      "When the exam asks them to multiply two binomials, they don't think \"hmm what do I do?\" They think \"FOIL\" and their hand starts moving. When asked about life processes, they don't pause — MRS GREN flows out automatically.\n\n" +
      "Over the next 8 minutes you'll learn the 7 techniques the top 1% use. Get these into your habits and you'll work less and score more — that's the trick.",
    actionLabel: "Show me the toolkit"
  },
  {
    id: "output",
    eyebrow: "Technique 1 of 7",
    title: "Output beats input",
    icon: iconOutput(),
    body:
      "Re-reading your notes feels like learning. It isn't — it's just eyes on a page.\n\n" +
      "Top students spend most of their revision PRODUCING answers, not consuming notes. The single best switch you can make today: replace re-reading with the BLURTING method.",
    tryIt: {
      title: "BLURTING — try it once",
      steps: [
        "Read a section of notes (max 5 min).",
        "Close the book. On a blank page, write down EVERYTHING you remember in one colour.",
        "Open the book. Fill in the gaps in a DIFFERENT colour."
      ],
      outro: "The second colour shows you exactly what didn't stick. That's the bit to drill, not the green stuff."
    },
    actionLabel: "Got it — next"
  },
  {
    id: "spacing",
    eyebrow: "Technique 2 of 7",
    title: "Spacing — the 1, 3, 7, 21 rule",
    icon: iconSpacing(),
    body:
      "Cramming feels productive. It isn't — your brain dumps most of it within 24 hours.\n\n" +
      "What works instead: review the same topic on day 1, then day 3, then day 7, then day 21. Every time you almost-forget then re-remember, the memory gets stronger. Forget once, you remember forever.",
    tryIt: {
      title: "How to do it",
      steps: [
        "First time you learn a topic — that's day 1.",
        "Three days later, do a 5-min recap (don't re-read; quiz yourself).",
        "A week after that, recap again. Then once more after three weeks.",
        "Four exposures. Memory locked."
      ]
    },
    actionLabel: "Got it — next"
  },
  {
    id: "feynman",
    eyebrow: "Technique 3 of 7",
    title: "Teach the goldfish",
    icon: iconFish(),
    body:
      "If you can explain it to a 7-year-old, you actually know it. If you find yourself using big words, you're hiding a gap.\n\n" +
      "This is called the Feynman technique. It's the fastest way to find what you don't really understand — because the moment you can't simplify it, you've found the hole.",
    tryIt: {
      title: "Try it now",
      steps: [
        "Pick a topic you covered in class today.",
        "Imagine your goldfish is listening. Explain it out loud in 30 seconds, no jargon.",
        "Stuck on a word? That's exactly where you go back and re-learn."
      ],
      outro: "Bonus: record it on your phone. Listening back is its own revision."
    },
    actionLabel: "Got it — next"
  },
  {
    id: "rag",
    eyebrow: "Technique 4 of 7",
    title: "RAG yourself — be honest",
    icon: iconRag(),
    body:
      "Most kids spend revision time on what they already know. It feels safe but it's a waste.\n\n" +
      "Top students rate every topic Red, Amber or Green and only drill the reds. The greens get a 30-second touch-up and a tick.",
    tryIt: {
      title: "The RAG colours",
      steps: [
        "GREEN — I could explain this to my friend right now. (5 min recap and move on.)",
        "AMBER — I'd get most of it. Bit shaky. (Drill 10 questions.)",
        "RED — I don't really get this. (LEARN it again, then drill.)"
      ],
      outro: "Be brutal. Mediocre students mark themselves green to feel good. Top students mark themselves harder than the examiner."
    },
    actionLabel: "Got it — next"
  },
  {
    id: "bug",
    eyebrow: "Technique 5 of 7",
    title: "BUG every question in the exam",
    icon: iconMagnify(),
    body:
      "The #1 way good students drop marks: answering the wrong question. They knew the topic. They just missed what was being asked.\n\n" +
      "Top students BUG every question. It takes 10 seconds and catches almost every avoidable mistake.",
    tryIt: {
      title: "BUG = three steps",
      steps: [
        "B — BOX the command word (describe / explain / compare / evaluate).",
        "U — UNDERLINE exactly what you're being asked to do.",
        "G — GLANCE BACK after writing to check you actually answered THAT."
      ],
      outro: "If \"explain\" is 2 marks, the answer is always: point + because. The marks tell you the structure before you've read the topic."
    },
    actionLabel: "Got it — next"
  },
  {
    id: "plan",
    eyebrow: "Technique 6 of 7",
    title: "The 6-week plan that works",
    icon: iconCalendar(),
    body:
      "Six weeks of daily 30-minute revision beats two weeks of all-day cramming. Every Mumsnet thread, every Reddit retrospective, every grade-9 student says the same thing: start now, go small, stay regular.",
    tryIt: {
      title: "The cadence",
      steps: [
        "Weeknights — 2 sessions of 25 min. Pomodoro: 25 on / 5 off.",
        "One weekend session, longer. The other weekend = full rest.",
        "Day 1-4: forward learn. Day 5: BLURT + repair the reds.",
        "Hardest subject FIRST when you're fresh. Not last."
      ],
      outro: "30 minutes of productive revision beats 3 hours of making pretty notes."
    },
    actionLabel: "Got it — next"
  },
  {
    id: "traps",
    eyebrow: "Technique 7 of 7",
    title: "5 traps to dodge",
    icon: iconWarn(),
    body:
      "These are the classic mistakes everyone makes. Just avoiding them puts you ahead of most of your year.",
    tryIt: {
      title: "Don't do these",
      steps: [
        "1. Highlighting and re-reading. (Feels productive. Isn't.)",
        "2. Phone in the room while revising.",
        "3. Cramming the night before. Your brain locks memories WHILE YOU SLEEP.",
        "4. Watching study-with-me YouTube videos. That's not studying, that's watching.",
        "5. \"I'll start tomorrow.\" Just start a 5-minute version. It always extends."
      ],
      outro: "Every kid in your class will fall into at least 3 of these. You won't."
    },
    actionLabel: "Got it — next"
  },
  {
    id: "complete",
    eyebrow: "Done",
    title: "Study Smart certified",
    icon: iconBadge(),
    body:
      "You now have the toolkit:\n\n" +
      "• Blurt instead of re-read\n" +
      "• Space at 1, 3, 7, 21 days\n" +
      "• Teach the goldfish\n" +
      "• RAG-rate every topic\n" +
      "• BUG every question\n" +
      "• 30-minute weekday sessions\n" +
      "• Dodge the 5 traps\n\n" +
      "Each subject also has its own cheat codes — the named mnemonics top students use. You'll meet them as you LEARN each topic.",
    actionLabel: "Take me to the subjects",
    actionHref: "learn.html",
    secondaryLabel: "Back to home",
    secondaryHref: "index.html"
  }
];

// === RENDERING ============================================================

start().catch(function (e) { paintFatalError("start() threw", e); }).finally(function () {
  if (typeof window.GBReady === "function") window.GBReady();
});

async function start() {
  if (!root) return;
  const params = readParams();
  const stepIdx = clampStep(params.step);
  paintStep(stepIdx);
}

function readParams() {
  const q = location.search;
  const step = match(q, /[?&]step=(\d+)/i);
  return { step: step == null ? 0 : parseInt(step, 10) };
}

function clampStep(n) {
  const max = STEPS.length - 1;
  if (typeof n !== "number" || isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > max) return max;
  return n;
}

function paintStep(i) {
  const step = STEPS[i];
  const isLast = i === STEPS.length - 1;
  const isFirst = i === 0;

  // Mark complete on first arrival at the final step.
  if (isLast) {
    try { writeString(STUDY_SMART_KEY, String(Date.now())); } catch (e) { /* storage off */ }
  }

  const progressHtml = renderProgress(i);
  const tryItHtml = step.tryIt ? renderTryIt(step.tryIt) : "";
  const navHtml = renderNav(i, step, isFirst, isLast);
  const eyebrowHtml = step.eyebrow
    ? "<span class=\"mock-stub-tag\">" + escapeHtml(step.eyebrow) + "</span>"
    : "";
  const bodyParas = String(step.body || "")
    .split(/\n\s*\n/)
    .map(function (p) { return "<p>" + escapeHtml(p) + "</p>"; })
    .join("");

  root.innerHTML =
    "<section class=\"study-smart-step study-smart-step-" + step.id + "\">" +
      progressHtml +
      "<div class=\"study-smart-step-icon\">" + step.icon + "</div>" +
      "<header class=\"study-smart-step-head\">" +
        eyebrowHtml +
        "<h1 class=\"study-smart-step-title\">" + escapeHtml(step.title) + "</h1>" +
      "</header>" +
      "<div class=\"study-smart-step-body\">" + bodyParas + "</div>" +
      tryItHtml +
      navHtml +
    "</section>";

  // Scroll to top on step change so the kid never has to scroll up to read.
  window.scrollTo(0, 0);
}

function renderProgress(i) {
  // Skip the progress bar on intro (step 0) and complete (last) — they're
  // covers, not toolkit steps.
  if (i === 0 || i === STEPS.length - 1) return "";
  const techStep = i; // 1..7
  const total = STEPS.length - 2; // 7
  const pct = Math.round((techStep / total) * 100);
  return (
    "<div class=\"study-smart-progress\" aria-label=\"Step " + techStep + " of " + total + "\">" +
      "<div class=\"study-smart-progress-bar\">" +
        "<div class=\"study-smart-progress-fill\" style=\"width:" + pct + "%\"></div>" +
      "</div>" +
      "<span class=\"study-smart-progress-text\">" + techStep + " / " + total + "</span>" +
    "</div>"
  );
}

function renderTryIt(t) {
  const stepsHtml = (t.steps || []).map(function (s) {
    return "<li>" + escapeHtml(s) + "</li>";
  }).join("");
  return (
    "<div class=\"study-smart-tryit\">" +
      "<p class=\"study-smart-tryit-title\">" + escapeHtml(t.title || "Try it") + "</p>" +
      (stepsHtml ? "<ol class=\"study-smart-tryit-steps\">" + stepsHtml + "</ol>" : "") +
      (t.outro ? "<p class=\"study-smart-tryit-outro\">" + escapeHtml(t.outro) + "</p>" : "") +
    "</div>"
  );
}

function renderNav(i, step, isFirst, isLast) {
  if (isLast) {
    // Final card — primary CTA + secondary, no prev.
    return (
      "<div class=\"study-smart-nav study-smart-nav-final\">" +
        "<a class=\"mock-button\" href=\"" + (step.actionHref || "learn.html") + "\">" + escapeHtml(step.actionLabel || "Take me there") + " &rarr;</a>" +
        (step.secondaryHref ? "<a class=\"mock-button mock-button-ghost\" href=\"" + step.secondaryHref + "\">" + escapeHtml(step.secondaryLabel || "Back") + "</a>" : "") +
      "</div>"
    );
  }
  const prevHref = isFirst ? "learn.html" : "study-smart.html?step=" + (i - 1);
  const prevLabel = isFirst ? "Back to LEARN" : "Back";
  const nextHref = "study-smart.html?step=" + (i + 1);
  return (
    "<div class=\"study-smart-nav\">" +
      "<a class=\"mock-button mock-button-ghost\" href=\"" + prevHref + "\">&larr; " + escapeHtml(prevLabel) + "</a>" +
      "<a class=\"mock-button\" href=\"" + nextHref + "\">" + escapeHtml(step.actionLabel || "Next") + " &rarr;</a>" +
    "</div>"
  );
}

// === SVG ICONS ============================================================
// Deliberately simple, single-stroke or single-fill, sized to viewBox 0 0 80 80.
// Cobalt + coral accents to match the brand. No mascot characters — these are
// glyphs, not illustrations.

function iconBolt() {
  return svg(
    '<path d="M 44 8 L 18 46 L 36 46 L 28 72 L 60 30 L 42 30 Z" fill="#ffd13a" stroke="#ff5e3a" stroke-width="2.5" stroke-linejoin="round"/>',
    'filter: drop-shadow(0 0 12px rgba(255, 209, 58, 0.4));'
  );
}

function iconOutput() {
  return svg(
    '<rect x="10" y="22" width="22" height="36" rx="3" fill="none" stroke="#6da7ff" stroke-width="2.5"/>' +
    '<line x1="14" y1="30" x2="28" y2="30" stroke="#6da7ff" stroke-width="2"/>' +
    '<line x1="14" y1="38" x2="28" y2="38" stroke="#6da7ff" stroke-width="2"/>' +
    '<line x1="14" y1="46" x2="24" y2="46" stroke="#6da7ff" stroke-width="2"/>' +
    '<path d="M 38 40 L 56 40" stroke="#ffd13a" stroke-width="3" stroke-linecap="round"/>' +
    '<polyline points="50,34 56,40 50,46" fill="none" stroke="#ffd13a" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<circle cx="64" cy="40" r="8" fill="#ff5e3a"/>'
  );
}

function iconSpacing() {
  return svg(
    '<circle cx="16" cy="40" r="6" fill="#ff5e3a"/>' +
    '<circle cx="32" cy="40" r="6" fill="#ff5e3a" opacity="0.8"/>' +
    '<circle cx="52" cy="40" r="6" fill="#ffd13a" opacity="0.85"/>' +
    '<circle cx="72" cy="40" r="6" fill="#5eead4"/>' +
    '<line x1="22" y1="40" x2="26" y2="40" stroke="#6da7ff" stroke-width="1.5" stroke-dasharray="2 2"/>' +
    '<line x1="38" y1="40" x2="46" y2="40" stroke="#6da7ff" stroke-width="1.5" stroke-dasharray="2 2"/>' +
    '<line x1="58" y1="40" x2="66" y2="40" stroke="#6da7ff" stroke-width="1.5" stroke-dasharray="2 2"/>' +
    '<g font-family="Outfit, sans-serif" font-size="6" fill="#8a92a8" text-anchor="middle">' +
      '<text x="16" y="56">1</text><text x="32" y="56">3</text><text x="52" y="56">7</text><text x="72" y="56">21</text>' +
    '</g>'
  );
}

function iconFish() {
  return svg(
    '<ellipse cx="36" cy="40" rx="22" ry="14" fill="#6da7ff" opacity="0.9" stroke="#3a6dc8" stroke-width="2"/>' +
    '<path d="M 14 40 L 4 30 L 4 50 Z" fill="#6da7ff" stroke="#3a6dc8" stroke-width="2" stroke-linejoin="round"/>' +
    '<circle cx="46" cy="36" r="2.5" fill="#0f1729"/>' +
    '<circle cx="46" cy="36" r="0.9" fill="#fff"/>' +
    '<path d="M 28 38 q 4 -3 8 0" fill="none" stroke="#3a6dc8" stroke-width="1.2"/>' +
    '<g font-family="Outfit, sans-serif" font-size="9" font-weight="700" fill="#ffd13a">' +
      '<text x="58" y="22">?</text>' +
      '<text x="64" y="32">?</text>' +
    '</g>'
  );
}

function iconRag() {
  return svg(
    '<circle cx="20" cy="40" r="12" fill="#ff5e3a"/>' +
    '<circle cx="40" cy="40" r="12" fill="#ffd13a"/>' +
    '<circle cx="60" cy="40" r="12" fill="#5eead4"/>' +
    '<g font-family="Outfit, sans-serif" font-size="11" font-weight="800" text-anchor="middle">' +
      '<text x="20" y="44" fill="#0f1729">R</text>' +
      '<text x="40" y="44" fill="#0f1729">A</text>' +
      '<text x="60" y="44" fill="#0f1729">G</text>' +
    '</g>'
  );
}

function iconMagnify() {
  return svg(
    '<circle cx="34" cy="34" r="20" fill="none" stroke="#6da7ff" stroke-width="3"/>' +
    '<line x1="48" y1="48" x2="68" y2="68" stroke="#6da7ff" stroke-width="4" stroke-linecap="round"/>' +
    '<rect x="22" y="26" width="12" height="6" fill="none" stroke="#ffd13a" stroke-width="1.8"/>' +
    '<line x1="22" y1="38" x2="34" y2="38" stroke="#ff5e3a" stroke-width="1.8"/>' +
    '<line x1="22" y1="42" x2="30" y2="42" stroke="#ff5e3a" stroke-width="1.8"/>'
  );
}

function iconCalendar() {
  return svg(
    '<rect x="12" y="16" width="56" height="50" rx="4" fill="none" stroke="#6da7ff" stroke-width="2.5"/>' +
    '<line x1="12" y1="28" x2="68" y2="28" stroke="#6da7ff" stroke-width="2.5"/>' +
    '<line x1="22" y1="12" x2="22" y2="22" stroke="#6da7ff" stroke-width="2.5" stroke-linecap="round"/>' +
    '<line x1="58" y1="12" x2="58" y2="22" stroke="#6da7ff" stroke-width="2.5" stroke-linecap="round"/>' +
    '<g fill="#ff5e3a">' +
      '<rect x="20" y="36" width="6" height="6" rx="1"/>' +
      '<rect x="30" y="36" width="6" height="6" rx="1"/>' +
      '<rect x="40" y="36" width="6" height="6" rx="1"/>' +
      '<rect x="50" y="36" width="6" height="6" rx="1"/>' +
    '</g>' +
    '<g fill="#ffd13a">' +
      '<rect x="20" y="48" width="6" height="6" rx="1"/>' +
      '<rect x="30" y="48" width="6" height="6" rx="1"/>' +
    '</g>' +
    '<g fill="#5eead4">' +
      '<rect x="40" y="48" width="6" height="6" rx="1"/>' +
    '</g>'
  );
}

function iconWarn() {
  return svg(
    '<polygon points="40,12 70,62 10,62" fill="rgba(255,94,58,0.18)" stroke="#ff5e3a" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<line x1="40" y1="28" x2="40" y2="46" stroke="#ff5e3a" stroke-width="3.5" stroke-linecap="round"/>' +
    '<circle cx="40" cy="54" r="2.5" fill="#ff5e3a"/>'
  );
}

function iconBadge() {
  return svg(
    '<polygon points="40,8 50,20 66,18 60,34 72,46 56,52 56,68 40,60 24,68 24,52 8,46 20,34 14,18 30,20" fill="rgba(255,209,58,0.20)" stroke="#ffd13a" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<polyline points="28,40 36,48 52,32" fill="none" stroke="#ffd13a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
    'filter: drop-shadow(0 0 14px rgba(255, 209, 58, 0.45));'
  );
}

function svg(inner, extraStyle) {
  const style = extraStyle ? " style=\"" + extraStyle + "\"" : "";
  return (
    "<svg viewBox=\"0 0 80 80\" role=\"img\" aria-hidden=\"true\"" + style + ">" + inner + "</svg>"
  );
}

// Public so learn.js paintHub() can decide whether to show "Start here"
// or "Re-take" copy for the Study Smart tile.
export function isStudySmartComplete() {
  try { return !!readString(STUDY_SMART_KEY); }
  catch (e) { return false; }
}
