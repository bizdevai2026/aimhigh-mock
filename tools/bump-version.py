#!/usr/bin/env python3
"""bump-version.py — single source of truth for cache-bust dates.

Why this exists
---------------
ES module imports are static strings — you can't compute the URL at runtime
without losing browser bytecode caching. So every import statement, every
<script src> and <link href> across HTML/JS/SW carries its own ?v=YYYYMMDD
query string. Bumping these by hand is the #1 source of "stale module"
bugs in this app's history.

This script bumps every ?v=YYYYMMDD on disk in one shot. It's the ONLY
way to bump versions — the README and CLAUDE.md should reference it.

Usage
-----
    python tools/bump-version.py            # bumps to today (UTC)
    python tools/bump-version.py 20260430   # bumps to a specific date

The script:
  1. Scans *.html, *.js, *.css, sw.js, manifest.webmanifest under the repo root
  2. Replaces every ?v=YYYYMMDD with ?v=<new>
  3. Refuses to write a date older than the highest currently-on-disk
     version (so re-runs are no-ops, not regressions)
  4. Reports a one-line summary of files touched
"""

import os, re, sys, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PATTERN = re.compile(rb'\?v=(\d{8})')
TARGETS = []
# Recurse so the per-domain folders (boot/, auth/, platform/, media/,
# domain/, diagnostics/, shared/) are caught as well as the top level.
# Skip the tools/ folder — it's our own infra, no cache-busted refs.
for ext in ('*.html', '*.js', '*.css', '*.webmanifest'):
    for p in ROOT.rglob(ext):
        if 'tools' in p.parts: continue
        TARGETS.append(p)
TARGETS.sort()

def existing_max_version():
    seen = set()
    for p in TARGETS:
        try:
            for m in PATTERN.finditer(p.read_bytes()):
                seen.add(m.group(1).decode('ascii'))
        except Exception:
            pass
    return max(seen) if seen else None

def bump_to(new_v):
    new_v_b = new_v.encode('ascii')
    touched, total_replacements = 0, 0
    for p in TARGETS:
        original = p.read_bytes()
        replaced, n = PATTERN.subn(b'?v=' + new_v_b, original)
        if n and replaced != original:
            p.write_bytes(replaced)
            touched += 1
            total_replacements += n
    return touched, total_replacements

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d')
    if not re.fullmatch(r'\d{8}', target):
        print(f'ERROR: target version must be YYYYMMDD, got {target!r}')
        sys.exit(2)
    current = existing_max_version()
    if current and target < current:
        print(f'ERROR: target {target} is older than current max on disk {current} — refusing.')
        print('       Pass an explicit higher date if you really mean it.')
        sys.exit(3)
    if current == target:
        print(f'No-op: every version on disk is already {target}.')
        return
    files, replacements = bump_to(target)
    print(f'Bumped {replacements} occurrences across {files} files: {current or "(none)"} -> {target}')

if __name__ == '__main__':
    main()
