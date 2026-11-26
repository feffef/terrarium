// SubagentStop hook (#3633, #3662): blocks a subagent's stop while a rule that
// loaded for it has no rating, so its log's ruleUse is as complete as the main
// agent's (#3508). A bare `echo rule-use:` is the explicit "none applies" and
// passes; each agent_id is blocked at most MAX_BLOCKS times (a counter file),
// so a subagent that cannot rate is never held for long. Fails open.
//
// Usage:
//   tsx scripts/hooks/subagent-rule-use-stop.ts   # hook: SubagentStop payload on stdin
import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { prop, readHookJson, readTranscript } from './hook-io.ts'
import { isMain } from '../lib/cli.ts'
import { RULE_USE_CALL, unratedRules } from '../session/rule-use.ts'
import { agentTranscript, extractTrace } from '../session/transcript-trace.ts'

const MAX_BLOCKS = 3

export function stopReason(payload: unknown, markerDir = tmpdir()): string | null {
  const agent = prop(payload, 'agent_id')
  if (prop(payload, 'stop_hook_active') === true || typeof agent !== 'string') return null
  const records = readTranscript(agentTranscript(String(prop(payload, 'transcript_path') ?? ''), agent))
  if (!records) return null
  const trace = extractTrace(records)
  const unrated = unratedRules(trace.ruleLoads, trace.reportedNamed)
  if (!unrated.length) return null
  // A count per agent_id, so the cap holds without trusting `stop_hook_active`
  // at SubagentStop and a subagent with no Bash tool is let go after MAX_BLOCKS.
  const marker = join(markerDir, `subagent-rule-use-stop-${agent.replace(/\W/g, '_')}`)
  let blocks = 0
  try { blocks = Number(readFileSync(marker, 'utf8')) || 0 } catch { /* first stop */ }
  if (blocks >= MAX_BLOCKS) return null
  writeFileSync(marker, String(blocks + 1))
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
