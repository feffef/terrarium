// Unit tests for `validateReferences()` (issue #446) — the pure-ish core of
// the referential-integrity + Atlas MDC structural pass that `pnpm
// validate:content` also runs (via `scripts/validate-content-refs.ts`).
// Exercises it against hand-built fixture files under a throwaway temp dir
// (not the real `layers/atlas/` tree), in the same spirit as
// `validate-content.spec.ts`: a valid baseline plus one fixture per violation
// kind, so a regression here is caught in isolation from the real content.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { scanDirectives, validateReferences } from '../../scripts/validate-content-refs.ts'
import type { ExpandedCollection } from '../../shared/expand.ts'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'validate-content-refs-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

// ── scanDirectives() — the colon-fence scanner ──────────────────────────────

describe('scanDirectives()', () => {
  it('matches a 2-colon leaf closed by a bare 2-colon line', () => {
    const { instances, unclosed } = scanDirectives('::almanac\n::\n')
    expect(instances).toEqual([{ tag: 'almanac', attrs: {}, line: 1 }])
    expect(unclosed).toEqual([])
  })

  it('matches a 3-colon container nesting a 2-colon leaf', () => {
    const body = [
      ':::phase-note{of="x"}',
      'prose',
      '::sighting{date="2026-01-01"}',
      '::',
      'more prose',
      ':::',
    ].join('\n')
    const { instances, unclosed } = scanDirectives(body)
    expect(instances.map((i) => i.tag)).toEqual(['phase-note', 'sighting'])
    expect(instances[0]?.attrs).toEqual({ of: 'x' })
    expect(instances[1]?.attrs).toEqual({ date: '2026-01-01' })
    expect(unclosed).toEqual([])
  })

  it('reports an unclosed container at end-of-body (the #446 regression)', () => {
    const { unclosed } = scanDirectives('::almanac\n\nno close follows\n')
    expect(unclosed).toEqual([{ tag: 'almanac', colons: 2, line: 1 }])
  })

  it('reports a directive left unclosed while nested inside a properly-closed parent container', () => {
    // The outer `:::phase-note` DOES get its matching `:::` — but the
    // `::sighting` nested inside it never gets its own `::` before that
    // outer close resolves. It must not be silently dropped when the outer
    // entry's close truncates the stack.
    const body = [':::phase-note{of="x"}', 'prose', '::sighting{date="2026-01-01"}', 'more prose', ':::'].join('\n')
    const { instances, unclosed } = scanDirectives(body)
    expect(instances.map((i) => i.tag)).toEqual(['phase-note', 'sighting'])
    expect(unclosed).toEqual([{ tag: 'sighting', colons: 2, line: 3 }])
  })

  it('ignores colon-only lines inside a fenced code block', () => {
    const body = ['```', '::', '```', '::almanac', '::'].join('\n')
    const { instances, unclosed } = scanDirectives(body)
    expect(instances).toEqual([{ tag: 'almanac', attrs: {}, line: 4 }])
    expect(unclosed).toEqual([])
  })
})

// ── validateReferences() — fixture helpers ──────────────────────────────────

// Neither schema is ever parsed against — validateReferences() reads raw YAML/
// frontmatter directly — they exist only to satisfy ExpandedCollection's type.
const pageSchema = z.object({})
const dataSchema = z.object({})

function pagesCol(cwdRel: string): ExpandedCollection {
  return {
    key: 'atlas_canopy_pages',
    tenant: 'atlas',
    space: 'canopy',
    collection: 'pages',
    include: '**/*.md',
    cwdRel,
    type: 'page',
    schema: pageSchema,
  }
}

function interactionsCol(cwdRel: string): ExpandedCollection {
  return {
    key: 'atlas_canopy_interactions',
    tenant: 'atlas',
    space: 'canopy',
    collection: 'interactions',
    include: '**/*.yml',
    cwdRel,
    type: 'data',
    schema: dataSchema,
  }
}

function observationsCol(cwdRel: string): ExpandedCollection {
  return {
    key: 'atlas_canopy_observations',
    tenant: 'atlas',
    space: 'canopy',
    collection: 'observations',
    include: '**/*.yml',
    cwdRel,
    type: 'data',
    schema: dataSchema,
  }
}

/** A valid Specimen page: one declared phase, one `::almanac`, one
 *  `::phase-note` naming that phase, and (optionally) one `::sighting`
 *  quoting a real ledger date. */
