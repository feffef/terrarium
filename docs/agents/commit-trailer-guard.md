# The commit-trailer guard (issue #921)

The single home for the `PreToolUse` guard that denies a `git commit` whose
message text hand-writes the ADR-0017 provenance trailer
(`scripts/commit-trailer-guard.ts`, pre-filtered by
`scripts/commit-trailer-guard.sh`, wired in `.claude/settings.json`).

## Why

Commits need nothing from the agent: the harness's own commit-message template
emits the two-line `Co-Authored-By:`/`Claude-Session:` trailer, and
`.githooks/commit-msg` appends or corrects it repo-side when the template
doesn't fire. Agents hand-typed it anyway in four recorded sessions
(2026-08-07, 2026-08-08, 2026-08-10, and a fourth on 2026-08-12 filed *after*
the issue was opened), each time recalling the session id from memory.

Nothing intervened at authoring time, and the two mechanisms that exist both
make the mistake invisible:

- The commit-msg hook discards the footer script's output and exits 0
  unconditionally, so its correction is silent. `computeFooterAction` fixes a
  *mismatched* id (#710) and an *unrecognized* model name (#797), but returns
  `noop` when a hand-typed value happens to be correct — accepted, not
  corrected. Either way the agent learns nothing.
- `findSessionIdMismatches` (the session-id check) runs at teardown via the
  session-end lander, after the commit landed, and is deliberately non-fatal.

So the near-miss kept recurring. This guard removes the choice at call time
rather than wording the rule again — the same escalation the sibling guards
record, and the shape `.out-of-scope/ci-enforced-doc-invariants.md` explicitly
endorses over a gate step ("prefer a guard that refuses the bad action at the
point it is taken").

It is **preventive**; the commit-msg hook stays the **backstop** and keeps
failing open (ADR-0017). Neither #710 nor #797 changes.

## Mechanism

- **Matcher `Bash`, hot path pre-filtered.** `Bash` is the highest-frequency
  tool, so the hook entry is the `sh` pre-filter: it forwards to the tsx guard
  only when the payload textually mentions `Claude-Session:` or
  `Co-Authored-By:` (case-insensitive); everything else pays one `grep`.
- **Deny predicate.** A `Bash` call whose command contains a `git commit`
  invocation — allowing the global options that may sit between the two words
  (`-C <path>`, `-c <cfg>`, `--no-pager`) — and whose text *from that
  invocation onward* carries either trailer key. Scoping to the tail is what
  lets `grep -c Claude-Session log.txt && git commit -m "…"` through.
- **Which patterns.** The co-author half reuses the single-homed
  `COAUTHOR_TRAILER` (`scripts/provenance-footer.ts`), pinned to the
  `noreply@anthropic.com` address so a human co-author line never trips it,
  matched case-insensitively because git trailers conventionally render as
  `Co-authored-by`. The session half matches the trailer **key** alone —
  deliberately broader than `SESSION_TRAILER` (`scripts/git-helpers.ts`), which
  requires the well-formed URL shape: typing the line at all is the mistake,
  and a malformed id recalled from memory is exactly the case worth refusing.
  The spec pins containment (anything `SESSION_TRAILER` matches also trips the
  guard) so the two cannot drift into disagreement.
- **Fail closed, bounded.** An unparseable payload, a payload naming no tool,
  or a guard crash denies — and can't wedge ordinary Bash use, since the
  pre-filter never forwards those calls.

## Residual limits (fail-open by construction)

- **`git commit -F <file>`** — the message text lives in the file, not the
  command string, so the guard cannot see it. The commit-msg hook's #710/#797
  correction remains the backstop there. (`-F -` with an inline heredoc *is*
  covered, since the text is in the command.)
- **MCP-API commits** (`create_or_update_file` / `push_files`) bypass local git
  entirely; they are the GitHub provenance guard's registry, not this one.
- **Textual pre-filter** — a payload that carries the trailer in some
  re-encoded form the `grep` misses is never forwarded.
- **`|| true` invocation** — missing pnpm/tsx dies before the guard runs, as
  with the sibling guards.
- **Commits from inside repo scripts** (the session-log lander) don't pass
  through the Bash tool at all, so they are untouched by design.

Known false-positive shape, accepted: a command that commits *and then* reads a
trailer in the same chain (`git commit -m "x" && git log | grep
Claude-Session`) is denied. Split it into two calls.

## Exercising it by hand

```
tsx scripts/commit-trailer-guard.ts --dry-run --tool Bash \
    --input '{"command":"git commit -m \"x\n\nClaude-Session: session_01ABC\""}'   # deny
tsx scripts/commit-trailer-guard.ts --dry-run --tool Bash \
    --input '{"command":"git commit -m \"fix: a real message\""}'                  # allow
```

Unit tests: `tests/unit/commit-trailer-guard.spec.ts` (pure core, CLI,
pre-filter, `--dry-run` — the ADR-0004 reviewability bar for an unattended
hook).
