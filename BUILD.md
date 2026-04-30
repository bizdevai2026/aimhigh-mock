# GradeBlaze — build & content guide

This is the operator's manual for the live app at **gradeblaze.co.uk**. It
covers how the project is structured, how to add or edit content safely,
and the few rituals that keep cache + module loading sane.

The audience is the parent/operator of the app — not engineers. There's
no build step, no framework, no backend.

---

## Stack at a glance

- Static site, hosted from `main` on GitHub Pages
- `index.html` and a small set of feature pages (`welcome.html`,
  `subject.html`, `paper.html`, `dashboard.html`, `learn.html`, etc.)
- Plain ES modules — `mock.js`, `engagement.js`, `questions.js`,
  `profile.js`, `sounds.js`, `visuals.js`, `welcome.js`, plus per-page
  runners (`sprint.js`, `paper.js`, `learn.js`, `dashboard.js`,
  `warmup.js`)
- All state is in `localStorage` under the `aimhigh-mock-` prefix
- No service worker (decommissioned — it was the #1 source of
  stuck-on-stale-cache bugs)
- Custom domain via `CNAME`, HTTPS via GitHub Pages

---

## Adding or editing content

Three places where content lives, all under `data/`.

### Quiz questions — `data/<subject>.json`

A JSON array. Each entry is one of:

- **Multiple choice** (default — used in every subject)
  ```json
  {
    "id": "sci-cells-007",
    "subject": "science",
    "topic": "cells",
    "prompt": "Which organelle releases energy from food?",
    "options": ["Nucleus", "Mitochondria", "Cell wall", "Chloroplast"],
    "answer": 1,
    "explainer": "Mitochondria respire glucose, releasing energy the cell can use."
  }
  ```
- **Spell** (French only — type the French phrase)
  ```json
  { "id": "fr-spell-001", "subject": "french", "topic": "...",
    "type": "spell", "prompt": "Type 'Hello' in French.",
    "answer": "bonjour", "explainer": "..." }
  ```
- **Speak** (French only — say the French phrase, with mic fallback)
  ```json
  { "id": "fr-speak-001", "subject": "french", "topic": "...",
    "type": "speak", "prompt": "Say it: \"How old are you?\"",
    "answer": "Quel âge as-tu", "audio": "Quel âge as-tu",
    "explainer": "..." }
  ```

Rules:
- `id` must be unique across **every** subject file.
- Every topic should have at least 5 questions so the 5-question drill
  always fills its target. If you add a new topic, add at least 5 at the
  same time.
- Use proper Unicode for maths: `²`, `³`, `½`, `×`, `÷`, `−` (not `^2`,
  `*`, `-`). Use proper accents in French.
- Keep prompts under ~150 characters. Keep explainers one or two
  sentences and useful — they show on wrong answers.

### Learning content — `data/learning.json`

Drives the LEARN topic detail page (read-before-test). Each entry:

```json
{
  "subject": "science",
  "topic": "cells",
  "title": "Cells — the building blocks",
  "subtitle": "What every living thing is made of",
  "readTimeMin": 4,
  "visual": "cell-comparison",          // optional, top-of-page diagram
  "sections": [ ... ],
  "tips": [ "...", "..." ]
}
```

Each section in `sections[]` can mix any of:
- `heading` — short H2
- `body` — paragraph(s); split with `\n\n` for multiple paragraphs
- `list` — array of bullet points
- `visual` — key into `visuals.js` for an inline section diagram
- `callout` — `{ tone: "tip"|"warn"|"note", title?, body }`
- `example` — `{ title?, intro?, steps: [...], outro? }`
- `quickfact` — `{ value, label }` (big number with caption)

Aim for at least 3 rich elements (callout / example / quickfact)
per topic — otherwise it reads like a wall of text.

### Inline diagrams — `visuals.js`

Each visual is a key in the `VISUALS` object whose value is an inline
SVG (built from a string-array `.join("")` so each line stays readable).

Use the variable `currentColor` for text and stroke fills so they
respect the page theme. Keep visuals simple — a colour-coded summary
is more useful than a photorealistic diagram.

To reference a new visual from `learning.json`, just use its key in
the `visual` field (top-level or section-level).

---

## The cache-bust ritual

Every time you change a JS, CSS, HTML or `learning.json`, run:

```bash
python tools/bump-version.py
```

This bumps every `?v=YYYYMMDD` query string across the repo to today.
Without bumping, browsers will serve a cached old module and your
change won't appear.

The script refuses to go backwards — pass an explicit higher date if
you really mean it (e.g. `python tools/bump-version.py 20260615`).

---

## Local preview

GitHub Pages serves the site directly — there's no build. To preview
locally before pushing:

```bash
cd aimhigh-mock
python -m http.server 5500
# then open http://localhost:5500/welcome.html
```

ES modules need a real HTTP server (file:// won't load them).

---

## Roles

The app has three roles, picked at sign-in:

- **Child** — full training mode (warm-up, sprint, paper, learn). All
  engagement state writes happen here.
- **Parent** — read-only Coach view. Sees streaks, weak topics, can
  pause progress (holiday mode) or wipe training data.
- **Demo** — preview mode for showing the app off without polluting
  the child's stats. Every engagement writer no-ops.

PINs are 4 digits, hashed with SHA-256 via SubtleCrypto before being
stored. The hash is privacy not security — anyone with localStorage
access can read every value. Don't put real secrets in localStorage.

---

## When something breaks

- **Stuck on a "Loading…" page** — open `/reset.html`, hit the button.
  This unregisters any leftover service worker and clears cache
  storage. Your training data in localStorage isn't touched.
- **Module import fails after an edit** — usually a missed cache bump.
  Run `python tools/bump-version.py`.
- **JSON edit broke the app** — `data/*.json` parse errors are
  surfaced by the inline error catcher on `learn.html` and the
  `paintError` calls in `sprint.js` / `paper.js`. Fix the JSON, bump.
