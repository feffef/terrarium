// Issue #2543: CLAUDE.md binds the `dispatch-subagents` Skill to "Before you
// write a subagent brief", but read-first-hint's pointer (#2475) fired only
// after the `Agent` call, once the brief was written. So this denies a
// main-session `Agent`, `Workflow` or `SendMessage` call until the transcript
// shows that Skill invoked or its SKILL.md read (Read tool, or a shell read the
// session trace recognises). A subagent (payload has `agent_id`) cannot
// dispatch, so it is never guarded. A missing or unreadable transcript lets the
// call through: denying would block every dispatch for good.
//
// Usage:
//   tsx scripts/hooks/dispatch-read-guard.ts                # hook payload on stdin
//   tsx scripts/hooks/dispatch-read-guard.ts --dry-run (--input '<payload json>' | --input-file <path>)
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildDenyOutput, denyUninspectable, printDryRunResult, prop, readHookPayload, readTranscript, resolveDryRunInput, runGuard } from './hook-io.ts'
import { extractTrace } from '../session/transcript-trace.ts'
import { buildDocLineIndex } from '../session/shell-reads.ts'
import { root } from '../lib/cli.ts'

const LABEL = 'dispatch-read guard'
const REF = 'issue #2543'
export const DOC = '.agents/skills/dispatch-subagents/SKILL.md'

export function shouldDeny(agentId: unknown, records: Record<string, unknown>[] | null): boolean {
  if (agentId !== undefined || !records) return false
  const trace = extractTrace(records, process.env, buildDocLineIndex([{ path: DOC, text: readFileSync(join(root, DOC), 'utf8') }]))
  return !trace.skillsUsed.includes('dispatch-subagents')
    && ![...trace.filesRead, ...trace.docsReadViaShell].some((p) => p === DOC || p.endsWith(`/${DOC}`))
}

export const formatGuardMessage = () =>
  `Blocked by the ${LABEL} (${REF}): read \`${DOC}\` first (CLAUDE.md: "Before you write a subagent brief, or resume ` +
  'a stopped subagent"), then retry this call unchanged if the Skill shows it was right.'

const decide = (payload: unknown) => shouldDeny(prop(payload, 'agent_id'), readTranscript(prop(payload, 'transcript_path') as string | undefined))

function main(): void {
  const read = readHookPayload()
  if (read.kind === 'none') return
  if (read.kind !== 'ok') return denyUninspectable(LABEL, REF, 'the hook payload was unreadable or named no tool')
  if (decide(read.payload)) process.stdout.write(JSON.stringify(buildDenyOutput(formatGuardMessage())))
}

function dryRun(argv: string[]): void {
  printDryRunResult({ decision: decide(resolveDryRunInput(argv)) ? 'deny' : 'allow' })
}

runGuard(import.meta.url, { main, dryRun, label: LABEL, ref: REF })
