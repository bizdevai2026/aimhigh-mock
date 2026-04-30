# Architecture validation — proposed modular restructure

**Date:** 2026-04-30
**Scope:** The proposed `gradeblaze/` target architecture (shell/auth/domain/practice/coach/media/diagnostics/platform/state/shared)
**Reviewer:** Senior technical architect (subagent)
**Outcome:** **6/10 — bones right, layering over-architected for a static no-build app.** Several specific recommendations.

## Dependency graph (current state)

```
                      engagement.js  ◄──── (used by 6 of 8 non-leaf files)
                            ▲
                            │
                       questions.js
                            ▲
                            │
   ├── warmup.js    ──► sounds, visuals, profile, engagement, questions
   ├── sprint.js    ──► sounds, visuals, profile, engagement, questions
   ├── paper.js     ──► sounds, visuals, profile, engagement, questions
   ├── learn.js     ──► visuals, engagement, questions, mock(side-effect)
   ├── dashboard    ──► sounds, profile, engagement, questions, mock(side-effect)
   ├── welcome.js   ──► sounds, profile
   └── mock.js      ──► sounds, profile, engagement, timetable

Leaves: sounds.js, visuals.js, timetable.js, profile.js
boot/error-catcher.js, boot/loading-guard.js → classic <script>, no imports
```

**Hub:** `engagement.js` (6/8 dependents).
**Latent cycle risk:** `questions.js → engagement.js`; `engagement.js` deliberately avoids importing `profile.js` (inlined `isDemoMode()` to break a future cycle).
**Side-effect import:** 5 runners do `import "./mock.js"` for boot side-effect — invisible coupling.

## Boundary rules — current violations

| Rule | Status |
|---|---|
| `domain/` may not import auth/media/practice/coach/shell | FAILS — `engagement.js` inlines auth state read (`isDemoMode`) |
| Only `platform/storage.js` touches `localStorage` | FAILS HARD — 32 callsites across 8 files |
| Only `domain/content/*` touches `fetch` | OK — only 2 fetch sites; one needs to move |
| Only `auth/pin.js` touches `crypto` | OK — single call |
| `shared/` imports only itself + platform/ | N/A — no `shared/` yet |

## Migration friction (per file)

| File | Target | Split? | Effort |
|---|---|---|---|
| `mock.js` | shell/header + shell/onboarding + auth/banners + diagnostics/ | YES (4-way) | **large** |
| `engagement.js` | domain/engagement/{streak,xp,ladder,weakness,results,scheduler}.js | YES (6-way) | **large** |
| `sounds.js` (643 LOC) | media/{sounds,speech,haptics}.js | YES (3-way) | **medium** |
| `sprint.js` (784 LOC) | practice/sprint or shared runner | YES if unified | **large** |
| `warmup.js` (634 LOC) | practice/warmup or shared runner | YES if unified | **large** |
| `paper.js` (465 LOC) | practice/paper or shared runner | YES if unified | **medium** |
| `learn.js` (379 LOC) | domain/content/learning + pages/learn | YES (2-way) | **medium** |
| `dashboard.js` (530 LOC) | coach/ + diagnostics/ | YES (2-way) | **medium** |
| `questions.js` (227 LOC) | domain/content/questions | YES (2-way fetch+logic) | **medium** |
| `profile.js` | auth/{pin,session,profile,gate} | optional split | **medium** |
| `welcome.js` | auth/welcome or pages/welcome | no | **small** |
| `visuals.js` | domain/content/visuals | no | **small** |
| `timetable.js` | domain/content/timetable | no | **trivial** |

7 of 14 files require splits.

## Specific recommendations

**Drop `state/`.** "In-memory views" in a no-framework app are just module-scope variables. A separate folder implies a store/observer pattern not present and not needed. Add it later if the architecture demands it.

**Trim `platform/`.** Only `platform/storage.js` is genuinely load-bearing today (it makes the storage rule enforceable). `platform/{cache,events,feature-flags,versioning,logging}.js` are speculative — build when needed.

**Don't unify the practice runners.** `warmup` (10 mixed Qs), `sprint` (15 single-subject), `paper` (30 with timer), `topic drill` (5 same-topic) are similar-but-not-the-same. A single config-driven runner would be a 1000-LOC engine harder to debug than three 600-LOC files. **Recommended:** extract a `practice/round-engine.js` (question rendering + answer entry + audio/haptic feedback + scoring) and let the per-mode runners stay as thin shells around it.

**Don't split `data/{questions,learning,visuals}/` into one-file-per-item.** 350 question files = git-on-Windows performance issues, harder validation, no real value. Per-subject files are correct. Visuals are already a single registry — splitting per-visual is theatre.

**`schemas/` and `tests/` are good additions.** Low cost, high value. Worth doing early.

**Replace four .md docs with one ARCHITECTURE.md.** Easier to maintain.

## Missing from the proposal

- A localStorage **migration plan** for `aimhigh-mock-*` → `gradeblaze-*` (this would silently lose every existing user's state if done naively)
- A **versioned content loader** (the `?v=20260513` strategy needs a single source of truth)
- An **ADR** for replacing `import "./mock.js"` side-effect with explicit `shell.mountHeader(document)` calls

## First concrete migration step (recommended)

> **Extract `platform/storage.js` only. Nothing else.**
>
> 1. Create one file with `read(key)`, `write(key, value)`, `remove(key)`, `keys(prefix)`, `snapshot(prefix)`.
> 2. Replace every `localStorage.setItem/getItem/removeItem` call site with the wrapper.
> 3. **No directory moves. No renames. No file splits.**
> 4. Run the existing app — every page should still work.
>
> Why this first: zero behaviour change, immediate elimination of the most-violated rule, gives you a brick to stand on for the engagement split (which is where the real complexity lives). Skip this and you'll be retrofitting it during a folder reshuffle, which is exactly the wrong moment.

After storage: `sounds.js` 3-way split (low risk, leaf module). Then `engagement.js`, the load-bearing wall.

## Status

**Held for explicit go-ahead.** Even the recommended "first step" (storage extraction) is structural and the architect specifically said it should be one PR, reviewed deliberately. Doing it autonomously in an unsupervised run risks committing to a shape we'd later rewrite.
