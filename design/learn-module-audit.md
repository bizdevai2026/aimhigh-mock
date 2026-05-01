# LEARN module — full audit + recommendations

*Prepared overnight by the audit run on 2026-05-01. Synthesises three parallel research passes (cognitive-science evidence base, top-1% student tactics from Reddit/Mumsnet/StudyTok/TSR, and subject-specific KS3 mnemonics) plus a hands-on inspection of the current LEARN code and content.*

---

## TL;DR — read this if you only read this

The LEARN module's **architecture** is good — better than most revision apps in fact. The schema already supports plain-English explainers, callouts (tips/warnings/notes), worked examples, quickfacts, tips, and inline visuals, all on a clean Read → Drill flow.

The **problem** is content depth and content scope, plus three structural gaps:

1. **Coverage is 16%.** Only 12 of 74 topics have LEARN content. The other 62 just have drill questions and a "coming soon" placeholder.
2. **No meta-skills layer.** The single highest-leverage thing a Year 7 can learn in 6 weeks is *how to study* — and the app doesn't teach it. There's no onboarding for the techniques (blurting, RAG-rating, Feynman, Pomodoro) that every top-1%-student source repeats. This is the easiest win and biggest gap.
3. **No mnemonic / cheat-code layer.** The kid never meets BIDMAS, MRS GREN, OIL RIG, PEEL, MRS VANDERTRAMP, the Big 8 history dates, the powers of 2, etc. — the named shortcuts that top students treat as cheat codes. These are absent entirely from the schema.
4. **Teaching is one-shot.** A LEARN page is a thing you read once. It's not re-surfaced via spaced repetition (only the questions are). It has no retrieval prompts, no "teach it back to a 7-year-old", no confidence rating. So the act of *reading* doesn't get any of the cognitive-science boosts the act of *answering* does.

**Recommendation in one line:** make LEARN a true reference point by adding a **Study Smart** meta-skill onboarding module + a **Cheat Cards** deck per subject + four small schema additions (`predict`, `why_prompt`, `teach_back`, `confidence_check`) — and triple the content from 12 to ~36 entries focused on Year-7 setting-test priorities.

The rest of this doc shows the diagnosis, the evidence, the content bank, and the implementation roadmap.

---

## 1. Current state — what's there now

### 1.1 Architecture (good)

The LEARN module is at [learn.js](../learn.js) (366 lines) + [learn.html](../learn.html) (47 lines), driven by a schema in [data/learning.json](../data/learning.json).

A learning entry can contain:

| Field | Purpose |
|---|---|
| `subject` / `topic` / `title` / `subtitle` | Routing + framing |
| `readTimeMin` | Sets expectation ("~4 min") |
| `visual` | Top-of-page diagram from `visuals.js` |
| `sections[]` | Ordered content blocks |
| `tips[]` | End-of-lesson bullet list |

Each section can mix any of:
- `heading`, `body`, `list[]` — basic prose
- `callout: { title?, body, tone }` — tip / warn / note styled aside
- `example: { title, intro?, steps[], outro? }` — boxed worked example
- `quickfact: { value, label }` — big-number stat highlight
- `visual` — inline diagram

That's a richer schema than Bitesize, Seneca, or Quizlet ship with. It's *capable* of serving any of the cognitive-science recommendations below — the gap is content, not structure (mostly).

The flow is right: **Hub → Subject picker → Topic detail → Read → "Test what stuck — 5 questions" CTA → Drill**. The "Read first, test second" framing on the hub (`READ, WATCH, GET THE BASICS`) is on-brand and educationally correct.

The hub also surfaces "Start with what's weak" — up to 3 most-missed topics — which is genuinely good. That's adaptive routing, lifted intact from the engagement module.

### 1.2 Content (skeletal)

The full inventory:

| Subject | Topics with LEARN | Total topics | Coverage |
|---|---:|---:|---:|
| Science | 3 | 13 | 23% |
| Maths | 2 | 15 | 13% |
| English | 2 | 11 | 18% |
| French | 1 | 11 | 9% |
| History | 1 | 7 | 14% |
| Geography | 1 | 9 | 11% |
| Computer Science | 2 | 8 | 25% |
| **Total** | **12** | **74** | **16%** |

Existing entries (sampled — *cells*, *particles-states*, *powers*, *word-classes*, *figurative-language*, *norman-conquest*) are decent quality:

- Plain English. Year-7-pitched.
- Vivid concrete anchors (*"50 cells fit across the dot of an i"*, *"the classroom was a zoo"*).
- Occasional embedded mnemonics (*"NCM/WCV"* for cells; *"penta = 5, hexa = 6, octa = 8"*).
- Worked examples with steps + outro.
- Reasonable use of callouts to flag the "watch out" gotchas.

What's missing in the existing entries:

- **No retrieval prompts.** The kid reads, then drills. There's nothing in between.
- **Few named mnemonics.** The implicit ones are good, but the *named* shortcuts (PEEL, BIDMAS, etc.) appear nowhere in this data. The kid never builds a vocabulary of cheat codes.
- **No exam-technique guidance.** The kid learns *what* the topic is but not *how to write about it in an exam*.
- **No "why does this matter?"** Sometimes the *Why it matters* section appears (e.g. word-classes), but inconsistently.
- **No "teach this back" prompt.** No protégé-effect step.

### 1.3 The 62 missing topics

The biggest single gap. Topics with question content but no LEARN content:

