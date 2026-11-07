import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { splitFrontmatter } from '../../../../scripts/lib/frontmatter.ts'
import { root } from '../../../../shared/expand.ts'
import { glassboxCheckRows, glassboxRunChange, glassboxRunStart } from '../../app/utils/workshop.ts'

describe('glassboxRunStart', () => {
  it('reads the UTC start time off the run entry\'s filename', () => {
    expect(glassboxRunStart('2026-11-06T1530')).toBe('2026-11-06 15:30 UTC')
  })
})

describe('glassboxRunChange', () => {
  it('splits "page | what | why"', () => {
    expect(glassboxRunChange('claude-code/01.claude-md | cut a duplicate | the Lesson restated another')).toEqual({
      page: 'claude-code/01.claude-md',
      what: 'cut a duplicate',
      why: 'the Lesson restated another',
    })
  })

  it('keeps pipes inside the reason', () => {
    expect(glassboxRunChange('p | a | b | c')).toEqual({ page: 'p', what: 'a', why: 'b | c' })
  })

  it('falls back to the raw string when it does not split into three parts', () => {
    expect(glassboxRunChange('one | two')).toEqual({ raw: 'one | two' })
    expect(glassboxRunChange('plain text')).toEqual({ raw: 'plain text' })
  })
})

describe('glassboxCheckRows', () => {
  it('lists the oldest check first, ties by page', () => {
    const rows = glassboxCheckRows([
      { page: 'b/01.z', checked: '2026-11-01' },
      { page: 'a/02.y', checked: '2026-11-03' },
      { page: 'a/01.x', checked: '2026-11-01' },
    ])
    expect(rows.map((r) => r.page)).toEqual(['a/01.x', 'b/01.z', 'a/02.y'])
  })

  it('leaves its input unsorted', () => {
    const checks = [{ page: 'b', checked: '2026-11-02' }, { page: 'a', checked: '2026-11-01' }]
    glassboxCheckRows(checks)
    expect(checks.map((c) => c.page)).toEqual(['b', 'a'])
  })
})

describe('the workshop memory page', () => {
  const { body } = splitFrontmatter(readFileSync(join(root, 'layers/glassbox/content/workshop/pages/index.md'), 'utf8'))

  it('stays within 2,500 words, not counting its component lines', () => {
    const words = body.split('\n').filter((line) => !line.startsWith('::')).join(' ').split(/\s+/).filter(Boolean)
    expect(words.length).toBeLessThanOrEqual(2500)
  })

  it('places both lists after its text', () => {
    expect(body.indexOf('::workshop-runs')).toBeGreaterThan(body.indexOf('## Memory'))
    expect(body.indexOf('::workshop-checks')).toBeGreaterThan(body.indexOf('::workshop-runs'))
  })
})

describe('glassbox-update checks', () => {
  // A moved page must be renamed here, or it silently loses its check date (glassbox-curate, Move).
  it('names only guide pages that exist', () => {
    const { pages } = parse(readFileSync(join(root, 'layers/glassbox/content/workshop/checks/update.yml'), 'utf8')) as { pages: { page: string }[] }
    expect(pages.map((p) => p.page).filter((page) => !existsSync(join(root, 'layers/glassbox/content/guide/pages', `${page}.md`)))).toEqual([])
  })
})
