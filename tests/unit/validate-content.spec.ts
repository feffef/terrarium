// Unit tests for `validateContent()` (issue #133) — the pure-ish core of
// `pnpm validate:content` (`scripts/validate-content.ts`). Exercises it against
// real fixture files under a throwaway temp dir (not the real `tenants/` tree)
// so a schema regression here is caught in isolation from the actual content.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { validateContent } from '../../scripts/validate-content.ts'
import type { ExpandedCollection } from '../../shared/expand.ts'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'validate-content-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

/** An ExpandedCollection rooted at `<dir>/<cwdRel>`, defaulting to `data` — callers
 *  building a `page` collection spread this and override `type`. */
function baseCollection(cwdRel: string, schema: z.ZodObject<z.ZodRawShape>, include = '**/*.yml'): ExpandedCollection {
  return { key: `t_s_${cwdRel}`, tenant: 't', space: 's', collection: cwdRel, include, cwdRel, type: 'data', schema }
}

describe('validateContent() — data collections (strict schema)', () => {
  const schema = z.object({ note: z.string(), kind: z.enum(['a', 'b']) }).strict()

  it('passes a Document that matches its schema', () => {
    writeFileSync(join(dir, 'ok.yml'), 'note: fine\nkind: a\n')
    const report = validateContent([baseCollection('.', schema)], dir)
    expect(report.violations).toEqual([])
    expect(report.documentsChecked).toBe(1)
    expect(report.collectionsChecked).toBe(1)
  })

  it('fails a Document with an out-of-enum value', () => {
    writeFileSync(join(dir, 'bad.yml'), 'note: fine\nkind: nope\n')
    const report = validateContent([baseCollection('.', schema)], dir)
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]?.file).toContain('bad.yml')
    expect(report.violations[0]?.messages.join()).toMatch(/kind/)
  })

  it('fails a Document with an extra field the strict schema disallows', () => {
    writeFileSync(join(dir, 'extra.yml'), 'note: fine\nkind: a\nsurprise: true\n')
    const report = validateContent([baseCollection('.', schema)], dir)
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]?.messages.join()).toMatch(/surprise/)
  })

  it('fails a Document missing a required field', () => {
    writeFileSync(join(dir, 'missing.yml'), 'kind: a\n')
    const report = validateContent([baseCollection('.', schema)], dir)
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]?.messages.join()).toMatch(/note/)
  })
})

describe('validateContent() — page collections (frontmatter-only, non-strict)', () => {
  const schema = z.object({ badge: z.string().optional() })

  it('validates only the frontmatter, ignoring the Markdown body', () => {
    writeFileSync(join(dir, 'page.md'), '---\ntitle: Hello\nbadge: current\n---\n\nBody text here.\n')
    const report = validateContent([{ ...baseCollection('.', schema, '**/*.md'), type: 'page' }], dir)
    expect(report.violations).toEqual([])
  })

  it('tolerates built-in page fields (title/description/…) not named in the manifest schema', () => {
    // Non-strict page schemas only describe *additional* fields — built-ins
    // are synthesized by @nuxt/content itself, so extras must not fail here.
    writeFileSync(join(dir, 'index.md'), '---\ntitle: Landing\ndescription: hi\n---\nBody\n')
    const report = validateContent([{ ...baseCollection('.', schema, '**/*.md'), type: 'page' }], dir)
    expect(report.violations).toEqual([])
  })

  it('still catches a genuine schema violation in page frontmatter', () => {
    const strictish = z.object({ badge: z.enum(['current', 'archived']) })
    writeFileSync(join(dir, 'page.md'), '---\nbadge: not-a-real-badge\n---\nBody\n')
    const report = validateContent([{ ...baseCollection('.', strictish, '**/*.md'), type: 'page' }], dir)
    expect(report.violations).toHaveLength(1)
  })

  it('a page Collection with no additional schema is skipped entirely', () => {
    writeFileSync(join(dir, 'page.md'), '---\nanything: goes\n---\nBody\n')
    const col: ExpandedCollection = {
      key: 't_s_pages',
      tenant: 't',
      space: 's',
      collection: 'pages',
      include: '**/*.md',
      cwdRel: '.',
      type: 'page',
      schema: undefined,
    }
    const report = validateContent([col], dir)
    expect(report.violations).toEqual([])
    expect(report.collectionsChecked).toBe(0)
    expect(report.documentsChecked).toBe(0)
  })
})

describe('validateContent() — multiple collections', () => {
  it('checks every collection independently and aggregates violations', () => {
    const schemaA = z.object({ x: z.string() }).strict()
    const schemaB = z.object({ y: z.number() }).strict()
    const dirA = join(dir, 'a')
    const dirB = join(dir, 'b')
    mkdirSync(dirA, { recursive: true })
    mkdirSync(dirB, { recursive: true })
    writeFileSync(join(dirA, 'ok.yml'), 'x: hi\n')
    writeFileSync(join(dirB, 'bad.yml'), 'y: not-a-number\n')

    const cols: ExpandedCollection[] = [
      { key: 'a', tenant: 't', space: 's', collection: 'a', include: '**/*.yml', cwdRel: 'a', type: 'data', schema: schemaA },
      { key: 'b', tenant: 't', space: 's', collection: 'b', include: '**/*.yml', cwdRel: 'b', type: 'data', schema: schemaB },
    ]
    const report = validateContent(cols, dir)
    expect(report.collectionsChecked).toBe(2)
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]?.key).toBe('b')
  })
})
