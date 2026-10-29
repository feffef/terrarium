// The per-session Friction rate a Prune Trial's verdict compares (§1, issue
// #2672): for each named Friction Ledger entry, the share of sessions that hit
// it before the trial landed and after. It prints rates, never a verdict.
//
// Both windows count only what the ledger can see. Before: the ledger horizon's
// start (older occurrences are pruned) to the landing. After: the landing to the
// start of the newest `frictions-to-fixes` survey whose ledger PR has merged,
// counting sessions that ended before it; a later session isn't surveyed yet
// and would read as a miss. Other PRs touch the ledger too, and a survey logs
// itself before its PR merges, so neither the last ledger commit nor the last
// survey log alone dates the cutoff.
//
// Usage:
//   tsx .agents/skills/prune-trial/scripts/friction-rates.ts <landed-ISO> <entry>...
//   `<landed-ISO>` is the `landed:` time find-trial-window.ts prints; `<entry>`
//   is a ledger file name without `.yml`.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { LEDGER_HORIZON_DAYS, ledgerWindowStart } from '../../../../layers/journal/app/utils/ledger.ts'
import { LEDGER_DIR, readSessions } from '../../../../scripts/session/extract-frictions.ts'
import { fetchOriginMain, git } from '../../../../scripts/lib/git.ts'
import { fail, root, runIfMain } from '../../../../scripts/lib/cli.ts'

export interface RateSession {
  id: string
  startedAt: string
  endedAt: string
  trigger: string
  prs: string[]
}

export interface Windows {
  beforeStart: number
  landed: number
  surveyCutoff: number
}

export interface Rate {
  hits: number
  sessions: number
}

/** The start of the newest survey run one of whose PRs merged a ledger change. */
export function surveyCutoff(sessions: RateSession[], ledgerPrs: Set<string>): number | null {
  const starts = sessions
    .filter((s) => s.trigger === 'frictions-to-fixes' && s.prs.some((pr) => ledgerPrs.has(pr)))
    .map((s) => Date.parse(s.startedAt))
  return starts.length ? Math.max(...starts) : null
}

export function rates(sessions: RateSession[], hitIds: Set<string>, w: Windows): { before: Rate; after: Rate } {
  const before = sessions.filter((s) => {
    const t = Date.parse(s.startedAt)
    return t >= w.beforeStart && t < w.landed
  })
  const after = sessions.filter(
    (s) => Date.parse(s.startedAt) >= w.landed && Date.parse(s.endedAt || s.startedAt) < w.surveyCutoff,
  )
  const rate = (set: RateSession[]): Rate => ({ hits: set.filter((s) => hitIds.has(s.id)).length, sessions: set.length })
  return { before: rate(before), after: rate(after) }
}

function format(r: Rate): string {
  return `${r.hits}/${r.sessions} (${r.sessions ? ((100 * r.hits) / r.sessions).toFixed(1) : '-'}%)`
}

/** PR numbers of the merges on `main` that changed the ledger. */
function ledgerPrs(): Set<string> {
  const subjects = git(['log', 'origin/main', '--first-parent', '--format=%s', '--', LEDGER_DIR], root)
  return new Set([...subjects.matchAll(/#(\d+)/g)].map((m) => m[1]!))
}

function main(): void {
  const [landedArg, ...entries] = process.argv.slice(2)
  const landed = Date.parse(landedArg ?? '')
  if (Number.isNaN(landed) || entries.length === 0) fail('usage: friction-rates.ts <landed-ISO> <entry>...')
  fetchOriginMain(root)
  const sessions = readSessions(root)
  const cutoff = surveyCutoff(sessions, ledgerPrs())
  if (cutoff === null || cutoff <= landed) {
    console.log('No frictions-to-fixes survey has reached main since the trial landed: no rates yet.')
    return
  }
  const today = new Date().toISOString().slice(0, 10)
  const beforeStart = Date.parse(`${ledgerWindowStart(today, LEDGER_HORIZON_DAYS)}T00:00:00Z`)
  const w: Windows = { beforeStart, landed, surveyCutoff: cutoff }
  const iso = (t: number) => new Date(t).toISOString()
  console.log(`before: ${iso(beforeStart)} to ${iso(landed)}${beforeStart >= landed ? ' (empty: landing is past the ledger horizon)' : ''}`)
  console.log(`after:  ${iso(landed)} to ${iso(cutoff)} (last survey on main)`)
  for (const name of entries) {
    const file = join(root, LEDGER_DIR, `${name}.yml`)
    if (!existsSync(file)) fail(`no ledger entry ${name}`)
    const occ = parseYaml(readFileSync(file, 'utf8'))?.occurrences
    const hitIds = new Set<string>((Array.isArray(occ) ? occ : []).map((o: { session: string }) => o.session))
    const r = rates(sessions, hitIds, w)
    console.log(`${name}  before: ${format(r.before)}  after: ${format(r.after)}`)
  }
}

runIfMain(import.meta.url, main)
