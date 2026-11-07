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

export function main(): void {
  const read = readHookJson()
  if (read.kind !== 'ok' || prop(read.json, 'stop_hook_active') === true) return
  const path = prop(read.json, 'transcript_path')
  const records = readTranscript(typeof path === 'string' ? path : undefined) ?? []
  if (closureRefusal('completed', extractTrace(records))) {
    const reason = 'A PR merged and close-session has not run since. Invoke close-session before ending the turn.'
    process.stdout.write(JSON.stringify({ decision: 'block', reason }))
  }
}

if (isMain(import.meta.url)) main()
