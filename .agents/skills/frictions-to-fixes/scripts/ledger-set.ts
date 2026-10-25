// Edits one Friction Ledger entry so no agent hand-edits its YAML: sets
// `status` and `ref`, appends or replaces `fixes`, appends occurrence blocks
// as `print-ledger-occurrence.ts` prints them. Refuses a result the ledger
// schema rejects; the file's other content and comments stay as written.
//
// Usage:
//   tsx .agents/skills/frictions-to-fixes/scripts/ledger-set.ts <entry>
//     [--status open|tracked|on-trial|accepted] [--ref TEXT]
//     [--fix <pr> <YYYY-MM-DD> <summary>]... [--replace-fixes]
//     [--occurrences <file>|-]
//   `<entry>` is the file name without `.yml`. `--fix` appends, oldest first;
//   with `--replace-fixes` (needs at least one `--fix`) the given fixes
//   replace the stored ones. `-` reads the occurrence blocks from stdin.
//   `print-ledger-occurrence.ts --append` files blocks under their entries
//   itself, through `setEntry`.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { isMap, isScalar, isSeq, parseDocument, Scalar, type Document } from 'yaml'
import { frictionClusterSchema } from '../../../../layers/journal/tenant.config.ts'
import { LEDGER_DIR } from '../../../../scripts/session/extract-frictions.ts'
import { fail, root, runIfMain } from '../../../../scripts/lib/cli.ts'

export interface Fix { pr: number; date: string; summary: string }

export interface LedgerChanges {
  status?: string
  ref?: string
  fixes?: Fix[]
  replaceFixes?: boolean
  /** Occurrence blocks as `print-ledger-occurrence.ts` prints them. */
  occurrences?: string
}

const FIELD_ORDER = Object.keys(frictionClusterSchema.shape)

/** Sets `key`, placing a new one in the schema's field order, as entries are written. */
function put(doc: Document, key: string, value: unknown): void {
  const map = doc.contents
  if (!isMap(map) || map.has(key)) return doc.set(key, value)
  const at = map.items.findIndex((p) => FIELD_ORDER.indexOf(String(isScalar(p.key) ? p.key.value : p.key)) > FIELD_ORDER.indexOf(key))
  map.items.splice(at < 0 ? map.items.length : at, 0, doc.createPair(key, value))
}

function append(doc: Document, key: string, items: unknown[], replace = false): void {
  const seq = doc.get(key, true)
  if (isSeq(seq) && !replace) seq.items.push(...items)
  else put(doc, key, doc.createNode(items))
}

function fixNode(doc: Document, fix: Fix) {
  const node = doc.createNode(fix)
  for (const key of ['date', 'summary']) (node.get(key, true) as Scalar).type = Scalar.QUOTE_DOUBLE
  return node
}

/** The entry's new text; throws when the result fails the ledger schema. */
export function setEntry(text: string, changes: LedgerChanges): string {
  const doc = parseDocument(text)
  if (changes.status !== undefined) put(doc, 'status', changes.status)
  if (changes.ref !== undefined) put(doc, 'ref', changes.ref)
  if (changes.replaceFixes && !changes.fixes?.length) throw new Error('--replace-fixes needs at least one --fix')
  if (changes.fixes) append(doc, 'fixes', changes.fixes.map((f) => fixNode(doc, f)), changes.replaceFixes)
  if (changes.occurrences !== undefined) {
    const blocks = parseDocument(changes.occurrences).contents
    if (!isSeq(blocks)) throw new Error('occurrences: expected the list print-ledger-occurrence.ts prints')
    append(doc, 'occurrences', blocks.items)
  }
  const result = frictionClusterSchema.safeParse(doc.toJS())
  if (!result.success) throw new Error(`schema refuses the result:\n${result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`)
  return doc.toString({ lineWidth: 0 })
}

export function parseArgs(argv: string[]): { entry: string; changes: LedgerChanges } {
  const [entry, ...rest] = argv
  if (!entry || entry.startsWith('--')) throw new Error('usage: ledger-set.ts <entry> [--status S] [--ref TEXT] [--fix <pr> <date> <summary>]... [--replace-fixes] [--occurrences <file>|-]')
  const changes: LedgerChanges = {}
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i]
    const value = () => {
      const v = rest[++i]
      if (v === undefined) throw new Error(`${flag} needs a value`)
      return v
    }
    if (flag === '--status') changes.status = value()
    else if (flag === '--ref') changes.ref = value()
    else if (flag === '--replace-fixes') changes.replaceFixes = true
    else if (flag === '--occurrences') {
      const src = value()
      changes.occurrences = readFileSync(src === '-' ? 0 : src, 'utf8')
    } else if (flag === '--fix') {
      const pr = Number(value())
      const date = value()
      changes.fixes = [...(changes.fixes ?? []), { pr, date, summary: value() }]
    } else throw new Error(`unknown flag ${flag}`)
  }
  return { entry, changes }
}

function main(): void {
  try {
    const { entry, changes } = parseArgs(process.argv.slice(2))
    const path = join(root, LEDGER_DIR, `${entry}.yml`)
    writeFileSync(path, setEntry(readFileSync(path, 'utf8'), changes))
    console.log(`ledger-set: updated ${path}`)
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}

runIfMain(import.meta.url, main)
