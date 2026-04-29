# tools/

Small Node.js scripts that help maintain the question pool.

## validate-content.mjs

Validates every `data/<subject>.json` file: JSON well-formed, each
question has the right shape, all ids are unique across the pool, and
each question's `subject` field matches its file.

```
node tools/validate-content.mjs
```

Exits non-zero with a list of problems if anything's wrong; prints a
one-line summary if everything passes.

## install-hook.sh

Installs a git pre-commit hook that runs the validator before each
commit. One-time setup per clone (git hooks aren't checked in):

```
bash tools/install-hook.sh
```

After install, any commit that would introduce invalid content is
blocked until you fix it.
