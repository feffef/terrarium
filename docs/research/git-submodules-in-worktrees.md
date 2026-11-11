# Git submodules in worktrees: limits for a `terrarium-assets` submodule

## The question

What limits do git submodules have in git worktrees, given the plan: a public
`terrarium-assets` repo as a submodule with `shallow = true`, left
uninitialized in agent sessions, CI and worktrees (placeholders instead), and
fetched with `git submodule update --init --depth 1` only by the deploy
container and an ingest script, while agents create, commit from and remove
worktrees all the time, sometimes running `git add -A`?

Researched 2026-11-11, against git v2.43.0 (the local version) and git
`master` (DEF_VER v2.56.GIT) where they differ. Doc and source line numbers
are from the `v2.43.0` tag on github.com/git/git unless marked `master`.
"Tested on git 2.43.0" marks results from throwaway repos with `file://`
remotes; the scripts were throwaway and are not kept.

## 1. What `git worktree add` does with submodules

- **It does not initialize or check them out.** `add` populates the new
  worktree by running `git reset --hard --no-recurse-submodules`
  (`builtin/worktree.c:385-395`; unchanged on `master`,
  `builtin/worktree.c:402`). The gitlink path is an empty directory.
  Tested on git 2.43.0: `git submodule status` in a fresh worktree prints
  `-<sha> assets` and `assets/` holds 0 entries.
- **The submodule's git dir is per worktree.** Git places it at
  `repo_git_path("modules/<name>")` (`submodule.c:2516-2541`), and `modules`
  is not in the list of paths shared through `$GIT_COMMON_DIR`
  (`path.c:116-142`), so it resolves inside the worktree's private
  `$GIT_DIR`. gitrepository-layout only says `modules` "Contains the
  git-repositories of the submodules" (`Documentation/gitrepository-layout.txt:266-267`).
  Tested on git 2.43.0: `update --init` in worktree `wt1` put the clone at
  `<main>/.git/worktrees/wt1/modules/assets`. Each worktree that initializes
  the submodule downloads it again (no object sharing).
- **Init in one worktree writes shared config.** `config` is in the shared
  list (`path.c:137`). Tested on git 2.43.0: after `update --init` in `wt1`,
  `submodule.assets.active=true` and `submodule.assets.url` sit in the main
  `.git/config`; the main worktree and a new worktree `wt2` still show
  `-<sha>` (not populated). `git switch` in `wt2` with
  `-c submodule.recurse=true` did not populate it either.
- `master` adds `extensions.submodulePathConfig` / `submodule.<name>.gitdir`
  to choose the git dir (`master:submodule.c:2737-2767`), and 2.54 encodes
  submodule names in those paths (`Documentation/RelNotes/2.54.0.adoc:134-136`).
  Neither exists in 2.43.

## 2. Documented limitations

- BUGS: "Multiple checkout in general is still experimental, and the support
  for submodules is incomplete. It is NOT recommended to make multiple
  checkouts of a superproject." (`Documentation/git-worktree.txt:515-517`;
  same wording on `master`, `git-worktree.adoc:543-545`.)
- `move`: "linked worktrees containing submodules cannot be moved with this
  command" (`git-worktree.txt:127-130`). The check runs with no `--force`
  bypass (`builtin/worktree.c:1219`).
- `remove`: "Unclean worktrees or ones with submodules can be removed with
  `--force`" (`git-worktree.txt:138-141`). `check_clean_worktree` (which
  calls the submodule check) runs only `if (!force)`
  (`builtin/worktree.c:1346-1347`).
- What counts as "containing submodules": a `modules/` dir in that worktree's
  git dir, or any gitlink whose path is populated
  (`validate_no_submodules`, `builtin/worktree.c:1140-1176`). An
  **uninitialized** submodule does not count. Tested on git 2.43.0: a clean
  worktree with an uninitialized submodule moved and removed without
  `--force`; one with an initialized submodule failed both with "fatal:
  working trees containing submodules cannot be moved or removed".
- `remove --force` then deletes `.git/worktrees/<id>` (`builtin/worktree.c:1355`),
  which holds that worktree's `modules/` clone. Tested on git 2.43.0: the
  submodule repo, including any unpushed submodule commits, is gone.
- `prune` only removes `$GIT_DIR/worktrees` entries for missing worktrees
  (`git-worktree.txt:132-134`); the docs say nothing submodule-specific.
  Pruning an entry also drops its `modules/` (inference from the layout
  above, untested).

