// The one home for where the Journal's session logs live, how to read them
// all (issue #1342) and how to check one (ADR-0009). log-session.ts and
// validate-content-schema.ts both import it, so neither imports the other.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { isPair, isScalar, parse as parseYaml, parseDocument, visit } from 'yaml'
import { sessionSchema } from '../../shared/schemas/session.ts'

export const SESSIONS_DIR = 'layers/journal/content/current/sessions'
export const ARCHIVED_SESSIONS_DIR = 'layers/journal/content/archived/sessions'
/** Digests are pages under a subfolder (ADR-0010). */
export const DIGESTS_DIR = 'layers/journal/content/current/pages/digests'
/** Where the retention sweep (`archive-journal-content.ts`) moves aged-out Digests. */
export const ARCHIVED_DIGESTS_DIR = 'layers/journal/content/archived/pages/digests'

export interface SessionLog {
  file: string
  data: Record<string, unknown>
}

/** A filename in both folders yields only its `current` copy: the archiver can
 *  amend a log back into `current` (.agents/skills/digest/scripts/archive-journal-content.ts). */
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

export interface SessionEntry {
  session: string
  startedAt: string
  schemaVersion?: number
  [k: string]: unknown
}

/** Validate a parsed entry against the frozen schema. Pure — the testable core.
 *  Timestamps are plain ISO-8601 strings (see the `utcTimestamp` note in the
 *  manifest): the YAML parser hands them over as strings and the schema keeps
 *  them that way, so no Date coercion is needed to match the build's L1 pass. */
export function validateEntry(raw: unknown):
  | { ok: true; data: SessionEntry }
  | { ok: false; errors: string } {
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, errors: 'entry is not a YAML mapping' }
  }
  const res = sessionSchema.safeParse(raw as Record<string, unknown>)
  if (!res.success) {
    const errors = res.error.issues
      .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n')
    return { ok: false, errors }
  }
  return { ok: true, data: res.data as SessionEntry }
}

/** A scalar value the YAML parser silently truncated at an unquoted `#`. The lost
 *  text survives on the parsed node's `.comment`, so the *full* value the agent
 *  meant is recoverable — `keyPath` locates it, `value` is what landed, `full` is
 *  what to quote instead. */
export interface TruncatedScalar {
  keyPath: string
  value: string
  full: string
}

/** Catch the recurring silent-truncation footgun the `log-session` Skill warns about
 *  ("Quote any scalar value containing `#`"): an unquoted scalar containing ` #`
 *  parses as the text before it, with everything after dropped as a YAML comment —
 *  `outcome: PR #354 merged` becomes just `PR`. Documentation alone hasn't held
 *  (issue: this branch), so the parse step fails loudly instead. The `yaml` parser
 *  keeps the dropped span on the node's `.comment`, letting us both detect it and
 *  report the intended value. Block scalars (`>-`/`|`) are unaffected — a `#` inside
 *  them is literal and carries no `.comment` — so summaries never false-positive. */
export function findTruncatedScalars(yamlText: string): TruncatedScalar[] {
  let doc: ReturnType<typeof parseDocument>
  try {
    doc = parseDocument(yamlText)
  } catch {
    return [] // a genuine parse error is surfaced by the caller's parseYaml step
  }
  const found: TruncatedScalar[] = []
  visit(doc, {
    Scalar(_key, node, path) {
      const dropped = typeof node.comment === 'string' ? node.comment.trim() : ''
      if (!dropped) return
      const keys: string[] = []
      for (const ancestor of path) {
        if (isPair(ancestor) && isScalar(ancestor.key)) keys.push(String(ancestor.key.value))
      }
      found.push({ keyPath: keys.join('.') || '(root)', value: String(node.value), full: `${node.value} #${dropped}` })
    },
  })
  return found
}

/** Human-readable rejection for a set of truncated scalars, quoting the recovered
 *  full value so the agent can paste it straight back in quoted. */
export function truncationError(hits: TruncatedScalar[]): string {
  const lines = hits.map((h) => `  ${h.keyPath}: parsed as "${h.value}" — an unquoted \`#\` dropped the rest. Quote it: ${JSON.stringify(h.full)}`)
  return `authored YAML has value(s) truncated at an unquoted '#':\n${lines.join('\n')}`
}
