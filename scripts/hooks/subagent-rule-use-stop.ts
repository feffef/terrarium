// SubagentStop hook (#3633): blocks a subagent's stop once while a rule that
// loaded for it has no rating, so its log's ruleUse is as complete as the main
// agent's (#3508). A bare `echo rule-use:` is the explicit "none applies" and
// passes; a re-entered stop (`stop_hook_active`) passes, so a subagent that
// cannot rate is never held. Fails open.
//
// Usage:
//   tsx scripts/hooks/subagent-rule-use-stop.ts   # hook: SubagentStop payload on stdin
import { prop, readHookJson, readTranscript } from './hook-io.ts'
import { isMain } from '../lib/cli.ts'
import { RULE_USE_CALL, unratedRules } from '../session/rule-use.ts'
import { agentTranscript, extractTrace } from '../session/transcript-trace.ts'

export function stopReason(payload: unknown): string | null {
  const agent = prop(payload, 'agent_id')
  if (prop(payload, 'stop_hook_active') === true || typeof agent !== 'string') return null
  const records = readTranscript(agentTranscript(String(prop(payload, 'transcript_path') ?? ''), agent))
  if (!records) return null
  const trace = extractTrace(records)
  const unrated = unratedRules(trace.ruleLoads, trace.reportedNamed)
  return unrated.length
    ? `These rules loaded for you and have no value: ${unrated.join(' ')}. ` +
      `Run ${RULE_USE_CALL} naming every rule that loaded, each with its value, or with no names if none applies, then finish.`
    : null
}

export function main(): void {
  const read = readHookJson()
  if (read.kind !== 'ok') return
  const reason = stopReason(read.json)
  if (reason) process.stdout.write(JSON.stringify({ decision: 'block', reason }))
}

if (isMain(import.meta.url)) main()