function specimenPage(opts: { phase: string; sightingDate?: string }): string {
  const sighting = opts.sightingDate ? `\n\n::sighting{date="${opts.sightingDate}"}\n::` : ''
  return [
    '---',
    'title: Test specimen',
    'phenology:',
    '  phases:',
    `    - { name: ${opts.phase}, label: "the ${opts.phase}", span: [0, 100] }`,
    '---',
    '',
    'Some prose.',
    '',
    '::almanac',
    '::',
    '',
    `:::phase-note{of="${opts.phase}"}`,
    `Body prose for ${opts.phase}.${sighting}`,
    ':::',
    '',
  ].join('\n')
}

/** Writes a minimal valid Biome: two specimens (`a`, `b`), one interaction
 *  edge a→b, one observation of `a` on `date`. Returns the three collections. */
function writeValidBiome(root: string, date = '2026-01-01'): ExpandedCollection[] {
  mkdirSync(join(root, 'pages'), { recursive: true })
  mkdirSync(join(root, 'interactions'), { recursive: true })
  mkdirSync(join(root, 'observations'), { recursive: true })
  writeFileSync(join(root, 'pages', 'index.md'), '---\ntitle: Canopy\n---\nLanding.\n')
  writeFileSync(join(root, 'pages', 'a.md'), specimenPage({ phase: 'first', sightingDate: date }))
  writeFileSync(join(root, 'pages', 'b.md'), specimenPage({ phase: 'first' }))
  writeFileSync(join(root, 'interactions', 'a-preys-on-b.yml'), 'from: a\nto: b\nkind: preys-on\nnote: n\n')
  writeFileSync(join(root, 'observations', 'obs.yml'), `date: "${date}"\ntime: night\nspecimen: a\nnote: n\n`)
  return [pagesCol('pages'), interactionsCol('interactions'), observationsCol('observations')]
}

describe('validateReferences() — valid baseline', () => {
  it('reports no violations for a well-formed Biome', () => {
    const cols = writeValidBiome(dir)
    const report = validateReferences(cols, dir)
    expect(report.violations).toEqual([])
    expect(report.groupsChecked).toBe(1)
  })

  it('skips a (Tenant, Space) with only an ordinary pages Collection (no phenology, no interactions/observations)', () => {
    mkdirSync(join(dir, 'pages'), { recursive: true })
    writeFileSync(join(dir, 'pages', 'hello.md'), '---\ntitle: Hello\n---\nJust a page.\n')
    const report = validateReferences([pagesCol('pages')], dir)
    expect(report.violations).toEqual([])
    expect(report.groupsChecked).toBe(0)
  })
})

describe('validateReferences() — interactions referential integrity', () => {
  it('fails when "from" names no real Specimen', () => {
    const cols = writeValidBiome(dir)
    writeFileSync(join(dir, 'interactions', 'a-preys-on-b.yml'), 'from: ghost\nto: b\nkind: preys-on\nnote: n\n')
    const report = validateReferences(cols, dir)
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]?.key).toBe('atlas_canopy_interactions')
    expect(report.violations[0]?.messages.join()).toMatch(/from.*"ghost"/)
  })

  it('fails when "to" names no real Specimen', () => {
    const cols = writeValidBiome(dir)
    writeFileSync(join(dir, 'interactions', 'a-preys-on-b.yml'), 'from: a\nto: ghost\nkind: preys-on\nnote: n\n')
    const report = validateReferences(cols, dir)
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]?.messages.join()).toMatch(/to.*"ghost"/)
  })

  it('fails on a self-edge (from === to)', () => {
    const cols = writeValidBiome(dir)
    writeFileSync(join(dir, 'interactions', 'a-preys-on-b.yml'), 'from: a\nto: a\nkind: preys-on\nnote: n\n')
    const report = validateReferences(cols, dir)
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]?.messages.join()).toMatch(/self-edge/)
  })
})

describe('validateReferences() — observations referential integrity', () => {
  it('fails when "specimen" names no real Specimen', () => {
    const cols = writeValidBiome(dir)
    writeFileSync(join(dir, 'observations', 'obs.yml'), 'date: "2026-01-01"\ntime: night\nspecimen: ghost\nnote: n\n')
    const report = validateReferences(cols, dir)
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]?.key).toBe('atlas_canopy_observations')
    expect(report.violations[0]?.messages.join()).toMatch(/specimen.*"ghost"/)
  })

  it('tolerates an ambient observation with no "specimen" field', () => {
    const cols = writeValidBiome(dir)
    writeFileSync(join(dir, 'observations', 'ambient.yml'), 'date: "2026-02-02"\ntime: dawn\nnote: something rippled\n')
    const report = validateReferences(cols, dir)
    expect(report.violations).toEqual([])
  })
})

