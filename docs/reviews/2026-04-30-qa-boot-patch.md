# QA audit — boot/ safety-net patch

**Date:** 2026-04-30
**Scope:** Commit c9e6228 ("Boot: shared error catcher + loading guard, no page can spin forever")
**Reviewer:** Senior QA engineer (subagent)
**Outcome:** 6 findings — 1 BLOCKER, 4 HIGH, 2 MEDIUM. All addressed in commit 09322c7.

## Findings

### 1. BLOCKER — `mock.js:530-531` early return without `GBReady`
`boot()` returned early when `requireProfileOrRedirect()` or `gateParentFromTraining()` failed. Both call `location.replace()` (asynchronous). On a slow redirect target the timeout card could flash on the source page before navigation completed. **Fix:** call `window.GBReady()` before each early `return`.

### 2. HIGH — `welcome.js:47-48` redirect path
Same async-redirect race for already-signed-in users. **Fix:** same pattern — cancel the guard before `location.replace`.

### 3. HIGH — `if (!root) return` silent exits
`warmup.js`, `sprint.js`, `paper.js`, `learn.js` all had `if (!root) return` inside `start()`. If the HTML root id is missing (deploy error / typo), the runner silently exits and the user sees the static "Loading…" stub forever. The `.finally()` cancelled the loading guard, so the timeout card didn't fire either. **Fix:** call `window.GBErr.paint("missing root", ...)` before returning, surfacing a visible error.

### 4. HIGH — `dashboard.js` no try/catch around `paint()`
The synchronous `paint()` calls six painters; one throwing would skip the GBReady call and leave the guard armed to fire over an already-rendering page. **Fix:** wrapped in `try { paint() } finally { GBReady() }`.

### 5. HIGH — `boot/error-catcher.js` + `loading-guard.js` wrong dashboard root id
`ROOT_IDS` listed `"dashboardRoot"` — but the actual id in `dashboard.html` is `coachRoot`. On dashboard error the catcher fell back to `<main>` and clobbered the header. **Fix:** updated `ROOT_IDS` to `coachRoot`, also added `homeRoot` (and added that id to `index.html`).

### 6. MEDIUM — `loading-guard.js` didn't set `_painted=true`
When the loading guard fired and painted the timeout card, it did not set `window.GBErr._painted = true`. A late-firing error catcher would then replace the yellow timeout card with its red error card — visual jank. **Fix:** set the flag after painting.

## Bonus improvement

The cross-origin "Script error." case (when a third-party script fails with empty filename / line / col) used to render `Script error. @ :?:?` — useless. Now substitutes a human-readable message about network filters and incognito mode.

## Verdict

> The patch substantially achieves its goal — no normal failure mode (network drop, syntax error, missing module, slow load) can spin forever. The red-card error-catcher reliably fires on script-graph failures because it's installed synchronously before the module loads. […] All three [original gaps] are fixable with one-line edits. The patch is good enough to ship; findings 2, 3, 4, and 5 should be addressed in a follow-up before the next public test.

All findings addressed in the follow-up commit.
