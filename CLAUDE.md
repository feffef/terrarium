# CLAUDE.md

Terrarium is a platform that agents build and improve; humans steer it and merge the risky few.

**Keep it short.** Write the least code and the fewest words that stay exact.
In instructions, state the goal; list steps only where a mistake is costly or
can't be undone. If a problem comes from one of our own instructions, cut or
simplify that instruction before you add a new one (ADR-0027).

## Docs you must read first

These are not optional. When a trigger applies, read the doc before you act,
once per session. Read enough to know what applies; reading it whole with the
Read tool is safest, since a rule can sit anywhere in it.

- **ADRs arrive as rules.** Each ADR's summary is a rule in `.claude/rules/`:
  the cross-cutting ones load at session start, the rest when you read or edit
  a file they govern or run a Skill they name. When a summary says so, read the
  full ADR before you act.
- **Before your first git command** beyond `status` and `diff` (commit, fetch,
  pull, rebase, amend, reset, or `log`/`blame` to draw a conclusion):
  `docs/agents/git-conventions.md`.
- **Before your first GitHub operation** (`mcp__github__*` tool or `gh`):
  `docs/agents/github-integration.md`.
- **Before you push a branch, or open, update or merge a PR:**
  `docs/agents/pr-workflow.md`.
- **Before you file, triage or label an issue:** `docs/agents/issue-tracker.md`
  and `docs/agents/triage-labels.md`.
- **Before you act on an issue or PR from someone without write access, or
  from an outside agent:** `docs/agents/guest-contributions.md`.
- **Before you inspect another session** (`list_events`, `get_event`): the
  `inspect-session` Skill.
- **Before you write a subagent brief, or resume a stopped subagent:** the
  `dispatch-subagents` Skill.
- **Every subagent brief** asks it to return, in its final reply, a verdict
  (path, why it loaded or was read, useful yes/partly/no) on each rule and doc
  it loaded or read, and to write every file it creates, scripts included, in a
  scratchpad subfolder named for itself (subagents share one scratchpad); a
  script that imports repo packages goes in `.throwaway/<its name>/` instead.
- **Before you debug a tool, push, network or permission error** that your
  diff doesn't explain: `docs/agents/environment-caveats.md`.

## Working conventions

- **Words we use:** @GLOSSARY-MAP.md and @GLOSSARY.md. When you name a concept
  they define, use its term, not a synonym; otherwise prefer plain, common words.
- **Empty task prompt** (only a title arrived)? Stop and ask. Never guess the
  task from the branch name or past commits.
- **Stay on the branch your session started on.** If that is `main`, fetch
  `origin main` and cut a new branch first.
- **Invoke `close-session`** before the turn that opens a PR ends, and when a session only answers a question.
- **Merge your own PR** with `scripts/github/merge-pr.ts <number>` once ADR-0004 allows it.
- **Verify before you state.** State an id, a count, a cause or another agent's
  claim (a subagent's report too) only after you check it this turn against its
  source. Count every item; never take a number from memory or a summary.
- **Ask before building** something the Trusted user will see (the `grilling`
  Skill); don't assume. Data shapes: `.claude/rules/data-shapes.md`.
- **Question the premise.** Before you recommend, build or harden a change,
  give each part a reason from the current goal; drop the parts you can't, and
  add nothing beyond the ask.
- **One home per fact.** Write each fact once; elsewhere, point to it. When a
  fact and reality differ, fix its home. When you change a fact, grep for its
  other statements and its consumers in the same edit.
- **Code comments say WHY, never WHAT.** Default to no comment. When the why
  isn't obvious, point to the doc that holds it (an ADR, an issue).

## Repo layout

`app/`, `modules/` and `nuxt.config.ts` follow Nuxt's own layout. The parts
that are ours:

```
layers/<tenant>/          one Tenant: tenant.config.ts (its manifest — edit this),
                          content/<space>/<collection>/, GLOSSARY.md, tests/
shared/                   manifest types, expansion, routing (mostly Human-only: ADR-0004)
docs/adr/                 decisions
.claude/rules/            rules (ADR summaries, the human-merge list)
docs/agents/              how-to docs for agents
docs/research/            dated reference notes
.agents/skills/           our Skills (.claude/skills/ links here)
.claude/workflows/        workflow scripts, each its Skill's code (ADR-0005)
scripts/                  repo tooling by area: gate/ (the gate and its checks), hooks/ (tool-call
                          guards and hints), session/ (session logs; Skill usage: audit-skills.ts --skill;
                          Frictions since a date: extract-frictions.ts --since), github/, git/, ui/, lib/ (shared)
tests/                    Platform tests; each Tenant keeps its own in its layer
```

## Self-verification

- **Put throwaway scripts that import repo packages in `.throwaway/`**
  (git-ignored); in the scratchpad they can't resolve `node_modules`.
- **Run anything that can take over 2 minutes** (`pnpm gate:scoped`, a build,
  e2e) with `run_in_background: true` and a log file; a foreground call dies at
  600s. Dispatched subagents: `dispatch-subagents` §3.
- **Never use `pkill`,** and never chain a kill with `&&` or `;` (the commands
  after it can silently not run). Stop a preview or dev server with
  `scripts/ui/preview.ts stop <pid>`.
