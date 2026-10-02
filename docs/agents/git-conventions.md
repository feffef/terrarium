# Git conventions

How to use git here without losing work or drawing a wrong conclusion from
history.

Scope: local git mechanics only.
[`github-integration.md`](./github-integration.md) covers the adjacent
`mcp__github__*` tool surface.

## Fetch before you trust history

`origin/main` in this environment's pre-cloned checkout is often stale, which
can inflate a diff to 100+ unrelated files. Before any since-last-merge diff
or review:

- Run `git fetch origin main` and anchor on the merge-base
  (`git merge-base origin/main HEAD`) or the commit under review (`HEAD~1`).
- Scope any `-S`/pickaxe search (`git log -S<string>`) to `origin/main`, never
  `--all` — mixing divergent/rewritten branch histories can misread an
  incrementally-built file as newly created.
- Check the merge-base isn't empty before resetting onto it
  (`git merge-base origin/main HEAD`). An empty merge-base means the checkout
  is a fully unrelated root, not just stale — resetting onto it blindly would
  destroy real history.

This isn't only a pre-diff step. Re-fetch and rebase onto `origin/main`
periodically during a long session too, not just before a final push —
especially before landing a PR that touches a doc or list other concurrent
sessions likely edit. The same applies before *starting* work a Trusted user
just directed: fetch first (`git fetch origin <branch>` + inspect the latest
commits) — a concurrent session may already have pushed that exact change.

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

## Commit hygiene

- **A commit message containing backticks or `$(...)` must go through
  `git commit -F <file>`** (or a quoted heredoc), never `-m` — inside a
  double-quoted `-m` argument the shell runs the backtick/`$()` span as a
  command and mangles the body. The ADR-0017 trailer is backstopped by
  `.githooks/commit-msg`, which can no-op silently if pnpm/tsx is off PATH, so
  glance that it landed.
- **Keep session-log-only commits content-only.** Never let substantive work
  ride along inside a commit titled as a session-log commit — title the
  commit for the work it actually contains.
- **Never use `git commit-tree` or other history-rewriting techniques** to
  patch a commit body — it can silently re-parent the chain onto a different
  base and drop intervening commits. The safe fix is
  `git commit --amend -F <file>` on the **tip commit only**, never non-tip
  history.

## Don't chain a git command past a step that can fail silently

**Never `&&`-chain a branch rename/creation with the commit/push steps that
follow it** — `git branch -m ... && git commit ... && git push` (or
`checkout -b`) fails at the rename/create when the branch already exists
locally, and every step after the `&&` never runs, with no error pointing at
it. Check existence first (`git rev-parse --verify <branch>`) and handle the
already-exists case explicitly instead of chaining blindly.

The same discipline applies to a backgrounded check: **never chain
`git push` (or any other state-changing git command) with `;`/`&&` right
after starting a backgrounded gate/test run**, without first waiting for and
checking its actual exit code — one session backgrounded `pnpm gate:scoped`
and chained `git push` immediately after, so the push went out while the
gate was still red. Start it per CLAUDE.md's long-command bullet, then read
that log's actual completion/exit status before running anything that assumes
it passed.

## Check `git status` before a destructive command, and never silence one's output

**Before `git reset --hard` (or any other command that discards uncommitted
work), run `git status` first** and stash or commit anything it finds (a
`git reset --hard HEAD~1` mid-teardown once discarded uncommitted edits to 5
tracked files, recovered only because this was caught).

**`git stash`/`git stash pop` around already-staged `git mv` renames splits
each rename into a staged add + an unstaged delete on pop**, instead of
preserving it as a rename. Run `git add -A` afterward to re-consolidate
before gating/committing.

**Never redirect a state-changing git command's output to `/dev/null`** (or
otherwise discard it). A `git stash pop` piped to `/dev/null` once failed
silently, leaving the stash un-popped while a later comparison looked clean
but was silently re-testing the base tree. Keep the exit code and stderr
observable and check it — don't discard the one signal that would have
caught the failure.

## A Stop-hook "Unverified" flag isn't automatically yours to fix

A session-closure Stop hook can flag commits that are actually **inherited
history** — landed on `main` before this branch existed, reachable from
`origin/main`.

Before acting on the flag, run `git log origin/main..HEAD`. Commits not in
that list predate this branch and must **not** be rebased or rewritten (e.g.
via the hook's suggested `--reset-author`) — doing so would rewrite public
history. Only commits that *are* in `origin/main..HEAD` are this session's
own and fair game to fix.

Before reaching for `--reset-author`, note the unprovisioned-signing-key
caveat that governs whether it can work at all — see
[`environment-caveats.md`](./environment-caveats.md).
