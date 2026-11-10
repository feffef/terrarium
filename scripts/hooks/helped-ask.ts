// A hint, not a guard (#3020): after a bare `helped.sh` call, show the agent
// the rules that loaded for it and what each value means, so it rates from
// that list rather than from memory. A subagent's payload carries its parent's
// `transcript_path` (docs/agents/guards.md), so its own transcript is read.
// Fails open: any error adds nothing.
// `scripts/hooks/helped-ask.sh` is the hot-path pre-filter.
//
// Usage:
//   tsx scripts/hooks/helped-ask.ts                # hook payload on stdin
//   tsx scripts/hooks/helped-ask.ts --dry-run (--input '<payload json>' | --input-file <path>)
import { root } from '../lib/cli.ts'
import { printDryRunResult, prop, readHookPayload, readTranscript, resolveDryRunInput, runGuard } from './hook-io.ts'
import { agentTranscript, extractTrace } from '../session/transcript-trace.ts'
import { helpedAsk, reportedNames } from '../session/rule-use.ts'

export function askFor(payload: unknown): string | null {
  const command = prop(prop(payload, 'tool_input'), 'command')
  if (prop(payload, 'tool_name') !== 'Bash' || typeof command !== 'string') return null
  if (reportedNames([command], (p) => p)?.length !== 0) return null
  const parent = String(prop(payload, 'transcript_path') ?? '')
  const agent = prop(payload, 'agent_id')
  const transcript = agent === undefined ? parent : agentTranscript(parent, String(agent))
  return helpedAsk(extractTrace(readTranscript(transcript) ?? []).ruleLoads, root)
}

function main(): void {
  const read = readHookPayload()
  if (read.kind !== 'ok') return
  const ask = askFor(read.payload)
  if (ask) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: ask } }))
}

runGuard(import.meta.url, {
  main,
  dryRun: (argv) => printDryRunResult({ ask: askFor(resolveDryRunInput(argv)) }),
  label: 'helped ask',
  ref: 'issue #3020',
  failOpen: true,
})
