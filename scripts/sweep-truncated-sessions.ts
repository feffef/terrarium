// One-time sweep (issue #449 Gap 5): back-catalog session logs whose `outcome`
// was silently truncated at an unquoted `#`, in one of two distinct shapes:
//
//   1. EXACT — the full intended text is still physically present in the
//      committed file (e.g. `outcome: PR #23 merged; digests live`, unquoted),
//      it just re-truncates every time a standards-conforming YAML parser
//      reads it back — the same live footgun `findTruncatedScalars` (PR #367)
//      guards against at author time, run here directly against the raw
//      landed file. Fully recoverable, byte-for-byte, via the parser's own
//      `.comment` on the node — no guessing involved.
//   2. LOST — the file predates PR #367 in a different way: the truncation
//      already happened once, upstream, at author time (the `--author` parse
//      step dropped the tail before the value ever reached `stitch`/
//      `stringifyYaml`), so the LANDED file itself is already a clean, complete
//      -looking short value (e.g. `outcome: PR`) with nothing left to recover
//      from its own bytes. The only remaining signal is corroboration against
//      the log's own `prs` list — the exact shape PR #367's own follow-up
//      found by hand in seven logs (`PR`, `Both`, …), three of which it
//      already repaired. Reconstructed only when unambiguous (a lone `PR` with
//      exactly one `prs` entry, matching the "PR #<n> merged" idiom every
//      other log in the corpus uses); anything more ambiguous (e.g. `Both`
//      against two `prs` entries — which PR, and what was the missing word?)
//      is flagged via the `historicallyTruncated` schema field, never guessed.
//
// Scoped to `outcome` only — the one field the original PR #367 investigation
// established as actually affected. A truncated `frictions.solution` line was
// incidentally spotted in one very old, hand-authored log during this sweep's
// own development; it's the same footgun but out of this sweep's scope, so it
// is called out in the landing PR rather than silently left unmentioned.
//
// Usage:  tsx scripts/sweep-truncated-sessions.ts [--write]
//   (no flag) — print a report of repaired/flagged findings, write nothing
//   --write   — apply confident repairs and flags to the .yml files in place
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'
import { ARCHIVED_SESSIONS_DIR, SESSIONS_DIR } from './audit-skills.ts'
import { findTruncatedScalars, validateEntry } from './log-session.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export interface TruncationVerdict {
  suspect: boolean
  /** Present only when the intended text is safe to write back. */
  repaired?: string
}

/** The LOST-shape fallback: an anomalously bare `outcome` (the schema wants
 *  ~8 words of prose) corroborated against the log's own `prs` list. Only
 *  called once `findTruncatedScalars` on the raw file found nothing — i.e.
 *  the value in the file is already "clean", with no dropped tail left to
 *  recover byte-for-byte. Pure — the testable core; never fabricates a repair
 *  it can't ground in the entry itself. */
export function detectTruncatedOutcome(entry: { outcome?: unknown; prs?: unknown }): TruncationVerdict {
  const outcome = typeof entry.outcome === 'string' ? entry.outcome.trim() : ''
  const prs = Array.isArray(entry.prs) ? entry.prs.map(String) : []
  if (!outcome || prs.length === 0) return { suspect: false } // nothing to corroborate a bare value against
  if (prs.some((n) => outcome.includes(`#${n}`))) return { suspect: false } // already cites its own PR — not truncated

  const words = outcome.split(/\s+/)
  const looksBare = words.length <= 2 && !/\d/.test(outcome)
  if (!looksBare) return { suspect: false }

  if (prs.length === 1 && /^pr$/i.test(outcome)) {
    return { suspect: true, repaired: `PR #${prs[0]} merged` }
  }
  return { suspect: true } // e.g. "Both" against 2+ prs — real signal, but which PR/word is unrecoverable
}

export interface SweepFinding {
  file: string
  session: string
  field: 'outcome'
  value: string
  repaired?: string
  /** 'exact' — recovered byte-for-byte from the still-present raw text.
   *  'reconstructed' — a best-effort guess, corroborated only against `prs`. */
  source?: 'exact' | 'reconstructed'
}

