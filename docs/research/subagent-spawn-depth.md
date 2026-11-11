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
- Observed, not documented: cloud sessions start with
  `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1`, passed in by the platform's launcher;
  a variable stored in the environment did not override it, a settings `env`
  entry did (see "Tests run" below). The `create_environment` tool's own
  description (not an official doc) says names that steer the session runtime
  "may be refused"; no docs page lists which.

## Not documented / unverified

- Whether the depth limit applies to Workflow `agent()` agents: untested in the
  docs and binary, but see "Tests run": they lack `Agent` even at depth 2.
- Whether the docs cover resuming Workflow-started agents: they do not, but it
  works by raw agent id (tests 6 to 9 below); the `agent()` signature has no
  resume option.
- Which names the cloud platform refuses in an environment's variables, and why
  a stored `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` did not apply (the stored value
  is not shown by `get_environment`).
- Exceptions to "settings `env` beats shell" for this variable (settings
  reference `env` entry, not read), and managed-policy `env` for it specifically.
- Binary: which call sites consume the value, and how workflow agents are counted,
  not traced.

## Follow-up: nesting inside Workflow scripts

Line numbers below are from `strings -n 6 /opt/claude-code/bin/claude` (v2.1.322);
the line numbers above come from `-n 8` and differ. Nothing was run in this
section; "Tests run" below ran workflows.

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

## Tests run 2026-11-11 (cloud sessions, Claude Code 2.1.322)

Each result is that session's own command output, or an agent's report of its
own tool list (marked self-reported, not checked by a command). One run each.

1. **Where the `1` comes from.** In the session that wrote this note,
   `env | grep SPAWN_DEPTH` printed `1`; so did `/proc/<pid>/environ` of the
   `claude` process and of its parent `environment-manager task-run`. Nothing
   matched in `/etc/profile*`, `/etc/profile.d`, `~/.bashrc`, `/root/.ccr` or
   `~/.claude`. At that time `get_environment` listed no variables for the
   session's environment, so `1` was a platform default.
2. **A stored environment variable did not override it.** After the owner stored
   the variable in the personal "Unrestricted" environment (they report the
   value `2`; `get_environment` shows names only), a session created
   22:21:15Z still had `1` in `env`, and `1` in the parent pids it could read
   (165, 156). So the stored value did not apply. Why is unknown; the platform's
   value winning fits.
