// Prints a Friction Ledger occurrence block for a session's friction, copied
// from the log the way `layers/journal/tests/unit/ledger-content.spec.ts`
// checks it (whitespace-normalised text, the session's UTC start date), so the
// `frictions-to-fixes` survey never retypes it. With `--append` it also files
// each block under its entry, so no printed output is split by hand.
//
// Usage:
//   tsx .agents/skills/frictions-to-fixes/scripts/print-ledger-occurrence.ts
//     <session> <index> [<session> <index> ...]
//   tsx .agents/skills/frictions-to-fixes/scripts/print-ledger-occurrence.ts
//     --append <entry> <session> <index> [<entry> <session> <index> ...]
//   `index` is the friction's position in the log's `frictions` list, as
//   `extract-frictions.ts --compact` prints it. Without `--append`, output is
//   ready to paste under a cluster's `occurrences:`. With it, `<entry>` is the
//   ledger file name without `.yml`; the blocks are appended through
//   `ledger-set.ts`'s `setEntry`, so a result the schema rejects (a session
//   listed twice in one entry, say) is refused and nothing is written.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Document, Scalar } from 'yaml'
import { flattenText, LEDGER_DIR } from '../../../../scripts/session/extract-frictions.ts'
import { readSessionLogs } from '../../../../scripts/session/journal-files.ts'
import { fail, root, runIfMain } from '../../../../scripts/lib/cli.ts'
import { setEntry } from './ledger-set.ts'

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

export interface FrictionRef { session: string; index: number }

type Logs = Map<string, Record<string, unknown>>

function parseIndex(session: string, raw: string | undefined): number {
  const index = Number(raw)
  if (!Number.isInteger(index) || index < 0) throw new Error(`${session}: index must be a whole number, got ${raw}`)
  return index
}

function blockFor(logs: Logs, { session, index }: FrictionRef): string {
  const log = logs.get(session)
  if (!log) throw new Error(`no session log for ${session}`)
  return occurrenceBlock(log, index)
}

/** `--append` arguments grouped by entry, in first-seen order. */
export function groupTriples(argv: string[]): Map<string, FrictionRef[]> {
  if (argv.length === 0 || argv.length % 3) throw new Error('usage: print-ledger-occurrence.ts --append <entry> <session> <index> [<entry> <session> <index> ...]')
  const groups = new Map<string, FrictionRef[]>()
  for (let i = 0; i < argv.length; i += 3) {
    const [entry, session] = [argv[i]!, argv[i + 1]!]
    groups.set(entry, [...(groups.get(entry) ?? []), { session, index: parseIndex(session, argv[i + 2]) }])
  }
  return groups
}

/** Each entry's new text with its blocks appended; throws before any write when one fails. */
export function appendPlan(groups: Map<string, FrictionRef[]>, logs: Logs, readEntry: (entry: string) => string): Map<string, string> {
  const plan = new Map<string, string>()
  for (const [entry, refs] of groups) {
    try {
      plan.set(entry, setEntry(readEntry(entry), { occurrences: refs.map((ref) => blockFor(logs, ref)).join('') }))
    } catch (err) {
      throw new Error(`${entry}: ${err instanceof Error ? err.message : String(err)}`, { cause: err })
    }
  }
  return plan
}

function readLogs(): Logs {
  return new Map(readSessionLogs(root, { archived: true }).map(({ data }) => [String(data.session), data]))
}

function main(): void {
  const argv = process.argv.slice(2)
  try {
    if (argv[0] === '--append') {
      const groups = groupTriples(argv.slice(1))
      const entryPath = (entry: string) => join(root, LEDGER_DIR, `${entry}.yml`)
      const plan = appendPlan(groups, readLogs(), (entry) => readFileSync(entryPath(entry), 'utf8'))
      for (const [entry, text] of plan) {
        writeFileSync(entryPath(entry), text)
        console.log(`print-ledger-occurrence: appended ${groups.get(entry)!.length} to ${entry}`)
      }
      return
    }
    if (argv.length === 0 || argv.length % 2) throw new Error('usage: tsx .agents/skills/frictions-to-fixes/scripts/print-ledger-occurrence.ts <session> <index> [<session> <index> ...]')
    const logs = readLogs()
    for (let i = 0; i < argv.length; i += 2) {
      const session = argv[i]!
      process.stdout.write(blockFor(logs, { session, index: parseIndex(session, argv[i + 1]) }))
    }
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}

runIfMain(import.meta.url, main)
