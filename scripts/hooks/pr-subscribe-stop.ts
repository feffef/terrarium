// Stop hook for #2961: blocks the stop once when this session opened a PR and
// never subscribed to its activity, which ADR-0003 requires. No exemption for a
// PR merged in the same turn: the hook only asks for the call or a stated reason.
//
// Usage:
//   tsx scripts/hooks/pr-subscribe-stop.ts   # hook: Stop payload on stdin
import { prop, readHookJson, readTranscript } from './hook-io.ts'
import { isMain } from '../lib/cli.ts'
import { extractTrace } from '../session/transcript-trace.ts'

export function main(): void {
  const read = readHookJson()
  if (read.kind !== 'ok' || prop(read.json, 'stop_hook_active') === true) return
  const path = prop(read.json, 'transcript_path')
  const records = readTranscript(typeof path === 'string' ? path : undefined) ?? []
  const names = Object.keys(extractTrace(records).toolCounts)
  if (names.some((n) => n.includes('create_pull_request')) && !names.some((n) => n.endsWith('subscribe_pr_activity'))) {
    const reason = 'You opened a PR and never called subscribe_pr_activity (ADR-0003). Subscribe now, or say why you cannot.'
    process.stdout.write(JSON.stringify({ decision: 'block', reason }))
  }
}

if (isMain(import.meta.url)) main()
