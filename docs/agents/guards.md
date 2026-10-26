# The guards

Rules that prose stopped holding are held mechanically instead. Each guard's
rationale, detection contract and residual gaps are single-homed in **its
own script header** — read that before changing one. This page is the index and
the conventions they share.

`scripts/hooks/hook-io.ts` holds the plumbing every `PreToolUse` guard needs (stdin
to deny-JSON, transcript read, `--dry-run`, direct-run bootstrap). Each guard
adds only its registry, a pure predicate and `formatGuardMessage`.

**A guard's deny message is the instruction:** it names what to do instead, so
follow it and don't route around it. If it is wrong, say so on the guard's issue
(roster below) rather than rephrasing the call until it passes.

## The roster

| Guard | Denies | Rule homed in | Issue |
| --- | --- | --- | --- |
| `deferred-tool-guard.ts` | a deferred tool called with another tool's argument shape, or `TaskCreate` called with a top-level array value. Wired only for `TaskCreate` and `Monitor`, so a wrongly-shaped call to any other tool is not intercepted | the harness (no repo home; the guard holds the rule) | #612, #724 |
| `loop-only-tool-guard.ts` | `ScheduleWakeup` outside a `/loop` session — `stop: true` is exempt in every mode, since a cancel can only remove a pending wakeup | the deny message | #814 |
| `skill-inline-guard.ts` | a `Skill` call naming a Skill this session's `<command-name>` block already delivered inline | the deny message | #999, #1018 |
| `subagent-background-guard.ts` | a **dispatched subagent** backgrounding a Bash command (`run_in_background: true`, or a bare `&` anywhere in the command text, `nohup … &` included), or calling `Monitor` to wait on one. Orchestrators are untouched | `dispatch-subagents` | #694, #964, #995 |
| `workflow-edit-guard.ts` | in a **cloud session** only, a **write** into `.github/workflows/` — an `Edit`/`Write` path there, or a write-shaped `Bash` command. Reads pass, and `.github/actions/gate/action.yml` is untouched: agents may push that one (ADR-0026) | `environment-caveats.md` (the write-refusal rule); ADR-0026 (the `action.yml` carve-out) | #897, #2174 |
| `double-background-guard.ts` | a `Bash` call stacking `run_in_background: true` on a text-level background operator in the command (a bare `&` anywhere, `nohup … &` included) — for **any** caller, main session included (no `detectAgentContext` gate, unlike `subagent-background-guard.ts`) | the deny message | #1208 |
| `github-provenance-guard.ts` | a GitHub body (MCP, or a Bash `gh api`/`curl` write), or an MCP-API commit, missing this session's provenance in the shape its surface prescribes; also an MCP title or body carrying a bare `<...>` span GitHub silently strips | ADR-0017 — the deny message is the agent-facing home | #886, #1900 |
| `github-search-fields-guard.ts` | `search_issues` or `search_pull_requests` called with `fields` missing or empty | the deny message | #1860 |
| `dispatch-read-guard.ts` | a **main-session** `Agent`, `Workflow` or `SendMessage` call before the transcript shows the `dispatch-subagents` Skill invoked or its `SKILL.md` read | CLAUDE.md | #2543 |
| `harness-tag-stop.ts` | blocks the stop once when this turn's main-agent text holds a `<task-notification>` or `<agent-message` tag, which only the harness delivers | its script header | #2499, #2503 |
| `stale-push-hint.ts` | nothing: a hint, not a guard. After a `git push` rejected as "stale info" it adds the fix to the result | its script header | #1610 |
| `skill-rules-hint.ts` | nothing: a hint, not a guard. When a Skill runs (Skill tool or slash command) it adds the rules whose `paths` name the Skill's directory | its script header | PR #1741 |
| `bash-rules-hint.ts` | nothing: a hint, not a guard. After a piped, chained or multi-file Bash read it adds the rules whose `paths` match the files read | its script header | #1764 |
| `read-first-hint.ts` | nothing: a hint, not a guard. At a session's first call of a kind CLAUDE.md or the UI rule binds to a doc (git, GitHub, issue write, screenshot) it points to that doc, once per doc. After a successful `mcp__github__create_pull_request` in the main session it says to invoke `close-session`, unless that was invoked after the PR call | its script header | #1754, #1859, #2209 |
| `adr-read-hint.ts` | nothing: a hint, not a guard. After an `Edit`, a `Write` or a Bash `git commit` it points to each ADR whose rule `paths` match a file written, or that the change names, unless this agent already read it in full | its script header | #2286, #2433 |

