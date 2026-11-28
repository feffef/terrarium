// Stop hook for #2913 and #3728. Blocks the stop once when this session
//  - merged a PR (or the owner did, seen as a GitHub subscription event, #3714)
//    and `close-session` has not run since; log-session's own refusal test, so
//    the two cannot disagree (#2424), or
//  - invoked `close-session` or ran `log-session.ts --author`, yet no authored
//    scratch is on disk: a refused `--author` writes none, so nothing lands.
//    Any scratch counts, even a stale one, so a later refused re-run slips by.
//
// Usage:
//   tsx scripts/hooks/merge-close-stop.ts   # hook: Stop payload on stdin
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { prop, readHookJson, readTranscript } from './hook-io.ts'
import { isMain } from '../lib/cli.ts'
import { closureRefusal } from '../session/log-session.ts'
import { extractTrace, SCRATCH_FILE } from '../session/transcript-trace.ts'

/** True when the transcript shows closure attempted (the Skill, or an `--author` run). */
export function closureAttempted(records: Record<string, unknown>[]): boolean {
  return records.some((rec) => {
    const content = (rec.message as { content?: unknown } | undefined)?.content
    if (rec.type !== 'assistant' || !Array.isArray(content)) return false
    return content.some((b: { type?: string; name?: string; input?: Record<string, unknown> }) => {
      if (b?.type !== 'tool_use') return false
      if (b.name === 'Skill') return b.input?.skill === 'close-session'
      const cmd = b.name === 'Bash' ? b.input?.command : undefined
      // A dry run or a read of the script writes no scratch, so it is no attempt.
      return typeof cmd === 'string' && /\b(tsx|node)\b[^|;&\n]*log-session\.ts[^|;&\n]*--author/.test(cmd) && !cmd.includes('--dry-run')
    })
  })
}

const MERGED = 'A PR merged and close-session has not run since. Invoke close-session before ending the turn.'
const LOST = 'Closure was attempted but no log was written (a refused log-session --author writes nothing). Fix the cause and re-run close-session.'

export function stopReason(records: Record<string, unknown>[], scratchExists: boolean): string | null {
  if (closureRefusal('completed', extractTrace(records))) return MERGED
  return closureAttempted(records) && !scratchExists ? LOST : null
}

export function main(): void {
  const read = readHookJson()
  if (read.kind !== 'ok' || prop(read.json, 'stop_hook_active') === true) return
  const path = prop(read.json, 'transcript_path')
  const records = readTranscript(typeof path === 'string' ? path : undefined) ?? []
  const reason = stopReason(records, existsSync(join(process.env.CLAUDE_PROJECT_DIR || '.', SCRATCH_FILE)))
  if (reason) process.stdout.write(JSON.stringify({ decision: 'block', reason }))
}

if (isMain(import.meta.url)) main()
