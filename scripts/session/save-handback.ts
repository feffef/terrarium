// Usage: save-handback.ts <agent-id> <out>
// Writes a subagent's final assistant message to <out> byte for byte, so a
// hand-back is never retyped (#2196). Run it from the session that dispatched
// the subagent.
import { readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import { fail, runIfMain } from '../lib/cli.ts'
import { findLatestTranscript, parseTranscript, subagentTranscriptPaths } from './transcript-trace.ts'

/**
 * The text of the last assistant record, or undefined when it holds none or ends on another tool call (mid-run).
 * The hand-back itself is a SubagentHandback tool call, whose message is the reply (#2262).
 */
function finalText(jsonl: string): string | undefined {
  const last = parseTranscript(jsonl).findLast((r) => r.type === 'assistant')
  const content = (last?.message as { content?: unknown } | undefined)?.content
  if (!Array.isArray(content)) return undefined
  const handback = content.find((c) => c?.type === 'tool_use' && c.name === 'SubagentHandback')
  if (typeof handback?.input?.message === 'string') return handback.input.message
  if (content.some((c) => c?.type === 'tool_use')) return undefined
  return content.filter((c) => c?.type === 'text' && typeof c.text === 'string').at(-1)?.text
}

export function saveHandback(parentTranscript: string, agentId: string, out: string): void {
  const file = subagentTranscriptPaths(parentTranscript).find((p) => basename(p) === `agent-${agentId}.jsonl`)
  if (!file) throw new Error(`no transcript for agent ${agentId} under ${parentTranscript}`)
  const text = finalText(readFileSync(file, 'utf8'))
  if (text === undefined) throw new Error(`agent ${agentId} has not finished (no final text)`)
  writeFileSync(out, text)
}

runIfMain(import.meta.url, () => {
  const [agentId, out] = process.argv.slice(2)
  if (!agentId || !out) fail('usage: save-handback.ts <agent-id> <out>')
  const parent = findLatestTranscript(process.cwd(), process.env.HOME)
  if (!parent) fail('no session transcript found for this directory')
  saveHandback(parent, agentId, out)
})