## 3. Accidental submodule pointer changes

Tested on git 2.43.0, pin `B`, submodule HEAD moved to `A`:

| Worktree state | Action | Result |
|---|---|---|
| uninitialized (empty dir) | `git add -A`, `git commit -a` | nothing staged |
| uninitialized, files written into `assets/` | `git status`, `git add -A` | files invisible, nothing staged |
| uninitialized, `assets/` deleted | `git add -A` | stages `D assets` (gitlink deletion) |
| initialized, HEAD moved | `git add -A` | stages the new pointer |
| initialized, `diff.ignoreSubmodules=all` | `status` / `add -A` | status silent; `add -A` still stages it |
| initialized, `submodule.assets.ignore=all` (`.git/config` or `.gitmodules`) | `add -A`, `add assets`, `commit -a` | all stage/commit it; `status`, `diff --cached --stat` and `show --stat` hide it (visible only with `--ignore-submodules=none`) |

Documented basis:

- `diff.ignoreSubmodules` "affects only 'git diff' Porcelain"
  (`Documentation/config/diff.txt:82-93`); `submodule.<name>.ignore` governs
  "git status and the diff family", and a staged change still shows in status
  and commit output (`Documentation/config/submodule.txt:33-47`,
  `Documentation/gitmodules.txt:66-73`). Neither claims to stop `git add`.
- Git 2.54 changed this for one form: "`git add <submodule>` has been taught
  to honor submodule.<name>.ignore that is set to 'all' (and requires
  `git add -f` to override it)" (`Documentation/RelNotes/2.54.0.adoc:63-65`).
  Whether that covers `add -A` / `commit -a` is unverified.
- `status.submoduleSummary` defaults to false and is suppressed by
  `ignore=all` (`Documentation/config/status.txt:63-77`), so it is no guard.
- `submodule.recurse` (default false) makes commands such as checkout and
  pull recurse (`Documentation/config/submodule.txt:60-70`); left at false,
  nothing touches an uninitialized submodule.

So `ignore = all` is worse than useless here on 2.43: it hides a pointer
change that `git add -A` still commits.

## 4. Shallow submodules and a pinned non-tip commit

- `submodule.<name>.shallow = true` makes the **clone** depth 1
  (`Documentation/gitmodules.txt:96-99`; code: `--depth=1` added only to the
  clone child, `builtin/submodule--helper.c:2065-2068`).
- If the pinned commit is not reachable from a fetched ref, `update` fetches
  again, then fetches the commit **directly by SHA** with the given depth,
  and fails with "Direct fetching of that commit failed" otherwise
  (`run_update_procedure`, `builtin/submodule--helper.c:2342-2368`;
  `fetch_in_submodule`, `:2225-2245`). Without `--depth` that direct fetch is
  not shallow. Tested on git 2.43.0: pin one behind the tip, plain
  `update --init` gave a shallow repo with 2 commits; `--depth 1` gave 1.
