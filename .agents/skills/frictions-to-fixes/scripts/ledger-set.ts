// Creates or edits one Friction Ledger entry so no agent hand-edits its YAML:
// sets `summary`, `cause`, `surface`, `status` and `ref`, appends `notes` lines, appends or replaces `fixes`,
// appends occurrence blocks as `print-ledger-occurrence.ts` prints them.
// Refuses a result the ledger schema rejects; the file's other content and
// comments stay as written.
//
// Usage:
//   tsx .agents/skills/frictions-to-fixes/scripts/ledger-set.ts <entry>
//     [--create] [--summary TEXT] [--cause TEXT] [--surface S]
//     [--status open|tracked|on-trial|accepted] [--ref TEXT | --clear-ref]
//     [--note TEXT]... [--fix <pr> <YYYY-MM-DD> <summary>]... [--replace-fixes]
//     [--occurrences <file>|-]
//   `<entry>` is the file name without `.yml`. `--create` writes a new entry
//   (status `open` unless `--status` says otherwise) and refuses an existing
//   one; without it, `--summary`, `--cause` and `--surface` replace the stored
//   text. `--clear-ref` (or `--ref ''`) removes `ref`. Each `--note` appends one
//   line to `notes`, newest last. `--fix` appends, oldest first;
//   with `--replace-fixes` (needs at least one `--fix`) the given fixes
//   replace the stored ones. `-` reads the occurrence blocks from stdin, e.g.
//   piped from print-ledger-occurrence.ts.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Document, isMap, isScalar, isSeq, parseDocument, Scalar } from 'yaml'
import { frictionClusterSchema } from '../../../../layers/journal/tenant.config.ts'
import { LEDGER_DIR } from '../../../../scripts/session/extract-frictions.ts'
import { fail, root, runIfMain } from '../../../../scripts/lib/cli.ts'

export interface Fix { pr: number; date: string; summary: string }

export interface LedgerChanges {
  status?: string
  ref?: string
  fixes?: Fix[]
  replaceFixes?: boolean
  /** Lines appended to `notes`, oldest first. */
  notes?: string[]
  /** Occurrence blocks as `print-ledger-occurrence.ts` prints them. */
  occurrences?: string
  /** Replaces these fields on an existing entry. */
  fields?: EntryFields
  /** Writes a new entry instead of editing one; the schema refuses a missing field. */
  create?: EntryFields
}

export interface EntryFields { summary?: string; cause?: string; surface?: string }

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
  if (isSeq(seq) && !replace) {
    seq.items.push(...items)
    seq.flow = false
  } else put(doc, key, doc.createNode(items))
}

function fixNode(doc: Document, fix: Fix) {
  const node = doc.createNode(fix)
  for (const key of ['date', 'summary']) (node.get(key, true) as Scalar).type = Scalar.QUOTE_DOUBLE
  return node
}

/** The entry's new text; throws when the result fails the ledger schema. */
export function setEntry(text: string, changes: LedgerChanges): string {
  const doc = parseDocument(text)
  for (const [key, value] of Object.entries(changes.fields ?? {})) {
    const node = new Scalar(value)
    const old = doc.get(key, true)
    if (isScalar(old)) node.type = old.type
    put(doc, key, node)
  }
  if (changes.status !== undefined) put(doc, 'status', changes.status)
  if (changes.ref === '') doc.delete('ref')
  else if (changes.ref !== undefined) put(doc, 'ref', changes.ref)
  if (changes.notes?.length) {
    if (changes.notes.some((n) => n.includes('\n'))) throw new Error('--note takes one line')
    const old = doc.get('notes')
    const notes = new Scalar([...(typeof old === 'string' && old ? [old] : []), ...changes.notes].join('\n'))
    notes.type = Scalar.BLOCK_LITERAL
    put(doc, 'notes', notes)
  }
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

/** Applies `changes` to `<dir>/<entry>.yml`, or writes it new with `create`; writes nothing on a refusal. */
export function writeEntry(dir: string, entry: string, changes: LedgerChanges): void {
  const path = join(dir, `${entry}.yml`)
  if (changes.create && existsSync(path)) throw new Error(`${entry} already exists`)
  const text = changes.create ? new Document({ name: entry, ...changes.create, status: 'open', occurrences: [] }).toString() : readFileSync(path, 'utf8')
  writeFileSync(path, setEntry(text, changes))
}

export function parseArgs(argv: string[]): { entry: string; changes: LedgerChanges } {
  const [entry, ...rest] = argv
  if (!entry || entry.startsWith('--')) throw new Error('usage: ledger-set.ts <entry> [--create] [--summary TEXT] [--cause TEXT] [--surface S] [--status S] [--ref TEXT|--clear-ref] [--note TEXT]... [--fix <pr> <date> <summary>]... [--replace-fixes] [--occurrences <file>|-]')
  const changes: LedgerChanges = {}
  const fields: EntryFields = {}
  let create = false
  const setRef = (ref: string) => {
    if (changes.ref !== undefined) throw new Error('ref given twice (--ref, --clear-ref)')
    changes.ref = ref
  }
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i]!
    const value = () => {
      const v = rest[++i]
      if (v === undefined) throw new Error(`${flag} needs a value`)
      return v
    }
    if (flag === '--status') changes.status = value()
    else if (flag === '--ref') setRef(value())
    else if (flag === '--clear-ref') setRef('')
    else if (flag === '--note') changes.notes = [...(changes.notes ?? []), value()]
    else if (flag === '--create') create = true
    else if (flag === '--summary' || flag === '--cause' || flag === '--surface') fields[flag.slice(2) as keyof typeof fields] = value()
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
  if (create) changes.create = fields
  else if (Object.keys(fields).length) changes.fields = fields
  return { entry, changes }
}

function main(): void {
  try {
    const { entry, changes } = parseArgs(process.argv.slice(2))
    writeEntry(join(root, LEDGER_DIR), entry, changes)
    console.log(`ledger-set: ${changes.create ? 'created' : 'updated'} ${join(LEDGER_DIR, `${entry}.yml`)}`)
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}

runIfMain(import.meta.url, main)
