#!/usr/bin/env bash
# AimHigh Mock Prep — install a pre-commit content validator.
#
# Run once per clone:
#   bash tools/install-hook.sh
#
# After this runs, every "git commit" will execute the JSON validator
# first; if any data file is malformed or has duplicate ids, the commit
# is blocked.
#
# Re-run after cloning to a new machine. Git hooks are NOT checked in
# (they live in .git/hooks/) so each clone needs its own setup.

set -e

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is not installed or not on PATH."
  echo "Install Node.js (any LTS) and re-run."
  exit 1
fi

HOOK_DIR="$(git rev-parse --git-dir 2>/dev/null)/hooks"
if [ -z "$HOOK_DIR" ] || [ ! -d "$(git rev-parse --git-dir 2>/dev/null)" ]; then
  echo "Error: not inside a git repo. Run from the repo root."
  exit 1
fi

mkdir -p "$HOOK_DIR"

cat > "$HOOK_DIR/pre-commit" <<'EOF'
#!/usr/bin/env bash
# AimHigh Mock Prep pre-commit: block commits with invalid question content.
node tools/validate-content.mjs
EOF

chmod +x "$HOOK_DIR/pre-commit"

echo "Installed pre-commit hook → $HOOK_DIR/pre-commit"
echo "Run 'node tools/validate-content.mjs' anytime to check the pool manually."