3. **A settings `env` entry did.** With `"CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH":
   "2"` in `.claude/settings.json` on a branch, a session created 22:28:38Z
   printed `2` from `env`. Its launcher's value was not readable (pid 1:
   permission denied). This matches the env-vars page ("the settings file value
   applies in most sessions").
4. **Plain subagents nest one level at depth 2.** In that session a general-purpose
   subagent reported an `Agent` tool and `SPAWN_DEPTH=2`, started a child and was
   not refused; the child reported `SPAWN_DEPTH=2` and no `Agent` tool
   (self-reported).
5. **Workflow agents never got `Agent`, at depth 2.** One Workflow ran four
   `agent()` calls in parallel: default options, `{agentType: 'claude'}`,
   `{agentType: 'general-purpose'}` and `{disallowedTools: ['WebFetch']}`.
   Every option was accepted without error; every agent reported no `Agent` or
   `Task` tool and `SPAWN_DEPTH=2`; their loaded tool lists were identical (56
   names, diffed by script from the run's journal). `disallowedTools` did not
   remove `WebFetch` from the list (ignored, or it only affects the loaded list:
   unverified). An earlier one-agent Workflow gave the same answer. Against a
   plain subagent's list (47 loaded names, self-reported) the workflow agents
   lack only `Agent` and carry extras (`ListAgents`, `SendUserFile`,
   `ReportFindings`, `SuggestSkills`, and among deferred tools the Cron and
   `Task*` tools). So within the `agent()` options tried, the missing `Agent`
   follows from being a workflow agent, not from depth or `agentType`.

6. **Workflow agents cannot be addressed by label.** After a two-agent Workflow
   (labels `resume-test-A`, `resume-test-B`), `ListAgents` in the main session and
   in agent B listed no agents, and `SendMessage` to `resume-test-A` returned
   `No agent named 'resume-test-A' is reachable`. Agent A said it cannot tell its
   own agent id.
7. **By raw id from the run journal, a workflow agent resumes and keeps its
   context.** The id is in `~/.claude/projects/<project>/<session>/subagents/workflows/<run id>/journal.jsonl`
   (line `{"type":"started","agentId":...,"label":...}`). `SendMessage` from the
   main session to A's id returned `success: true, Resuming agent ...`; asked "reply
   `RESUMED-OK`, the secret word backwards, and 17*23", it answered
   `RESUMED-OK 247-MULP 391` (self-report; the harness notice showed 70,560 tokens,
   1 tool use, 2.4 s, a real new turn). A first attempt asking for "just the word"
   got a near-repeat of its old report; unexplained. A plain subagent resumed the
   same way is the control and answered a new question.
8. **A workflow agent can find a sibling's id and message it.** Agent D read the
   journal with Bash (`ls -dt ~/.claude/projects/*/*/subagents/workflows/*/ | head -1`,
   then `grep` the label) and `SendMessage` to C's id returned `success: true`.
   D saw no reply in the tool result. C did answer: the hand-back (`509-IWIK 144`,
   a real new turn with its context; harness notice 68,161 tokens, 1 tool use,
   4.5 s) reached the main session, not D. Not tested: whether D would receive it
   if D were still running. So a script cannot wait for a resumed sibling's
   answer inside the run.
9. **`resumeFromRunId` is a replay, not a resume.** Re-running the same script
   with it returned byte-identical output with 0 tokens, 0 tool uses and 12 ms:
   completed agents came from cache (matches the docs).

## The Agent SDK route (docs only; nothing run)

Whether a driver script on the Claude Agent SDK could replace the Workflow tool
for build, review, fix. Fetched 2026-11-11 from code.claude.com (summarised by the
fetch tool, so wording is close, not byte-exact).

- **Nesting works there.** Define the builder in `agents` with `Agent` in its
  `tools` (inherited if `tools` is omitted); a type list in `Agent(...)` is
  ignored in a subagent definition. The depth variable applies (default 3; set it
  through the SDK `env` option, TypeScript replaces the subprocess env so spread
  `process.env`). (https://code.claude.com/docs/en/agent-sdk/subagents, "Cap
  subagent depth, concurrency, and spend"; https://code.claude.com/docs/en/sub-agents)
- **Resume is documented, through the parent.** Keep `session_id` and the
  `agentId` from the Agent tool result, call `query()` again with `resume:
  sessionId` and a prompt asking to resume that agent; the subagent "retains its
  full conversation history". `SendMessage` by id or name also resumes. A
  driver-side call straight to a subagent id is not documented. (agent-sdk/subagents,
  "Resume subagents"; sub-agents page)
- **Auth is the open point.** The quickstart documents `ANTHROPIC_API_KEY` (or
  Bedrock, Vertex, Foundry switches) and says third parties may not offer claude.ai
  login. The authentication page documents `CLAUDE_CODE_OAUTH_TOKEN` for CI and
  scripts, tied to a subscription plan. Whether it may be used for an own-use SDK
  script, and how it counts against limits, is not documented in what was read.
  (agent-sdk/quickstart; https://code.claude.com/docs/en/authentication)
- **Cloud sessions.** `api.anthropic.com` and the npm registry are in the default
  allowed domains and Node 22 is preinstalled, so running a script looks feasible.
  The authentication page says cloud sessions always use subscription OAuth and
  ignore `ANTHROPIC_API_KEY` set in the environment. Whether a child SDK process
  in the VM gets a usable credential is undocumented. (cloud-environments;
  authentication)
- **Settings.** Omitting `settingSources` loads user, project and local settings,
  CLAUDE.md, rules, skills and hooks as the CLI does. (agent-sdk/claude-code-features)
- **Workflow tool.** Available in the TypeScript SDK from v0.3.149; the docs
  describe no workflow replacement built on the SDK, and nothing on whether an
  SDK-defined subagent can have `Workflow`. (agent-sdk/subagents, "Scale up with
  dynamic workflows")

