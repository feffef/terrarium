// Stop hook for #2913: blocks the stop once when this session merged a PR and
// `close-session` has not run since. Reuses log-session's refusal test, so the
// two cannot disagree about what "merged without closing" means (#2424).
//
// Usage:
//   tsx scripts/hooks/merge-close-stop.ts   # hook: Stop payload on stdin
import { prop, readHookJson, readTranscript } from './hook-io.ts'
import { isMain } from '../lib/cli.ts'
import { closureRefusal } from '../session/log-session.ts'
import { extractTrace } from '../session/transcript-trace.ts'

/** The reason to block the stop, or `undefined` when no merge awaits a close. */
export function unclosedMerge(records: Record<string, unknown>[]): string | undefined {
  return closureRefusal('completed', extractTrace(records))
}

export function main(): void {
  const read = readHookJson()
  if (read.kind !== 'ok' || prop(read.json, 'stop_hook_active') === true) return
  const path = prop(read.json, 'transcript_path')
  const reason = unclosedMerge(readTranscript(typeof path === 'string' ? path : undefined) ?? [])
  if (reason) process.stdout.write(JSON.stringify({ decision: 'block', reason }))
}

if (isMain(import.meta.url)) main()
