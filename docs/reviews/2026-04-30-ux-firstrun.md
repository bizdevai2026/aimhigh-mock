# UX + Year 7 first-run walkthrough

**Date:** 2026-04-30
**Scope:** First-run flow — welcome → parent PIN → child name → child PIN → home → onboarding tour → LEARN
**Reviewer:** UX engineer + Year 7 student persona (subagent)
**Outcome:** Engagement scores per screen, top 5 fixes. Some addressed in commit 35ca3b3 (welcome copy, tour content); others held for explicit go-ahead.

## Journey map

| # | Screen | Time-to-engagement | Felt moment |
|---|---|---|---|
| 1 | Intro card | 0–8 s | "Looks slick. What is this for?" |
| 2 | Parent PIN | 8–25 s | "I'm not the user yet. I'm bored." |
| 3 | Confirm parent PIN | 25–35 s | "Same screen again." |
| 4 | Child name | 35–45 s | "Finally me." |
| 5 | Child PIN | 45–60 s | "Okay, this is starting." |
| 6 | Home (zeros + 5 tiles) | 60–80 s | "Did I do something wrong?" |
| 7 | Tour modal x3 | 80–120 s | "Stop teaching, let me play." |
| 8 | Tap LEARN → hub | 120–135 s | "More menus." |
| 9 | Tap a subject | 135–150 s | First actual content — 2.5 min in. |

## Engagement scores (out of 10)

| Screen | Score |
|---|---|
| Intro card | 6 |
| Parent PIN | 3 |
| Confirm parent PIN | 2 |
| Child name | 5 |
| Child PIN | 7 |
| Home (first-time) | 5 |
| Tour modals | 4 |
| Learn hub | 6 |

## Top 5 fixes (with engagement deltas)

1. **Add "Step N of 4" stepper above each setup form.** (+1) — Removes the "how long is this?" dread. **Held — light task, can do without confirm.**
2. **Replace welcome intro tagline with a kid-voice line; drop bullet brochure.** (+1.5) — Partially done in commit 35ca3b3 (tagline rewritten, bullets softened). Full "drop bullet list, single starting-gun CTA" change held.
3. **Move parent PIN to AFTER the kid plays one question.** (+2) — Largest single uplift. Held: this is a flow change, not a tweak. Needs explicit go-ahead.
4. **Kill the empty-state metrics on first-time home.** (+1.5) — Replace day-zero hero with a single pulsing "Start your first warm-up — 5 min" CTA. Hide streak/XP/tier/exam-date until after session 1. Held: visual identity change.
5. **Rewrite tour card 2.** (+1) — Done in commit 35ca3b3.

## Dark-mode fatigue

Score: **5/10 for sustained 30-min reading.** Contrast technically passes WCAG AAA but the saturated scarlet + magenta gradients fatigue. Two findings:

- `--mock-text-dim` was identical to `--mock-text` (defeats hierarchy). ✅ Fixed in 35ca3b3.
- Recommendation: light-mode default, dark toggle, force light on Learn pages with reading content. **Held — needs brand decision.**

## Should we add a "try one question" before parent PIN?

**Recommendation: yes.** New order: Intro → name → 1 sample question → celebration → parent PIN → child PIN → home. The question doesn't write to engagement state, but it earns the right to ask for two PINs. Sub-30-second add, biggest engagement-score lift in this entire review.

**Status:** Held — biggest lift but biggest flow change too. Awaits go-ahead.
