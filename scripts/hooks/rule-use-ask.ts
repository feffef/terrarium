// A hint, not a guard (#3020): after an agent's first bare `echo rule-use:` call,
// show it the rules that loaded for it and what each value means, so it rates
// from that list rather than from memory. Later bare calls get nothing, so "none
// applies" can end; a call naming a rule without a valid value is told so,
// since only the last call counts. A subagent's payload carries its parent's
// `transcript_path` (docs/agents/guards.md), so its own transcript is read.
// Fails open: any error adds nothing.
// `scripts/hooks/rule-use-ask.sh` is the hot-path pre-filter.
//
// Usage:
//   tsx scripts/hooks/rule-use-ask.ts                # hook payload on stdin
//   tsx scripts/hooks/rule-use-ask.ts --dry-run (--input '<payload json>' | --input-file <path>)
import { printDryRunResult, prop, readHookPayload, readTranscript, resolveDryRunInput, runGuard } from './hook-io.ts'
import { agentTranscript, extractTrace, hintText } from '../session/transcript-trace.ts'
import { RULE_USE_ASK_HEAD, RULE_USE_CALL, ruleUseCall, subagentAsk } from '../session/rule-use.ts'

export function askFor(payload: unknown): string | null {
  const command = prop(prop(payload, 'tool_input'), 'command')
  if (prop(payload, 'tool_name') !== 'Bash' || typeof command !== 'string') return null
  const call = ruleUseCall([command], (p) => p)
  if (!call) return null
  if (call.unvalued.length) {
    return `Not recorded, since a rule needs =steered or =backed: ${call.unvalued.join(' ')}. ` +
      `Only the last call counts, so run ${RULE_USE_CALL} again naming every rule and doc you mean, each rule with its value.`
  }
  if (call.entries.length) return null
  const parent = String(prop(payload, 'transcript_path') ?? '')
  const agent = prop(payload, 'agent_id')
  const records = readTranscript(agent === undefined ? parent : agentTranscript(parent, String(agent))) ?? []
  const asked = records.some((r) => {
    const att = r.attachment as { type?: string; content?: unknown } | undefined
    return att?.type === 'hook_additional_context' && hintText(att.content).includes(RULE_USE_ASK_HEAD)
  })
  return asked ? null : subagentAsk(extractTrace(records).ruleLoads)
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
  label: 'rule-use ask',
  ref: 'issue #3020',
  failOpen: true,
})