/** Repair a bare `outcome:` line in place, quoting the new value (it now
 *  legitimately contains a `#`) and touching no other byte of the file. */
export function applyRepair(raw: string, repaired: string): string {
  return raw.replace(/^outcome:.*$/m, `outcome: ${JSON.stringify(repaired)}`)
}

/** Record the flag for an unrepairable-but-suspect `outcome`, right after its
 *  own line, unless the file was already flagged (idempotent re-run). */
export function applyFlag(raw: string, field: string): string {
  if (/^historicallyTruncated:/m.test(raw)) return raw
  return raw.replace(/^outcome:.*$/m, (line) => `${line}\nhistoricallyTruncated:\n  - ${field}`)
}

function listYmlFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yml'))
    .map((f) => join(dir, f))
}

export interface SweepReport {
  repaired: SweepFinding[]
  flagged: SweepFinding[]
}

/** Scan every session log under `dirs`, apply confident repairs and flags when
 *  `write` is true, and report what happened either way. Already-flagged files
 *  (a prior sweep run) are skipped entirely — idempotent re-runs. Every write
 *  is re-validated against the frozen `sessions` schema before landing on
 *  disk; a repair that would produce an invalid entry aborts loudly instead of
 *  silently corrupting the file. */
export function sweep(dirs: string[], write: boolean): SweepReport {
  const repaired: SweepFinding[] = []
  const flagged: SweepFinding[] = []

  for (const dir of dirs) {
    for (const absPath of listYmlFiles(dir)) {
      const raw = readFileSync(absPath, 'utf8')
      let parsed: Record<string, unknown>
      try {
        parsed = parseYaml(raw) as Record<string, unknown>
      } catch {
        continue // not this sweep's problem — a genuine parse error surfaces elsewhere
      }
      if (!parsed || typeof parsed !== 'object') continue
      if ('historicallyTruncated' in parsed) continue // already flagged by a prior run

      const session = String(parsed.session ?? '')
      const value = String(parsed.outcome ?? '')

      // EXACT shape first: the raw file itself still carries the dropped tail
      // on the parser's `.comment` — recoverable byte-for-byte, no guessing.
      const exactHit = findTruncatedScalars(raw).find((h) => h.keyPath === 'outcome')
      const verdict = exactHit ? { suspect: true, repaired: exactHit.full } : detectTruncatedOutcome(parsed)
      if (!verdict.suspect) continue

      if (verdict.repaired) {
        repaired.push({
          file: absPath,
          session,
          field: 'outcome',
          value,
          repaired: verdict.repaired,
          source: exactHit ? 'exact' : 'reconstructed',
        })
        if (write) {
          const next = applyRepair(raw, verdict.repaired)
          const check = validateEntry(parseYaml(next))
          if (!check.ok) throw new Error(`sweep: repaired entry for ${absPath} failed validation:\n${check.errors}`)
          writeFileSync(absPath, next)
        }
      } else {
        flagged.push({ file: absPath, session, field: 'outcome', value })
        if (write) {
          const next = applyFlag(raw, 'outcome')
          const check = validateEntry(parseYaml(next))
          if (!check.ok) throw new Error(`sweep: flagged entry for ${absPath} failed validation:\n${check.errors}`)
          writeFileSync(absPath, next)
        }
      }
    }
  }

  return { repaired, flagged }
}

function main(): void {
  const write = process.argv.includes('--write')
  const dirs = [join(root, SESSIONS_DIR), join(root, ARCHIVED_SESSIONS_DIR)]
  const { repaired, flagged } = sweep(dirs, write)

  console.log(
    `sweep-truncated-sessions: ${repaired.length} repaired, ${flagged.length} flagged-only${write ? '' : ' (dry run — pass --write to apply)'}`,
  )
  for (const f of repaired) {
    console.log(`  REPAIRED (${f.source}) ${f.file}: ${f.field} "${f.value}" -> "${f.repaired}"`)
  }
  for (const f of flagged) {
    console.log(`  FLAGGED  ${f.file}: ${f.field} "${f.value}" — ambiguous, not auto-repaired`)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
