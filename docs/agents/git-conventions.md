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
- Session logs land on `main` mid-session (ADR-0009), so `origin/main` moves
  under you. Diff with `origin/main...HEAD` (three dots), and squash with
  `git reset --soft "$(git merge-base origin/main HEAD)"`, never onto
  `origin/main` itself: that commit would delete the logs `main` gained. Check
  the merge-base is not empty first: empty means the checkout is an unrelated
  root, and the reset would destroy real history.
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

`scripts/hooks/unshallow-on-start.ts` unshallows at session start (issue #772), so a
shallow checkout means its fetch failed. A shallow `merge-base` can under-report
a diff. Run `git fetch --unshallow` before trusting any history; if that fails,
refuse to answer from the truncated graph. `scripts/gate/gate.ts` unshallows too,
and runs the full gate if that fails or the clone stays shallow (issue #849).

## File lists that feed a decision need `--no-renames`

`git diff --name-only` shows only a rename's new path, so a path classifier
misses the old one (#1443). `--no-renames` lists the delete and the add. The
GitHub PR-files API has the same gap: read `previous_filename` too.

## Commit hygiene

- A commit message containing backticks or `$(...)` goes through
  `git commit -F <file>` (or a quoted heredoc), never `-m`: the shell would run
  the span as a command.
- Check the ADR-0017 trailer landed: `.githooks/commit-msg` adds it but
  silently no-ops when the main checkout has no `node_modules` or `node` is off
  PATH.
- A commit titled as a session-log commit holds only the session log. Title any
  other commit for its work.
- Never patch a commit body with `git commit-tree` or other history rewriting;
  it can re-parent the chain and drop commits. Fix the tip commit only, with
  `git commit --amend -F <file>`.

## Don't chain git past a step that can fail silently

- Never `&&`-chain a branch rename or create with the commit and push after it:
  if the branch exists, the rename fails and the rest silently never runs. Check
  with `git rev-parse --verify <branch>` first.
- Never push (or run any other state-changing git command) anywhere later in
  the same command as a gate or test run, foreground or backgrounded. Pushes
  went out while the gate was red. Read the run's exit status in a separate
  step first.

## Before a destructive command

- Before `git reset --hard` or anything that discards uncommitted work, run
  `git status` and stash or commit what it shows.
- After `git stash pop` on staged `git mv` renames, run `git add -A`; each
  rename comes back as a staged add plus an unstaged delete.
- Never send a state-changing git command's output to `/dev/null`. A silenced
  `git stash pop` once failed, and a later comparison tested the base tree.
  Check the exit code and stderr.

## When the Stop hook flags commits you inherited from `main`

The closure Stop hook can flag inherited commits already on `origin/main`. Run
`git log origin/main..HEAD` first: a commit outside that list is public
history, so never rebase or rewrite it (for example via the hook's suggested
`--reset-author`). Even inside the list, a commit is yours to fix only if this
session made it; in a working copy shared with other sessions, the list also
holds theirs. `--reset-author` may also fail to sign: see the signing-key
caveat in [`environment-caveats.md`](./environment-caveats.md).

If the hook reports unpushed commits on a branch that exists on `origin` but
that list is empty, push this session's branch (`git push origin HEAD`, never
`main`, never forced). Every commit it sends is already on `origin/main`, so
none of your own work goes out and no PR follows; the nag stops because the
hook counts against the remote branch, not `origin/main`.
