# Deriving `docsReadViaShell` from command output instead of command text

Can the shell-read detector behind `docsReadViaShell` (ADR-0009's shell-read
amendment, `scripts/shell-reads.ts`) stop parsing the Bash command string and
instead credit an instruction doc when lines of that doc appear in the
command's own `tool_result`? And would that close the SHELL-READ-DETECTION
frictions the Journal has accumulated, or only trade them for new ones?

**Measured 2026-10-03** on this checkout, with a throwaway script committed as
`aa86e131` (`scripts/shell-reads-by-output.prototype.ts`, reverted in the
following commit; `git show aa86e131:scripts/shell-reads-by-output.prototype.ts`
to read it). Every number in the results table is that script's printed
output; anything else that is a count over the logs or an ad-hoc probe says so.
The proposal that follows from it is issue #1545, not this note.

## The corpus

42 session logs carry the marker, holding 39 frictions. 29 of them became the
30 replay cases below (two frictions describe two commands each); the other
ten are listed afterwards with the reason each was left out. Ten decoys print
doc-like text without reading an instruction doc (`cat CLAUDE.md`, the
detector's own spec and source, a Skill Inventory entry, the prune-trials
ledger, Journal pages, `git log`). Where a record says the command printed
nothing, the replay feeds the harness's empty-output placeholder instead of
today's output, because the file has since changed or appeared.

| Case (log date, session prefix) | Shape | Direction |
|---|---|---|
| 09-09 01Lk7T | `git show <ref>:<path> \| grep` | miss |
| 09-12 019wQ8, 09-12 01GqyK, 09-13 01QmM7 (two commands), 09-14 017vEL, 09-22 01S3vB, 09-28 01LXTs, 10-01 01BNbm | single-match glob | miss |
| 09-14 017Tdz | `git show <sha> -- <path>` | miss |
| 09-15 015DSd | multi-match glob grep | miss |
| 09-23 01YWMT | `for` over literals | miss |
| 09-25 01QQyg | `diff a b` | miss |
| 09-29 01SYbi | `git log -p -- <path>` | miss |
| 09-30 01JJjn, 10-02 01VC6t, 10-02 01BXoQ | `for` over a glob, the last after `cd` | miss |
| 09-30 01UYR7 | `cd <dir> && cat a b c` | miss |
| 10-01 014aYT | `cat a 2>/dev/null \|\| cat b` | miss |
| 09-01 01EQQR | `wc -l` over globs | false positive |
| 09-12 01Dykm | `git merge` file list (simulated) | false positive |
| 09-13 01XhrV (two frictions), 09-25 01Aqnk, 09-25 01QQyg, 09-27 019yVY | grep with no output | false positive |
| 09-24 0198W2 | `sed <missing> 2>/dev/null \|\| ls` | false positive |
| 09-26 01YLyu | `cat <missing> 2>/dev/null \| head` | false positive |
| 09-27 0158Jc | relative path after `cd` | false positive |
| 09-28 01C1P9 | absolute path re-prefixed after `cd` | false positive |

Not replayed:

- Four frictions mention the marker in passing (09-12 01CgSD, two in
  09-12 01Dykm, 09-22 01C7aQ).