- **Science** (10 missing): acids-alkalis, chemical-reactions, distance-time, energy, forces-motion, mixtures, reproduction, skeleton-and-movement, sound-waves, variation
- **Maths** (13 missing): algebra, area, decimals, fractions, function-machines, geometry, negatives, number, percentages, probability, ratio, sequences, statistics
- **English** (9 missing): comprehension, dickens, myths-and-legends, punctuation, sentence-types, spelling, tenses, vocabulary, writing-skills
- **French** (10 missing): adjectives, birthday-and-months, family, hair-and-eyes, home-and-where-from, negation, personality, speaking, spelling, verbs
- **History** (6 missing): black-death, cromwell, english-civil-war, gunpowder-plot, medieval-england, tudors
- **Geography** (8 missing): coasts, continents-and-oceans, flooding, kenya, rivers, settlement, uk-geography, weather-and-climate
- **Computing** (6 missing): algorithms, hardware-software, it-system, networks, scratch-programming, small-basic

A kid can drill these topics, see questions, get scored — but never reads an explainer first. It's "test second" without "read first".

---

## 2. The teaching-vs-testing distinction — the philosophy

Your direct ask was to remember this distinction, and it's the right frame. The two modes do different cognitive work:

| | TESTING (drill / sprint / mock) | TEACHING (LEARN) |
|---|---|---|
| Goal | Detect what's stuck and what isn't. | Build the schema before stress-testing it. |
| Cognitive load | High — under time pressure, single-best-answer demands. | Low — paced, multimodal, no scoring. |
| Failure tolerance | Low — wrong = miss, schedule for review. | High — wrong = "interesting, here's why". |
| Outcome surface | XP, streak, ladder tier, miss-count. | Comprehension, vocabulary, models, habits. |
| Frequency | Every session, several rounds. | Per topic, ~once before drilling, then on-demand. |
| Time per item | 30s–60s. | 4–8 minutes. |

The crucial insight: **a teaching module is not a low-stakes test, it's a different activity entirely.** The mistake every revision app makes is bolting a "teach me first" mode on top of the question bank — basically a glossary or a worked example. That's not teaching, that's pre-game warmup for the test.

Real teaching for an 11-year-old needs:

- **A scaffold** they can hang the topic on (mental model, anchor example, mnemonic).
- **A reason** to care about the topic (why-this-matters, real-world stakes).
- **Active processing during reading** (predict / cloze / pause-and-recall — not just eyes on text).
- **A way to say "I don't get it"** (confidence rating) that changes what happens next.
- **A way to know they got it** (teach-it-back, write a 2-sentence summary).
- **Re-exposure later** at expanding intervals (spaced recap card, not just question SR).
- **Named techniques** they can use in the exam room (PEEL, BIDMAS, BUG-the-question).
- **Permission to be wrong while learning.** Drill scoring shouldn't apply to LEARN content.

The current module covers ~3 of these 8 (scaffold, anchor example, why-this-matters when present). The rest are the recommended additions below.

---

## 3. What the evidence base says

