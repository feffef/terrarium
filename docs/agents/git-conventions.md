# Git conventions

How to drive git in this environment without losing work or drawing a false
conclusion from history. Moved out of `CLAUDE.md` so that file could stay an
index (the same treatment `pr-workflow.md` got in #448).

Scope: local git mechanics only.
[`github-integration.md`](./github-integration.md) owns the adjacent
`mcp__github__*` tool surface.

## Staleness — fetch before you conclude anything

**For any since-last-merge diff or review, run `git fetch origin main` first and
anchor on the merge-base** (`git merge-base origin/main HEAD`) or the commit
under review (`HEAD~1`). The environment's pre-cloned `origin/main` is often
stale and inflates the diff to 100+ unrelated files.

The same staleness bites two related cases:

- Scope any `-S`/pickaxe search (`git log -S<string>`) to `origin/main`
  specifically, never `--all`, which mixes divergent/rewritten branch histories
  and can misread an incrementally-built file as a brand-new-file commit.
- Don't assume a nonempty merge-base — check `git merge-base origin/main HEAD`
  first and be ready for the pre-cloned repo to be a fully unrelated root (empty
  merge-base, 100+ commits of divergence), not just stale. Resetting onto it
  blindly would destroy real history.

**This isn't only a pre-diff step.** In this fast-moving, multi-agent repo,
re-fetch and rebase onto `origin/main` periodically during a long-running
session too — not just right before a final push, and especially before
landing/merging a PR that touches a shared doc or list other concurrent sessions
likely edit.

**The same applies before *starting* work, not just before pushing it.** When a
Trusted user verbally directs an edit on a PR, fetch (`git fetch origin
<branch>` + inspect the latest commits) before beginning it — a concurrent
session may have already pushed that exact change, and catching it before you
redundantly re-author it is cheaper than catching it at push time.

## A clean merge is not proof of correctness

**A clean, no-conflict auto-merge/rebase is not proof of correctness on a file
both branches restructured.** Git only flags a conflict where the two sides
touched overlapping lines — a rename or refactor on one side can leave a
now-stale reference on the other with no conflict marker to catch it (a rebase
once silently kept a stale `specimen.value?.slug` reference after `main` had
renamed it to `entry.value?.specimen`).

On any file both branches actually restructured, read both sides **in full**,
not just the (absent) conflict markers, before trusting the merge — especially
after a rename or refactor on either side.

## Rule out a shallow clone before any history archaeology

**Run `git rev-parse --is-shallow-repository` as the *first* step** before
starting any blame/pickaxe/history-completeness work — not only once a result
already looks wrong.

A shallow clone's grafted, parent-less boundary commit makes every file it
touches look newly-added, which reads as a real history rewrite when it's
actually a clone-depth artifact. The same boundary silently truncates any search
over history before it, which makes a completeness claim ("searched everything
since X, found nothing more") false.

`git fetch --deepen <n>` (or `--unshallow`) to inspect the real history before
concluding a file's history was rewritten, squashed, or re-rooted — or before
asserting any completeness claim over history.

### A shallow `merge-base` can be wrong, and its diff can OMIT files

This is the sharper edge of the same problem, and it bites the *routine*
operation CLAUDE.md asks for — "anchor on the merge-base before any
since-last-merge diff" — not just history archaeology.

In a shallow clone `git merge-base` answers off a truncated commit graph. When
the true merge-base lies below the graft boundary but a merge commit keeps some
*older* commit reachable, `merge-base` returns that older commit. The answer is
an ordinary, fully-hydrated commit: **not** listed in `.git/shallow`, **not**
parentless. Nothing about it looks wrong, so there is no way to detect the bad
answer short of having the history that would make the question moot.

The tempting conclusion — an older base only over-reports, so the diff is a
harmless superset — is **false**. `git diff A..B` compares the two *endpoints*,
not the path between them. A branch that reverts a change which landed between
the wrong base and the true base restores that file to its wrong-base content,
so it drops out of the diff entirely. Revert branches make this everyday.

So a shallow `merge-base` diff can silently **under-report** what a branch
touched. Anything gating on "what changed" — a scoped test run, a review scope,
a risk classification — can therefore under-run. Complete the clone first
(`git fetch --unshallow`), or refuse to answer; do not classify off the
truncated graph. This is exactly what `scripts/gate.ts` does, in both
directions: `changedPaths()` unshallows, and its CI sibling
`changedPathsBetween()` refuses (issue #849; reproduced in
`tests/unit/gate-shallow-base.spec.ts`).

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
