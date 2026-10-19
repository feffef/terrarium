# Raw session data sources beyond `list_events`

Date: 2026-10-19 · Issue: feffef/terrarium#2294 · Claude Code 2.1.303, cloud session (`entrypoint: remote_mobile`)

**Question.** Besides the `claude-code-remote` MCP tools, which sources give raw
data (transcript events, tool calls, subagent activity) from *another* Claude Code
session, especially another cloud session? Can a Bash or `tsx` script read them
without MCP?

**Short answer.** No documented source lets a script in one cloud session read
another session's raw transcript. A script can read only its own session's local
JSONL. The other routes need one of three things: the MCP tool, a credential that
belongs to the CLI, or a mirror that *we* write while the source session is still
alive (a `SessionEnd`/`Stop` hook that archives its own transcript somewhere
durable).

## Comparison

| Source | Covers subagents / workflow agents / rule loads / images | Another session reachable from a cloud session? | Script without MCP? | Auth | Cost |
|---|---|---|---|---|---|
| HTTP API behind `claude-code-remote` (`https://api.anthropic.com/v2/ccr-sessions/-/meta/mcp`) | Same as `list_events`, which shows no workflow agents (past session logs) | Yes, through the MCP tool | Not tested. It needs the CLI's worker bearer credential, and the auto-mode classifier blocked even reading how that credential is sourced | Worker credential plus `X-Session-UUID` and `X-MCP-Server-ID` headers | Free. Through the model, every result costs context |
| Own local transcript `~/.claude/projects/<cwd>/<id>.jsonl` plus `subagents/*.jsonl` and `subagents/workflows/<run>/` | All of them: subagents, workflow agents, `nested_memory` rule loads, hook context, images when sent | **No.** Only this session's files exist, and container reclaim deletes them | Yes (`scripts/session/transcript-trace.ts`) | Filesystem | Free, and nothing enters context |
| Our session logs `layers/journal/content/*/sessions/*.yml` | A derived summary only: tool counts, files read and edited, skills, rules loaded, subagents. No raw events | Yes, for every logged session on `main` | Yes (git, YAML) | Repo read | Free |
| `claude --teleport <id>` / `teleport-events` endpoint | "Full conversation history" of the cloud session | In principle. It needs a claude.ai sign-in for the same account | Not as a read-only call: it checks out the session's branch and needs a clean tree. Not tested | claude.ai OAuth | Free, but it changes git state |
| `claude -p --resume <id>` / Agent SDK `getSessionMessages()` | Main messages plus subagent messages, tagged with `parent_tool_use_id` | No. Same machine only | Yes | Local | Free to read. `-p --resume` runs a model turn |
| Agent SDK `sessionStore` | Whatever the SDK mirrors | Only for sessions the SDK itself launches, not for the harness-run cloud session | Yes | Our backend | Our storage |
| Remote Control / cross-session messaging (`SendMessage`, `ListAgents`) | Text messages only, never history | Lists cloud sessions only from a session connected to Remote Control | No. These are model tools; the inbox socket only *receives* | claude.ai sign-in | Model turns |
| OpenTelemetry (`OTEL_LOGS_EXPORTER`, `OTEL_LOG_TOOL_DETAILS`, …) | `tool_result`, `tool_decision`, `api_request` (with `query_source` set to a subagent name), `skill_activated`. Tool output appears only in traces. Rule loads and images: not listed in the part of the page we read | Yes, if every session exports to one collector we can query | Yes, against our own collector | Collector credential kept in server-managed settings | A collector to run. Configured per org or per environment |
| claude.ai data export | "Conversation data". The docs don't say whether Claude Code sessions are included | Manual, by email | No | Human sign-in | Manual |

## Findings

### HTTP API behind the `claude-code-remote` MCP server
- The server is an HTTP MCP server at `/v2/ccr-sessions/-/meta/mcp`, named
  `claude-code-remote`. The CLI builds it with headers `X-MCP-Server-ID`,
  `X-Session-UUID` and `anthropic-version`, and mounts it only
  "when the bridge exposes a worker credential" (`getBearerToken`). — verified:
  strings in `/opt/claude-code/bin/claude` 2.1.303.
- The server is not configured in `~/.claude.json` and there is no `.mcp.json`.
  It is injected at runtime through the bridge's `mcp_config`. — verified: read
  `~/.claude.json` keys with values redacted.
- `api.anthropic.com` is in the agent proxy's `noProxy`, so a script would reach
  it directly. — verified: `$HTTPS_PROXY/__agentproxy/status`.
- Env var names that look relevant: `CLAUDE_SESSION_INGRESS_TOKEN_FILE`,
  `SESSION_INGRESS_URL`, `CLAUDE_CODE_REMOTE_SDK_URL`
  (`…/v1/code/sessions/cse_…`). The token directory holds `.oauth_token` and
  `.session_ingress_token`. — verified: names and file listing only, no values
  read.
- **Not tested:** whether a script can call the endpoint with this session's
  credentials. The auto-mode classifier denied a strings search for how the
  bearer token is sourced ("Credential Exploration"), so I made no call with
  any token. Using a CLI-internal credential this way is undocumented, so treat
  it as unsupported even if it works. — verified (the denial).
- The CLI also calls `/v1/code/sessions/{id}/events`,
  `/v1/code/sessions/{id}/teleport-events` and `/v1/sessions/{id}/events`. None
  of these appear in the public docs. — verified: binary strings; assumption that
  they are internal.
