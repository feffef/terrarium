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
import {
  checkProvenance,
  commitDateWithinSeason,
  scanDirectives,
  validateReferences,
} from '../../scripts/validate-content-refs.ts'
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

function middenPagesCol(cwdRel: string): ExpandedCollection {
  return {
    key: 'midden_trench_pages',
    tenant: 'midden',
    space: 'trench',
    collection: 'pages',
    include: '**/*.md',
    cwdRel,
    type: 'page',
    schema: pageSchema,
  }
}

function middenArtifactsCol(cwdRel: string): ExpandedCollection {
  return {
    key: 'midden_trench_artifacts',
    tenant: 'midden',
    space: 'trench',
    collection: 'artifacts',
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

// ── validateReferences() — Midden page body: ::midden-artifact resolution ──
// (issue #773) — a page body embedding `::midden-artifact{slug="..."}`
// (MiddenArtifact.vue, #521) with a typo'd or stale `slug` previously sailed
// through `validate:content` silently; only a runtime "Artifact not found"
// fallback caught it. This Space has no `phenology`, so unlike a Specimen
// page it gets reference resolution only — no almanac/phase-note checks.

/** Writes a minimal valid Midden Site: one `pages` Document ("home") whose
 *  body embeds one real Artifact by slug, and the Artifact Document itself. */
function writeValidMiddenSite(root: string): ExpandedCollection[] {
  mkdirSync(join(root, 'pages'), { recursive: true })
  mkdirSync(join(root, 'artifacts'), { recursive: true })
  writeFileSync(join(root, 'pages', 'index.md'), '---\ntitle: Trench\n---\nLanding.\n')
  writeFileSync(
    join(root, 'pages', 'home.md'),
    ['---', 'title: Home', '---', '', 'Some dig report prose.', '', '::midden-artifact{slug="the-find"}', '::', ''].join(
      '\n',
    ),
  )
  writeFileSync(join(root, 'artifacts', 'the-find.yml'), 'site: home\n')
  return [middenPagesCol('pages'), middenArtifactsCol('artifacts')]
}

describe('validateReferences() — Midden page body: ::midden-artifact resolution (issue #773)', () => {
  it('reports no violations when the slug resolves to a real Artifact', () => {
    const cols = writeValidMiddenSite(dir)
    const report = validateReferences(cols, dir)
    expect(report.violations).toEqual([])
    expect(report.groupsChecked).toBe(1)
  })

  it('fails when ::midden-artifact{slug} names no real Artifact (a typo/stale slug)', () => {
    const cols = writeValidMiddenSite(dir)
    writeFileSync(
      join(dir, 'pages', 'home.md'),
      ['---', 'title: Home', '---', '', '::midden-artifact{slug="the-ghost-find"}', '::', ''].join('\n'),
    )
    const report = validateReferences(cols, dir)
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]?.key).toBe('midden_trench_pages')
    expect(report.violations[0]?.messages.join()).toMatch(
      /midden-artifact\{slug="the-ghost-find"\}.*names no Document in this Space's "artifacts" collection/,
    )
  })

  it('fails when ::midden-artifact has no "slug" attribute to resolve', () => {
    const cols = writeValidMiddenSite(dir)
    writeFileSync(join(dir, 'pages', 'home.md'), ['---', 'title: Home', '---', '', '::midden-artifact', '::', ''].join('\n'))
    const report = validateReferences(cols, dir)
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]?.messages.join()).toMatch(/"::midden-artifact" has no "slug" attribute to resolve/)
  })

  it('does not require an ::almanac or ::phase-note — those are Atlas-only invariants', () => {
    const cols = writeValidMiddenSite(dir)
    const report = validateReferences(cols, dir)
    expect(report.violations).toEqual([])
  })
})

// ── checkProvenance() — the provenance-reference soft checks (Midden) ───────
//
// The path rule is a DENYLIST of what is actually wrong, not an allowlist of
// permitted characters: the check exists to catch a typo, and an allowlist
// kept rejecting legitimate repo paths (a pnpm patch filename's `@`, a Nuxt
// dynamic route's `[`/`]`) — both of which real artifacts already cite.

