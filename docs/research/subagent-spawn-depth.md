# Subagent nesting, `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` and workflow agents

Can a subagent start its own subagents, what controls it, and how do cloud
sessions, Workflow agents and the Agent SDK fit in? Answered from Anthropic's
official docs plus tests run on 2026-11-11 in cloud sessions (Claude Code
2.1.322). **Status: reference; decides nothing.** The proposal that uses it is
issue #3110.

How to read the sources: doc claims were read through a fetch tool that
summarises pages, so they are paraphrased, not quoted, and carry their URL.
Test results are command output unless marked "self-reported" (an agent's own
account of its tool list or reply); token and time figures are the harness's
completion notices.

## Summary

- Nesting is on by default in Claude Code: subagents may start subagents up to
  `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` layers (documented default 3, `1` turns
  it off).
- Cloud sessions start with that variable at `1`, passed in by the platform's
  launcher. A variable stored in the cloud environment did not change it; a
  `settings.json` `env` entry did.
- Workflow agents never had an `Agent` tool, even at depth 2 and with other agent
  types, so a workflow agent cannot start subagents. A plain subagent can, one
  level at depth 2.
- A finished workflow agent can be resumed by its raw agent id (from the run
  journal), not by label. It keeps its context and takes new instructions; its
  reply goes to the main session. Re-running a workflow with `resumeFromRunId`
  only replays cached results.
- A driver script on the Agent SDK could nest and resume through the parent
  session; its authentication in a cloud session is undocumented.

## What the docs say

