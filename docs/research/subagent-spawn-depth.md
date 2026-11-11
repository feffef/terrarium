# What Claude Code documents about subagent nesting and `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`

Can a subagent start its own subagents, what controls that, and how does it
reach Workflow `agent()` calls, SDK subagents and cloud sessions? Answered from
Anthropic's official docs only, plus one grep of the installed binary.

**Read 2026-11-11** from code.claude.com (pages fetched that day; quotes are
from the fetched text, which the fetch tool summarises, so wording is close, not
guaranteed byte-exact). Local binary: `/opt/claude-code/bin/claude`,
`claude --version` printed `2.1.322 (Claude Code)`.
**Status: reference; decides nothing** (the proposal is issue #3110).

## Findings

**1. The variable is documented.**
- Name `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`. "Number of subagent layers allowed
  below the main conversation (default: 3). At the default, subagents can spawn
  their own subagents, and a subagent at the third layer can't spawn further; set
  `1` to turn nesting off." (https://code.claude.com/docs/en/env-vars)
- Valid values: "a positive whole number in plain digits; anything else is
  ignored, so the limit can be adjusted but not removed." Requires v2.1.217+.
  (same page)
- Default history: 1 in v2.1.217 through v2.1.218, 3 from v2.1.219. (same page)
- Binary agrees: the reader returns the env value if set, else a feature-flag
  value (`tengu_hazel_trellis`), else constant `3`; valid is an integer >= 1.
  (`strings -n 8 /opt/claude-code/bin/claude`, line 553868 of the output)

**2. Nested spawning is supported, by default.**
- "By default, a subagent can spawn subagents of its own, up to three layers below
  the main conversation. At the depth limit, Claude Code withholds the `Agent` tool
  from every subagent except a fork." (https://code.claude.com/docs/en/sub-agents,
  "Subagent nesting")
- To stop one subagent: omit `Agent` from its `tools` or add it to
  `disallowedTools`. (same page)
- `Agent(agent_type)` allow-lists apply only to an agent run as the main thread
  with `claude --agent`; in a subagent definition, "listing `Agent` in `tools`
  lets that subagent spawn subagents of its own while the depth limit allows it,
  but any type list inside the parentheses is ignored." (same page)
- Binary's refusal text at the limit: "Complete this task directly using your
  tools instead of spawning another agent. ... ask them to raise
  CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH." (`strings -n 8` output, line 396314)

**3. Where it can be set.**
- Settings `env` is documented: the sub-agents page shows
  `{"env": {"CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH": "2"}}` in `settings.json`,
  and the env-vars page shows `export CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1`
  for a shell.
- Precedence: "When the same variable is set in both your shell and a settings
  file `env` block, the settings file value applies in most sessions. Claude Code
  writes each `env` entry into the process environment, replacing the value
  inherited from the shell." Between settings files, "`env` values follow
  settings precedence, so a managed settings entry overrides the same variable in
  user or project settings." (https://code.claude.com/docs/en/env-vars#precedence)
  The page defers the exceptions ("sessions that keep the inherited value") to the
  settings reference `env` entry, which I did not read (unverified).
