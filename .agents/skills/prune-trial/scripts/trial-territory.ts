// Says which open Prune Trial covers a file or word (ADR-0027), so a session
// edits no text an open trial owns. Reads the ledger from origin/main so a
// stale branch does not hide a newly merged trial.
//   tsx .agents/skills/prune-trial/scripts/trial-territory.ts <path-or-word>...
import { git } from '../../../../scripts/lib/git.ts'
import { root, runIfMain } from '../../../../scripts/lib/cli.ts'
import { parseTrials, type Trial } from './find-trial-window.ts'

export interface Hit {
  problem: string
  entry: string
  opened: string
}

export function matchTerritory(trials: Trial[], input: string): Hit[] {
  const hits: Hit[] = []
  const word = input.toLowerCase()
  for (const t of trials) {
    const territory = (t.territory ?? {}) as { paths?: string[]; keywords?: string[] }
    const found =
      (territory.paths ?? []).find((entry) => {
        const path = entry.split(':')[0]!.trim()
        return input === path || input.startsWith(path.replace(/\/?$/, '/'))
      }) ?? (territory.keywords ?? []).find((k) => word.includes(k.toLowerCase()))
    if (found) hits.push({ problem: t.problem.trim().slice(0, 100), entry: found, opened: t.opened })
  }
  return hits
}

function main(): void {
  const trials = parseTrials(git(['show', 'origin/main:.agents/prune-trials.yml'], root))
  for (const input of process.argv.slice(2)) {
    const hits = matchTerritory(trials, input)
    console.log(`${input}: ${hits.length ? '' : 'none'}`)
    for (const h of hits) console.log(`  ${h.problem}\n  covers: ${h.entry} (opened ${h.opened})`)
  }
}

runIfMain(import.meta.url, main)
