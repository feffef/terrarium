# Reading cloud session transcripts with the claude-code-remote tools

What do the read-only `claude-code-remote` MCP tools (`list_sessions`,
`get_session`, `list_events`, `get_event`) return, and where are their limits?
(Issue #2293.)

**Measured 2026-10-19** with about 30 live calls from a cloud subagent (Claude Code
2.1.303) on real sessions of this account. Each claim is tagged with where it comes from:
*live* (a call made for this note, named), *doc* (the tool's own description
or a named file), or *assumption*. No public code.claude.com page documents
these tools. `read_documentation` from the same server has no page on them
(*live*: its index lists github, connectors, environment, session and
remote_control pages only). `docs/agents/github-integration.md` §"Reading
another session's transcript" calls them undocumented.

## Response shapes

- Every response is `{"ccr": {...}}`. `list_events` gives `data[]`,
`first_id`, `last_id` and `has_more`. **`has_more` is left out, not set to
`false`, when the whole session fits in the page** (*live*: `list_events`
on session_01Hseqbm2PXoYLAfQeFuew6m, limit 100).
- Each event is `{created_at, <kind>: {uuid, internal_anthropic_catchall: {...}}}`.
The text sits under `internal_anthropic_catchall.message.content[]`, never
at the top level (*live*). Kinds without a key of their own come as a bare
`internal_anthropic_catchall` with a `type` such as `active_goal`,
`autocompact_state`, `queued_notification` or `prompt_suggestion` (*live*).
- `get_event` returns the same event object, wrapped as a one-item `data[]`
with `first_id = last_id`. It does not return the flattened "role, content,
isSynthetic, inbound_origin" its description promises (*live*:
`get_event` fc2141f8… on session_01Jej4qtE56V9dtLCNobJ39K).
- `get_session` returns about 1.5–2.5k characters: title, status,
`status_bucket`, created/updated times, `origin` (`android`,
`web_claude_ai`, `scheduled_trigger`), tags, `post_turn_summary`, model
fields and `external_metadata.usage` (cost and tokens). `list_sessions`
returns the same record for each session, at about 1.5k characters each
(*live*).
- Responses about other sessions arrive inside an
`<other-session nonce=… untrusted="true">` wrapper. Two `list_events` calls
on this session's own parent session came back without that wrapper
(*live*; why is an assumption: the caller's own session is not "other").
- Thinking blocks hold only a signature. Their `thinking` text is empty
(*live*, session_01Jej4…).
- `result` events (one per turn) carry the turn's final reply text in
`result`, its cost, `num_turns` and `subagent_stats`, at about 3k characters
each. `kinds:["result"]` is the cheapest way to see how every turn ended
(*live*: session_01Jej4… and session_01YWMTQ7ZdjaYab177AJNWXx).

## Paging and cursors

- With no cursor, `list_events` returns the **newest** `limit` events in
chronological order (*live* and *doc*). `before_id = first_id` walks toward
older events, and `after_id = last_id` walks toward newer ones (*live*).
- **No call starts at the oldest event.** A made-up cursor fails with
`Invalid after_id: …` (*live*: an all-zero uuid). To read from the start,
walk back to the oldest page first, then use `after_id` from its `first_id`
(*live*: on session_01Hseqbm…, `after_id` set to the oldest event's id
returned the next events with `has_more: true`).
- **`kinds` filters after the page is read.** `limit` still counts the
unfiltered events, and `first_id`/`last_id`/`has_more` describe the whole
page read (*doc*, confirmed *live*). Over 100 events, `kinds:["result"]`
returned 4 events and `kinds:["user"]` returned 5–15.
- **A `kinds` filter that matches nothing is a cheap cursor walk.**
`kinds:["keep_alive"]` returned about 150 characters per 100-event page,
cursors only (*live*: four pages on session_019e8Gy8cuUFcMzNkEYLfuP4 and
session_01Jej4…). The walk still costs one call per 100 events.
- **100 events cover only about 40 seconds to 8 minutes of a session.** On
session_01Jej4…, the newest 100 events spanned 21:23–21:41 and the 100
before them spanned 21:15–21:23. On a session running two subagents, 100
events spanned 42 s (*live*). A 2-hour, subagent-heavy session therefore
runs to dozens of pages (*assumption*, from those spans).
- Default `limit` is 20 and the maximum is 100 (*doc*).

## Page size by event kind

Measured on one unfiltered 100-event page of session_01Jej4… (*live*,
`list_events` limit 100, before_id b26ab57d…: 207,490 characters):

| kind | count | chars |
|---|---|---|
| assistant | 18 | 50,476 |
| control_response (init: full Skill and agent list) | 1 | 41,997 |
| user (tool results, Stop-hook feedback) | 10 | 40,028 |
| system:init | 3 | 27,159 |
| queued_notification | 4 | 15,861 |
| system:hook_response | 24 | 12,606 |
| result | 3 | 11,757 |
| system:hook_started | 24 | 7,812 |
| everything else (task_*, tool_progress, notification, …) | 13 | ~4,300 |

A page with two running subagents was 112,480 characters: 23 assistant
events (48k), 13 user events (41k) and 57 system events (*live*, parent
session_01XWMuHGcaNTvRPHfYb9T7z2). User and assistant events are about a third
of the events and about 45% of the characters. A resume/init block (one
`control_response` holding every Skill description, about 30–42k characters)
makes even a 5-event page about 30k characters (*live*: limit 5,
session_01Jej4…).

- **Parent user events carry each tool result twice**, once in
`message.content` and again in `tool_use_result` (stdout/stderr or text).
That doubles their size, for example 28,508 + 26,060 characters for one
result. Subagent user events carry no `tool_use_result` (*live*: page before
de2b3744… of session_01CtktRkpbF4wQ3TTQVYUqLz).
- **Images:** a screenshot-heavy session gave about 14 MB per page because of
base64 image blocks inside tool results (*from* the friction
`list-events-transcript-overflow`, session_01GVmwHZQthucdGcVwe3HAUL). Not
re-verified: the two pages read here from that session's screenshot run
(session_01Ctkt…, 11:33–11:37) fall after the screenshot phase and hold no
image blocks. The doubled tool result suggests each image is stored twice
in parent events (*assumption*).

## Subagents

- Agent-tool subagents' user and assistant events are interleaved with the
parent's in one stream. Each carries `agent_id`, `parent_tool_use_id` (the
parent's Agent `tool_use` id), `subagent_type` and `task_description`
(*live*, session_01XWMuHG…: two subagents, 36 events). Some
`permission_check_status` system events carry `agent_id` too. Hook events
(`hook_started`/`hook_response`) carry no `agent_id`, so they cannot be
attributed to a subagent (*live*).
- **No call reads one subagent on its own.** No parameter filters by
`agent_id`, so a reader must page everything and filter on the client
(*doc*: the parameter list).
- Events reach the transcript within seconds. This subagent read its own
tool results from about a minute earlier (*live*).
- An oversized tool result is stored as the harness's "saved to file"
message, not as the payload, so a reader sees what the model saw (*live*:
this subagent's 207k-character result appears in the parent's transcript as
the error text).

## What does and does not appear

- **Hook output does appear.** `system:hook_response` events carry `output`,
`stdout`, `stderr`, `exit_code` and `hook_name` (for example
`SessionStart:resume` and `PostToolUse:Bash`). Stop-hook feedback appears as
a synthetic user event (`isSynthetic: true`, text "Stop hook feedback: …")
(*live*, session_01Jej4…).
- **`nested_memory` rule loads:** the string occurs nowhere in three saved
pages (*live*, by grep). This supports earlier findings that rule loads
are invisible, but three pages do not prove it.
- **Workflow agents' calls do not appear** (*from* session_01AwaGncaYJFWdJnc6yqDoTS's
`post_turn_summary`, whose finding was posted on #2286; not re-verified here).

## Which sessions are visible

- `list_sessions` lists interactive sessions, newest first, cursor by
session id (*live*, limit 5).
- **Scheduled Routine runs** are left out of `list_sessions` (*doc*, not
verified by paging), but `get_session` and `list_events` work on them by id
(*live*: session_01YWMTQ7ZdjaYab177AJNWXx, `origin: scheduled_trigger`,
tags `routine:*`). Routine run ids are kept in
`layers/journal/content/current/routines/*.yml`.
- **Cowork:** `tags:["cowork-remote","cowork-local"]` fails with `tags filter
is not currently available` from an in-session caller (*live*). The
description says tags need an OAuth caller (*doc*).
- **Retention:** a session from 2026-07-04 (107 days old) still returns its
record and events (*live*: session_011Y8H9m3q94H3FMXkZMhztp). No limit is
documented.
- **Archived:** not tested; no archived session was found to probe.
- **Other accounts:** not testable from this personal account. The
description says personal accounts are already scoped to the owner (*doc*).
- An unknown id fails with `the requested resource was not found` (*live*).

## Rate limits, failures, speed

- About 30 calls in about 4 minutes hit no rate limit (*live*).
- "permission stream closed" never occurred in this run. Session logs from
July record it on `AskUserQuestion` and on this server's `send_later`
(session_01L3h7FzUR9QH7fLvztNmGJL). "Retry once" rests on those logs
(*from* session logs, 2026-07-10 to 07-13).
- **Speed:** one cursor-only page took at most about 9 s, measured between two
Bash timestamps that also include two model turns (*live*). A friction
records a subagent that skipped a 3.6-hour transcript as too slow to page
(*from* `list-events-transcript-overflow`).

## Keeping pages out of model context

- **The harness saves any oversized MCP result to a file.** A result of
89,700 characters or more came back as `Error: result (N characters across
M lines) exceeds maximum allowed tokens. Output has been saved to
/root/.claude/projects/<proj>/<session>/tool-results/mcp-claude-code-remote-list_events-<ms>.txt`.
Results of about 15k and 32k characters came back inline (*live*). The
cut-off is assumed to be Claude Code's MCP output token limit
(`MAX_MCP_OUTPUT_TOKENS`, default 25,000 tokens; *from* the Claude Code MCP
docs from memory, not re-fetched).
- The saved file is the raw response. Wrapped pages have 4 lines: header,
nonce line, the JSON, closing tag. Unwrapped pages are one JSON line. A
script finds `{"ccr"` and the last `}` and `json.loads` the span between
them (*live*: `analyze.py` in this run's scratchpad).
- **Pages between about 32k and about 90k characters land in context
untouched.** The tool has no way to force a save, and a 15k-character
`kinds:["user"]` page landed in full (*live*). To stay safe: use limit
100 with tight `kinds` (`result` about 3k characters per turn), or a
`kinds` value that matches nothing for cursor walks, and expect large
unfiltered pages to be saved to file.
