# ADR-0017: Every agent write names the session that made it

Agents act on GitHub through the owner's own account, so GitHub cannot tell
an agent's post from the owner's. Every agent write to GitHub, git or any
other outside system therefore names the session that made it, with no
exceptions. A GitHub body opens with a one-line header; a commit ends with a
two-line trailer.

## Scope

- **What it covers.** Issues, PR descriptions, comments, reviews, and every
  commit, including session-log commits and commits made through the GitHub
  API tools. A write with no text, such as a label change, carries nothing.
- **The mark names this session.** A link to another session is a wrong
  mark, so a body copied from another session gets a new header. The model
  name is optional; the session log records it.
- **GitHub bodies are blocked without the header.** The tool-call guard
  denies a write that lacks this session's header, has it in another shape,
  or cannot be checked.
- **Commits are repaired, not blocked.** The commit hook adds or corrects the
  trailer. If the hook fails, the commit goes through unmarked, so agents
  check that the trailer landed.
- **Reading is wider than writing.** Code that asks "did an agent write
  this?" also accepts the old two-line footer and the Claude Code tool's own
  "Generated with Claude Code" line, which agents leave in place. A bare
  session link in prose does not count. No mark means a human wrote it.

## Why

The login and `author_association` show the owner for every agent write, so
agents misread who did what, and pipelines that skip their own earlier
comments need another way to find them. A mark in the content is the one
signal every reader can check. No exceptions, because each narrower rule is
one more gap to remember.

Prose versions of this rule were missed again and again, even by sessions
that had read them. So the guard blocks, and its deny message teaches the
format at the moment of the mistake. A commit hook can fix the message
itself, so blocking commits would buy nothing, and a hook bug would stop all
work.

## Rejected alternatives

- **A separate bot account** (issue #124). It fixes the login fields at the
  source, but GitHub access is a managed connection set up outside this repo,
  and each kind of session would need re-pointing. Set aside, not ruled out.
- **A footer at the end of GitHub bodies.** It fought the Claude Code tool's
  own footer for the last line, and agents dropped it.
- **Accept any shape that names the session.** Agents invented shapes that
  readers could not rely on.
- **Let the guard add a missing header instead of blocking.** Nobody has
  shown that a tool-call hook can rewrite the call it checks.
- **A check in the gate.** The gate sees the repo, not what was posted.

## When to revisit

- A separate bot account becomes possible for every kind of session (#124).
- A tool-call hook can rewrite its call, so the guard could add the header.

## Consequences

- Old posts are never rewritten, so code that finds agent posts must keep
  accepting every mark ever written, or it reads old agent posts as human.
- The guard checks only the GitHub MCP tools; a write through `gh api` goes
  unchecked.

## See

- `scripts/provenance-header.ts`: the header and which marks count
  (`hasAuthorshipMarker`).
- `scripts/github-provenance-guard.ts`: the checked tool calls and the deny
  messages.
- `scripts/provenance-footer.ts` and `.githooks/commit-msg`: the trailer and
  its hook; `scripts/log-session.ts` builds it on session-log commits.
- `docs/agents/github-integration.md`, `docs/agents/git-conventions.md`: the
  traps agents hit when writing.
