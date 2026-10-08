# Git conventions

How to use git here without losing work or drawing a wrong conclusion from
history.

Scope: local git mechanics only.
[`github-integration.md`](./github-integration.md) covers the adjacent
`mcp__github__*` tool surface.

## Fetch before you trust history

The pre-cloned `origin/main` is often stale and can inflate a diff to 100+
unrelated files. Before any since-last-merge diff or review:

- Run `git fetch origin main` and anchor on the merge-base
  (`git merge-base origin/main HEAD`) or the commit under review (`HEAD~1`).
- Scope any `-S`/pickaxe search (`git log -S<string>`) to `origin/main`, never
  `--all` — mixing divergent/rewritten branch histories can misread an
  incrementally-built file as newly created.
- Before resetting onto the merge-base, check it isn't empty: an empty one means
  the checkout is an unrelated root, not just stale, and resetting onto it would
  destroy real history.

In a long session, re-fetch and rebase onto `origin/main` periodically, not just
before the final push — especially before landing a PR touching a doc or list
other sessions likely edit. Before *starting* work a Trusted user just directed,
`git fetch origin <branch>` and inspect the latest commits: a concurrent session
may already have pushed it.

**To read a file from main, use `git show origin/main:<path>`** — never
`git checkout <ref> -- <path>` (stages it into the index) or
`git checkout origin/main` (detaches HEAD).

## A clean merge is not proof of correctness

Git only flags a conflict where both sides touched overlapping lines. A
rename or refactor on one side can leave the other with a stale reference and
no conflict marker to catch it (a rebase once silently kept a stale
`specimen.value?.slug` reference after `main` had renamed it to
`entry.value?.specimen`). On any file both branches actually restructured,
read both sides **in full** before trusting the merge.

## If a checkout is still shallow

A `SessionStart` hook (`scripts/unshallow-on-start.ts`, issue #772) unshallows
before a session's first turn, so a shallow checkout means the hook's fetch
failed (e.g. offline). Don't trust history off it — a shallow `merge-base` can
**under-report** a diff, not just over-report it (a revert branch is the common
case). Run `git fetch --unshallow` and verify before trusting any history-based
conclusion; refuse to answer rather than classify off the truncated graph.
`scripts/gate.ts` enforces the same in code (issue #849).

## A file list that feeds a decision needs `--no-renames`

`git diff --name-only` reports only a rename's new path, so a path classifier
misses the old one (#1443). `--no-renames` lists a rename as a delete of the
old path plus an add of the new one. The GitHub PR-files API has the same gap:
read `previous_filename` too.

## Commit hygiene

- **A commit message containing backticks or `$(...)` must go through
  `git commit -F <file>`** (or a quoted heredoc), never `-m` — inside a
  double-quoted `-m` argument the shell runs the backtick/`$()` span as a
  command and mangles the body. The ADR-0017 trailer is backstopped by
  `.githooks/commit-msg`, which can no-op silently if pnpm/tsx is off PATH, so
  glance that it landed.
- **A commit titled as a session-log commit holds only the session log.** Title
  any commit that carries other work for that work.
- **Never patch a commit body with `git commit-tree` or other history
  rewriting:** it can silently re-parent the chain onto a different base and
  drop commits in between. Fix the **tip commit only**, with `git commit --amend
  -F <file>`.

## Don't chain a git command past a step that can fail silently

**Never `&&`-chain a branch rename or create with the commit/push after it.**
`git branch -m … && git commit … && git push` (or `checkout -b`) fails at the
rename when the branch already exists, and the later steps silently never run.
Check first (`git rev-parse --verify <branch>`) and handle the exists case.

**Never chain `git push` (or any state-changing git command) with `;`/`&&` after
a backgrounded gate/test run.** A push chained right after a backgrounded `pnpm
gate:scoped` once went out while the gate was red. Read the run's exit status
before anything that assumes it passed.

## Check `git status` before a destructive command, and never silence one's output

**Before `git reset --hard` (or any other command that discards uncommitted
work), run `git status` first** and stash or commit anything it finds (a
`git reset --hard HEAD~1` mid-teardown once discarded uncommitted edits to 5
tracked files).

**`git stash pop` after stashing staged `git mv` renames turns each rename into
a staged add plus an unstaged delete.** Run `git add -A` afterward, before
gating/committing.

**Never redirect a state-changing git command's output to `/dev/null`** (or
otherwise discard it). A `git stash pop` so redirected once failed silently: the
stash stayed un-popped and a later comparison re-tested the base tree. Check the
exit code and stderr.

## A Stop-hook "Unverified" flag isn't automatically yours to fix

The session-closure Stop hook can flag **inherited** commits: ones already on
`origin/main` from before this branch existed.

Before acting on the flag, run `git log origin/main..HEAD`. Commits not in that
list must **not** be rebased or rewritten (e.g. via the hook's suggested
`--reset-author`); that would rewrite public history. Only commits in
`origin/main..HEAD`, minus a checked-out branch's commits authored before this
session started, are this session's own and fair game to fix.

`--reset-author` may also fail to sign: see the unprovisioned-signing-key caveat
in [`environment-caveats.md`](./environment-caveats.md).
