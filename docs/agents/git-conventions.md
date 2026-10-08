# Git conventions

How to use git here without losing work or drawing a wrong conclusion from
history. Local git only; [`github-integration.md`](./github-integration.md)
covers the `mcp__github__*` tools.

## Fetch before you trust history

The pre-cloned `origin/main` is often stale and can inflate a diff to 100+
unrelated files. Before any since-last-merge diff or review, run
`git fetch origin main` and anchor on `git merge-base origin/main HEAD` or the
commit under review.

- Scope `git log -S<string>` to `origin/main`, never `--all`. Divergent branch
  histories can make an old file look newly created.
- Before resetting onto the merge-base, check it is not empty. Empty means the
  checkout is an unrelated root, and the reset would destroy real history.
- In a long session, re-fetch and rebase periodically, especially before
  landing a PR on a doc or list other sessions edit. Before starting work a
  Trusted user just directed, fetch that branch and read its latest commits:
  another session may have pushed it already.
- Read a file from main with `git show origin/main:<path>`. Never
  `git checkout <ref> -- <path>` (stages it) or `git checkout origin/main`
  (detaches HEAD).

A clean merge is not proof of correctness. Git flags only overlapping lines, so
a rename on one side can leave a stale reference on the other. On any file both
branches restructured, read both sides in full.

## If a checkout is still shallow

`scripts/unshallow-on-start.ts` unshallows at session start (issue #772), so a
shallow checkout means its fetch failed. A shallow `merge-base` can under-report
a diff. Run `git fetch --unshallow` before trusting any history; if that fails,
refuse to answer from the truncated graph. `scripts/gate.ts` does the same
(issue #849).

## File lists that feed a decision need `--no-renames`

`git diff --name-only` shows only a rename's new path, so a path classifier
misses the old one (#1443). `--no-renames` lists the delete and the add. The
GitHub PR-files API has the same gap: read `previous_filename` too.

## Commit hygiene

- A commit message containing backticks or `$(...)` goes through
  `git commit -F <file>` (or a quoted heredoc), never `-m`: the shell would run
  the span as a command. `.githooks/commit-msg` backstops the ADR-0017 trailer
  but silently no-ops if pnpm/tsx is off PATH, so check it landed.
- A commit titled as a session-log commit holds only the session log. Title any
  other commit for its work.
- Never patch a commit body with `git commit-tree` or other history rewriting;
  it can re-parent the chain and drop commits. Fix the tip commit only, with
  `git commit --amend -F <file>`.

## Don't chain git past a step that can fail silently

- Never `&&`-chain a branch rename or create with the commit and push after it:
  if the branch exists, the rename fails and the rest silently never runs. Check
  with `git rev-parse --verify <branch>` first.
- Never chain `git push` (or any state-changing git command) with `;` or `&&`
  after a backgrounded gate or test run. A push once went out while the gate
  was red. Read the run's exit status first.

## Before a destructive command

- Before `git reset --hard` or anything that discards uncommitted work, run
  `git status` and stash or commit what it shows.
- After `git stash pop` on staged `git mv` renames, run `git add -A`; each
  rename comes back as a staged add plus an unstaged delete.
- Never send a state-changing git command's output to `/dev/null`. A silenced
  `git stash pop` once failed, and a later comparison tested the base tree.
  Check the exit code and stderr.

## A Stop-hook "Unverified" flag isn't automatically yours to fix

The closure Stop hook can flag inherited commits already on `origin/main`. Run
`git log origin/main..HEAD` first. Never rebase or rewrite commits outside that
list (for example via the hook's suggested `--reset-author`); that rewrites
public history. Only commits in `origin/main..HEAD`, minus a checked-out
branch's commits authored before this session started, are yours to fix.
`--reset-author` may also fail to sign: see the signing-key caveat in
[`environment-caveats.md`](./environment-caveats.md).
