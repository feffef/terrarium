# The commit-trailer guard (issue #921)

The single home for the `PreToolUse` guard that denies a `git commit` whose
message text hand-writes the ADR-0017 provenance trailer
(`scripts/commit-trailer-guard.ts`, pre-filtered by
`scripts/commit-trailer-guard.sh`, wired in `.claude/settings.json`).

## Why

The trailer is landed for the agent twice over (harness template, then
`.githooks/commit-msg`), yet four sessions hand-typed it anyway from memory —
#921 has the dates and quotes. Nothing intervened at authoring time, and both
existing mechanisms hide the mistake: the commit-msg hook discards its output
and exits 0, so its correction is silent (and `computeFooterAction` returns
`noop` when a hand-typed value happens to be right); the session-id check runs
post-hoc at teardown and is non-fatal.

So the guard removes the choice at call time rather than wording the rule a
fifth time — the shape `.out-of-scope/ci-enforced-doc-invariants.md` endorses
over a gate step. It is **preventive**; the commit-msg hook stays the
**backstop** and keeps failing open (ADR-0017). Neither #710 nor #797 changes.

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
- **Which patterns.** The co-author half reuses `COAUTHOR_TRAILER`
  (`scripts/provenance-footer.ts`), pinned to the `noreply@anthropic.com`
  address so a human co-author line never trips it; only the pattern *text* is
  shared, since the guard re-flags it case-insensitive. The session half matches
  the trailer **key** alone — broader than `SESSION_TRAILER`
  (`scripts/git-helpers.ts`), because typing the line at all is the mistake and
  a memory-recalled id is exactly the malformed case; the spec pins containment
  between them.
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

### Known false-positive shapes, accepted

The guard reads a command string, not a parsed shell AST, so three shapes are
denied that aren't real commits. Each was observed, not guessed, and each has a
workaround.

1. **Writing a file *about* this guard through Bash** — a heredoc whose body
   carries both an example `git commit` and an example trailer. Bit the code
   review of this change. Use the Write tool, which CLAUDE.md prefers over `cat`
   anyway. Same reason `--dry-run` needs `--input-file`: a denying `--input`
   can't be passed inline, because that Bash call is itself denied.
2. **A commit message that *discusses* the trailer** — `git commit -m "fix:
   Claude-Session: handling"` is denied, because the session half matches the
   bare key while the co-author half needs the address. That asymmetry is
   deliberate: a hand-typed session trailer's failure mode is its *value*.
   Reword, or use `-F`.
3. **Commit-then-read in one chain** — `git commit … && git log | grep
   Claude-Session`. Split it into two calls.

## Merging

ADR-0004's 2026-07-30 amendment makes an unattended hook **human-only to
merge**, as `loop-only-tool-guard.md` records for its sibling; this one will not
auto-merge.

It does close that doc's open residual, though: whether `PreToolUse` actually
intercepts in this cloud environment (neither sibling's authoring session could
watch its own hook, since hooks load at session start). This guard was **observed
firing live on the `Bash` matcher, in the session that authored it** — two probe
commands carrying trailer text were denied and nothing ran. Ordering against the
harness's own handling for *other* matchers stays unobserved.

## Exercising it by hand

```
# allow — inline is fine, the command carries no trailer
tsx scripts/commit-trailer-guard.ts --dry-run --tool Bash \
    --input '{"command":"git commit -m \"fix: a real message\""}'

# deny — write the payload with the Write tool first (see shape 1), then:
tsx scripts/commit-trailer-guard.ts --dry-run --tool Bash --input-file <path>
```

`--dry-run` prints `{ tool, decision, kinds, reason }` and **never emits a hook
control object** — including on a bad `--input-file`, which exits 1 rather than
falling through to the hook path's fail-closed deny.

Unit tests: `tests/unit/commit-trailer-guard.spec.ts` (pure core, CLI,
pre-filter, `--dry-run` — ADR-0004's reviewability bar for an unattended hook).
