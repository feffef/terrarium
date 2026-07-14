// Cheap docs-drift check (issue #442, split off #439's audit-docs sweep): a
// removed/renamed mechanism noun (the seed case: `SessionEnd`, retired as the
// sole session-log committer in favor of `Stop` — ADR-0009's amendment) tends
// to keep being *mentioned* in prose long after the mechanism it names has
// moved on, and that drift otherwise only gets caught by the next `audit-docs`
// sweep. This is the other half: a fast, always-on grep gate a PR can't merge
// past.
//
// Deliberately narrow (this PR implements only the first of #442's two checks
// — the second, a retired-glossary-term-on-a-new-line check, needs diff-scoping
// and word-sense care that a plain noun→homes grep doesn't, and is split to a
// follow-up issue):
//   - Config-driven: `REMOVED_MECHANISM_NOUNS` maps a noun to the file(s) it's
//     still allowed to appear in (its "sanctioned home").
//   - Scoped to **live docs**: every git-tracked `*.md` file outside `layers/`.
//     `layers/` content (journal session logs, blog posts, digests) is a dated,
//     historical narrative — a session log accurately says "SessionEnd fired"
//     about *that day's* mechanism and is never revised to track a later
//     rename, so scanning it would flag permanent, correct history as drift.
//     This mirrors the same live-docs/Tenant-content boundary `scripts/gate.ts`
//     already draws for its inert-change classifier (issue #350).
//
// Usage:  pnpm check:docs-drift
//   Exits 0 if no configured noun appears outside its sanctioned home(s),
//   1 otherwise (with every violation's file, line, and matched text listed).
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { root } from '../shared/expand.ts'

/** noun → glob-ish path pattern(s) (only `*` is special) it may still appear
 *  in without being flagged as drift. A file matching one of a noun's own
 *  patterns is never scanned for that noun, even if the noun appears in it
 *  many times over — it *is* the noun's home. */
export const REMOVED_MECHANISM_NOUNS: Record<string, string[]> = {
  // Retired as the sole session-log committer (ADR-0009 amendment); kept only
  // as a `Stop`-miss fallback. `scripts/session-end.ts` is the implementation
  // (not `*.md`, so the live-docs scan below never reaches it, but it's listed
  // for readers matching the noun to its real home) and `.agents/skills/
  // log-session/SKILL.md` correctly documents the current fallback role.
  SessionEnd: ['scripts/session-end.ts', 'docs/adr/0009-*', '.agents/skills/log-session/SKILL.md'],
}

export interface Doc {
  /** Path relative to the repo root, e.g. `docs/adr/0009-....md`. */
  file: string
  content: string
}

export interface DriftViolation {
  noun: string
  file: string
  line: number
  excerpt: string
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`)
}

/** Whether `file` is one of `noun`'s own sanctioned homes. */
export function isAllowedHome(file: string, patterns: string[]): boolean {
  return patterns.some((pattern) => globToRegExp(pattern).test(file))
}

function wordBoundaryRegExp(noun: string): RegExp {
  return new RegExp(`\\b${noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
}

/** Pure core: which (noun, doc) pairs are drift. Every doc not matching one of
 *  `noun`'s own `homes` patterns is scanned line-by-line for a whole-word
 *  match — `\b`-bounded so e.g. `SessionEndpoint` doesn't false-positive on
 *  `SessionEnd`. */
export function findDriftViolations(homes: Record<string, string[]>, docs: Doc[]): DriftViolation[] {
  const violations: DriftViolation[] = []
  for (const [noun, patterns] of Object.entries(homes)) {
    const re = wordBoundaryRegExp(noun)
    for (const doc of docs) {
      if (isAllowedHome(doc.file, patterns)) continue
      const lines = doc.content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? ''
        if (re.test(line)) {
          violations.push({ noun, file: doc.file, line: i + 1, excerpt: line.trim() })
        }
      }
    }
  }
  return violations
}

// ── Live-docs discovery (thin git shell) ────────────────────────────────────

/** Every `*.md` file outside `layers/` that isn't gitignored — tracked *and*
 *  not-yet-added (`--others --exclude-standard`), so a doc authored but not
 *  yet `git add`ed still gets scanned locally, not just at CI's post-checkout
 *  tracked-only state. See the header comment for why `layers/` (dated Tenant
 *  content) is out of scope. Excludes `node_modules`, `.nuxt`, etc. via the
 *  same `.gitignore` git already resolves. */
function listLiveDocs(cwd: string): string[] {
  const raw = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', '*.md'], { cwd, encoding: 'utf8' })
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('layers/'))
}

function loadDocs(files: string[], cwd: string): Doc[] {
  return files.map((file) => ({ file, content: readFileSync(join(cwd, file), 'utf8') }))
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function printReport(violations: DriftViolation[]): void {
  for (const v of violations) {
    console.error(`\n${v.file}:${v.line}  "${v.noun}" referenced outside its sanctioned home(s)`)
    console.error(`  ${v.excerpt}`)
  }
  const status = violations.length === 0 ? 'PASS' : 'FAIL'
  console.log(`\ncheck-docs-drift: ${status} — ${violations.length} violation(s)`)
}

function main(): void {
  const docs = loadDocs(listLiveDocs(root), root)
  const violations = findDriftViolations(REMOVED_MECHANISM_NOUNS, docs)
  printReport(violations)
  if (violations.length > 0) process.exit(1)
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
