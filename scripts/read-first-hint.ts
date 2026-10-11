// A hint, not a guard (issue #1754): CLAUDE.md's action-bound "read first"
// triggers are prose, and sessions read the doc after the action. At the first
// matching git or GitHub call this adds one line pointing to the doc, alongside
// that call's result (PostToolUse, and PostToolUseFailure for a failed call).
// It cannot stop the first call. Once per doc per agent context: silent when the
// transcript shows the doc read (Read tool, or a shell read the session trace
// recognises) or already holds the pointer. A subagent dedupes against its own
// transcript beside its parent's; if that is missing it points anyway. A missing
// main transcript adds nothing, since every call would repeat the pointer.
// Fails open: any error adds nothing. `scripts/read-first-hint.sh` is the Bash
// hot-path pre-filter.
//
// Usage:
//   tsx scripts/read-first-hint.ts                # hook payload on stdin
//   tsx scripts/read-first-hint.ts --dry-run (--input '<payload json>' | --input-file <path>)
//     (with no transcript_path, the dry run assumes an empty transcript)
import { readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { printDryRunResult, prop, readTranscript, resolveDryRunInput, runIfMain } from './guard-io.ts'
import { extractTrace, subagentTranscript } from './session-trace.ts'
import { buildDocLineIndex, commandWords } from './shell-reads.ts'

export interface ReadFirst {
  doc: string
  /** CLAUDE.md's wording of the trigger, quoted in the pointer. */
  trigger: string
  tool?: RegExp
  /** One segment's words, verb first. */
  bash?: (words: string[]) => boolean
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const verb =(words: string[]) => basename(words[0] ?? '')

/** git's subcommand: the first word after its global options. */
function gitSubcommand(words: string[]): string | undefined {
  for (let i = 1; i < words.length; i++) {
    const w = words[i]!
    if (w === '-C' || w === '-c') i++
    else if (!w.startsWith('-')) return w
  }
}

export const READ_FIRST: ReadFirst[] = [
  {
    doc: 'docs/agents/git-conventions.md',
    trigger: 'Before your first git command',
    bash: (w) => verb(w) === 'git' && !['status', 'diff', undefined].includes(gitSubcommand(w)),
  },
  {
    doc: 'docs/agents/github-integration.md',
    trigger: 'Before your first GitHub operation',
    tool: /^mcp__github__/,
    bash: (w) => verb(w) === 'gh',
  },
]

export function triggeredDocs(tool: string, command: unknown): ReadFirst[] {
  const segs = tool === 'Bash' && typeof command === 'string' ? commandWords(command) : []
  return READ_FIRST.filter((r) => r.tool?.test(tool) || (r.bash && segs.some(r.bash)))
}

const pointer = (r: ReadFirst) => `Read first: \`${r.doc}\` (CLAUDE.md: "${r.trigger}").`

/** The docs this transcript already read or was pointed to. */
function seen(records: Record<string, unknown>[], docs: ReadFirst[]): Set<string> {
  const index = buildDocLineIndex(docs.map((r) => ({ path: r.doc, text: readFileSync(join(ROOT, r.doc), 'utf8') })))
  const trace = extractTrace(records, process.env, index)
  const read = [...trace.filesRead, ...trace.docsReadViaShell]
  const hinted = records
    .map((r) => r.attachment as { type?: string; content?: unknown } | undefined)
    .filter((a) => a?.type === 'hook_additional_context')
    .flatMap((a) => [a!.content].flat())
    .filter((c) => typeof c === 'string')
    .join('\n')
  return new Set(docs.filter((r) => read.some((p) => p === r.doc || p.endsWith(`/${r.doc}`)) || hinted.includes(pointer(r))).map((r) => r.doc))
}

function hintFor(payload: unknown, dryRun = false): string | null {
  const docs = triggeredDocs(String(prop(payload, 'tool_name')), prop(prop(payload, 'tool_input'), 'command'))
  if (docs.length === 0) return null
  const parent = prop(payload, 'transcript_path')
  const agent = prop(payload, 'agent_id')
  let records: Record<string, unknown>[] | null
  if (typeof parent !== 'string') records = dryRun && parent === undefined ? [] : null
  else if (agent === undefined) records = readTranscript(parent)
  else records = readTranscript(subagentTranscript(parent, String(agent))) ?? []
  if (!records) return null
  const skip = seen(records, docs)
  const fresh = docs.filter((r) => !skip.has(r.doc))
  return fresh.length ? fresh.map(pointer).join('\n') : null
}

function main(): void {
  const payload: unknown = JSON.parse(readFileSync(0, 'utf8'))
  const hint = hintFor(payload)
  if (!hint) return
  const event = prop(payload, 'hook_event_name') === 'PostToolUseFailure' ? 'PostToolUseFailure' : 'PostToolUse'
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: hint } }))
}

function dryRun(argv: string[]): void {
  printDryRunResult({ hint: hintFor(resolveDryRunInput(argv), true) })
}

runIfMain(import.meta.url, { main, dryRun, label: 'read-first hint', ref: 'issue #1754', failOpen: true })
