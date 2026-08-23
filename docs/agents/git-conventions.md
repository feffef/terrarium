# Git conventions

How to drive git in this environment without losing work or drawing a false
conclusion from history. Moved out of `CLAUDE.md` so that file could stay an
index (the same treatment `pr-workflow.md` got in #448).

Scope: local git mechanics only.
[`github-integration.md`](./github-integration.md) owns the adjacent
`mcp__github__*` tool surface.

## Your local git view is incomplete until you make it complete

**Goal: never conclude anything from git — a diff, a review scope, a history or
completeness claim — off a view you have not made complete.** Here it is
incomplete by default, three ways.

**Stale.** The pre-cloned `origin/main` lags, inflating a since-last-merge diff
to 100+ unrelated files. `git fetch origin main`, then anchor on `git merge-base
origin/main HEAD` (or `HEAD~1` for a single commit under review). Re-fetch
through a long session, not only before pushing — and before *starting* a
directed edit, since a concurrent session may already have pushed it. Don't
assume the merge-base is nonempty: the pre-cloned repo is occasionally an
unrelated root, and resetting onto it blindly destroys real history.

**Shallow.** Run `git rev-parse --is-shallow-repository` **first**, before any
blame/pickaxe/completeness work — not once a result already looks wrong. The
graft boundary makes every file it touches look newly-added and silently
truncates any search past it. Worse, `merge-base` answers off the truncated
graph with an older, ordinary-looking commit — not in `.git/shallow`, not
parentless, nothing about it detectably wrong — and that diff can *omit* files,
not merely over-report, because `A..B` compares endpoints and a revert restores
the wrong base's content. Anything gating on "what changed" then under-runs. So
`git fetch --unshallow` (or `--deepen <n>`), or refuse to answer; never classify
off a truncated graph. `scripts/gate.ts` does both — `changedPaths()` unshallows,
`changedPathsBetween()` refuses (#849, `tests/unit/gate-shallow-base.spec.ts`).
Scope a `-S`/pickaxe search to `origin/main`, never `--all`, which mixes
rewritten histories.

**Merged clean, but wrong.** Git flags a conflict only where both sides touched
the same lines, so a rename on one side leaves a stale reference on the other
with no marker. On a file both branches restructured, read both sides **in
full** before trusting the merge.

Prose has not held the shallow half — it failed four times (#413 → #682 → #703 →
**#772**, still open, which argues for mechanizing it; the design is row `GC-03`
of `docs/research/rulebook-migration-table.md`).

## Commit hygiene

- **Commit messages containing backticks or `$(...)` must be written with `git
  commit -F <file>`** (or a quoted heredoc), never `git commit -m` — inside a
  double-quoted `-m` argument the shell runs the backtick/`$()` span as a
  command and mangles the commit body. The harness's automatic footer injection
  only applies to interactive/`-m` commits, not `-F` — but `.githooks/commit-msg`
  (`scripts/provenance-footer.ts`) backstops both, appending the ADR-0017 trailer
  when absent and correcting it when it names the wrong session. It can no-op
  silently if pnpm/tsx is off PATH, so glance that the footer actually landed.
- **Keep session-log-only commits content-only.** Never let substantive work
  ride along inside a commit titled as a session-log commit — title the commit
  for the work it actually contains instead.
- **Never use `git commit-tree` or other history-rewriting techniques** to
  inject a missing footer or otherwise patch a commit body. It can silently
  re-parent the chain onto a different base and drop intervening commits. The
  safe fix is `git commit --amend -F <file>` on the **tip commit only** — never
  rewrite non-tip history.

## Don't `&&`-chain a branch rename/creation with what follows it

**Never `&&`-chain a branch rename/creation with the commit/push steps that
follow it** — `git branch -m ... && git commit ... && git push` (or
`checkout -b`) fails at the rename/create when the branch already exists
locally, and every step after the `&&` never runs, with no error pointing at
it. Check existence first (e.g. `git rev-parse --verify <branch>`) and handle
the already-exists case explicitly instead of chaining blindly.

## Check `git status` before a destructive command, and never silence a state-changing command's output

**Before `git reset --hard` (or any other command that discards uncommitted
work), run `git status` first and stash or commit anything it finds.** A
`git reset --hard HEAD~1` mid-teardown once discarded uncommitted edits to 5
tracked files (recovered).

**`git stash`/`git stash pop` around already-staged `git mv` renames splits
each rename into a staged add + an unstaged delete on pop**, instead of
preserving it as a rename. Run `git add -A` afterward to re-consolidate
before gating/committing.

**Never redirect a state-changing git command's output to `/dev/null` (or
otherwise discard it).** A `git stash pop` piped to `/dev/null` once failed
silently, leaving the stash un-popped and a later "base vs mine" comparison
silently re-testing against base while looking like a clean pass. If you
want quiet output, keep the exit code and stderr observable and check `$?`
— don't discard the one signal (exit status / error text) that would have
caught the failure.

## A Stop-hook "Unverified" flag isn't automatically yours to fix

A session-closure Stop hook can flag commits that are actually **inherited
history** — landed on `main` before this branch existed, reachable from
`origin/main`.

Before acting on the flag, run `git log origin/main..HEAD`. If the flagged
commits aren't in that list, they predate this branch and must **not** be
rebased or rewritten (e.g. via the hook's suggested `--reset-author`) — doing so
would rewrite public history. Only commits that *are* in `origin/main..HEAD` are
this session's own and fair game to fix.

Before reaching for `--reset-author`, note the unprovisioned-signing-key caveat
that governs whether it can work at all — see
[`environment-caveats.md`](./environment-caveats.md).