- Agent SDK: set it through the `env` option; TypeScript replaces the subprocess
  environment (spread `process.env`), Python merges. Default 3, `1` stops
  nesting. (https://code.claude.com/docs/en/agent-sdk/subagents, "Cap subagent
  depth, concurrency, and spend")

**4. Workflow and SDK subagents.**
- SDK programmatic subagents (`agents` option): covered by the same variable and
  the same section; "a subagent can spawn subagents of its own". Same page.
- Workflow `agent()` calls: the depth variable is **not documented** as applying
  or not applying. The only related sentence: "Agents that other features run,
  such as workflow agents and agent team teammates, follow their own limits
  instead." (https://code.claude.com/docs/en/sub-agents). The documented
  workflow limits are 16 concurrent agents (`CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS`)
  and 1,000 agents per run. (https://code.claude.com/docs/en/workflows,
  "Behavior and limits") Whether a workflow agent may spawn subagents of its own
  is not stated.

**5. Resuming Workflow-started agents: not documented.**
- Resuming ordinary subagents is documented: `SendMessage` with the agent ID or
  name resumes a completed subagent; IDs live in
  `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`.
  (https://code.claude.com/docs/en/sub-agents, "Resuming subagents")
- What the workflows page documents is resuming the *run*: relaunching with a
  `Workflow` call replays it, completed agents return saved results, failed or
  still-running ones run again; it says nothing about `SendMessage` or agent IDs
  for a workflow's agents. (https://code.claude.com/docs/en/workflows, "Resume
  after a pause")

**6. Cloud sessions.**
- The cloud pages never mention this variable. Searched
  https://code.claude.com/docs/en/claude-code-on-the-web and
  https://code.claude.com/docs/en/cloud-environments for it (text search of the
  saved cloud-environments page; the web page was read via the fetch tool):
  no hit. So "set by the platform" is not documented.
- User override: environments take variables in `.env` format, read "into
  ordinary environment variables that any command Claude runs can read, except
  `OTEL_*`". (cloud-environments, "Set environment variables") No documented
  list of refused names. The claude-code-on-the-web page does say the platform
  sets `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` and that "adding the variable there
  doesn't change when compaction triggers", the one documented platform-set
  variable that beats an environment value. The docs also say transport
  variables (`NODE_EXTRA_CA_CERTS`, mTLS) in a repo's `settings.json` `env` are
  ignored.
- Observed, not documented: this session's process environment has
  `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` (`env | grep SPAWN_DEPTH`; also in
  `/proc/self/environ`). It is in no settings file I checked
  (`/root/.claude/settings*.json`, `/home/user/terrarium/.claude/settings*.json`,
  `/etc/claude-code`), so the platform or harness set it. Which of them, and
  whether an environment variable of the same name would override it, is
  unverified. The `create_environment` tool's own description (not an official
  doc) says names that steer the session runtime "may be refused"; no docs page
  lists which.

## Not documented / unverified

- Whether the depth limit applies to Workflow `agent()` agents (finding 4; the
  follow-up below adds the binary check, still unverified).
- Whether Workflow-started agents can be resumed with `SendMessage` or agent IDs.
- Whether the cloud platform sets this variable, and which names it refuses; the
  value `1` seen here is local observation only.
- Exceptions to "settings `env` beats shell" for this variable (settings
  reference `env` entry, not read), and managed-policy `env` for it specifically.
- Binary: which call sites consume the value, and how workflow agents are counted,
  not traced.

## Follow-up: nesting inside Workflow scripts

Line numbers below are from `strings -n 6 /opt/claude-code/bin/claude` (v2.1.322);
the line numbers above come from `-n 8` and differ. Nothing was run.

1. **Workflow agents starting subagents, and the depth variable: not documented.**
   The docs page and sub-agents page are silent (see finding 4 above). The binary's
   `agent()` signature lists `label, phase, schema, model, effort, isolation,
   agentType` and no tool or nesting option (line 672745); error strings also
   name `opts.disallowedTools` and `opts.bashCommandClamp` (lines 584957-585023),
   so those exist but are not in the signature text. Whether the `Agent` tool is in
   a workflow agent's pool, and whether a workflow counts as a depth level, I could
   not confirm (unverified; would need tracing the depth reader at line 553868 of
   the `-n 8` output to its call sites).
2. **Sub-workflows: supported, one level only (binary, not in the docs page).**
   The workflow-authoring text in the binary says: "`workflow(nameOrRef: string |
   {scriptPath: string}, args?)` - run another workflow inline as a sub-step ...
   The child shares this run's concurrency cap, agent counter, abort signal, and
   token budget ... Nesting is one level only: workflow() inside a child throws."
   (line 672752.) A matching error exists: "nest with workflow('<name>') instead."
   (line 584855.) The public workflows page does not mention `workflow()`
   (https://code.claude.com/docs/en/workflows). Whether an agent inside a workflow
   may call the `Workflow` tool: not documented; the `sub-agents` page lists
   `Workflow` among tools its first filter removes from subagents (quoted in
   the fetched page, "The first filter removes these tools ... `Workflow`"), which
   suggests no, but I did not read the full list context (unverified).
3. **Tool description.** The `Workflow` tool description in the binary (line
   651664) and the script reference (line 672745 onward) say nothing about
   nesting, depth or the `Agent` tool.
4. **Repo workflows.** `.claude/workflows/clear-backlog-build.js` and
   `clear-backlog-explore.js` use only `label, phase, schema, isolation, model`
   in `agent()` opts (build.js lines 132-162, explore.js line 149); no tool
   options. build.js line 106 tells review agents "you can't spawn subagents (the
   environment sets CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1)": the repo author's
   belief, consistent with the value seen in this session, not evidence that a
   workflow counts as a level.
