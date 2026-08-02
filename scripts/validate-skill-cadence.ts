// Mechanical check for CLAUDE.md's "Don't restate a Routine's schedule in a
// committed doc … Say a Skill *is* scheduled; never say *when*" convention
// (Working conventions) — issue #813. A Skill Inventory entry
// (`layers/journal/content/current/skills/*.yml`, ADR-0015) is the one place
// this has actually been violated before, so this check is scoped to that
// collection rather than content-wide.
//
// Sibling to `validate-content.ts`/`validate-content-refs.ts` in the same
// `validate:content` chain (package.json), kept as its own small script
// rather than folded into `validate-content-refs.ts` — that script's scope is
// documented narrowly (Atlas/Midden referential integrity); this check has no
// referential-integrity shape and would just be a third responsibility bolted
// on.
//
// Usage: pnpm validate:content (runs after the other two; see package.json)
//   Exits 0 (silent beyond the summary line) when no entry pairs a cadence
//   word with "Routine" in the same sentence, 1 with every violation listed
//   otherwise.
import { globSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expand, loadManifests, root, type ExpandedCollection } from '../shared/expand.ts'
import { parseDocument } from './validate-content.ts'

export interface CadenceViolation {
  file: string
  field: string
  match: string
  sentence: string
}

const CADENCE_WORDS = [
  'daily',
  'hourly',
  'nightly',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'annually',
  'biweekly',
  'fortnightly',
  'twice-daily',
  'twice daily',
]

// A deliberately simple regex/proximity check, not sentence-boundary NLP
// (issue #813) — a cadence word or an "every N <unit>" phrase, matched
// case-insensitively.
const CADENCE_RE = new RegExp(
  `\\b(?:${CADENCE_WORDS.map((w) => w.replace(/[- ]/g, '[- ]')).join('|')})\\b` +
    `|\\bevery\\s+\\d+\\s+(?:minute|min|hour|day|week|month)s?\\b`,
  'gi',
)

const ROUTINE_RE = /\bRoutines?\b/i

/** Rough sentence split — good enough for a "same sentence" proximity check.
 *  YAML's folded scalars (`role: >-`) already collapse single newlines into
 *  spaces at parse time, so splitting on sentence punctuation here is enough. */
function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Every sentence in `text` that pairs a cadence word with "Routine" — the
 *  schedule restated in a committed doc that CLAUDE.md forbids. */
export function findCadenceViolations(text: string): { sentence: string; match: string }[] {
  const out: { sentence: string; match: string }[] = []
  for (const sentence of sentencesOf(text)) {
    if (!ROUTINE_RE.test(sentence)) continue
    CADENCE_RE.lastIndex = 0
    const m = CADENCE_RE.exec(sentence)
    if (m) out.push({ sentence, match: m[0] })
  }
  return out
}

function noteOf(entry: unknown): string {
  return entry && typeof entry === 'object' && typeof (entry as Record<string, unknown>).note === 'string'
    ? ((entry as Record<string, unknown>).note as string)
    : ''
}

/** Scan every Skill Inventory entry's prose fields (`role`, each
 *  `observations[].note`) for a cadence word paired with "Routine". Pure
 *  aside from the file reads, mirroring `validateContent()`/`validateReferences()`. */
export function validateSkillCadence(cols: ExpandedCollection[], projectRoot = root): CadenceViolation[] {
  const violations: CadenceViolation[] = []
  const skillCols = cols.filter((c) => c.tenant === 'journal' && c.collection === 'skills')

  for (const col of skillCols) {
    const cwd = join(projectRoot, col.cwdRel)
    for (const rel of globSync(col.include, { cwd })) {
      const file = join(col.cwdRel, rel)
      const data = parseDocument(join(cwd, rel))

      const role = typeof data.role === 'string' ? data.role : ''
      for (const { sentence, match } of findCadenceViolations(role)) {
        violations.push({ file, field: 'role', match, sentence })
      }

      const observations = Array.isArray(data.observations) ? data.observations : []
      observations.forEach((entry, i) => {
        for (const { sentence, match } of findCadenceViolations(noteOf(entry))) {
          violations.push({ file, field: `observations[${i}].note`, match, sentence })
        }
      })
    }
  }

  return violations
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function printReport(violations: CadenceViolation[]): void {
  for (const v of violations) {
    console.error(`\n${v.file}  (${v.field})`)
    console.error(`  - restates a Routine's schedule ("${v.match}"): "${v.sentence}"`)
    console.error('    CLAUDE.md: say a Skill *is* scheduled; never say *when* — a schedule can change without a commit.')
  }
  const status = violations.length === 0 ? 'PASS' : 'FAIL'
  console.log(`\nvalidate-skill-cadence: ${status} — ${violations.length} violation(s)`)
}

function main(): void {
  const violations = validateSkillCadence(expand(loadManifests()), root)
  printReport(violations)
  if (violations.length > 0) process.exit(1)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