describe('checkProvenance() — file-kind path plausibility', () => {
  const filePath = (path: unknown) => checkProvenance({ kind: 'file', path }, dir)

  it('accepts an ordinary repo-relative path', () => {
    expect(filePath('scripts/validate-content-refs.ts')).toEqual([])
    expect(filePath('CONTEXT.md')).toEqual([])
  })

  it('accepts a pnpm patch filename (the "@" an allowlist rejected)', () => {
    expect(filePath('patches/@nuxt__content@3.15.0.patch')).toEqual([])
  })

  it('accepts a Nuxt dynamic route (the "[" / "]" an allowlist rejected)', () => {
    expect(filePath('layers/journal/app/pages/t/journal/[space]/index.vue')).toEqual([])
  })

  it('accepts a trailing-slash directory path (load-bearing for midden-survey, #752)', () => {
    expect(filePath('layers/journal/app/components/journal/prototype/')).toEqual([])
  })

  it('rejects an empty or whitespace-only path', () => {
    expect(filePath('')).toHaveLength(1)
    expect(filePath('   ')).toHaveLength(1)
    expect(filePath(undefined)).toHaveLength(1)
  })

  it('rejects a leading "/" (absolute, not repo-relative)', () => {
    expect(filePath('/etc/passwd')).toHaveLength(1)
  })

  it('rejects an embedded space', () => {
    expect(filePath('scripts/validate content.ts')).toHaveLength(1)
  })

  it('rejects a backslash', () => {
    expect(filePath('scripts\\validate-content.ts')).toHaveLength(1)
  })

  it('rejects a ".." traversal segment', () => {
    expect(filePath('../outside/the/repo.ts')).toHaveLength(1)
    expect(filePath('scripts/../../escape.ts')).toHaveLength(1)
  })

  it('accepts ".." inside a segment, which traverses nothing', () => {
    expect(filePath('docs/notes..draft.md')).toEqual([])
  })
})

describe('checkProvenance() — commit-kind path plausibility', () => {
  // A well-formed hash whose `git cat-file` lookup fails is never itself a
  // violation (shallow-clone stance) — so these isolate the path rule.
  const hash = 'b23e8d3'
  const commit = (path?: unknown) =>
    checkProvenance(path === undefined ? { kind: 'commit', hash } : { kind: 'commit', hash, path }, dir)

  it('stays valid with no path — it is optional on this kind', () => {
    expect(commit()).toEqual([])
  })

  it('accepts the same real paths the file kind accepts', () => {
    expect(commit('patches/@nuxt__content@3.15.0.patch')).toEqual([])
    expect(commit('layers/journal/app/pages/t/journal/[space]/index.vue')).toEqual([])
  })

  it('rejects a malformed path instead of ignoring it', () => {
    expect(commit('/absolute/path.ts')).toHaveLength(1)
    expect(commit('has a space.ts')).toHaveLength(1)
    expect(commit('../escape.ts')).toHaveLength(1)
    expect(commit('  ')).toHaveLength(1)
  })

  it('still rejects a malformed hash', () => {
    expect(checkProvenance({ kind: 'commit', hash: 'nothex' }, dir)).toHaveLength(1)
  })

  it('reports a malformed hash and a malformed path together', () => {
    expect(checkProvenance({ kind: 'commit', hash: 'nothex', path: '/absolute' }, dir)).toHaveLength(2)
  })
})

describe('commitDateWithinSeason() — the removedIn/stratum corroboration (Midden)', () => {
  const closed = { slug: 's', label: 'the S', start: '2026-07-10', end: '2026-07-13' }
  const open = { slug: 'o', label: 'the O', start: '2026-07-14', end: null }

  it('accepts a commit date inside a closed season (inclusive bounds)', () => {
    expect(commitDateWithinSeason('2026-07-10T00:12:00+00:00', closed)).toBe(true)
    expect(commitDateWithinSeason('2026-07-13T23:59:59+02:00', closed)).toBe(true)
    expect(commitDateWithinSeason('2026-07-11T09:00:00Z', closed)).toBe(true)
  })

  it('rejects a commit date outside a closed season', () => {
    expect(commitDateWithinSeason('2026-07-09T23:59:59Z', closed)).toBe(false)
    expect(commitDateWithinSeason('2026-07-14T00:00:00Z', closed)).toBe(false)
  })

  it('treats an open-ended season as bounded only below', () => {
    expect(commitDateWithinSeason('2026-07-14T00:00:00Z', open)).toBe(true)
    expect(commitDateWithinSeason('2027-01-01T00:00:00Z', open)).toBe(true)
    expect(commitDateWithinSeason('2026-07-13T23:59:59Z', open)).toBe(false)
  })

  it('compares on the DATE PART of the commit instant, not clock time', () => {
    // A commit late on the season's last day, expressed in a negative offset
    // whose UTC instant crosses midnight, still belongs to that calendar day
    // as git renders it (%cI carries the committer's own offset).
    expect(commitDateWithinSeason('2026-07-13T20:00:00-07:00', closed)).toBe(true)
  })
})
