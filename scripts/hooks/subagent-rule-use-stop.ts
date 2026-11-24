// SubagentStop hook (#3633): blocks a subagent's stop once while a rule that
// loaded for it has no rating, so its log's ruleUse is as complete as the main
// agent's (#3508). A bare `echo rule-use:` is the explicit "none applies" and
// passes; each agent_id is blocked once (a marker file), so a subagent that
// cannot rate is never held. Fails open.
//
// Usage:
//   tsx scripts/hooks/subagent-rule-use-stop.ts   # hook: SubagentStop payload on stdin
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { prop, readHookJson, readTranscript } from './hook-io.ts'
import { isMain } from '../lib/cli.ts'
import { RULE_USE_CALL, unratedRules } from '../session/rule-use.ts'
import { agentTranscript, extractTrace } from '../session/transcript-trace.ts'

export function stopReason(payload: unknown, markerDir = tmpdir()): string | null {
  const agent = prop(payload, 'agent_id')
  if (prop(payload, 'stop_hook_active') === true || typeof agent !== 'string') return null
  const records = readTranscript(agentTranscript(String(prop(payload, 'transcript_path') ?? ''), agent))
  if (!records) return null
  const trace = extractTrace(records)
  const unrated = unratedRules(trace.ruleLoads, trace.reportedNamed)
  if (!unrated.length) return null
  // One block per agent_id, so the cap holds without trusting `stop_hook_active`
  // at SubagentStop and a subagent with no Bash tool is let go on its next stop.
  const marker = join(markerDir, `subagent-rule-use-stop-${agent.replace(/\W/g, '_')}`)
  if (existsSync(marker)) return null
  writeFileSync(marker, '')
  return `These rules loaded for you and have no value: ${unrated.join(' ')}. ` +
    `Run ${RULE_USE_CALL} naming every rule that loaded, each with its value, or with no names if none applies, then finish.`
}

export function main(): void {
  const read = readHookJson()
  if (read.kind !== 'ok') return
  const reason = stopReason(read.json)
  if (reason) process.stdout.write(JSON.stringify({ decision: 'block', reason }))
}

if (isMain(import.meta.url)) main()
