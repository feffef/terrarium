// The one home for where the Journal's session logs live and how to read them
// all (issue #1342). Kept dependency-light: log-session.ts imports it (ADR-0009).
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'

export const SESSIONS_DIR = 'layers/journal/content/current/sessions'
export const ARCHIVED_SESSIONS_DIR = 'layers/journal/content/archived/sessions'

export interface SessionLog {
  file: string
  data: Record<string, unknown>
}

/** A filename in both folders yields only its `current` copy: the archiver can
 *  amend a log back into `current` (scripts/archive-journal-content.ts). */
export function readSessionLogs(cwd: string, { archived }: { archived: boolean }): SessionLog[] {
  const seen = new Set<string>()
  const out: SessionLog[] = []
  for (const dir of archived ? [SESSIONS_DIR, ARCHIVED_SESSIONS_DIR] : [SESSIONS_DIR]) {
    if (!existsSync(join(cwd, dir))) continue
    for (const f of readdirSync(join(cwd, dir)).filter((f) => f.endsWith('.yml'))) {
      if (seen.has(f)) continue
      seen.add(f)
      const data: unknown = parseYaml(readFileSync(join(cwd, dir, f), 'utf8'))
      if (data && typeof data === 'object') out.push({ file: `${dir}/${f}`, data: data as Record<string, unknown> })
    }
  }
  return out
}