- Server side, stock git: protocol v2 "Wants can be anything and are not
  limited to advertised objects" (`Documentation/gitprotocol-v2.txt:252-255`;
  `parse_want` has no reachability check, `upload-pack.c:1464-1490`). On v0,
  a non-tip want needs `uploadpack.allowReachableSHA1InWant` (or
  `allowAnySHA1InWant`), except over stateless HTTP, where reachable commits
  are allowed (`upload-pack.c:785-812`; `Documentation/config/uploadpack.txt:16-28`).
  Tested on git 2.43.0 with a `file://` remote: an unreachable commit
  fetched over v2, refused over v0 ("Server does not allow request for
  unadvertised object").
- GitHub: no GitHub doc found that states its policy (unverified). Tested on
  git 2.43.0 against `https://github.com/octocat/Hello-World`:
  `git fetch --depth 1 origin <non-tip sha>` succeeded for two reachable
  non-tip commits, over v2 and over `-c protocol.version=0`. actions/checkout
  also documents fetching a single commit "for the ref/SHA that triggered
  the workflow" (actions/checkout `README.md:31`). Fetching a commit no ref
  reaches (e.g. after a force-push in `terrarium-assets`) was not tested on
  GitHub; treat it as unreliable.
- Tested on git 2.43.0: `update --init` into an `assets/` dir that already
  holds placeholder files fails ("clone of ... into submodule path ...
  failed", "Failed to clone 'assets' a second time, aborting").

## 5. How Claude Code creates worktrees

- "By default Claude Code creates the isolated working copy with
  `git worktree`" for `--worktree`, `isolation: "worktree"` subagents,
  `EnterWorktree`, workflows and background sessions; a `WorktreeCreate` hook
  replaces that entirely (code.claude.com/docs/en/hooks, WorktreeCreate). A
  `git worktree add` run through Bash fires no `WorktreeCreate` hook; a
  `PreToolUse` Bash hook is the way to inspect it (same section).
- Defaults: worktrees under `.claude/worktrees/`, branched from the default
  branch, checking out "only tracked files" (code.claude.com/docs/en/worktrees,
  "Customize worktree creation"). The docs never say Claude Code initializes
  submodules; with git's own `add` behaviour (§1) they start uninitialized.
- Cleanup is submodule-aware: on exit Claude checks "uncommitted work inside
  checked-out submodules" and prompts if it "can't inspect its submodule
  checkouts"; the periodic sweep keeps a worktree whose checked-out submodule
  has changed or untracked files (Claude Code v2.1.274+)
  (code.claude.com/docs/en/worktrees, "Clean up worktrees" and "Clean up
  subagent and background-session worktrees"). Git cleanup is
  `git worktree remove` (hooks doc, WorktreeRemove); whether Claude Code
  passes `--force` for an initialized but clean submodule is not documented
  (unverified). The sweep check does not mention unpushed commits inside a
  submodule.
- Subagent worktrees are "automatically cleaned up if the subagent makes no
  changes" (code.claude.com/docs/en/sub-agents, `isolation` field).

## 6. Other things that bite, and what keeps it safe

- `actions/checkout` defaults to `submodules: false` and `fetch-depth: 1`
  (actions/checkout `README.md:137-159`), matching the plan.
- Bites: placeholders written into `assets/` are invisible to git and break a
  later `update --init` there (§3, §4); deleting `assets/` and running
  `git add -A` commits the submodule's removal (§3); initializing in a
  worktree makes it unmovable and `remove --force`-only, and that removal
  discards the per-worktree clone (§2); init also flips shared config for
  every worktree (§1).
- Keeps it safe: an **uninitialized** submodule is inert to `git add -A`,
  `git commit -a`, `worktree move` and `worktree remove` (§2, §3), and
  `worktree add` never initializes it (§1). Leave `submodule.recurse` unset.

## What this means for the plan

1. Keep the submodule uninitialized everywhere agents work; never run
   `submodule update --init` in an agent worktree or the main checkout.
   Have the ingest script work in its own fresh clone, not a worktree.
2. Put placeholders outside the gitlink path (e.g. a gitignored
   `public/assets-placeholder/` the app falls back to), never inside
   `assets/`.
3. Do not use `ignore = all` (it hides pointer commits on 2.43). Instead,
   have the gate fail any diff that touches the gitlink path
   (`git diff --no-renames origin/main...HEAD -- <path>`) unless the PR is a
   pointer bump, which also catches the "deleted dir + `git add -A`" case.
4. Pin only commits on `terrarium-assets`' default branch and never
   force-push it, so the pinned SHA stays reachable; fetch with an explicit
   `--depth 1` (not just `shallow = true`) in the deploy container.
5. Deploy into a fresh clone with an empty `assets/`, or the init fails.

## Sources

- git v2.43.0 tag, github.com/git/git: `Documentation/git-worktree.txt`,
  `gitrepository-layout.txt`, `gitmodules.txt`, `git-submodule.txt`,
  `gitprotocol-v2.txt`, `config/{diff,status,submodule,uploadpack}.txt`;
  `builtin/worktree.c`, `builtin/submodule--helper.c`, `submodule.c`,
  `path.c`, `upload-pack.c`.
- git `master`: `Documentation/git-worktree.adoc`, `builtin/worktree.c`,
  `submodule.c`, `Documentation/RelNotes/2.54.0.adoc`.
- https://code.claude.com/docs/en/worktrees, /hooks, /sub-agents.
- https://github.com/actions/checkout/blob/main/README.md
- Empirical: throwaway shell scripts on git 2.43.0 with `file://` remotes
  (not kept); GitHub probe against `octocat/Hello-World`.
