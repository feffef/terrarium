// Ground truth for a Prune Trial's judging window (ADR-0027). §1 of the
// `prune-trial` Skill requires dating a trial's window from when its prune
// *landed on `main`* — never from `opened:`, which records when the ledger
// entry was written and is always earlier. That step was previously freehand
// prose ("run this git log command, read the date"): PR #1061 shows the
// failure mode — it judged the guards.md consolidation trial a day before its
// real landing-plus-three-days window closed, citing a landing commit
// (`d4c08f6`) that does not exist in this repository's history at all. This
// script makes the one fact that matters — the real landing commit and its
// timestamp — a single command's output to quote, not a date to derive by
// hand.
//
// "Landed" means: the earliest commit on `origin/main` whose diff introduces
// the trial's `problem:` text into `.agents/prune-trials.yml` — the same
// commit that ships the entry ships the prune (SKILL.md §5: "Write the
// trial's ledger entry as you prune, and commit it *with* the prune"). A
// `git log -S` pickaxe search for that exact text, oldest match first, finds
// it; `--reverse` is what makes the first hit the addition rather than some
// later touch.
//
// The reported window is a FLOOR, not a deadline: the earliest instant a
// judgment is valid, never a time a judgment is due. `/prune-trial` runs on a
// scheduled Routine, and a Routine's fire time carries no exact-timing
// guarantee — judging a trial some hours (or a day) after its window closes
// is normal and fine; judging it before is the one thing that's wrong. Don't
// read `closes:` below as something to hit precisely.
//
// Usage:
//   tsx scripts/prune-trial-window.ts                # every open trial in the ledger
//   tsx scripts/prune-trial-window.ts <problem-substr> # just the trial(s) whose
//                                                        # problem text contains this
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'
import { fetchOriginMain } from './git-helpers.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LEDGER_PATH = '.agents/prune-trials.yml'
const WINDOW_MS = 3 * 24 * 60 * 60 * 1000 // ADR-0027: "left standing for three days"

// ── Types ───────────────────────────────────────────────────────────────────

export interface Trial {
  problem: string
  opened: string
  [key: string]: unknown
}

export interface LandingCommit {
  hash: string
  isoCommitTime: string // UTC, "...Z"
}

export interface TrialWindow {
  trial: Trial
  /** null when no commit on origin/main ever introduced this exact text — the
   *  ledger's own header rule applies: "silence is not evidence: leave the
   *  entry alone and judge nothing." */
  landing: LandingCommit | null
  /** The earliest instant this trial may be judged — a floor, not a deadline.
   *  No scheduled Routine fires at a guaranteed exact time, so being judged
   *  any amount of time after this is expected and fine; only *before* it is
   *  the failure this whole script exists to prevent (PR #1061). */
  earliestJudgeableAtUtc: string | null
  judgeableNow: boolean
}

// ── Pure core (unit-tested) ────────────────────────────────────────────────

/** Parses the ledger's `trials:` list. The file's leading block is a `#`
 *  comment (this header included) — ordinary YAML, no special handling. */
export function parseTrials(yamlText: string): Trial[] {
  const doc = parseYaml(yamlText) as { trials?: Trial[] } | null
  return doc?.trials ?? []
}

/** `git log -S` matches literal bytes in the file, but YAML's `>` folded
 *  scalar joins every wrapped line with a single space when parsed — so a
 *  parsed `problem` string is *not* a substring of the raw file the moment it
 *  crosses a line wrap, and a `-S` search built from it silently finds
 *  nothing. Each entry's raw first content line (up to its own line break) is
 *  never wrapped, so it always IS a literal substring — use that as the
 *  search key instead. Returned in document order, matched to `parseTrials`'
 *  output by position (both walk the same `- problem: >` occurrences); if
 *  that pairing were ever to drift, the failure mode is a `-S` miss, i.e.
 *  "NOT FOUND" — the fail-safe direction (ADR-0027: "silence is not
 *  evidence"), never a false-positive judgeable window. */
export function rawProblemFirstLines(yamlText: string): string[] {
  const lines: string[] = []
  const re = /-\s*problem:\s*>\s*\n\s+(.+)\n/g
  let m: RegExpExecArray | null
  while ((m = re.exec(yamlText))) lines.push(m[1]!.trimEnd())
  return lines
}

