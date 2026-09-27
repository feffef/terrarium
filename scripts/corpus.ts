// Query the session-log corpus — current and archived — so a claim about it
// ("what share of docsRead entries are derived?") is one command, not another
// hand-rolled parser.
//
// Usage:  tsx scripts/corpus.ts [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--field <name>]
//   Prints one JSON line per session, by date: { session, date, file, value }.
//   `date` is the filename's (startedAt) date; `value` is the named top-level
//   field, or the whole log without --field. Logs lacking the field are skipped.
//   Pipe into `jq` for counts, e.g. `... --field ideas | jq -s 'map(.value | length) | add'`.
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { readSessionLogs, type SessionLog } from './session-logs.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export interface CorpusQuery {
  since?: string
  until?: string
  field?: string
}

export interface CorpusRow {
  session: string
  date: string
  file: string
  value: unknown
}

export function queryCorpus(logs: SessionLog[], { since, until, field }: CorpusQuery): CorpusRow[] {
  const rows: CorpusRow[] = []
  for (const { file, data } of logs) {
    const date = file.split('/').pop()!.slice(0, 10)
    if ((since && date < since) || (until && date > until)) continue
    if (field && !(field in data)) continue
    rows.push({ session: String(data.session ?? ''), date, file, value: field ? data[field] : data })
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.file.localeCompare(b.file))
}

function main(): void {
  const { values } = parseArgs({
    options: { since: { type: 'string' }, until: { type: 'string' }, field: { type: 'string' } },
  })
  for (const row of queryCorpus(readSessionLogs(root, { archived: true }), values)) process.stdout.write(JSON.stringify(row) + '\n')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