- `claude mcp` offers add, get, list, login, logout, remove, serve and
  related setup commands. It has no subcommand that calls a tool. — verified:
  `claude mcp --help`.
- Large MCP results are written to a file next to the transcript
  (`tool-results/mcp-claude-code-remote-list_events-*.txt`), and the model sees
  only a preview. One MCP call followed by a script that greps the spilled file
  is therefore a real but partial way to save tokens: small results are not
  spilled. — verified: files in this session's directory.

### Local transcript JSONL
- Path: `~/.claude/projects/<cwd with non-alphanumerics as ->/<id>.jsonl`. The
  "entry format is internal … can break on any release". Default retention is 30
  days (`cleanupPeriodDays`). — from https://code.claude.com/docs/en/sessions.md
- In this container `projects/` holds exactly one session (this one) plus its
  `subagents/*.jsonl`, `*.meta.json` and `tool-results/`. `session-env/` also
  holds an empty directory dated 2026-10-13, which is an image leftover, not a
  transcript. — verified: `ls`.
- This session's own JSONL carries `attachment` records of type `nested_memory`
  (rule loads), `hook_additional_context`, `hook_success` and others. Subagent
  JSONLs carry the same record shapes. — verified: counted record types with
  `python3 -I`.
- `transcript-trace.ts` already unions `subagents/` and
  `subagents/workflows/<runId>/*.jsonl`, skipping the engine's `journal.jsonl`,
  and reads `nested_memory` attachments for rules. — verified: lines 561, 661–709.
- Another session's JSONL can be reached only if it is present on this
  filesystem: `--resume` searches local projects only ("Same machine only"), and
  sessions in one container can message each other but cannot read each other's
  history. — from https://code.claude.com/docs/en/agent-sdk/sessions and
  https://code.claude.com/docs/en/cross-session-messaging.md
- The docs name the supported way to preserve a transcript: "A `SessionEnd` hook
  can archive the transcript when a session ends" (`transcript_path` is in every
  hook payload). — from https://code.claude.com/docs/en/sessions.md

### Our session logs
- `scripts/session/log-session.ts --land` runs on `Stop` (only when a scratch
  file exists) and always on `SessionEnd`. It stitches the authored half with the
  derived trace and commits one YAML per session to `main`. — verified:
  `.claude/settings.json`, script header.
- A log holds fields (`docsRead`, `toolCounts`, `rulesLoaded`, `ruleVerdicts`,
  subagents, `frictions`), not raw events. It is the only cross-session record a
  script can already read today (about 1113 files). — verified: `find`, one log
  read.

### Teleport, `--cloud`, Remote Control
- `claude --teleport <id>` "fetches and checks out the branch … and loads the
  full conversation history". It needs a clean git state, the same repository
  and a claude.ai subscription sign-in. `claude -p "…" --cloud <id>` only
  *sends* a message. — from https://code.claude.com/docs/en/claude-code-on-the-web
- In this container `claude auth status` reports `loggedIn: true` and
  `authMethod: oauth_token`. Whether teleport accepts that token was not tested,
  because teleport would change git state. — verified (status); assumption
  (teleport).
- While Remote Control is connected, the transcript "is stored on Anthropic
  servers". It is reachable only through the claude.ai UI or app; the docs name
  no read API. — from https://code.claude.com/docs/en/remote-control
- Cross-session messages are "a piece of text … never the sender's conversation
  history". — from https://code.claude.com/docs/en/cross-session-messaging.md

### Agent SDK
- `listSessions()`, `getSessionInfo()` and `getSessionMessages(id, {limit,
  offset})` read local transcripts. Messages carry `parent_tool_use_id` and
  `parent_agent_id` for subagents, and only `user` and `assistant` types are
  returned (so no `nested_memory` attachments). — from
  https://code.claude.com/docs/en/agent-sdk/typescript (the first 100k
  characters of the page)
- `sessionStore` mirrors the transcripts of sessions the SDK runs to our own
  backend. — from https://code.claude.com/docs/en/agent-sdk/sessions

### OpenTelemetry
- Events include `user_prompt`, `assistant_response`, `tool_result` (sizes only),
  `tool_decision`, `api_request` (`query_source` = subagent name) and
  `skill_activated`. Tool input needs `OTEL_LOG_TOOL_DETAILS=1` (capped at about
  4K characters). Tool output appears only in traces with
  `OTEL_LOG_TOOL_CONTENT=1`. — from https://code.claude.com/docs/en/monitoring-usage
- In cloud sessions you configure it through server-managed settings or the
  environment's variables. Don't put a collector token in environment
  variables, and the collector host must be on the network allowlist. — same
  source.
- This container already sets `CCR_ENABLE_TRACING` and
  `CCR_OTLP_METRICS_INTERVAL_S`, which is Anthropic's own telemetry; nothing we
  can read. — verified: env var names; assumption about who receives it.

### claude.ai data export
- Settings > Privacy > Export sends a ZIP link by email that expires in 24h. It
  contains "conversation data". The article doesn't say whether Claude Code
  sessions are included, and no API is mentioned. — from
  https://support.claude.com/en/articles/9450526-how-can-i-export-my-claude-data

## Open questions
- Can a script call `/v2/ccr-sessions/-/meta/mcp` with the session's own worker
  credential, and is that allowed? It needs an explicit go-ahead from the owner
  first.
- Does teleported history include subagent and workflow JSONLs?
