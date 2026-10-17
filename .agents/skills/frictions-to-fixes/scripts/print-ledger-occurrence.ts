// Prints a Friction Ledger occurrence block for a session's friction, copied
// from the log the way `layers/journal/tests/unit/ledger-content.spec.ts`
// checks it (whitespace-normalised text, the session's UTC start date), so the
// `frictions-to-fixes` survey never retypes it.
//
// Usage:
//   tsx .agents/skills/frictions-to-fixes/scripts/print-ledger-occurrence.ts
//     <session> <index> [<session> <index> ...]
//   `index` is the friction's position in the log's `frictions` list, as
//   `extract-frictions.ts --compact` prints it. Output is ready to paste under
//   a cluster's `occurrences:`.
import { Document, Scalar } from 'yaml'
import { flattenText } from '../../../../scripts/session/extract-frictions.ts'
import { readSessionLogs } from '../../../../scripts/session/journal-files.ts'
import { root, runIfMain } from '../../../../scripts/lib/cli.ts'

export function occurrenceBlock(log: Record<string, unknown>, index: number): string {
  const frictions = Array.isArray(log.frictions) ? log.frictions : []
  const fr = frictions[index]
  if (!fr) throw new Error(`${log.session} has no friction ${index} (${frictions.length} logged)`)
  const occ = {
    session: String(log.session),
    date: String(log.startedAt).slice(0, 10),
    severity: String(fr.severity),
    description: flattenText(fr.description),
    solution: flattenText(fr.solution),
  }
  const doc = new Document([occ])
  for (const key of ['date', 'description', 'solution']) (doc.getIn([0, key], true) as Scalar).type = Scalar.QUOTE_DOUBLE
  return doc.toString({ lineWidth: 0 }).replace(/^(?=.)/gm, '  ')
}

function main(): void {
  const argv = process.argv.slice(2)
  if (argv.length === 0 || argv.length % 2) throw new Error('usage: tsx .agents/skills/frictions-to-fixes/scripts/print-ledger-occurrence.ts <session> <index> [<session> <index> ...]')
  const logs = new Map(readSessionLogs(root, { archived: true }).map(({ data }) => [String(data.session), data]))
  for (let i = 0; i < argv.length; i += 2) {
    const log = logs.get(argv[i]!)
    if (!log) throw new Error(`no session log for ${argv[i]}`)
    process.stdout.write(occurrenceBlock(log, Number(argv[i + 1])))
  }
}

runIfMain(import.meta.url, main)
