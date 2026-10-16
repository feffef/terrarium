// A hint, not a guard (issue #1754): CLAUDE.md's action-bound "read first"
// triggers are prose, and sessions read the doc after the action. At the first
// matching git, GitHub or screenshot call this adds one line pointing to the doc, alongside
// that call's result (PostToolUse, and PostToolUseFailure for a failed call).
// It cannot stop the first call, and the owner accepts that, so a closing line
// says a late read that clears the call is not a Friction (Friction Ledger
// `binding-docs-skipped`). Once per doc per agent context: silent when the
// transcript shows the doc read (Read tool, or a shell read the session trace
// recognises) or already holds the pointer. A subagent dedupes against its own
// transcript beside its parent's; if that is missing it points anyway. A missing
// main transcript adds nothing, since every call would repeat the pointer.
// After a successful `mcp__github__create_pull_request` in the main session it
// also says to invoke `close-session` now, until the transcript shows it invoked:
// prose alone left sessions logging only at the end (issue #1859).
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
import { extractTrace, hintText, subagentTranscript } from './session-trace.ts'
import { buildDocLineIndex, commandWords } from './shell-reads.ts'

interface ReadFirst {
  doc: string
  /** CLAUDE.md's wording of the trigger, quoted in the pointer. */
  trigger: string
  /** `segs`: each Bash segment's words, verb first; empty for other tools. */
  matches: (tool: string, segs: string[][]) => boolean
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const runs = (segs: string[][], name: string, ok = (_w: string[]) => true) => segs.some((w) => basename(w[0] ?? '') === name && ok(w))

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
    matches: (_t, segs) => runs(segs, 'git', (w) => !['status', 'diff', undefined].includes(gitSubcommand(w))),
  },
  {
    doc: 'docs/agents/github-integration.md',
    trigger: 'Before your first GitHub operation',
    matches: (tool, segs) => tool.startsWith('mcp__github__') || runs(segs, 'gh'),
  },
  {
    doc: 'docs/agents/verifying-ui-changes.md',
    trigger: 'Before you say a UI change works, or take a screenshot',
    // Run through tsx, the script path is a later word, not the verb.
    matches: (_t, segs) => segs.some((w) => w.some((x, i) => /(^|\/)screenshot\.ts$/.test(x) || (/(^|\/)preview\.ts$/.test(x) && ['shot', 'review'].includes(w[i + 1]!)))),
  },
]

export function triggeredDocs(tool: string, command: unknown): ReadFirst[] {
  const segs = tool === 'Bash' && typeof command === 'string' ? commandWords(command) : []
  return READ_FIRST.filter((r) => r.matches(tool, segs))
}

const pointer = (r: ReadFirst) => `Read first: \`${r.doc}\` (CLAUDE.md: "${r.trigger}").`

export const LATE_READ_NOTE = 'If the doc shows your call was already right, the late read is not a Friction.'

export const CLOSE_SESSION_HINT = 'PR opened: invoke the `close-session` Skill now for an in-review first log (CLAUDE.md); re-invoking it later is safe.'

/** The docs this transcript already read or was pointed to. */
function seen(records: Record<string, unknown>[], docs: ReadFirst[], trace: ReturnType<typeof extractTrace>): Set<string> {
  const read = [...trace.filesRead, ...trace.docsReadViaShell]
  const hinted = records
    .map((r) => r.attachment as { type?: string; content?: unknown } | undefined)
    .filter((a) => a?.type === 'hook_additional_context')
    .map((a) => hintText(a!.content))
    .join('\n')
  return new Set(docs.filter((r) => read.some((p) => p === r.doc || p.endsWith(`/${r.doc}`)) || hinted.includes(pointer(r))).map((r) => r.doc))
}

function hintFor(payload: unknown, dryRun = false): string | null {
  const tool = String(prop(payload, 'tool_name'))
  const docs = triggeredDocs(tool, prop(prop(payload, 'tool_input'), 'command'))
  const parent = prop(payload, 'transcript_path')
  const agent = prop(payload, 'agent_id')
  const prOpened = tool === 'mcp__github__create_pull_request' && agent === undefined
    && prop(payload, 'hook_event_name') !== 'PostToolUseFailure'
  if (docs.length === 0 && !prOpened) return null
  let records: Record<string, unknown>[] | null
  if (typeof parent !== 'string') records = dryRun && parent === undefined ? [] : null
  else if (agent === undefined) records = readTranscript(parent)
  else records = readTranscript(subagentTranscript(parent, String(agent))) ?? []
  if (!records) return null
  const index = buildDocLineIndex(docs.map((r) => ({ path: r.doc, text: readFileSync(join(ROOT, r.doc), 'utf8') })))
  const trace = extractTrace(records, process.env, index)
  const skip = seen(records, docs, trace)
  const lines = docs.filter((r) => !skip.has(r.doc)).map(pointer)
  if (lines.length) lines.push(LATE_READ_NOTE)
  if (prOpened && !trace.skillsUsed.includes('close-session')) lines.push(CLOSE_SESSION_HINT)
  return lines.length ? lines.join('\n') : null
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
