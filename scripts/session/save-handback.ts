// Usage: save-handback.ts <agent-id> <out>
// Writes a subagent's final assistant message to <out> byte for byte, so a
// hand-back is never retyped (#2196). Run it from the session that dispatched
// the subagent.
import { readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import { fail, runIfMain } from '../lib/cli.ts'
import { findLatestTranscript, parseTranscript, subagentTranscriptPaths } from './transcript-trace.ts'

/** The last text block of the last assistant record that has one. */
function finalText(jsonl: string): string | undefined {
  for (const r of parseTranscript(jsonl).reverse()) {
    const content = (r.message as { content?: unknown } | undefined)?.content
    if (r.type !== 'assistant' || !Array.isArray(content)) continue
    const texts = content.filter((c) => c?.type === 'text' && typeof c.text === 'string')
    if (texts.length) return texts[texts.length - 1].text
  }
}

export function saveHandback(parentTranscript: string, agentId: string, out: string): void {
  const file = subagentTranscriptPaths(parentTranscript).find((p) => basename(p) === `agent-${agentId}.jsonl`)
  if (!file) throw new Error(`no transcript for agent ${agentId} under ${parentTranscript}`)
  const text = finalText(readFileSync(file, 'utf8'))
  if (text === undefined) throw new Error(`agent ${agentId} has no assistant text yet`)
  writeFileSync(out, text)
}

runIfMain(import.meta.url, () => {
  const [agentId, out] = process.argv.slice(2)
  if (!agentId || !out) fail('usage: save-handback.ts <agent-id> <out>')
  const parent = findLatestTranscript(process.cwd(), process.env.HOME)
  if (!parent) fail('no session transcript found for this directory')
  saveHandback(parent, agentId, out)
})