`.claude/settings.json` wires the guards under `hooks.PreToolUse`, and the hints
under `PostToolUse`, `PostToolUseFailure` and `UserPromptSubmit`; `harness-tag-stop.ts` runs under `Stop`.

## Conventions every guard follows

- **A crash.** A crashing hint, `deferred-tool-guard` or `harness-tag-stop`
  lets the action go ahead (each uses a bare `|| true`). Any other guard that crashes or can't read
  its context or payload blocks it: its hook entry sets `"onFailure": "block"`,
  which also blocks when the hook can't start or times out (#2073). That needs
  Claude Code v2.1.295 or later; an older CLI ignores it and lets the call go ahead.
- **Run tsx as `node_modules/.bin/tsx`,** never `pnpm exec tsx`, in every hook
  command and `.sh` pre-filter: `pnpm exec` adds about a second per call. Only
  the SessionStart `pnpm install` stays.
- **Matcher-scoped, never `"*"`.** Each `tsx` start (~0.3s) would hit every
  Read/Edit/Bash call. The `Bash`, `Edit` and `Write` guards add an `sh`
  pre-filter so only a payload that could match pays it.
- **Pure core, `--dry-run`, and a unit test** in `tests/unit/<guard>.spec.ts`.
  Run the `--dry-run` in a script's `Usage:` header to exercise a branch by hand.
- **Human-only to merge** (ADR-0004): unit tests can't observe live interception.
- **Never dispatch an unattended or scheduled session to change a guard,
  `.claude/settings.json`'s hook wiring included:** the edit raises a permission
  prompt that no human is present to grant. A routine that finds such a fix files
  a `needs-triage` issue with the fix and stops; a human-attended session builds it. This
  limits who implements, not how triage routes: an issue with a settled design is
  still `ready-for-agent`.
- **A unit test asserts the property, not hand-picked substrings.** A regex on a
  negated character class can match across newlines, so a verb on one line
  denied an unrelated action on the next, and 26 single-line tests missed it.
  Cover multi-line and adversarial inputs, and live-probe the real deny path
  once before trusting the suite.

## Extending one

Add a row to the guard's registry — an exported array at the top of its script
(`FOREIGN_SIGNATURES`, `LOOP_ONLY_TOOLS`, `GITHUB_PROVENANCE_TOOLS`,
`BASH_WRITE_SHAPES`) — and add the tool to that guard's `PreToolUse` matcher in
`.claude/settings.json`. A newly observed confusion is a data row, never a logic
change. Add the case to `tests/unit/<guard>.spec.ts` too.

## Probed live, and still unknown

- Hooks fire in this cloud environment, **including for a dispatched subagent's**
  tool calls (probed 2026-08-06, CLI 2.1.42). Unlike `permissions.allow`, they
  are not subject to the untrusted-workspace drop (`environment-caveats.md`).
- A subagent's payload carries **`agent_id`/`agent_type`**; a main session's
  carries neither, and a subagent's env and `transcript_path` are the *parent's*.
  That pair is the only signal separating the two contexts.
- **Unknown:** whether `PreToolUse` fires *before* the harness rejects a
  schema-invalid deferred-tool call (the `InputValidationError` path). A `Bash`
  call has no competing rejection path, so the confirmed `Bash` interception
  (#946) says nothing about it.

## Known gaps

Each guard's header lists its own. One applies to all:

- A textual pre-filter lets the action go ahead if the harness renames or
  re-serializes a payload key.
