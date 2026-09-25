// Query the session-log corpus — current and archived — so a claim about it
// ("what share of docsRead entries are derived?") is one command, not another
// hand-rolled parser.
//
// Usage:  tsx scripts/corpus.ts [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--field <name>]
//   Prints one JSON line per session, oldest first: { session, date, file, value }.
//   `date` is the filename's (startedAt) date; `value` is the named top-level
//   field, or the whole log without --field. Logs lacking the field are skipped.
//   Pipe into `jq` for counts, e.g. `... --field ideas | jq -s 'map(.value | length) | add'`.
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { parse as parseYaml } from 'yaml'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const SESSION_DIRS = ['layers/journal/content/archived/sessions', 'layers/journal/content/current/sessions']

export interface SessionLog {
  file: string
  data: Record<string, unknown>
}

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

/** Keyed by filename so a log amended back into `current` after archiving
 *  (scripts/archive-journal-content.ts) counts once, as its `current` copy. */
function readLogs(cwd = root): SessionLog[] {
  const byName = new Map<string, SessionLog>()
  for (const dir of SESSION_DIRS) {
    for (const f of readdirSync(join(cwd, dir)).filter((f) => f.endsWith('.yml'))) {
      byName.set(f, { file: join(dir, f), data: parseYaml(readFileSync(join(cwd, dir, f), 'utf8')) ?? {} })
    }
  }
  return [...byName.values()]
}

function main(): void {
  const { values } = parseArgs({
    options: { since: { type: 'string' }, until: { type: 'string' }, field: { type: 'string' } },
  })
  for (const row of queryCorpus(readLogs(), values)) process.stdout.write(JSON.stringify(row) + '\n')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
