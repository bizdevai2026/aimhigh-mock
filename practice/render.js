// GradeBlaze — practice question card renderer.
//
// Paints the multiple-choice question card that's identical across
// the three practice runners (warmup / sprint / paper). The runners
// still own their own onAnswer, advance, finalise — they all paint
// the SAME card and each owns DIFFERENT policy on what happens after
// a tap (warmup + sprint reveal the correct answer with feedback;
// paper silently advances).
//
// What this module renders:
//   - Progress bar at the top (i + 1 of total, % fill)
//   - Session card with subject/topic eyebrow
//   - Visual diagram (when q.visual matches a key in visuals.js)
//   - Listen button (when q.audio is set — French listening practice)
//   - Question prompt
//   - Four option buttons (A/B/C/D), wired to onAnswer(idx, btnEl)
//   - --tile-color CSS variable on the session card so the eyebrow
//     uses the per-subject hue
//
// What this module does NOT render: spell-input or speak-mic cards.
// Those are MFL-specific (French only) and only warmup + sprint use
// them, with their own paint helpers. Keeping those out keeps this
// module a pure MC card; ~250 lines of duplicated MC markup deleted
// across the three runners.
//
// Usage:
//   import { renderQuestionCard } from "./practice/render.js";
//   renderQuestionCard(root, q, { i: 3, total: 10 }, function (idx, btn) {
//     // runner's onAnswer policy goes here
//   });

import { escapeHtml } from "../shared/dom.js?v=20260608";
import { subjectColor, prettyTopic } from "../shared/subjects.js?v=20260608";
import { subjectName } from "../questions.js?v=20260608";
import { getVisual } from "../visuals.js?v=20260608";
import { makeListenButton } from "../media/speech.js?v=20260608";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

// Subject + topic eyebrow text. Identical across runners; lifted here.
export function subjectLabel(q) {
  const sub = subjectName(q.subject || "").toUpperCase();
  if (q.topic) return sub + " · " + prettyTopic(q.topic).toUpperCase();
  return sub;
}

// Inline visual SVG snippet for the question card, or empty string.
function renderVisualHtml(q) {
  if (!q || !q.visual) return "";
  const svg = getVisual(q.visual);
  if (!svg) return "";
  return "<div class=\"mock-session-visual\">" + svg + "</div>";
}

// Listen button for French questions (audio + slow-audio pair). Inserted
// after the subject eyebrow so the kid sees it before the prompt.
function attachListenButton(card, q) {
  if (!card || !q || !q.audio) return;
  const btn = makeListenButton(q.audio);
  if (!btn) return;
  const subj = card.querySelector(".mock-session-subject");
  if (subj && subj.nextSibling) card.insertBefore(btn, subj.nextSibling);
  else card.appendChild(btn);
}

// The main entry point. Paints the question card into `root` and wires
// the option buttons.
//
// Args:
//   root        — DOM element (e.g. document.getElementById("warmupRoot"))
//   q           — the question object: { prompt, options[], subject,
//                  topic, audio?, visual? }
//   progress    — { i, total } where i is the current question index
//                  (zero-based) and total is the round size
//   onAnswer    — callback invoked when an option is clicked, with
//                  (chosenIdx, buttonElement). The runner decides what
//                  happens next (reveal, advance, score, etc).
export function renderQuestionCard(root, q, progress, onAnswer) {
  if (!root || !q) return;
  const i = (progress && progress.i) || 0;
  const total = (progress && progress.total) || 1;
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
        renderVisualHtml(q) +
        "<p class=\"mock-session-prompt\">" + escapeHtml(q.prompt) + "</p>" +
        "<div class=\"mock-session-options\" id=\"sessionOptions\"></div>" +
      "</div>" +
    "</section>";

  // Per-subject tile colour drives the eyebrow chip + accent.
  const card = document.getElementById("sessionCard");
  if (card) card.style.setProperty("--tile-color", subjectColor(q.subject));

  // Listen button — fires only when q has an audio field (French only).
  attachListenButton(card, q);

  // Wire the four option buttons. The runner's onAnswer owns the
  // post-tap behaviour (reveal, score, advance, etc).
  const optsEl = document.getElementById("sessionOptions");
  if (!optsEl) return;
  (q.options || []).forEach(function (opt, idx) {
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
