// Stop hook for issue #2503 (#2499's fix 3): only the harness delivers a
// `<task-notification>` or `<agent-message` block, so one in the main agent's
// own reply means it wrote a subagent's report itself (#2499). It blocks the
// stop once; `stop_hook_active` marks the re-entered stop, which passes. Fails
// open (`|| true`): a Stop hook must never wedge a session.
//
// Usage:
//   tsx scripts/hooks/harness-tag-stop.ts   # hook: Stop payload on stdin
import { prop, readHookJson, readTranscript } from './hook-io.ts'
import { isMain } from '../lib/cli.ts'

const TAGS = ['<task-notification>', '<agent-message']

const blocks = (r: Record<string, unknown>): unknown[] => {
  const content = prop(prop(r, 'message'), 'content')
  return Array.isArray(content) ? content : [{ type: 'text', text: content }]
}

/** The harness-only tag in this turn's main-agent text, or `null`. A turn
 *  starts at the last prompt: a user record that is not all tool results. */
export function fabricatedTag(records: Record<string, unknown>[]): string | null {
  const own = records.filter((r) => r.isSidechain !== true && r.isMeta !== true)
  const start = own.findLastIndex((r) => r.type === 'user' && blocks(r).some((b) => prop(b, 'type') !== 'tool_result'))
  for (const r of own.slice(start + 1)) {
    if (r.type !== 'assistant') continue
    for (const b of blocks(r)) {
      const text = prop(b, 'type') === 'text' ? prop(b, 'text') : undefined
      const tag = typeof text === 'string' && TAGS.find((t) => text.includes(t))
      if (tag) return tag
    }
  }
  return null
}

export function main(): void {
  const read = readHookJson()
  if (read.kind !== 'ok' || prop(read.json, 'stop_hook_active') === true) return
  const path = prop(read.json, 'transcript_path')
  const tag = fabricatedTag(readTranscript(typeof path === 'string' ? path : undefined) ?? [])
  if (!tag) return
  const reason =
    `Your reply contains \`${tag}\`, a tag only the harness delivers, so you invented a subagent report (#2499). ` +
    `Retract it, wait for the real delivery, and check every claim against it. If you only quoted the tag, carry on.`
  process.stdout.write(JSON.stringify({ decision: 'block', reason }))
}

if (isMain(import.meta.url)) main()
