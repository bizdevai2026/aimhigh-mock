#!/usr/bin/env python3
"""GradeBlaze — static smoke test.

Catches the breakage modes that have actually shipped to users in this
project's history:
  1. HTML pages missing the boot/error-catcher.js + boot/loading-guard.js
     scripts before the module entry (was the cause of the
     stuck-on-loading reports).
  2. Module import that doesn't point to a file that exists.
  3. JSON content that doesn't parse, has duplicate question ids, or
     references a visual key that isn't in visuals.js.
  4. LEARN topic that has zero questions in its pool (the "Test what
     stuck — 5 questions" link runs an empty drill).
  5. Cache-bust version inconsistency (some files on a different ?v=).
  6. localStorage prefix mismatch between modules (would silently lose
     state on a future migration).

Run with: python tools/smoke-test.py
Exits 0 on pass, 1 on any failure. Prints a per-check report.

Designed to be cheap (~1s) so it can run on every commit. A more
thorough headless-browser smoke (Playwright) is a separate tool.
"""

import json, re, sys, os
from pathlib import Path

# Run from the repo root regardless of where the user invokes from.
ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)
sys.stdout.reconfigure(encoding='utf-8')

PROBLEMS = []

def fail(check, msg):
    PROBLEMS.append((check, msg))

def ok(check, msg):
    print(f"  OK    {check}: {msg}")

# === 1. HTML pages have boot scripts before the module script =================

HTML_PAGES = ['index.html', 'welcome.html', 'daily.html', 'subject.html',
              'paper.html', 'dashboard.html', 'learn.html',
              'study-smart.html', 'exam-day.html', 'cheat-cards.html']

for p in HTML_PAGES:
    if not Path(p).exists():
        fail("html-presence", f"{p} missing")
        continue
    src = Path(p).read_text(encoding='utf-8')
    # Find positions of each script tag of interest.
    err_match = re.search(r'<script[^>]*src=["\']boot/error-catcher\.js[\"\']', src)
    grd_match = re.search(r'<script[^>]*src=["\']boot/loading-guard\.js[\"\']', src)
    thm_match = re.search(r'<script[^>]*src=["\']boot/theme\.js[\"\']', src)
    mod_match = re.search(r'<script[^>]*type=["\']module[\"\'][^>]*src=["\']([^"\']+)["\']', src)

    if not mod_match:
        fail("html-module-script", f"{p} has no module script tag")
        continue

    mod_pos = mod_match.start()

    if not err_match:
        fail("boot-error-catcher", f"{p} missing boot/error-catcher.js")
    elif err_match.start() > mod_pos:
        fail("boot-error-catcher-order", f"{p} loads error-catcher AFTER the module script")

    if not grd_match:
        fail("boot-loading-guard", f"{p} missing boot/loading-guard.js")
    elif grd_match.start() > mod_pos:
        fail("boot-loading-guard-order", f"{p} loads loading-guard AFTER the module script")

    if not thm_match:
        fail("boot-theme", f"{p} missing boot/theme.js")
    elif thm_match.start() > mod_pos:
        fail("boot-theme-order", f"{p} loads theme AFTER the module script (FOUC risk)")

ok("html-pages", f"{len(HTML_PAGES)} pages each have boot/error-catcher + loading-guard + theme")

# === 2. Every module import points to a file that exists ======================

JS_FILES_TO_SCAN = []
for pattern in ['*.js', 'auth/*.js', 'platform/*.js', 'media/*.js',
                'diagnostics/*.js', 'domain/**/*.js', 'shared/*.js',
                'boot/*.js']:
    JS_FILES_TO_SCAN.extend(str(p) for p in ROOT.glob(pattern))

import_re = re.compile(r'''import\s+(?:[^"';]+\s+from\s+)?["']([^"']+)["']''')
unresolved = []
for f in JS_FILES_TO_SCAN:
    src = Path(f).read_text(encoding='utf-8')
    for m in import_re.finditer(src):
        spec = m.group(1)
        if not spec.startswith('./') and not spec.startswith('../'): continue
        # Resolve relative to the importing file
        target = (Path(f).parent / spec.split('?')[0]).resolve()
        if not target.exists():
            unresolved.append(f"{f} imports {spec} (resolves to {target}) — not found")

if unresolved:
    for u in unresolved: fail("import-resolution", u)
else:
    ok("import-resolution", f"all imports across {len(JS_FILES_TO_SCAN)} JS files resolve")

# === 3. Content JSON validity =================================================

DATA_FILES = ['data/science.json','data/maths.json','data/english.json',
              'data/french.json','data/history.json','data/geography.json',
              'data/computing.json']
TOTAL_QUESTIONS = 0
ALL_IDS = {}
TOPIC_COUNTS = {}

