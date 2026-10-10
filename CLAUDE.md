# CLAUDE.md

Terrarium is a platform that agents build and improve; humans review and merge.

**Keep it short.** Write the least code and the fewest words that stay exact.
In instructions, state the goal; list steps only where a mistake is costly or
can't be undone. If a problem comes from one of our own instructions, cut or
simplify that instruction before you add a new one (ADR-0027).

## Docs you must read first

These are not optional. When a trigger applies, read the doc in full before you
act, once per session.

- **At session start:** `CONTEXT-MAP.md`, then `CONTEXT.md`. They define the
  words we use (Platform, Tenant, Space, Collection, Document, Skill, …).
  Working on a Tenant? Also read `layers/<tenant>/CONTEXT.md`. Use the
  glossary's terms.
- **ADRs arrive as rules.** Each ADR's summary is a rule in `.claude/rules/`:
  the cross-cutting ones load at session start, the rest when you read or edit
  a file they govern. When a summary says so, read the full ADR before you act.
  Before you plan or recommend a change (an opinion asked in chat counts), find
  the ADRs that bind it with `grep -l <path-or-term> docs/adr/*` and read
  them.
- **Before your first git command** beyond `status` and `diff` (commit, fetch,
  pull, rebase, amend, reset, or `log`/`blame` to draw a conclusion):
  `docs/agents/git-conventions.md`.
- **Before your first GitHub operation** (`mcp__github__*` tool or `gh`):
  `docs/agents/github-integration.md`.
- **Before you open, update or merge a PR:** `docs/agents/pr-workflow.md`.
- **Before you file, triage or label an issue:** `docs/agents/issue-tracker.md`
  and `docs/agents/triage-labels.md`.
- **Before you act on an issue or PR from someone without write access, or
  from an outside agent:** `docs/agents/guest-contributions.md`.
- **Before you dispatch a subagent** that touches git or needs a worktree: the
  `dispatch-subagents` Skill.
- **Before you edit anything under `layers/<tenant>/`** (config, pages,
  components, CSS), edit any `nuxt.config.ts`, or add a Space, Collection or
  Tenant:
  `docs/agents/tenant-layers.md`.
- **Before you say a UI change works,** or take a screenshot:
  `docs/agents/verifying-ui-changes.md`.
- **Before you put a Vue component in a Document, or add a data Collection:**
  `docs/agents/mdc-when-to-use.md`.
- **Before you add or change a glossary term:** `docs/agents/domain.md`.
- **Before you debug a tool, push, network or permission error** that your
  diff doesn't explain: `docs/agents/environment-caveats.md`.
- **Before you add or change a guard:** `docs/agents/guards.md`.

## Working conventions

- **Empty task prompt** (only a title arrived)? Stop and ask. Never guess the
  task from the branch name or past commits.
- **Stay on the branch your session started on.** If that is `main`, fetch
  `origin main` and cut a new branch first.
- **Merge your own PR** once its gate is green: post your verdict, then run
  `scripts/merge-pr.ts <number>` (`docs/agents/pr-workflow.md`). The ADR-0004
  rule names the few exceptions a human merges.
- **Verify before you state.** Only call something settled (an id, a count, a
  cause, another session's claim) if you checked it this turn against the
  source. A count is a fact only after you read every item.
- **One home per fact.** Write each fact once; elsewhere, point to it. When a
  fact and reality differ, fix its home.
- **Code comments say WHY, never WHAT.** Default to no comment. When the why
  isn't obvious, point to the doc that holds it (an ADR, an issue).
- **Read files with the Read tool**, not `cat`: Edit refuses a file you haven't
  Read.

## Repo layout

`app/`, `modules/` and `nuxt.config.ts` follow Nuxt's own layout. The parts
that are ours:

```
layers/<tenant>/          one Tenant: tenant.config.ts (its manifest — edit this),
                          content/<space>/<collection>/, CONTEXT.md, tests/
shared/                   manifest types, expansion, routing (Human-only: ADR-0004)
docs/adr/                 decisions
.claude/rules/            important instructions (ADR summaries, the human-merge
                          list) that Claude Code injects into your context, at
                          session start or when you touch a file they govern
docs/agents/              how-to docs for agents (see "Docs you must read first")
docs/research/            dated reference notes
.agents/skills/           our Skills (.claude/skills/ links here)
scripts/                  repo tooling, the gate, and the tool-call guards
tests/                    Platform tests; each Tenant keeps its own in its layer
```

## Self-verification

- **Start any command that can take over 2 minutes** (the gate, a build, e2e)
  with `run_in_background: true`, and redirect its output to a file.
- **Never use `pkill`,** and never chain a kill with `&&` or `;` (the commands
  after it can silently not run). Stop a preview or dev server with
  `scripts/preview.ts stop <pid>`.