(Distilled from the cognitive-science research pass — full source bibliography includes Dunlosky et al. 2013, Brown/Roediger/McDaniel *Make It Stick*, Bjork's "desirable difficulties", Sweller's Cognitive Load Theory, Mayer's Multimedia Learning, EEF guidance reports.)

The 13 evidence-backed patterns and their concrete schema additions:

### 3.1 Retrieval practice during reading
**The science.** Pulling info OUT of the brain strengthens memory more than re-reading. Even low-stakes in-the-flow retrieval cues during a teaching pass is a learning event, not just an assessment one (Roediger & Karpicke 2006; Bjork). Self-generated wrong answers actually *prime* later encoding ("pretesting effect", Richland 2009).
**Add.** Three new section types:
- `predict` — pre-reading prompt ("Before you read: what do you think a cell membrane does?"). Tap-to-reveal model answer.
- `cloze_check` — one-sentence fill-the-gap mid-explainer ("Mitochondria release ___ from glucose"). Tap-to-reveal.
- `recall_pause` — every 2–3 sections, "Look away — say the 3 things you just learned" with reveal cards.
**Don't.** Don't score them. The moment they feel graded the kid will skip back and re-read instead of trying to retrieve — destroying the effect.

### 3.2 Spaced repetition for *learning* content (not just questions)
**The science.** Ebbinghaus forgetting curve + Cepeda 2008 meta-analysis. Re-exposure at expanding intervals (1d, 4d, 10d, 21d) beats massed exposure. Importantly, re-exposing the *explanation* benefits from spacing too — not just the questions.
**Add.** A `spaced_recap` 60-90s mini-card surfaced on the home screen ("Quick recap from last week"). Pulls 2-3 distilled sentences and one image from a previously-completed lesson. Use simple Leitner-style timestamps in localStorage.
**Don't.** Don't re-show the *whole* lesson — that's re-reading, not spacing. Distilled core only.

### 3.3 Dual coding (words + relevant visuals)
**The science.** Paivio + Mayer. Words paired with *meaningful* visuals roughly double transfer-test performance. *Decorative* images (mascots, fun-but-irrelevant graphics) actually *reduce* learning by 20-30% (Harp & Mayer 1998, "seductive details").
**Status.** Already partially done — the visuals.js library is good. The Option B redraws shipped today are exactly the right register: meaningful diagrams, not decorative. Keep going.
**Don't.** Don't add stock-photo "kids in lab coats" images. They eat working memory.

### 3.4 Elaborative interrogation
**The science.** Asking *"why does this work?"* forces integration with prior knowledge — builds the schemas that make recall easier later (Pressley 1992; Dunlosky rates moderate-utility).
**Add.** A `why_prompt` section type that appears after a fact: a single "Why does this work?" question with a tap-to-reveal 1-2 sentence answer. Example after "Plants need sunlight": *"Why? Because sunlight is the energy chlorophyll uses to split water — without it, the reaction can't start."*
**Don't.** Don't ask "why" on arbitrary memorised facts where the answer is "because it just is" (e.g. element symbols).

### 3.5 Worked examples + faded scaffolding
**The science.** Sweller & Cooper 1985, Renkl & Atkinson 2003: novices learn problem-solving faster from studying *complete* worked examples than from solving alone. The full → partial → solo *fade* outperforms either pure worked or pure solo.
**Add.** Extend the existing `example` type to a `worked_example` triplet:
1. `full`: every step with a one-line explanation
2. `partial`: same structure, 1-2 steps replaced with input boxes
3. `solo`: similar problem with answer-reveal
Use this for Maths especially. The existing `example.steps[]` is half of this — needs the partial + solo halves.
**Don't.** Don't jump from one full worked example to a full quiz. The fade is what does the work.

### 3.6 Concrete anchor examples with explicit mapping
**The science.** Dunlosky rates moderate-to-high utility. Multiple varied concrete examples help kids abstract the principle (Rawson 2015). The "mitochondria is the powerhouse" effect works because it maps the abstract onto the vivid familiar — but only if the analogy mapping is *explicit*.
**Add.** An `anchor_example` section with three required fields: `concept`, `everyday_anchor`, and `mapping` (1-2 sentences explaining how the analogy works AND where it breaks). Examples: electrical current = water through a pipe; cell membrane = bouncer at a club; a variable in Scratch = a labelled box.
**Don't.** Use an analogy without spelling out the mapping — kids latch onto the surface and miss the principle.

### 3.7 Light interleaving (compare-contrast)
**The science.** Rohrer & Taylor 2007: interleaved practice beats blocked on delayed transfer, especially for *discrimination*. But not too early — pure interleaving for novices overloads working memory (Carvalho & Goldstone 2014).
**Add.** Block within a topic; add a `compare_contrast` section at the end of related topics — e.g. after teaching mitosis and meiosis separately, a side-by-side card asking "which one is this?" with 3-4 mini-scenarios. That's interleaving inside LEARN without overload.
**Don't.** Don't shuffle concepts before each is solid.

### 3.8 Metacognition prompts
**The science.** EEF's *Metacognition* guidance report: +7 months progress on average, one of the highest-impact, lowest-cost interventions in their evidence base.
**Add.** Two new types:
- `reflect` — end-of-page free-text "What's the one most important idea on this page?" (saved to localStorage, shown back on revisit)
- `confidence_check` — 3-button "Got it / Bit shaky / Lost" rating per topic, fed into the spaced-recap schedule (shaky/lost re-surfaces sooner)
**Don't.** Don't ask "did you enjoy this?" — too vague. Ask about *content* and *confidence*.

### 3.9 Cognitive load theory — hard limits
**The science.** Sweller 1988-2011. Working memory holds ~4 chunks for ~20 seconds. For 11-year-olds it's smaller. Split-attention (text-here, diagram-elsewhere) can halve learning. Mayer's segmenting principle: learner-paced chunks beat continuous presentation.
**Add (rules).**
- ≤80 words per `body` section.
- ≤9 sections per lesson.
- 8-12 minutes target.
- Labels go *on* the diagram (already handled by the new visuals).
- One new technical term per section, bold + define inline.
- Each section ends with a learner-paced "Next" tap, not auto-scroll.
**Don't.** Write 400-word walls "for completeness". Split it.

### 3.10 The Feynman technique / protégé effect
**The science.** Self-explanation (Chi 1994) and learning-by-teaching (Fiorella & Mayer 2013) produce deeper encoding than re-reading. Simplifying for a younger audience exposes gaps.
**Add.** A `teach_back` end-of-lesson section: *"Explain this to a 7-year-old in 2 sentences. Type it out."* Save to localStorage; on next visit show it back alongside the original explanation so the kid sees their own gaps. Optionally a checklist: "Did your explanation include: cause, effect, an example?"
**Don't.** Don't make it skippable on first encounter. Single highest-leverage minute of the lesson.

### 3.11 Prior-knowledge activation
**The science.** Ausubel: "the most important single factor influencing learning is what the learner already knows." Activating relevant schema *before* new content (Brod 2018) primes encoding even when the priming knowledge is wrong.
**Add.** A `prior_knowledge` lesson opener: *"What do you already know about X?"* — single-line free text or quick-pick options. Wrong answers are fine.

### 3.12 Process praise, not trait praise
**The science.** Mueller & Dweck 1998: praising *strategy* and *effort* robustly increases persistence; praising *ability* ("you're so smart") reduces it.
**Status.** Already mostly clean — the engagement module's confirmations focus on streak/effort. Just need to audit any "Great job!" copy and convert to "You stuck with the tricky bit — that's how it sticks."

### 3.13 Avoid debunked techniques
**The science.** Dunlosky 2013 explicitly low-rates: highlighting, re-reading, summarisation. Pashler 2008 firmly debunks *learning styles* (visual/auditory/kinaesthetic).
**Status.** Currently clean — no learning-styles UI, no highlighting interactions. Don't add them.

---

## 4. What the top 1% actually do — voices from the field

(Distilled from the second research pass — sources include r/GCSE, The Student Room, Mumsnet, StudyTok, UnJaded Jade, Ali Abdaal, Save My Exams, Birmingham City University, EEF.)

### 4.1 Five habits that recur everywhere

1. **Output beats input.** Top students *produce* answers more than they consume notes. *"Re-reading your notes feels like learning. It isn't. It's eyes on a page."* (paraphrasing the consensus on r/GCSE)
2. **Protégé effect.** They teach what they just learned to a younger sibling, a goldfish, the camera, an empty room. Forces simplification = exposes gaps.
3. **Spacing > cramming.** Day-1, day-3, day-7, day-21 review cycle is the most-cited evidence-backed tactic across every source.
4. **Sleep is a study tool.** Mumsnet, Tutorful, Dormeo all hammer this. 8-10 hours non-negotiable, screens off an hour before bed.
5. **Sustained ordinary effort.** Two 30-40 minute weekday sessions, started in Year 7, beats Year-11 panic. *"y11 is leaving it too late to learn what works and doesn't work."* (Mumsnet)

### 4.2 The named techniques every top student knows by name

These are the techniques every top student names. The kid should leave the app with all of them in their vocabulary:

| Name | What it is | When to use it |
|---|---|---|
| **Blurting** | Read a section, close the book, write everything you remember on a blank page in *one colour*, then fill the gaps in a *different colour*. The two-colour split is the key detail. | After every 5-min explainer. Shows what stuck and what didn't. |
| **Active recall** | Self-test instead of re-read. Flashcards used aggressively, past-paper questions, "blurt"-style. | Default mode. Replace re-reading with this. |
| **Spaced repetition** | Re-test on day 1, 3, 7, 21. Anki / Quizlet / Leitner box. | All long-term factual content. |
| **Pomodoro** | 25 min focus / 5 min break. Four cycles = a productive day for an 11-year-old. | Sustained sessions. |
| **Feynman technique** | Explain it to a 7-year-old. If you used jargon, you don't really know it. | After every topic. The "teach back" prompt. |
| **RAG self-rating** | Red / Amber / Green confidence per topic. Drill the reds, ignore the greens. | Daily routine. Prevents the comfort-topic trap. |
| **BUG the question** | **B**ox the command word, **U**nderline what it asks for, **G**lance back to check you answered. | Every exam question, every paper. |
| **20-min productive struggle** | Try the problem alone for 20 min before looking up the answer. The struggle IS the learning. | Stuck-on-a-question moments. |
| **Mark scheme as template** | Not for marking — for learning what an answer should LOOK like. | Past-paper practice. |
| **Examiner reports** | Examiners publish exactly what students got wrong last year. Top students read these. | Pre-exam reconnaissance. |
| **Past papers in reverse order** | Most recent first. Examiners change patterns; new papers are reconnaissance. | Final two weeks. |

### 4.3 The "cheats" that actually work

Repeat-cited heuristics that genuinely move marks:

- **Read the question backwards.** Look at the marks first, then the command word, then the topic. A 6-mark "evaluate" wants two sides + a judgement. The marks tell you the structure before you've read the topic.
- **The mark scheme as template.** When "explain" is 2 marks, it's *always* point + because. Drill the pattern, not the content.
- **Mark yourself harshly.** Top students self-mark stricter than the examiner. Mediocre students give themselves the benefit of the doubt.
- **Be your own YouTuber.** Pretend you're recording a 60-second explainer for your phone. The performative element makes you commit to clarity.
- **Audio-revision while moving.** Walking + listening to your own recorded notes is repeatedly cited as a sleeper-tactic, especially for kinetic kids.
- **The "brain dump" before bed.** 5-min write-down of the day's key ideas right before sleep — sleep then consolidates them.
- **Easy questions first in the exam room.** Build confidence and bank marks before tackling the hard stuff.
- **Marks-per-minute math.** *"75 marks in 75 minutes = 1 minute per mark. 6 marks = 6 minutes max. Move on."* (York exam guide)

### 4.4 The traps mediocre students fall into (avoid these)

- Highlighting & re-reading without testing.
- Pretty-notes syndrome — 7 hours making colour-coded notes, never test on them.
- Watching study-with-me YouTube *as* studying.
- Cramming the night before. (Sleep is the consolidator.)
- "I'll start tomorrow." (Just start a 5-min version. Always extends.)
- Fixed-mindset language — *"I'm just bad at maths."* Reframe to *"I haven't drilled this yet."*
- Studying what you already know — the comfort topic. RAG-rating destroys this.
- Phones in the room. Universal Mumsnet wisdom: take phones away when revising.

### 4.5 What experienced parents actually say

Real Mumsnet quotes worth surfacing in-app as "Parent tips":

> *"Revision is a skill they have to learn and practise — they don't just 'know' how."*

> *"30 minutes of productive revision is more useful than 3 hours of creating notes."*

> *"y11 is leaving it too late to learn what works and doesn't work."* (Year 7 is the right time.)

> *"I recorded 99% of my notes onto tape and played them back while walking anywhere and as I went to sleep. Reading aloud helped cement information."*

> *"Constant access to their phone fed rumination, played havoc with sleep hygiene, and robbed them of headspace."*

> *"Highlighting topics by confidence level (green for confident, yellow for needs work, red for didn't understand) helped keep teens focused on weaker areas rather than re-reading what they already knew."* (RAG validation in the wild.)

### 4.6 Exam-room moves

The actual physical-room behaviour of top students:

- Read the *whole paper* first (1-2 min).
- 1 minute per mark math.
- Easy questions first.
- Flag and return — if stuck >90 seconds, circle, leave, come back.
- Last-5-minutes check: command words, units, all parts (a, b, c).
- If you blank: write *anything* related to the topic. Writing unfreezes the brain.
- Handwriting matters — it's still the marks medium. Legibility is a marks issue.

---

## 5. The KS3 mnemonic bank — the cheat-code library

(From the third research pass — every mnemonic below is the canonical phrasing used in UK schools. The kid should leave the 6 weeks with these loaded.)

This section is the single biggest content addition the LEARN module needs. It's the "outsmart-other-students" layer. Each mnemonic gets a card the kid can flip through, with: name, decode, topic, when-to-use.

### 5.1 Science

- **MRS GREN** — Movement, Respiration, Sensitivity, Growth, Reproduction, Excretion, Nutrition. *The 7 life processes.* Use on "is X alive" questions.
- **OIL RIG** — **O**xidation **I**s **L**oss (of electrons), **R**eduction **I**s **G**ain. *Redox reactions.*
- **ROY G BIV** — Red, Orange, Yellow, Green, Blue, Indigo, Violet. *Visible spectrum order, longest to shortest wavelength.*
- **Reactivity series** — *"Please Stop Calling Me A Careless Zebra Instead Try Learning How Coppers Should Get Smart Gold"* → Potassium, Sodium, Calcium, Magnesium, Aluminium, Carbon, Zinc, Iron, (Hydrogen), Copper, Silver, Gold.
- **Separation techniques (FCD)** — Filtration, Crystallisation, Distillation. + Evaporation + Chromatography for the full toolkit.
- **The 8 energy stores** (new spec) — Kinetic, Gravitational, Elastic, Chemical, Nuclear, Thermal, Magnetic, Electrostatic. Examiners no longer accept "types" of energy — they want STORES.
- **MAN** — **M**itochondria, **A** nucleus, Membra**N**e. *Organelles in BOTH plant and animal cells.* (Plants add cell wall, chloroplasts, vacuole.)
- **Photosynthesis** — *6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂*, with light + chlorophyll above the arrow. (Dropping "light" or "chlorophyll" loses marks every year.)

**Top 3 to drill cold.** MRS GREN, OIL RIG, the reactivity series.

**Subject-specific exam tip.** Always use the technical word: not "the bug breathes" → "the organism respires". For calculations: equation, then substitution, then answer with units. Always units. For 6-mark questions, plan with 6 distinct scientific points before writing.

### 5.2 Maths

- **BIDMAS** (or BODMAS) — **B**rackets, **I**ndices, **D**ivision, **M**ultiplication, **A**ddition, **S**ubtraction. *Order of operations.*
- **FOIL** — **F**irst, **O**uter, **I**nner, **L**ast. *Expanding two binomials.* (x+2)(x+3) → x·x + x·3 + 2·x + 2·3 = x² + 5x + 6.
- **SOH CAH TOA** — Sin = Opp/Hyp, Cos = Adj/Hyp, Tan = Opp/Adj. *Right-angled triangle trigonometry.*
- **KFC** — **K**eep, **F**lip, **C**hange. *Dividing fractions.* 2/3 ÷ 4/5 → 2/3 × 5/4 = 10/12.
- **The 9× finger trick** — fold down the *n*-th finger; fingers to the left = tens, right = units. 9 × 7: fold #7 → 6 fingers left, 3 right → 63.
- **The 11× split trick** — 11 × 24: split 2_4, sum middle (2+4=6), insert → 264.
- **Squares Club 1²-15²** — 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225. *Memorise cold.*
- **Cubes Club 1³-10³** — 1, 8, 27, 64, 125, 216, 343, 512, 729, 1000.
- **Mean / Median / Mode** — Mean = aMount divided. Median = Middle (sort first!). Mode = MOst common. The trap: forgetting to sort before finding the median.
- **Triangle congruence** — SSS, SAS, ASA, RHS. (SSA is *not* valid — "the donkey rule".)
- **"Of" means times** — "20% of 60" = 0.2 × 60 = 12.
- **Index laws** — multiplying = ADD powers, dividing = SUBTRACT, power-of-power = MULTIPLY. Anything^0 = 1.

**Top 3 to drill cold.** BIDMAS, KFC, Squares 1-15.

**Subject-specific exam tip.** Show every step. Method marks are real. A wrong final answer with right working can still earn 3/4. Always write units. Always sense-check size — a 240cm person is wrong. Cross out neatly with one line; don't erase. Bring a spare pen, sharp pencil, ruler, protractor, compass, calculator.

### 5.3 English

- **PEEL** — **P**oint, **E**vidence, **E**xplain, **L**ink. *Every analysis paragraph.*
- **PETAL** — Adds **T**echnique. *Better for poetry/prose: forces you to NAME the device.*
- **PEEZL** — Adds **Z**oom (on a single word). *Top 1% paragraph — analyses connotations of one word from the quote.*
- **DAFOREST** — **D**irect address, **A**lliteration, **F**acts, **O**pinion, **R**epetition, **E**motive language, **S**tatistics, **T**riples. *Persuasive writing devices. Aim for 5 of 8.*
- **SMILE** — **S**tructure, **M**eaning, **I**magery, **L**anguage, **E**ffect. *Poetry analysis framework.*
- **FLIRT** — **F**orm, **L**anguage, **I**magery, **R**hyme, **T**one. *Faster poetry framework when time-pressed.*
- **The 5 Senses** — sight, sound, smell, touch, taste. *Aim for 3+ per descriptive paragraph.*
- **Sonnet structure** — 14 lines, ABAB CDCD EFEF GG, iambic pentameter. *Final couplet usually delivers the twist.*
- **FANBOYS** — For, And, Nor, But, Or, Yet, So. *The 7 coordinating conjunctions; comma before them when joining two complete sentences.*
- **Embedded quotations** — slot into your sentence, never free-floating. Bad: *"She is sad: 'lonely as a cloud'."* Good: *The narrator describes herself as "lonely as a cloud," suggesting isolation.*
- **Show, don't tell** — *"Her hands shook"* beats *"She was scared"*.

**Top 3 to drill cold.** PEEL, DAFOREST, the 5 Senses.

**Subject-specific exam tip.** Plan 5 minutes before writing. A planned essay outscores a brilliant unplanned one. Underline keywords in the question, especially "how" and "why". Link back to the question in every paragraph's final sentence — this is what separates "good" from "top band". Vary sentence length. One ambitious vocab word per paragraph max. Never say "in conclusion" — just summarise smoothly.

### 5.4 History

- **NOP** (or **NOPE**) — **N**ature, **O**rigin, **P**urpose, **E**ffectiveness. *Source analysis framework.*
- **The 5 Ws** — Who, What, When, Where, Why. *Quick source checklist.*
- **PEEL with specific evidence** — same as English, but evidence MUST be a date / name / event, not generic.
- **PERSIA** — **P**olitical, **E**conomic, **R**eligious, **S**ocial, **I**ntellectual, **A**rtistic. *Categorising causes.* "Why did X happen?" → run through PERSIA.
- **The Big 8 Dates:**
  - **1066** — Battle of Hastings, Norman Conquest.
  - **1215** — Magna Carta.
  - **1348** — Black Death hits England.
  - **1485** — Battle of Bosworth, Tudors begin.
  - **1534** — Act of Supremacy, Reformation.
  - **1588** — Spanish Armada defeated.
  - **1605** — Gunpowder Plot.
  - **1649** — Charles I executed.
  - **1660** — Restoration of Charles II.
  - **1688** — Glorious Revolution.

**Top 3 to drill cold.** The Big 8 Dates, NOP, PERSIA.

**Subject-specific exam tip.** Always include specific evidence — a date, name, place, number. *"Lots of people died"* loses marks; *"approximately 1/3 of England's population died from the Black Death between 1348-1350"* gains them. For source questions: would the author have a reason to lie? Private letter (more reliable) vs public propaganda (less)? Avoid hedging ("maybe", "kind of"). Don't judge by modern standards.

### 5.5 Geography

- **Never Eat Shredded Wheat** — N, E, S, W. *Compass clockwise.* (UK version of "Naughty Elephants Squirt Water".)
- **Along the Corridor, Up the Stairs** — read **eastings first, northings second** for grid references. The single most-fluffed thing in map-skills papers.
- **HASE** — **H**ydraulic action, **A**brasion, **S**olution, **E**rosion (or attrition). *River erosion processes.*
- **DTSS** — Deposition, Traction, Saltation, Suspension, Solution. *River transportation.* Big rocks roll (traction), pebbles bounce (saltation), small particles float (suspension), dissolved load (solution).
- **3 Plate Boundaries** — Constructive (apart, new crust), Destructive (together, subduction), Conservative (sliding past, earthquakes only).
- **4 Layers of the Earth** — Crust, Mantle, Outer Core (liquid), Inner Core (solid).
- **Climate graph rules** — Temperature is a LINE; rainfall is BARS; months on the X-axis. Always identify which Y-axis is which before answering.
- **BRADSHAW model** — going downstream: discharge UP, width UP, depth UP, velocity UP, load size DOWN, load roundness UP. (Counter-intuitive: rivers actually flow *faster* downstream, less friction.)
- **Push-Pull factors** — Push = reasons people LEAVE; Pull = reasons they GO TO. *Migration framework.*
- **Water cycle** — Evaporation → Condensation → Precipitation → Collection. (Add transpiration for top-band answers.)

**Top 3 to drill cold.** Along the corridor / up the stairs, HASE+DTSS, the 3 plate boundaries.

**Subject-specific exam tip.** Use specific case studies — examiners want named places. Memorise 2-3 in detail (one earthquake, one river, one settlement) with stats: dates, magnitudes, populations. Eastings before northings, every time. Sketch maps should be simple but labelled — bad-looking labelled beats beautiful unlabelled.

### 5.6 Computing

- **Powers of 2** — 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024. *Binary place values. Memorise cold.*
- **CIA Triad** — Confidentiality, Integrity, Availability. *The three goals of any security system.*
- **FDE Cycle** — Fetch, Decode, Execute. *What the CPU does for every instruction.*
- **SMART (e-safety)** — **S**afe (don't share personal info), **M**eet (don't meet strangers), **A**ccept (don't accept random files), **R**eliable (check info), **T**ell (a trusted adult).
- **DPAA** — the 4 Pillars of Computational Thinking: **D**ecomposition, **P**attern recognition, **A**bstraction, **A**lgorithms.
- **OSI 7 layers** — *"All People Seem To Need Data Processing"* → Application, Presentation, Session, Transport, Network, Data Link, Physical.
- **RAM vs ROM** — RAM is volatile, read+write, temporary. ROM is non-volatile, read-only, permanent (BIOS).
- **Phishing / Pharming / Spoofing** — Phishing = fake emails, Pharming = fake websites, Spoofing = fake identity.
- **Algorithm vs Program** — algorithm is the recipe (logic), program is the implementation (code in a language).
- **Binary vs Linear search** — Binary is faster (log n) but requires sorted data. Linear works on anything but is slower (n).

**Top 3 to drill cold.** Powers of 2 to 1024, SMART (e-safety), Fetch-Decode-Execute.

**Subject-specific exam tip.** For binary conversions, write out place values (128 64 32 16 8 4 2 1) before converting. For algorithm questions, trace through with a TABLE (variables across top, each row = one iteration). Use precise vocabulary: "volatile" not "temporary"; "execute" not "run"; "syntax error" not "typo". Spell "algorithm" correctly — it's the most-misspelled word in the subject.

### 5.7 French

- **MRS VANDERTRAMP** — Monter, Rester, Sortir, Venir, Aller, Naître, Descendre, Entrer, Retourner, Tomber, Rentrer, Arriver, Mourir, Partir. *The 17 verbs that take ÊTRE in passé composé.* Past participle agrees with the subject (elle est allée).
- **The House Trick** — All MRS VANDERTRAMP verbs describe moving in/out/around a house. (Up, down, in, out, arrive, leave...)
- **BANGS** — **B**eauty, **A**ge, **N**umber, **G**oodness, **S**ize. *Adjectives that go BEFORE the noun.* Most others go after.
- **CaReFuL** — C, R, F, L are the final consonants you DO pronounce. Most others are silent. ("Sport" — pronounce the t. "Petit" — don't.)
- **The 7 question words** — Qui (who), Quoi/Que (what), Où (where), Quand (when), Pourquoi (why), Comment (how), Combien (how many).
- **-ER endings** — je -e, tu -es, il -e, nous -ons, vous -ez, ils -ent.
- **-IR endings** — je -is, tu -is, il -it, nous -issons, vous -issez, ils -issent.
- **-RE endings** — je -s, tu -s, il -(none), nous -ons, vous -ez, ils -ent.
- **Imperfect vs Perfect** — Imperfect = background / used to / was -ing. Perfect = single completed event.
- **À vs De** — à = to/at (location), de = of/from (origin).
- **Avoir age** — *J'ai 12 ans* (NOT *je suis*). In French you HAVE an age, not ARE one.
- **70/80/90** — soixante-dix (60+10), quatre-vingts (4×20), quatre-vingt-dix (4×20+10). They break the pattern.

**Top 3 to drill cold.** -ER endings, MRS VANDERTRAMP, CaReFuL.

**Subject-specific exam tip.** Always check gender before writing — wrong article = wrong adjective ending. Use connectives (et, mais, parce que, cependant, donc) for sentence complexity marks. Memorise 5-6 "wow" phrases (*à mon avis*, *il faut que*, *j'aimerais bien*) — instant marks. Read listening questions BEFORE the audio plays. Watch out for false friends: *librairie* = bookshop, NOT library.

---

## 6. Recommended LEARN module redesign

Bringing the diagnosis + evidence + content together into a concrete proposal.

### 6.1 The Study Smart onboarding module (NEW — biggest single win)

The first time the kid opens LEARN, route them through an 8-minute onboarding that teaches the *meta-skill* of studying — not any subject content. This is the highest-leverage 8 minutes the app can give them.

Sections:
1. **The 1% truth** — *"Top students don't have bigger brains. They have more cheat codes loaded. You're about to learn the cheat codes."*
2. **Output > input** — what blurting is, how it works, why it beats re-reading.
3. **Spacing** — the day-1 / day-3 / day-7 / day-21 cycle, with a graphic.
4. **The Feynman test** — explain it to a 7-year-old. The goldfish framing.
5. **RAG-rate yourself** — red / amber / green per topic; drill the reds, ignore the greens.
6. **BUG the question** — Box the command word, Underline what it asks for, Glance back.
7. **The 6-week plan** — 2 sessions of 25 min on weekdays, one longer + rest on weekends.
8. **Top 5 traps to avoid** — phone in room, pretty notes, comfort topics, cramming, "I'll start tomorrow".

Wrap-up: "These 7 techniques are your toolkit. Each subject has its own cheat codes — let's go look at one."

Persist completion to localStorage. Available to re-watch any time from the LEARN hub. Show a badge on the home page when complete: "Study Smart certified".

### 6.2 Cheat Cards — a per-subject deck (NEW — second biggest win)

A new section type at the top of every subject page in LEARN: a swipeable deck of **Cheat Cards**, one per mnemonic from §5 above. Locked behind the relevant topic so kids only meet OIL RIG once they're learning redox, not as random trivia. Card front: the mnemonic. Card back: decode + when-to-use + a worked example.

For maximum stickiness: a "I've got this one" tap that adds the card to a personal "Memorised" pile, so the kid sees the pile growing as a proxy for progress.

### 6.3 Schema additions (the four highest-impact)

In priority order:

1. **`teach_back`** — end-of-lesson "Explain this to a 7-year-old in 2 sentences" prompt with free-text save. *The single highest-leverage minute of any lesson.*
2. **`why_prompt`** — mid-lesson "Why does this work?" with tap-to-reveal model answer. *Cheap to add; activates elaborative interrogation.*
3. **`predict`** — pre-reading "What do you think X does?" prompt. *Pretesting effect = better encoding.*
4. **`confidence_check`** — end-of-lesson "Got it / Bit shaky / Lost" — feeds the spaced-recap schedule.

The other 9 from §3 are valuable but lower-priority. These four are the floor.

### 6.4 Exam-day drill card (NEW)

A printable / shareable one-pager called **"What top students do in the exam room"** — six bullets, big font, kid sticks it on the bedroom door:

1. Read the WHOLE paper first (1-2 minutes).
2. 1 minute per mark. 6-mark question = 6 minutes max.
3. Easy questions first.
4. Stuck >90s → flag and return.
5. BUG every question: Box command word, Underline what it asks, Glance back.
6. Last 5 minutes: check command words, units, all parts (a, b, c).

### 6.5 Parent tips strip (NEW — small, valuable)

A weekly "Parent tip" card on the LEARN hub, written in the voice of a Mumsnet parent (not curriculum-corporate). Surface one of the tips from §4.5 each week. Authenticity is the whole point — *"30 minutes of productive revision is more useful than 3 hours of creating notes"* lands harder than *"keep sessions focused"*.

### 6.6 Content scope — triple to ~36 entries

Going from 12 → 36 LEARN entries means roughly +3-4 entries per subject. Priority order based on Year-7 setting-test relevance and where mnemonics most help:

**Science (10 → priority 5):**
1. Forces & motion (mnemonic-rich; SOHCAHTOA prep)
2. Energy stores (the new 8 — high marks-per-minute)
3. Acids & alkalis (pH already has a great visual)
4. Reproduction (MRS GREN context)
5. Sound waves (visual already shipped, just need explainer)

**Maths (13 → priority 5):**
1. Fractions (KFC = highest mnemonic-leverage)
2. Percentages ("of means times")
3. Algebra basics (FOIL prep)
4. Negatives (sign rules)
5. Statistics (mean/median/mode trap)

**English (9 → priority 4):**
1. Punctuation (Comma Queen + semicolon)
2. Sentence types (FANBOYS, simple/compound/complex)
3. Tenses (past/present/future + aspect)
4. Writing skills (PEEL + DAFOREST)

**French (10 → priority 3):**
1. Verbs (the 3 endings)
2. Adjectives (BANGS + agreement)
3. Negation (ne...pas)

**History (6 → priority 3):**
1. Tudors (1485-1603, the Big 8 dates focused window)
2. English Civil War (1642-1660)
3. Black Death (causation drill — PERSIA)

**Geography (8 → priority 3):**
1. Rivers (HASE + DTSS + Bradshaw)
2. Coasts (already have visual)
3. Weather & climate (climate graph rules)

**Computing (6 → priority 3):**
1. Algorithms (DPAA + binary vs linear search)
2. Hardware/software (RAM vs ROM, FDE)
3. Networks (TCP/IP, OSI)

That's 26 new entries. Combined with 12 existing = **38 entries, ~52% topic coverage.** Doable in roughly 4-5 evenings of writing if I batch it.

### 6.7 Structural cleanups in existing content

While adding new entries, fold in:
- Add a `teach_back` prompt to each existing entry.
- Add named mnemonics where missing (e.g. cells should explicitly mention MRS GREN, even though the topic is structural).
- Add a `why_prompt` to at least one section per existing entry.
- Add a "Cheat Cards earned in this lesson" footer that previews the cards now unlocked.

### 6.8 What NOT to add

- No learning-styles UI (debunked).
- No highlighting interactions (low-utility).
- No "fun facts" sidebar (seductive details = -20% learning).
- No cartoon mascots that aren't part of the diagram.
- No re-reading prompts — replace with retrieval prompts.

---

## 7. Implementation roadmap

The order I'd ship this in, smallest viable steps first:

### Phase 1 — meta-skill foundation (1 evening)
- Build the **Study Smart** onboarding (§6.1). Standalone HTML, no schema changes needed, ~8 sections.
- Build the **Exam-day drill card** (§6.4). Single page, printable.
- Add a "Study Smart" tile to the LEARN hub.

### Phase 2 — cheat-cards layer (1 evening)
- Add a `cheats[]` field to the registry per subject.
- Build the swipeable Cheat Cards deck UI (CSS + a tiny JS module).
- Populate the cheat-card content from §5 (~80 cards). All copy-pasteable from this doc.

### Phase 3 — schema additions (1 evening)
- Add the four section types: `teach_back`, `why_prompt`, `predict`, `confidence_check`.
- Update [learn.js](../learn.js)'s `renderSection` to render them.
- Update [diagnostics/schema-validator.js](../diagnostics/schema-validator.js) to validate them.
- Add localStorage persistence for `teach_back` answers and `confidence_check` ratings.

### Phase 4 — content expansion (3-4 evenings)
- Write 26 new LEARN entries per the priority list in §6.6.
- Backfill existing 12 entries with `teach_back` + `why_prompt` + named-mnemonic refs.
- Run smoke test after each batch (the existing `learning-drill-links` check guarantees every LEARN topic has 5+ questions in its pool).

### Phase 5 — spaced recap (1 evening, optional)
- Add the `spaced_recap` section type.
- Surface "Quick recap from last week" on the home screen for completed lessons due for re-exposure.
- Use existing localStorage timestamping infrastructure.

### Phase 6 — parent tips strip (30 minutes)
- Weekly card on LEARN hub. ~10 tip strings rotated.

**Total estimated effort: ~6-8 evenings to ship the full audit's recommendations.** Phases 1-3 alone (≈3 evenings) deliver ~70% of the educational impact.

---

## 8. Quick-start for the next session

If you only have time for one session of follow-up work, do **Phase 1**: ship the Study Smart onboarding + the Exam-day drill card. This is the meta-skill foundation that everything else builds on, and it's the single biggest reframe of how the kid will see the app — from "test me" to "teach me how to learn".

If you have two sessions, add **Phase 2** (Cheat Cards). The mnemonic bank in §5 is already written and copy-pasteable; the work is mostly UI.

The schema additions (Phase 3) are higher-impact than the content expansion (Phase 4), because they amplify *every* lesson, including the existing 12. So if the choice is "ship Phase 3 across all 12 existing lessons" vs "ship 5 new lessons in the old format", Phase 3 wins.

---

## 9. The headline insight

Year 7 is the precise moment when learning-how-to-learn pays a 5-year compound dividend. Every Mumsnet thread, every TSR retrospective, every UnJaded Jade video lands in the same place:

> *"I wish I'd known how to study earlier."*

The current LEARN module is a *content* module — a collection of explainers. The recommendation is to make it a *learning* module — one that teaches the meta-skill of studying as a first-class subject, gives the kid a vocabulary of named techniques (blurt, RAG, Feynman, BUG-the-question, MRS VANDERTRAMP, OIL RIG), and trains those techniques into automatic responses over the 6-week sprint.

That's the top-1% cheat code: not working harder, but having the right shortcuts loaded before everyone else even knows the test is coming.

---

*End of audit. Next session: Phase 1 ship. ~1 evening. Total: 6-8 evenings to fully implement.*