for p in DATA_FILES:
    try:
        data = json.load(open(p, encoding='utf-8'))
    except Exception as e:
        fail("json-parse", f"{p}: {e}")
        continue
    if not isinstance(data, list):
        fail("json-shape", f"{p}: not a JSON array")
        continue
    TOTAL_QUESTIONS += len(data)
    for q in data:
        qid = q.get('id', '?')
        if qid in ALL_IDS:
            fail("dup-question-id", f"{qid} in {p} (also in {ALL_IDS[qid]})")
        ALL_IDS[qid] = p
        # Topic count tracking for the LEARN-link check below
        topic_key = (q.get('subject'), q.get('topic'))
        TOPIC_COUNTS[topic_key] = TOPIC_COUNTS.get(topic_key, 0) + 1

ok("json-questions", f"{TOTAL_QUESTIONS} questions across {len(DATA_FILES)} files, no parse errors, no duplicate ids")

# learning.json
try:
    LEARNING = json.load(open('data/learning.json', encoding='utf-8'))
except Exception as e:
    fail("json-parse", f"data/learning.json: {e}")
    LEARNING = []

# registry.json
try:
    REGISTRY = json.load(open('data/registry.json', encoding='utf-8'))
except Exception as e:
    fail("json-parse", f"data/registry.json: {e}")
    REGISTRY = None

if REGISTRY:
    ok("registry", f"{len(REGISTRY.get('topics',[]))} topics across {len(REGISTRY.get('subjects',[]))} subjects")

# === 4. LEARN topic alignment ================================================

VISUALS_SRC = Path('visuals.js').read_text(encoding='utf-8')
VISUAL_KEYS = set(re.findall(r"['\"]([a-z0-9\-]+)['\"]\s*:\s*\[", VISUALS_SRC))

orphan_visuals = []
empty_drills = []
for e in LEARNING:
    s, t = e.get('subject'), e.get('topic')
    # 4a. Top-level visual key resolves
    v = e.get('visual')
    if v and v not in VISUAL_KEYS:
        orphan_visuals.append(f"{s}/{t} → visual '{v}' not in visuals.js")
    # 4b. Section visuals resolve
    for sec in e.get('sections', []):
        sv = sec.get('visual')
        if sv and sv not in VISUAL_KEYS:
            orphan_visuals.append(f"{s}/{t} section '{sec.get('heading','?')}' → visual '{sv}' not in visuals.js")
    # 4c. The "Test what stuck — 5 questions" link won't work if no questions.
    n = TOPIC_COUNTS.get((s, t), 0)
    if n == 0:
        empty_drills.append(f"{s}/{t} has 0 questions in pool (drill link will fail)")
    elif n < 5:
        empty_drills.append(f"{s}/{t} has only {n} questions (drill aims for 5)")

if orphan_visuals:
    for o in orphan_visuals: fail("visual-key", o)
else:
    ok("learning-visuals", f"all {len(LEARNING)} LEARN entries reference resolvable visual keys")

if empty_drills:
    for d in empty_drills: fail("learn-drill-link", d)
else:
    ok("learning-drill-links", "every LEARN topic has 5+ questions in its pool")

# === 4d. Cheat Cards schema =================================================
# data/cheat-cards.json is loaded by cheat-cards.js. Catch malformed cards
# here, where it's cheap, before they reach the kid as a half-broken deck.

REQUIRED_CARD_FIELDS = {'id', 'subject', 'mnemonic', 'decode', 'tagline'}
KNOWN_SUBJECTS = set([s['id'] for s in (REGISTRY or {}).get('subjects', [])])

try:
    CHEAT_CARDS = json.load(open('data/cheat-cards.json', encoding='utf-8'))
except Exception as e:
    fail("json-parse", f"data/cheat-cards.json: {e}")
    CHEAT_CARDS = []

cheat_problems = []
cheat_ids = set()
cheat_by_subject = {}
cheat_rich = 0
for c in CHEAT_CARDS:
    if not isinstance(c, dict):
        cheat_problems.append("non-object card entry")
        continue
    missing = REQUIRED_CARD_FIELDS - set(c.keys())
    if missing:
        cheat_problems.append(f"{c.get('id','?')} missing fields: {sorted(missing)}")
    cid = c.get('id')
    if cid in cheat_ids:
        cheat_problems.append(f"duplicate id: {cid}")
    cheat_ids.add(cid)
    s = c.get('subject')
    if KNOWN_SUBJECTS and s not in KNOWN_SUBJECTS:
        cheat_problems.append(f"{cid} subject '{s}' not in registry")
    cheat_by_subject[s] = cheat_by_subject.get(s, 0) + 1
    # Optional rich-content fields. Validate shape only if present.
    if 'context' in c and not isinstance(c['context'], str):
        cheat_problems.append(f"{cid} context must be a string")
    if 'worked_example' in c:
        we = c['worked_example']
        if not isinstance(we, dict):
            cheat_problems.append(f"{cid} worked_example must be an object")
        else:
            if 'scenario' in we and not isinstance(we['scenario'], str):
                cheat_problems.append(f"{cid} worked_example.scenario must be a string")
            if 'steps' in we and (not isinstance(we['steps'], list) or not all(isinstance(s_, str) for s_ in we['steps'])):
                cheat_problems.append(f"{cid} worked_example.steps must be array of strings")
            if 'outcome' in we and not isinstance(we['outcome'], str):
                cheat_problems.append(f"{cid} worked_example.outcome must be a string")
        cheat_rich += 1