- **The variable.** The number of subagent layers allowed below the main
  conversation; default 3 (the default was 1 in two early releases); `1` stops
  subagents spawning their own; a value that is not a positive whole number is
  ignored. (https://code.claude.com/docs/en/env-vars)
- **Nesting.** A subagent can spawn subagents by default, up to three layers
  below the main conversation; at the limit the `Agent` tool is withheld from
  every subagent except a fork. Omit `Agent` from a subagent's `tools`, or list
  it in `disallowedTools`, to stop one subagent. A type list inside `Agent(...)`
  only applies to an agent run as the main thread.
  (https://code.claude.com/docs/en/sub-agents)
- **Where to set it.** In a shell, or in `settings.json` under `env` (the
  sub-agents page shows an example with value 2). When the same variable is set in
  the shell and in a settings `env` block, the settings value applies in most
  sessions; the exceptions are listed under the settings reference's `env` entry,
  which was not read. (env-vars page, "precedence"; sub-agents page)
- **Workflow agents.** Agents that other features run, such as workflow agents,
  follow their own limits (sub-agents page); a workflow runs at most 16 agents at
  once and 1,000 per run. Resuming a subagent by id with `SendMessage` is
  documented for ordinary subagents; for a workflow the docs describe only
  relaunching the run, which replays saved results.
  (https://code.claude.com/docs/en/workflows, "Behavior and limits", "Resume
  after a pause")
- **Cloud sessions.** The cloud pages do not mention this variable. Environment
  variables are read into ordinary environment variables, except `OTEL_*`; no page
  lists names that are refused. The platform sets some variables that an
  environment value does not override (the web page's example is
  `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`).
  (https://code.claude.com/docs/en/claude-code-on-the-web,
  https://code.claude.com/docs/en/cloud-environments)

The installed binary agrees on the default: its reader takes the environment
value, else a feature flag, else 3 (`strings` on `/opt/claude-code/bin/claude`).

## What the tests showed

1. **The `1` comes from the launcher.** `env | grep SPAWN_DEPTH` printed `1`, and
   so did `/proc/<pid>/environ` of the `claude` process and of its parent
   `environment-manager task-run`. Nothing matched in `/etc/profile*`,
   `/etc/profile.d`, `~/.bashrc`, `/root/.ccr` or `~/.claude`. At that time the
   session's environment had no stored variables, so `1` was a platform default.
2. **A stored environment variable did not override it.** After the owner stored
   the variable in the cloud environment (they report the value `2`; the tool
   shows names only), a session created afterwards still had `1` in `env` and in
   the parent processes it could read.
3. **A settings entry did.** With `"CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH": "2"` in
   `.claude/settings.json` on a branch, a session started on that branch printed
   `2`. Its launcher's own value could not be read (pid 1: permission denied).
   The entry was a test and is not in the repo.
4. **A plain subagent nests one level at depth 2.** A general-purpose subagent
   reported an `Agent` tool and started a child without refusal; the child
   reported no `Agent` tool (self-reported).
5. **Workflow agents had no `Agent` tool.** One Workflow ran four `agent()` calls
   at depth 2: default options, `agentType: 'claude'`, `agentType:
   'general-purpose'` and `disallowedTools: ['WebFetch']`. All options were
   accepted. Every agent reported no `Agent` or `Task` tool and `SPAWN_DEPTH=2`,
   and their loaded tool lists were identical (56 names, compared by script from
   the run journal). `disallowedTools` did not remove `WebFetch` from the list
   (ignored, or it affects only the loaded list: unverified). An earlier
   one-agent Workflow gave the same answer. Against a plain subagent's list the
   workflow agents lack only `Agent` among the loaded tools (both lists
   self-reported).
6. **Resume.** Workflow agents are not addressable by label: `SendMessage` to a
   label failed with "No agent named ... is reachable", and `ListAgents` never
   listed them. By raw id (the journal line
   `{"type":"started","agentId":...,"label":...}` under
   `~/.claude/projects/<project>/<session>/subagents/workflows/<run id>/`),
   `SendMessage` from the main session resumed the agent: asked for "the secret
   word backwards and 17*23" it answered `RESUMED-OK 247-MULP 391` (self-reported;
   70,560 tokens, 1 tool use, 2.4 s), so it took a real new turn with its earlier
   context. A workflow agent could also read the journal and message a sibling's
   id; the sibling answered (`509-IWIK 144`) but the reply reached the main
   session, not the sender, so a script cannot wait for it inside the run. One
   resume reply repeated the agent's earlier report instead of the requested
   line; unexplained. Re-running the same script with `resumeFromRunId` returned
   identical output from cache (0 tokens, 12 ms).

## The Agent SDK route (docs only; nothing run)

- A driver script can define a builder in `agents` with `Agent` in its `tools`;
  the depth variable applies and is set through the SDK `env` option.
  (https://code.claude.com/docs/en/agent-sdk/subagents)
- Resume is documented through the parent: keep the `session_id` and the `agentId`
  from the Agent tool result, then call `query()` again with `resume: sessionId`
  and ask to resume that agent; `SendMessage` by id also resumes. A direct
  driver-side call to a subagent id is not documented. (same page; sub-agents page)
- Authentication: the quickstart documents an API key (or Bedrock, Vertex,
  Foundry); the authentication page documents `CLAUDE_CODE_OAUTH_TOKEN` for CI and
  scripts, tied to a subscription plan. Whether that token may be used for an
  own-use SDK script, and how it counts against limits, is not documented.
  (https://code.claude.com/docs/en/agent-sdk/quickstart,
  https://code.claude.com/docs/en/authentication)
- In a cloud session: `api.anthropic.com` and the package registries are in the
  default allowed domains, but the authentication page says cloud sessions use
  subscription OAuth and ignore an `ANTHROPIC_API_KEY` set in the environment.
  Whether a child SDK process there gets a usable credential is undocumented.
- Omitting `settingSources` loads user, project and local settings, CLAUDE.md,
  rules, skills and hooks as the CLI does (agent-sdk/claude-code-features). The
  `Workflow` tool is available in the TypeScript SDK from v0.3.149
  (agent-sdk/subagents).

## Not known

- Why the stored environment variable did not apply (its value is not visible),
  and which names the platform refuses.
- Whether the missing `Agent` tool in workflow agents depends on anything other
  than being a workflow agent; only the `agent()` options in test 5 were tried.
- Whether a resumed workflow agent would deliver its reply to a sender that is
  still running.
- The exceptions to "settings `env` beats the shell" for this variable.
