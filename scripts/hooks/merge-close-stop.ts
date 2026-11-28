// Stop hook for #2913 and #3728. Blocks the stop once when this session
//  - merged a PR and `close-session` has not run since (reuses log-session's
//    refusal test, so the two cannot disagree, #2424), or
//  - invoked `close-session` or ran `log-session.ts --author`, yet no authored
//    scratch is on disk: `--author` refuses (exit 1, no scratch) on an
//    incomplete log, and the landing hook then has nothing to land. The disk is
//    checked, never a transcript claim (ADR-0009).
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
      return typeof cmd === 'string' && cmd.includes('log-session.ts') && cmd.includes('--author')
    })
  })
}

const MERGED = 'A PR merged and close-session has not run since. Invoke close-session before ending the turn.'
const LOST = 'close-session ran but no log was written (a refused log-session --author writes nothing). Fix the cause and re-run it.'

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
