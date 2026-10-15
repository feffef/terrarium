# Glass Box handoff

Written at the end of the session that built Glass Box
([session log](https://claude.ai/code/session_01GG85r8HWMEdaMgKUaNUZH7), Journal entry
`2026-10-14-session_01GG85r8HWMEdaMgKUaNUZH7`). It holds what the log and the issues
don't: how the build went, what was decided along the way, and what is still open.
Delete it once its open items are filed or done.

## Where things stand

- Spec #1985 (still open on purpose) and map #1965. All 23 stories (#1988–#2010, #2015)
  are closed as completed.
- Every story landed as its own PR into the integration branch
  `claude/affectionate-lamport-fu16x5`, never straight to `main`. #2014 merges that
  branch into `main`, and the owner merges it. It carries Human-only files from #2019
  (ADR-0024 and its rule). Its description lists every PR by story.
- The wrap-up comment on #1985 lists the owner's decisions, findings and the pages to
  look at first. Read it before starting follow-up work:
  https://github.com/feffef/terrarium/issues/1985#issuecomment-6189564983

## How the build went

1. **Platform and layer stories** (#1988–#1998, #2015). Each had one implementer
   subagent in its own worktree, then a Standards and a Spec review, then fixes, then
   a PR into the integration branch.
2. **Seed pages** (#1999), then **three checkpoint rounds** (#2035, #2046, #2055). Each
   round was a fresh reviewer reading every seed page against the spec. Round 3 found
   only one item above a nit, so the loop stopped there.
3. **Lessons** (#2000–#2009) in batches of 2–4 pages per PR. Each batch got a content
   review against the code at its pinned revision and the tool's own docs, before its PR.
4. **Walkthroughs** (#2010): four parallel batches, each reviewed the same way.

Two pauses: a usage-limit stop killed five subagents mid-task, and resuming each one
by message worked. The worker process also restarted a few times, with no work lost.

## What reviews kept finding, and where the fix now lives

Each problem recurred across batches, so it became a rule. Don't re-add these as page
fixes; they are enforced.

| Problem | Now enforced by |
|---|---|
| Why it's built this way restating the ADR | Lesson contract in `GLOSSARY.md`; Why-line shape in `page-checks.ts` |
| "so …"/"because …" reasons in In Terrarium or stops | `.agents/skills/glassbox-lesson/EVERY-PAGE.md`; `glassbox-walkthrough` Skill |
| Where next growing with every new Lesson | 5-page cap in the contracts and `page-checks.ts` |
| Stop chips repeating a file a linked Lesson cites | stop rule in the Walkthrough contract; check in `page-checks.ts` |
| "the owner" where any Trusted user can act | `glassbox-walkthrough` Skill |
| Excerpt with several gaps numbered wrong | multi-range `lines="a-b,c-d"`; anchoring check in `page-checks.ts` |
| A page wording a fact that a pending change will break | Pin step in `EVERY-PAGE.md`: diff cited files against the integration tip |

## Rules for the next writer

- **Pin pages to `main`.** Lessons cite only files on `main` at their `revision`, never
  `layers/glassbox/`. Once #2014 lands, Glass Box's own files become citable, and
  `glassbox-update` (#1998) moves pins forward.
- **Use local docs.** The proxy blocks most docs sites (nuxt.com, content.nuxt.com,
  mermaid.js.org, git-scm.com, v3.zod.dev). Check claims against `npm pack` tarballs or
  sparse clones of the docs repos instead.
- **Fetch with an explicit refspec.** In a linked worktree, a bare
  `git fetch origin <branch>` left `origin/<branch>` stale twice. Writers then reported
  "up to date" wrongly. Use
  `git fetch origin <b>:refs/remotes/origin/<b>`, then check ancestry before trusting a
  merge.
- **Merge content PRs one at a time.** They collide on shared Where next lists and on
  *Opening a page* chips. Have each PR merge the integration branch in before it lands.
- **Post the verdict first.** `scripts/merge-pr.ts` refuses a PR without a
  session-headed verdict comment.
- **Glossary terms live in `content/guide/terms/*.yml`.** Check new ones against their
  source glossary and any open PR, since three batches once added duplicate terms.

## Open items

None of these is filed yet unless it says so. Each needs an issue or an owner decision.

**Owner decisions**
- Pack vs Terrarium rules (#2036): the `ready-for-agent` label, and wayfinder pushing
  branches without a PR, which ADR-0003 forbids.
- The `glassbox-update` Routine: set it up after #2014 merges.
- Sticky bars are solid, not 1b's frosted look. That was for readability; confirm it
  or revert it.

**Small fixes found while writing**
- e2e specs are in neither type-check program.
- The deploy script starts the server without `NODE_ENV=production`.
- `layers/journal/app/assets/theme.css` sets `--diagram-font` and `--diagram-font-size`,
  which nothing reads.
- The `nuxt.config.ts` comment says `node:sqlite` needs ">= 22.5". It is unflagged only
  from 22.13. That file is Human-only.

**Docs out of step**
- `dispatch-subagents` and `clear-backlog-build.js` say subagents can't spawn. That is
  true here only because of `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1`.
- `docs/agents/environment-caveats.md` says cloud sessions drop `permissions.allow`.
  The official docs disagree.

**Tooling**
- The workflow-edit guard false-positives on any script whose text names
  `.github/workflows/`. Report it on #897.
- The worktree guard refuses chained git commands and loops, which cost every writer
  time.
- `tinkerfund-flows.spec.ts:387` flakes locally under a parallel gate. It is green in CI.

**Glass Box nits left by design**
- The scroll-cue fade doesn't run in Firefox, which has no `animation-timeline`, but it
  degrades cleanly.
- The Zod docs anchors come from README headings and are unverified.

**Ideas**
- Add *Routine* to the root `GLOSSARY.md`.
- Move the guards to Claude Code's `onFailure: block`.
- Put a rule and doc verdicts block in the writer hand-back template, so that
  log-session gets subagent verdicts for free.

## Suggested Skills

- `glassbox-lesson` and `glassbox-walkthrough`: to write or fix any page. They are
  user-invoked, so read and follow them.
- `glassbox-update`: to move pins after `main` changes.
- `dispatch-subagents`: before sending writers or reviewers to worktrees.
- `code-review`: before the first push of any code change.
- `tdd`: for changes to `page-checks.ts`, `page-refs.ts` or the components.
- `close-session`: at PR open and at the end.