describe('validateReferences() — Specimen body: phase-note resolution', () => {
  it('fails when ::phase-note{of} names an undeclared phase', () => {
    mkdirSync(join(dir, 'pages'), { recursive: true })
    const badBody = specimenPage({ phase: 'first' }).replace('of="first"', 'of="ghost-phase"')
    writeFileSync(join(dir, 'pages', 'a.md'), badBody)
    const report = validateReferences([pagesCol('pages')], dir)
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]?.key).toBe('atlas_canopy_pages')
    expect(report.violations[0]?.messages.join()).toMatch(/names no phase this page declares/)
  })

  it('fails when a declared phase has zero ::phase-note blocks', () => {
    mkdirSync(join(dir, 'pages'), { recursive: true })
    const body = [
      '---',
      'title: T',
      'phenology:',
      '  phases:',
      '    - { name: lonely, label: "the lonely", span: [0, 100] }',
      '---',
      '',
      '::almanac',
      '::',
      '',
    ].join('\n')
    writeFileSync(join(dir, 'pages', 'a.md'), body)
    const report = validateReferences([pagesCol('pages')], dir)
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]?.messages.join()).toMatch(/"lonely" has 0 "::phase-note"/)
  })

  it('fails when a declared phase has two ::phase-note blocks', () => {
    mkdirSync(join(dir, 'pages'), { recursive: true })
    const one = specimenPage({ phase: 'dup' })
    const twice = one.replace(':::phase-note{of="dup"}\nBody prose for dup.\n:::', () =>
      ':::phase-note{of="dup"}\nBody prose for dup.\n:::\n\n:::phase-note{of="dup"}\nAgain.\n:::')
    writeFileSync(join(dir, 'pages', 'a.md'), twice)
    const report = validateReferences([pagesCol('pages')], dir)
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]?.messages.join()).toMatch(/"dup" has 2 "::phase-note"/)
  })
})

describe('validateReferences() — Specimen body: sighting resolution', () => {
  it('fails on a malformed date', () => {
    const cols = writeValidBiome(dir)
    const bad = specimenPage({ phase: 'first', sightingDate: 'not-a-date' })
    writeFileSync(join(dir, 'pages', 'a.md'), bad)
    const report = validateReferences(cols, dir)
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]?.messages.join()).toMatch(/not a valid "YYYY-MM-DD" date/)
  })

  it('fails when the date matches no observation in the biome ledger', () => {
    const cols = writeValidBiome(dir)
    const bad = specimenPage({ phase: 'first', sightingDate: '2099-12-31' })
    writeFileSync(join(dir, 'pages', 'a.md'), bad)
    const report = validateReferences(cols, dir)
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]?.messages.join()).toMatch(/matches no observation/)
  })
})

describe('validateReferences() — Specimen body: almanac cardinality', () => {
  it('fails when ::almanac is missing', () => {
    mkdirSync(join(dir, 'pages'), { recursive: true })
    const body = specimenPage({ phase: 'first' }).replace('::almanac\n::\n\n', '')
    writeFileSync(join(dir, 'pages', 'a.md'), body)
    const report = validateReferences([pagesCol('pages')], dir)
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]?.messages.join()).toMatch(/expected exactly one "::almanac" block, found 0/)
  })

  it('fails when ::almanac appears twice', () => {
    mkdirSync(join(dir, 'pages'), { recursive: true })
    const body = specimenPage({ phase: 'first' }).replace('::almanac\n::\n', '::almanac\n::\n\n::almanac\n::\n')
    writeFileSync(join(dir, 'pages', 'a.md'), body)
    const report = validateReferences([pagesCol('pages')], dir)
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]?.messages.join()).toMatch(/expected exactly one "::almanac" block, found 2/)
  })
})

describe('validateReferences() — Specimen body: unclosed MDC container (the #446/#355 regression)', () => {
  it('fails when ::almanac has no closing "::"', () => {
    mkdirSync(join(dir, 'pages'), { recursive: true })
    const body = specimenPage({ phase: 'first' }).replace('::almanac\n::\n', '::almanac\n')
    writeFileSync(join(dir, 'pages', 'a.md'), body)
    const report = validateReferences([pagesCol('pages')], dir)
    expect(report.violations.length).toBeGreaterThan(0)
    expect(report.violations[0]?.messages.join()).toMatch(/"::almanac" is never closed/)
  })
})
