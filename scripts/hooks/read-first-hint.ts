// A hint, not a guard (issue #1754): the action-bound "read first" triggers in
// CLAUDE.md and the UI rule are prose, and sessions read the doc after the
// action. At the first matching git, GitHub or screenshot call this adds one line pointing to the doc, alongside
// that call's result (PostToolUse, and PostToolUseFailure for a failed call).
// It cannot stop the first call, and the owner accepts that, so a closing line
// says a late read that clears the call is not a Friction (Friction Ledger
// `binding-docs-skipped`). Once per doc per agent context: silent when the
// transcript shows the doc read (Read tool, or a shell read the session trace
// recognises), or already holds the pointer. A subagent dedupes against its own
// transcript beside its parent's; if that is missing it points anyway. A missing
// main transcript adds nothing, since every call would repeat the pointer.
// After a successful `mcp__github__create_pull_request` in the main session it
// also says to invoke `close-session`, unless the transcript shows it invoked
// after that PR call, so each PR gets it (issue #2209): prose alone left sessions
// logging only at the end (issue #1859).
// Fails open: any error adds nothing. `scripts/hooks/read-first-hint.sh` is the Bash
// hot-path pre-filter.
//
// Usage:
//   tsx scripts/hooks/read-first-hint.ts                # hook payload on stdin
//   tsx scripts/hooks/read-first-hint.ts --dry-run (--input '<payload json>' | --input-file <path>)
//     (with no transcript_path, the dry run assumes an empty transcript)
import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { printDryRunResult, prop, readHookPayload, readTranscript, resolveDryRunInput, runGuard } from './hook-io.ts'
import { agentTranscript, extractTrace, hintText } from '../session/transcript-trace.ts'
import { buildDocLineIndex, commandWords, gitSubcommandAt } from '../session/shell-reads.ts'
import { root } from '../lib/cli.ts'

interface ReadFirst {
  doc: string
  /** The instruction file that states the trigger. */
  source: string
  /** Its wording of the trigger, quoted in the pointer. */
  trigger: string
  /** `segs`: each Bash segment's words, verb first; empty for other tools. */
  matches: (tool: string, segs: string[][]) => boolean
}

const runs = (segs: string[][], name: string, ok = (_w: string[]) => true) => segs.some((w) => basename(w[0] ?? '') === name && ok(w))

const issueWrite = (tool: string, segs: string[][]) => tool === 'mcp__github__issue_write'
  || runs(segs, 'gh', (w) => w[1] === 'issue' && ['create', 'edit', 'close', 'reopen'].includes(w[2]!))

export const READ_FIRST: ReadFirst[] = [
  {
    doc: 'docs/agents/git-conventions.md',
    source: 'CLAUDE.md',
    trigger: 'Before your first git command',
    matches: (_t, segs) => runs(segs, 'git', (w) => !['status', 'diff', 'show', 'ls-tree', 'cat-file', undefined].includes(w[gitSubcommandAt(w)])),
  },
  {
    doc: 'docs/agents/github-integration.md',
    source: 'CLAUDE.md',
    trigger: 'Before your first GitHub operation',
    matches: (tool, segs) => tool.startsWith('mcp__github__') || runs(segs, 'gh'),
  },
  ...['docs/agents/issue-tracker.md', 'docs/agents/triage-labels.md'].map((doc) => ({
    doc,
    source: 'CLAUDE.md',
    trigger: 'Before you file, triage or label an issue',
    matches: issueWrite,
  })),
  {
    doc: 'docs/agents/verifying-ui-changes.md',
    source: '.claude/rules/ui-verification.md',
    trigger: 'Before you say a UI change works, or take a screenshot',
    // Run through tsx, the script path is a later word, not the verb.
    matches: (_t, segs) => segs.some((w) => w.some((x, i) => /(^|\/)screenshot\.ts$/.test(x) || (/(^|\/)preview\.ts$/.test(x) && ['shot', 'review'].includes(w[i + 1]!)))),
  },
]

export function triggeredDocs(tool: string, command: unknown): ReadFirst[] {
  const segs = tool === 'Bash' && typeof command === 'string' ? commandWords(command) : []
  return READ_FIRST.filter((r) => r.matches(tool, segs))
}

const pointer = (r: ReadFirst) => `Read first: \`${r.doc}\` (${r.source}: "${r.trigger}").`

export const LATE_READ_NOTE = 'If the doc shows your call was already right, the late read is not a Friction.'

export const CLOSE_SESSION_HINT = 'PR opened: invoke the `close-session` Skill before this turn ends for an in-review first log (CLAUDE.md); re-invoking it later is safe.'

/** The docs this transcript already read or was pointed to. */
function seen(records: Record<string, unknown>[], docs: ReadFirst[], trace: ReturnType<typeof extractTrace>): Set<string> {
  const read = [...trace.filesRead, ...trace.docsReadViaShell]
  const hinted = records
    .map((r) => r.attachment as { type?: string; content?: unknown } | undefined)
    .filter((a) => a?.type === 'hook_additional_context')
    .map((a) => hintText(a!.content))
    .join('\n')
  return new Set(docs.filter((r) => read.some((p) => p === r.doc || p.endsWith(`/${r.doc}`))
    || hinted.includes(pointer(r))).map((r) => r.doc))
}

/** The record holding the latest `create_pull_request` call: the one this hook
 *  fires for, once written. -1 when none is written, so the whole transcript counts. */
const lastPrCall = (records: Record<string, unknown>[]) => records.findLastIndex((r) => r.type === 'assistant'
  && [prop(prop(r, 'message'), 'content')].flat().some((b) => prop(b, 'type') === 'tool_use' && prop(b, 'name') === 'mcp__github__create_pull_request'))

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
  else records = readTranscript(agentTranscript(parent, String(agent))) ?? []
  if (!records) return null
  const index = buildDocLineIndex(docs.map((r) => ({ path: r.doc, text: readFileSync(join(root, r.doc), 'utf8') })))
  const trace = extractTrace(records, process.env, index)
  const skip = seen(records, docs, trace)
  const lines = docs.filter((r) => !skip.has(r.doc)).map(pointer)
  if (lines.length) lines.push(LATE_READ_NOTE)
  if (prOpened && !extractTrace(records.slice(lastPrCall(records) + 1), process.env).skillsUsed.includes('close-session')) lines.push(CLOSE_SESSION_HINT)
  return lines.length ? lines.join('\n') : null
}

function main(): void {
  const read = readHookPayload()
  if (read.kind !== 'ok') return
  const { payload } = read
  const hint = hintFor(payload)
  if (!hint) return
  const event = prop(payload, 'hook_event_name') === 'PostToolUseFailure' ? 'PostToolUseFailure' : 'PostToolUse'
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: hint } }))
}

function dryRun(argv: string[]): void {
  printDryRunResult({ hint: hintFor(resolveDryRunInput(argv), true) })
}

runGuard(import.meta.url, { main, dryRun, label: 'read-first hint', ref: 'issue #1754', failOpen: true })