if cheat_problems:
    for p in cheat_problems: fail("cheat-cards-schema", p)
else:
    ok("cheat-cards", f"{len(CHEAT_CARDS)} cards across {len(cheat_by_subject)} subjects ({cheat_rich} with rich worked examples), ids unique, schema valid")

# === 5. Cache-bust version consistency =======================================

versions = set()
for p in HTML_PAGES + JS_FILES_TO_SCAN:
    src = Path(p).read_text(encoding='utf-8')
    for m in re.finditer(r'\?v=(\d{8})', src):
        versions.add(m.group(1))

if len(versions) > 1:
    fail("cache-bust-skew", f"multiple ?v= versions in tree: {sorted(versions)}. Run python tools/bump-version.py")
elif len(versions) == 0:
    fail("cache-bust-missing", "no ?v= references found at all")
else:
    ok("cache-bust", f"single version {versions.pop()} consistent across {len(HTML_PAGES) + len(JS_FILES_TO_SCAN)} files")

# === 6. localStorage prefix consistency ======================================

PREFIX = "aimhigh-mock-"
prefix_violators = []
for f in JS_FILES_TO_SCAN:
    src = Path(f).read_text(encoding='utf-8')
    # Look for storage key strings that aren't aimhigh-mock-* and aren't comments
    for m in re.finditer(r'["\'](aimhigh-mock-[a-z0-9\-]+)["\']', src):
        pass  # accepted
    # Detect any *other* prefix that looks like a storage key
    for m in re.finditer(r'["\'](gradeblaze-[a-z0-9\-]+)["\']', src):
        # We allow this in user-facing filenames (e.g. gradeblaze-progress-2026...)
        if 'progress' in m.group(1) or 'export' in m.group(1):
            continue
        prefix_violators.append(f"{f}: uses key '{m.group(1)}' — should be aimhigh-mock-* until we ship a migration")

if prefix_violators:
    for v in prefix_violators: fail("storage-prefix", v)
else:
    ok("storage-prefix", "all storage keys use aimhigh-mock-* prefix (no premature renames)")

# === 7. Registry / SUBJECTS drift check =====================================
# The SUBJECTS array in questions.js is a sync mirror of data/registry.json.
# If they drift, downstream consumers (sprint, learn, dashboard) will see a
# different topic list than the registry-driven UI surfaces will.

import re as _re
qjs = Path("questions.js").read_text(encoding="utf-8")
m = _re.search(r"const\s+SUBJECTS\s*=\s*\[(.*?)\];", qjs, _re.S)
qjs_ids = sorted(_re.findall(r'id:\s*"([a-z\-]+)"', m.group(1) if m else ""))
reg_ids = sorted([s["id"] for s in (REGISTRY or {}).get("subjects", [])])
if not qjs_ids:
    fail("registry-mirror", "could not parse SUBJECTS const in questions.js")
elif qjs_ids != reg_ids:
    fail("registry-mirror", f"questions.js SUBJECTS {qjs_ids} != registry.json subjects {reg_ids}")
else:
    ok("registry-mirror", f"questions.js SUBJECTS matches registry.json ({len(reg_ids)} subjects)")

# === 8. Boundary check: only platform/storage.js touches localStorage =========

storage_re = re.compile(r'localStorage\.(getItem|setItem|removeItem|key|length)')
# boot/theme.js is the documented exception — a classic <script> in <head>
# that runs before module loaders are even available, so it can't import
# from platform/storage. The architecture owns this exception.
ALLOWED_DIRECT_LS = {'platform/storage.js', 'boot/theme.js'}
storage_violators = []
for f in JS_FILES_TO_SCAN:
    rel = str(Path(f).relative_to(ROOT)).replace(os.sep, '/')
    if rel in ALLOWED_DIRECT_LS: continue
    src = Path(f).read_text(encoding='utf-8')
    if storage_re.search(src):
        storage_violators.append(rel)

if storage_violators:
    for v in storage_violators: fail("storage-boundary", f"{v} touches localStorage directly")
else:
    ok("storage-boundary", f"only {sorted(ALLOWED_DIRECT_LS)} touch localStorage directly (rest go through platform/storage.js)")

# === Final report ============================================================

print()
if PROBLEMS:
    print(f"FAIL — {len(PROBLEMS)} problems:")
    for c, m in PROBLEMS:
        print(f"  [{c}] {m}")
    sys.exit(1)
else:
    print(f"PASS — all checks ok.")
    sys.exit(0)