- Four report docs credited from a dispatched subagent's transcript or report
  text (09-05 016ahW, 09-08 01DAJK, 09-09 01MCTb, 09-10 012HBW). Folding
  subagent reads into the parent is by design (issue #796), so these are not
  detector errors. Output matching would fold them the same way, since it
  scans the same transcripts; it changes nothing about this class.
- 09-17 01Ura7 (`git diff <path>` on an uncommitted change) is fixed and has
  no working-tree diff to replay.
- 09-25 01QQyg's third friction has the same shape as its second.

Two cases (015DSd and 01XhrV's multi-file grep) are scored against an oracle
built from the output's own `path:line:` prefixes, which is close to what the
output method itself reads. They test the parser more than they test the
matcher.

Three derivations were scored against what each friction said should have
happened:

- **landed** — `extractTrace`, the value that lands in the Journal today.
- **advisory** — `shellReadScanOf`, the glob- and `cd`-aware scan that
  `log-session --author` prints for the agent to check.
- **output** — the prototype: an index of every instruction doc's trimmed
  lines of at least 30 characters, keeping only lines unique across all docs
  (and absent from `CLAUDE.md`/`README.md`); a doc is credited when one such
  line appears in a Bash result, after stripping the prefixes `grep -n`,
  multi-file grep, `cat -n`, unified diff and plain `diff`. One variant also
  credits a doc whose own path prefixes an output line (`path:12:`).

## Results

| Method (script config name) | Pass | Fails |
|---|---|---|
| landed | 24/40 | every glob case (including `for` over a glob), the three `cd` cases, the empty-output `cat` |
| advisory | 33/40 | multi-match glob grep, `for` over a glob (3, #1542), both `cd` cases (#1482), the empty-output `cat` |
| output, 30-char lines (`out k1 L30`) | 38/40 | historical `git show <old-sha>:path`, a 24-char grep fragment |
| output, 40-char lines (`out k1 L40`) and with Journal content as extra sinks (`out k1 L30 +layers`) | 38/40 | the same two |
| output + path-prefix signal (`out k1 L30 +prefix`) | 39/40 | historical `git show <old-sha>:path` only |

All ten decoys pass under every output variant: no decoy credited any doc. The
run indexed 133 docs and about 10,800 distinctive lines; adding the Journal
content as sinks removed only 11 of them. A variant requiring two matching
lines per doc was tried before the script was committed and dropped: it lost
single-line grep hits.

The `||` case passes under the advisory only because both sides name the same
file: the primary side is rejected as a fallback (#1327) and the fallback side
credits the same canonical path.

An ad-hoc probe over this session's own transcript, not part of the script,
compared parser and matcher on real commands. They agreed on four docs. The
parser alone credited three more: a `diff` whose left-hand file contributed no
output lines, a grep whose only hit was a 24-character fragment, and one that
was a race in the probe itself (the tool result had not been written yet; it
matches 10 lines once it has).

## What the numbers settle

- **The landed value and the advisory disagree.** `extractTrace` calls the
  scanner with no glob resolver and applies no `cd` resolution, so the fixes
  for #1246 and #1454 reach only the printout the agent is asked to verify,
  never the committed field. Eight glob cases from seven frictions pass the
  advisory and fail the landed scan.
- **The `cd` fix sits after the shape test.** `cd docs/agents && cat guards.md`
  is credited by neither path: `guards.md` alone fails the instruction-doc
  shape test and is dropped before the `cd` prefix is applied (#1482's open
  half).
- **Output matching is command-agnostic by construction.** Globs, variables,
  loops, subshells, `cd`, `git show`/`diff`/`log -p`, pipes and `||`
  fallbacks stop being cases, because none of them changes what text reached
  the session. A zero-output command can never be credited.
- **Its residual misses are two.** A doc read from history
  (`git show <old-sha>:path`) whose lines no longer exist in the checkout, and
  a read that showed fewer than 30 characters of the doc. The path-prefix
  signal recovers the second for multi-file grep.

## Costs

- The index needs the repo checkout. The advisory already injects a
  filesystem-backed glob resolver at author time (#1246), and the landing hook
  runs in the same checkout. ADR-0009 calls the trace "derived from `tool_use`
  calls, not results"; #1247's grep output-gating already reads results.
- A doc edited between two derivations of the same session can change the
  result, which touches ADR-0009's superset and byte-identity premises for
  the idempotent re-derive.
- Line uniqueness is global across docs, so a doc that quotes another doc
  verbatim credits only the one whose lines are unique. No decoy exercised
  this.
- No new dependency.

Whether to adopt this, and how to settle the ADR-0009 points above, is
issue #1545.
