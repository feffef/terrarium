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
  `noreply@anthropic.com` address so a human co-author line never trips it.
  Only the *pattern text* is shared: the guard re-flags it case-insensitive
  (git trailers conventionally render as `Co-authored-by`), so the two are
  deliberately not flag-identical — what cannot drift is the address pin and
  the shape, not the casing. The session half matches the trailer **key**
  alone — deliberately broader than `SESSION_TRAILER`
  (`scripts/git-helpers.ts`), which requires the well-formed URL shape: typing
  the line at all is the mistake, and a malformed id recalled from memory is
  exactly the case worth refusing. There the spec *does* pin containment —
  anything `SESSION_TRAILER` matches also trips the guard — so those two cannot
  disagree.
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
denied that aren't real commits. All three were observed or probed, not guessed;
none blocks work that has no workaround.

1. **Writing a file *about* this guard through Bash.** A heredoc
   (`cat > f <<'EOF' … EOF`) whose body contains both an example `git commit`
   and an example trailer line is denied — the guard cannot tell an example from
   an invocation. This bit the code review of this very change. **Workaround:
   use the Write tool**, which CLAUDE.md already prefers over shelling out to
   `cat` anyway. Authoring this doc and
   `tests/unit/commit-trailer-guard.spec.ts` is the main population of this
   shape, and both were written that way.
   **Corollary — probing the guard from Bash.** A `--dry-run` whose `--input`
   carries a denying command inline is itself a denied Bash call, so inline JSON
   cannot express the inputs most worth probing. That is why `--dry-run` takes
   `--input-file`: write the payload with the Write tool, pass the path.
2. **A commit message that legitimately *discusses* the trailer.** The session
   half matches the bare key, so `git commit -m "fix: Claude-Session: handling"`
   is denied even though it hand-writes no trailer. The asymmetry is deliberate
   — the co-author half needs the `noreply@anthropic.com` address, the session
   half doesn't — because a hand-typed session trailer's whole failure mode is
   that its *value* is wrong. Reword the subject, or commit with `-F`.
3. **Commit-then-read in one chain.** `git commit -m "x" && git log | grep
   Claude-Session` is denied. Split it into two calls.

## Merging

ADR-0004's 2026-07-30 amendment makes a hook that runs unattended **human-only
to merge**, exactly as `loop-only-tool-guard.md` records for its sibling. This
one will not auto-merge. The pure-core / hook-I/O split and `--dry-run` keep the
reviewable surface small.

**One thing the sibling guards left open is now answered.**
`deferred-tool-guard.md` and `loop-only-tool-guard.md` both record, as an
unresolved residual, whether `PreToolUse` actually intercepts a call in this
cloud environment — neither authoring session could watch its own hook, since
hooks load at session start. This guard was **observed firing live, on the
`Bash` matcher, in the session that authored it**: two probe commands carrying
trailer text were denied with the guard's own message and nothing ran. So the
matcher works for `Bash` at least; what remains unobserved is only ordering
against the harness's own handling for *other* matchers.

## Exercising it by hand

An **allowing** input can go inline; a **denying** one must go through
`--input-file`, for the reason in shape 1 above.

```
# allow — inline is fine, the command carries no trailer
tsx scripts/commit-trailer-guard.ts --dry-run --tool Bash \
    --input '{"command":"git commit -m \"fix: a real message\""}'

# deny — write the payload with the Write tool first, then:
tsx scripts/commit-trailer-guard.ts --dry-run --tool Bash --input-file <path>
```

`--dry-run` prints `{ tool, decision, kinds, reason }` and **never emits a hook
control object** — including on a bad `--input-file`, which exits 1 with a plain
error rather than falling through to the fail-closed deny the hook path uses.

Unit tests: `tests/unit/commit-trailer-guard.spec.ts` (pure core, CLI,
pre-filter, `--dry-run` — the ADR-0004 reviewability bar for an unattended
hook).
