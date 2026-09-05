# The guards

Rules that prose stopped holding are held mechanically instead. Each guard's
rationale, detection contract and residual fail-opens are single-homed in **its
own script header** — read that before changing one. This page is the index and
the conventions they share.

`scripts/guard-io.ts` (issue #1080) owns the stdin→deny-JSON, `--dry-run`, and
direct-run-bootstrap plumbing every `PreToolUse` guard needs — the mechanical
shape, not the rules. Every guard but `subagent-background-guard.ts` and
`session-id-guard.ts` (a different shape: quote-aware command scanning and a
post-hoc trace read, respectively) builds on it; each still contributes only
its own registry, pure predicate, and `formatGuardMessage`.

**If a guard just denied your call, its deny message is the instruction** — it
names what to do instead. Don't route around it. If it is wrong, say so on the
issue below rather than rephrasing the call until it passes.

## The roster

| Guard | Denies | Rule homed in | Issue |
| --- | --- | --- | --- |
| `deferred-tool-guard.ts` | a deferred tool called with another tool's argument shape, or `TaskCreate` called with a top-level array value | CLAUDE.md (load the schema via `ToolSearch` first) | #612, #724 |
| `loop-only-tool-guard.ts` | `ScheduleWakeup` outside a `/loop` session — `stop: true` is exempt in every mode, since a cancel can only remove a pending wakeup | CLAUDE.md | #814 |
| `subagent-background-guard.ts` | a **dispatched subagent** backgrounding a Bash command (`run_in_background: true`, or a bare `&` anywhere in the command text, `nohup … &` included), or calling `Monitor` to wait on one. Orchestrators are untouched | `dispatch-subagents` | #694, #964, #995 |
| `commit-trailer-guard.ts` | a `git commit` whose message hand-types the ADR-0017 trailer the harness already lands | CLAUDE.md, ADR-0017 | #921 |
| `workflow-edit-guard.ts` | a **write** into `.github/workflows/` — an `Edit`/`Write` path there, or a write-shaped `Bash` command. Reads pass, and `.github/actions/gate/action.yml` is untouched: agents may push that one (ADR-0026) | CLAUDE.md, `environment-caveats.md` | #897 |
| `github-provenance-guard.ts` | a GitHub body, or an MCP-API commit, missing this session's provenance in the shape its surface prescribes; also a title or body carrying a bare `<...>` span GitHub silently strips | ADR-0017 — the deny message is the agent-facing home | #886 |
| `session-id-guard.ts` | nothing: **post-hoc**. Reports a wrong session id on this session's own commits, at teardown | CLAUDE.md | #387 |

`.claude/settings.json` wires all of these under `hooks.PreToolUse`, except
`session-id-guard`, which `scripts/session-end.ts` calls.

## Conventions every guard follows

- **Fail closed.** An undeterminable context, an unparseable payload, or a crash
  inside the guard **denies**. The one exception is `deferred-tool-guard`, which
  has no context to be unsure about: it fails **open**, never blocking a call it
  cannot positively identify.
- **Matcher-scoped, never `"*"`.** Matching every tool would run a `tsx` process
  (~0.3s) on the Read/Edit/Bash hot path. The three guards matching `Bash` (or
  `Edit`/`Write`) add an `sh` pre-filter, so only a payload that could possibly
  match pays that start.
- **Pure core split from the I/O, reachable by `--dry-run`, with a unit test in
  `tests/unit/<guard>.spec.ts`** — ADR-0004's reviewability bar for code that
  runs unattended. Run the `--dry-run` in a script's `Usage:` header to exercise
  a branch by hand.
- **Human-only to merge** (ADR-0004, 2026-07-30). Unit tests don't clear that
  bar: what they cannot observe is the *live* interception.
- **A unit test must assert the underlying property, not a handful of
  hand-picked substring fixtures.** A regex built on a negated character class
  can match across newlines, letting an unrelated verb on one line accidentally
  deny an unrelated action on the next — 26 passing tests gave no signal
  because every one of them asserted against single-line substrings, never the
  multi-line property actually at risk. Cover multi-line and adversarial
  inputs, and live-probe the real deny path once before trusting the suite as
  sufficient — the "Human-only to merge" bullet above is exactly why a test
  alone can't be the whole story.

## Extending one

Add a row to the guard's registry — an exported array at the top of its script
(`FOREIGN_SIGNATURES`, `LOOP_ONLY_TOOLS`, `GITHUB_PROVENANCE_TOOLS`,
`BASH_WRITE_SHAPES`) — and add
the tool to that guard's `PreToolUse` matcher in `.claude/settings.json`. The
predicates are registry-driven, so a newly-observed confusion is a data row —
never a logic change — and the tests pin that property directly. Add the new
case to `tests/unit/<guard>.spec.ts` too.

## Probed live, and still unknown

- Hooks fire in this cloud environment, **including for a dispatched subagent's**
  tool calls (probed 2026-08-06, CLI 2.1.42). Unlike `permissions.allow`, they
  are not subject to the untrusted-workspace drop (`environment-caveats.md`).
- A subagent's payload carries **`agent_id`/`agent_type`**; a main session's
  carries neither, and a subagent's env and `transcript_path` are the *parent's*.
  That pair is the only signal separating the two contexts.
- **Unknown:** whether `PreToolUse` fires *before* the harness rejects a
  schema-invalid deferred-tool call (the `InputValidationError` path).
  Interception confirmed on the `Bash` matcher (#946) says nothing about it — a
  `Bash` call has no competing rejection path.

## Known gaps

- A textual pre-filter fails **open** if the harness renames or re-serializes a
  payload key — as does a missing `pnpm`/`tsx`, since every hook is invoked
  `|| true`.
- `subagent-background-guard`'s command-text scan is not a full shell parser:
  a `&` reached only through command substitution, a here-doc, or ANSI-C
  quoting is outside its model (#964's accepted trade-off).
- `workflow-edit-guard`'s Bash arm has the same limit, and it is a *matcher* of
  paths: a command naming no workflow path has nothing to match — a path reached
  through a variable or `xargs`, `git commit -a` after an out-of-band
  modification, and `git add .`/`-A`, which are the common forms of the `git add`
  it does catch. The push rejection stays the backstop there.
