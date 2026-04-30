# Copy + hygiene audit

**Date:** 2026-04-30
**Scope:** All visible strings across HTML, JS, and `data/*.json`
**Reviewer:** Senior copy editor (subagent)
**Outcome:** ~80 defects classified. Top 5 + content fixes addressed in commit 35ca3b3.

## Top 5 (per the editor's "would you ship this today?" assessment)

1. **Kill "trainee" everywhere kid-facing.** 8 instances. ✅ Fixed.
2. **`DISTANCE` mode-name leak in Coach.** Parents saw "DISTANCE — 22/30" instead of "FULL MOCK". ✅ Fixed via `modeDisplayName()`.
3. **Four ellipsis offenders in content JSON.** Literal `...` → `…`. ✅ Fixed (14 strings actually, across 6 JSON files).
4. **AimHigh→GradeBlaze brand straddle.** Export filename, error toast. ✅ Fixed.
5. **Soften welcome intro + onboarding tour copy.** Registrar tone; freeze mechanics dumped on day 0. ✅ Both rewritten.

## Style guide proposed (locked into the project)

**Brand voice.** Warm, plain, motivating. Older-sibling tone. Never registrar.

**Audience split.**
- Kid-facing: second-person, child's first name, never "trainee"/"child"/"user"
- Parent-facing: "your child" not "the trainee"

**Mode names.** WARM-UP / SPRINT / FULL MOCK / COACH. Always paired with a one-line gloss the first time they appear. Internal name `distance` must never reach UI — map to "FULL MOCK".

**Ampersand rule.**
- `&` in display titles, tile headers, eyebrow chips
- "and" in body copy, list items, button captions
- Never `&` in JS confirm/alert dialogs

**Dash rule.**
- Em-dash (—) for parentheticals; literal `—` in JSON/HTML body, `&mdash;` only where mid-string concat in JS demands it
- En-dash (–) for numeric ranges
- Hyphen (-) for compounds (warm-up, 5-day)

**Ellipsis.** `&hellip;` in HTML, literal `…` in JSON / textContent. Never `...`.

**Punctuation.** Per-list consistency (all-period or no-period, never mixed). Drop Oxford comma unless ambiguity. UK English (organise, colour, behaviour, analyse).

**Empty states.** Never a 0-score scoreboard. "Day 1 starts here" beats "0 day streak". "Get started" beats "BRONZE".

**Forbidden words.** "trainee", "user", "session" (in kid-facing context where "go" or "round" works), "training" where "practice" works.

## Defects addressed in this commit

- All 8 kid-facing "trainee" instances replaced
- DISTANCE→FULL MOCK display mapping
- 14 ellipsis fixes across content JSON
- Brand straddle (filename + toast)
- Welcome intro tagline + bullets reframed
- Setup-child-name screen ("Your turn. What's your first name?")
- Onboarding tour cards 1, 2, 3 rewritten
- Moon orbit factual reconciled (28d → 27d to match the 27.3d quickfact)
- "the sun" → "the Sun" in science.json
- `--mock-text-dim` token defrocked (was identical to `--mock-text`)

## Defects NOT yet addressed

These need a separate pass — the visible-on-day-1 stuff was prioritised:

- Dash usage (literal `—` vs `&mdash;`) inconsistent across files
- Oxford comma inconsistencies
- Some list items mixing trailing periods
- Storage key prefix `aimhigh-mock-*` still leaks into export structure (parent-visible if they open the JSON file)
- A few "trainee" instances in code comments (non-user-visible)
- Brand: source comments still say "AimHigh Mock Prep" at the top of every JS file

These accumulate to "feels imprecise" but don't block tester re-runs.
