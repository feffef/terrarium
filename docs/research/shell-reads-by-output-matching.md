# Deriving `docsReadViaShell` from command output instead of command text

Can the shell-read detector behind `docsReadViaShell` (ADR-0009's shell-read
amendment, `scripts/shell-reads.ts`) stop parsing the Bash command string and
instead credit an instruction doc when lines of that doc appear in the
command's own `tool_result`? And would that close the SHELL-READ-DETECTION
frictions the Journal has accumulated, or only trade them for new ones?

**Measured 2026-10-03** on this checkout, with a throwaway script committed as
`aa86e131` (`scripts/shell-reads-by-output.prototype.ts`, reverted in the
following commit; `git show aa86e131:scripts/shell-reads-by-output.prototype.ts`
to read it). Numbers below are that run's output, not inferred.

## The corpus

42 session logs carry the marker, holding 39 frictions. Four mention it in
passing. The other 35 reduce to the shapes below; the corpus replays one
verbatim command per shape (29 cases), plus ten decoys that print doc-like
text without reading an instruction doc (`cat CLAUDE.md`, the detector's own
spec and source, a Skill Inventory entry, the prune-trials ledger, Journal
pages, `git log`). Where the record says the command printed nothing, the
replay feeds the harness's empty-output placeholder instead of today's output,
because the file has since changed or appeared.

Three derivations were scored against what each friction said should have
happened:

- **landed** — `extractTrace`, the value that lands in the Journal today.
- **advisory** — `shellReadScanOf`, the glob- and `cd`-aware scan that
  `log-session --author` prints for the agent to check.
- **output** — the prototype: an index of every instruction doc's trimmed
  lines of at least 30 characters, keeping only lines unique across all docs
  (and absent from `CLAUDE.md`/`README.md`); a doc is credited when one such
  line appears in a Bash result, after stripping the prefixes `grep -n`,
  multi-file grep, `cat -n`, unified diff and plain `diff` add. One variant
  also credits a doc whose own path prefixes an output line (`path:12:`).

## Results

| Method | Pass | Fails |
|---|---|---|
| landed | 24/40 | every glob and `for` shape, `cd` shapes, the empty-output `cat` |
| advisory | 33/40 | `for` over a glob (#1542), `cd` shapes (#1482), empty-output `cat`, `||` flip side |
| output, 30-char lines | 38/40 | historical `git show <old-sha>:path`, a 24-char grep fragment |
| output, 40-char lines | 38/40 | same two |
| output, two lines required | 34/40 | too strict: single-line grep hits go uncredited |
| output + path-prefix signal | 39/40 | historical `git show <old-sha>:path` only |
| output + Journal content as sinks | 38/40 | same as 30-char; only 11 doc lines are shared with `layers/` content |

All ten decoys pass under every output variant: no decoy credited any doc.

A live check over this session's own transcript (parser versus matcher on
real commands, not the corpus) agreed on four docs. The parser alone credited
three more: a `diff` whose left-hand file contributed no lines, a grep whose
only hit was a 24-character fragment, and one that was a race in the probe
itself (the result had not been written yet; it matches 10 lines once it has).

## What the numbers settle

- **The landed value and the advisory disagree.** `extractTrace` calls the
  scanner with no glob resolver and applies no `cd` resolution, so the fixes
  for #1246 and #1454 reach only the printout the agent is asked to verify,
  never the committed field. Seven glob frictions were "fixed" for the report
  and are still missed in the Journal.
- **The `cd` fix sits after the shape test.** `cd docs/agents && cat guards.md`
  is credited by neither path: `guards.md` alone fails the instruction-doc
  shape test and is dropped before the `cd` prefix is applied (#1482's open
  half).
- **Output matching is command-agnostic by construction.** Globs, variables,
  loops, subshells, `cd`, `git show`/`diff`/`log -p`, pipes and `||`
  fallbacks stop being cases, because none of them changes what text reached
  the session. A zero-output command can never be credited, which closes the
  `cat` of a missing file and the `||` tension in one move.
- **Its residual misses are bounded and visible.** A doc read from history
  (`git show <old-sha>:path`) whose lines no longer exist in the checkout, and
  a read that showed fewer than 30 characters of the doc. Both are the kind
  of read the field was never precise about.
- **The path-prefix signal is worth keeping.** It is still output-only
  evidence and recovers the short-fragment case for multi-file grep.

## Costs and open questions

- The index needs the repo checkout. The advisory already injects a
  filesystem-backed glob resolver at author time (#1246), and the landing hook
  runs in the same checkout, so the same injection pattern applies. ADR-0009
  calls the trace "derived from `tool_use` calls, not results"; the grep
  output-gating of #1247 already reads results, so this widens an existing
  exception rather than opening a new one. It should be recorded as an
  ADR-0009 amendment, not left implicit.
- A doc edited between two derivations of the same session can change the
  result, which touches ADR-0009's superset and byte-identity premises for
  the idempotent re-derive. Pinning the index to the session's start commit
  would remove that, at the cost of a `git show` per doc.
- The index is ~10,800 lines over 133 docs, built from the checkout at author time;
  no new dependency.
- Line uniqueness is global across docs, so a doc that quotes another doc
  verbatim credits only the one whose lines are unique. The decoy set found
  no case where this mattered.

## Recommendation

Adopt output matching as the single derivation of `docsReadViaShell`, keep the
path-prefix signal, keep the command parser only to produce the near-miss
advisory (it explains *why* a command was not credited, which the matcher
cannot), and fix the landed-versus-advisory divergence in the same change so
both paths derive one value. Treat the two residual misses as accepted limits
and say so in `log-session/SKILL.md`'s shell-read section. Whether to proceed
is a human call (ADR-0003: net-new on green-light).
