# ADR-0017: Every agent write names the session that made it

Agents act on GitHub through the owner's own account, so GitHub cannot tell
an agent's post from the owner's. Every agent write to GitHub, git or any
other outside system therefore names the session that made it. A GitHub body
opens with a one-line header; a commit ends with a two-line trailer.

## Scope

- **What it covers.** Issues, PR descriptions, comments, reviews, and every
  commit, including session-log commits and commits made through the GitHub
  API tools. A write with no text, such as a label change, carries nothing.
- **The mark names this session.** A link to another session is a wrong
  mark, so a body copied from another session gets a new header. A local
  session has no claude.ai/code link, so its mark carries its raw session id
  where a cloud session's carries `session_<id>`. The model name is optional;
  the session log records it.
- **GitHub bodies are blocked without the header.** The tool-call guard
  denies a write through the MCP tools, or through `gh api` or `curl` in a
  shell command, that lacks this session's header, has it in another shape,
  or cannot be checked.
- **The header alone marks a post as written by an agent.** It needs no
  further notice.
- **Local commits are repaired; API commits are blocked.** The commit hook adds
  or corrects the trailer. If the hook fails, the commit goes through unmarked,
  so agents check that the trailer landed. The guard blocks a commit made through
  the GitHub API tools without the trailer, since no local hook sees those.
- **Reading is wider than writing.** Code that asks "did an agent write
  this?" also accepts the old two-line footer and the Claude Code tool's own
  "Generated with Claude Code" line, which agents leave in place. A bare
  session link in prose does not count. No mark means a human wrote it.

## Why

The login and `author_association` show the owner for every agent write, so
agents misread who did what, and pipelines that skip their own earlier
comments need another way to find them. A mark in the content is the one
signal every reader can check. One rule covers every write, because each
narrower rule is one more gap to remember.

Prose versions of this rule were missed again and again, even by sessions
that had read them. So the guard blocks, and its deny message teaches the
format at the moment of the mistake. A commit hook can fix the message
itself, so blocking local commits would buy nothing, and a hook bug would stop
all work.

## Rejected alternatives

- **A separate bot account** (issue #124). It fixes the login fields at the
  source, but GitHub access is a managed connection set up outside this repo,
  and each kind of session would need re-pointing. Set aside, not ruled out.
- **A footer at the end of GitHub bodies.** It competes with the Claude Code
  tool's own footer for the last line, and agents drop it.
- **Accept any shape that names the session.** Agents invented shapes that
  readers could not rely on.
- **Let the guard add a missing header instead of blocking.** A tool-call
  hook can rewrite its call, but a rewrite that goes wrong posts in public and
  can't be taken back, while a block costs one retry. And a silent fix teaches
  nothing, so agents would never learn the format.
- **A check in the gate.** The gate sees the repo, not what was posted.

## When to revisit

- A separate bot account becomes possible for every kind of session (#124).

## Consequences

- Old posts are never rewritten, so code that finds agent posts must keep
  accepting every mark ever written, or it reads old agent posts as human.
- The guard reads a shell command's text, not the shell running it, so a
  `gh api` or `curl` write it cannot see (inside a script, say) goes
  unchecked. Agents write through the MCP tools, which it always sees.

## See

- `scripts/lib/provenance-header.ts`: the header and which marks count
  (`hasAuthorshipMarker`).
- `scripts/hooks/github-provenance-guard.ts`: the checked tool calls and the deny
  messages.
- `scripts/session/commit-trailer.ts` and `.githooks/commit-msg`: the trailer and
  its hook; `scripts/session/log-session.ts` builds it on session-log commits.
- `docs/agents/github-integration.md`, `docs/agents/git-conventions.md`: the
  traps agents hit when writing.