/** True once `now` is at or past the floor (`landing + WINDOW_MS`) — never
 *  earlier. There's no matching upper bound to test: arriving late is not a
 *  failure this function needs to detect, since nothing guarantees a
 *  judging Routine runs at any particular time. Exported so the floor
 *  itself (exactly three days from landing, not "the third calendar date")
 *  is independently testable. */
export function isJudgeable(landingIsoUtc: string, now: Date): boolean {
  return now.getTime() >= Date.parse(landingIsoUtc) + WINDOW_MS
}

/** The floor from `isJudgeable`, as a timestamp to report — not a deadline a
 *  judging Routine needs to hit. */
export function earliestJudgeableAtUtc(landingIsoUtc: string): string {
  return new Date(Date.parse(landingIsoUtc) + WINDOW_MS).toISOString()
}

/** One trial paired with the literal raw-file text `findLandingCommit` will
 *  actually search for (see `rawProblemFirstLines`). */
export interface TrialWithSearchKey {
  trial: Trial
  searchKey: string
}

/** Picks which trials `buildWindows` should report on: every trial when
 *  `filterSubstr` is empty, otherwise only those whose `problem` contains it
 *  — case-sensitive, since `-S` search below is exact-text too. */
export function selectTrials(pairs: TrialWithSearchKey[], filterSubstr: string): TrialWithSearchKey[] {
  if (!filterSubstr) return pairs
  return pairs.filter((p) => p.trial.problem.includes(filterSubstr))
}

// ── Git shell (thin) ────────────────────────────────────────────────────────

const FIELD_SEP = '\x1f'

/** The earliest `origin/main` commit whose diff of `.agents/prune-trials.yml`
 *  introduces `problemText` — i.e. the commit that shipped this trial's entry
 *  (and, per the Skill's own commit discipline, the prune it records). `null`
 *  when no such commit exists yet. */
function findLandingCommit(problemText: string, cwd = root): LandingCommit | null {
  const out = execFileSync(
    'git',
    [
      'log',
      'origin/main',
      '--reverse',
      `--format=%H${FIELD_SEP}%cI`,
      `-S${problemText}`,
      '--',
      LEDGER_PATH,
    ],
    { cwd, encoding: 'utf8' },
  ).trim()
  if (!out) return null
  const [first = ''] = out.split('\n')
  const [hash = '', isoCommitTime = ''] = first.split(FIELD_SEP)
  if (!hash || !isoCommitTime) return null
  return { hash, isoCommitTime: new Date(isoCommitTime).toISOString() }
}

export function buildWindows(pairs: TrialWithSearchKey[], now = new Date(), cwd = root): TrialWindow[] {
  return pairs.map(({ trial, searchKey }) => {
    const landing = findLandingCommit(searchKey, cwd)
    return {
      trial,
      landing,
      earliestJudgeableAtUtc: landing ? earliestJudgeableAtUtc(landing.isoCommitTime) : null,
      judgeableNow: landing ? isJudgeable(landing.isoCommitTime, now) : false,
    }
  })
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function firstLine(text: string): string {
  return text.trim().split('\n')[0]!.slice(0, 72)
}

function formatWindow(w: TrialWindow): string {
  const label = `"${firstLine(w.trial.problem)}…" (opened: ${w.trial.opened})`
  if (!w.landing) {
    return `${label}\n  NOT FOUND on origin/main — do not judge; leave the entry alone.`
  }
  const verdict = w.judgeableNow ? 'JUDGEABLE' : 'not yet judgeable'
  return (
    `${label}\n` +
    `  landed:         ${w.landing.isoCommitTime}  (commit ${w.landing.hash})\n` +
    `  judgeable from: ${w.earliestJudgeableAtUtc}  (a floor — judging later than this is fine)\n` +
    `  ${verdict}`
  )
}

function main(): void {
  const filterSubstr = process.argv.slice(2).join(' ')
  fetchOriginMain(root)
  const yamlText = readFileSync(resolve(root, LEDGER_PATH), 'utf8')
  const trials = parseTrials(yamlText)
  const searchKeys = rawProblemFirstLines(yamlText)
  const pairs: TrialWithSearchKey[] = trials.map((trial, i) => ({ trial, searchKey: searchKeys[i] ?? trial.problem }))
  const selected = selectTrials(pairs, filterSubstr)
  if (selected.length === 0) {
    console.log(filterSubstr ? 'No open trial matches that text.' : 'No open trials.')
    return
  }
  for (const w of buildWindows(selected)) console.log(formatWindow(w) + '\n')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
