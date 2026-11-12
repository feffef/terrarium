import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { splitFrontmatter } from '../../../../scripts/lib/frontmatter.ts'
import { root } from '../../../../shared/expand.ts'
import { glassboxSitePath } from '../../page-checks.ts'
import { glassboxGuidePath, glassboxLatelyChanges, glassboxRunChange, glassboxRunStart } from '../../app/utils/workshop.ts'

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

describe('glassboxLatelyChanges', () => {
  const runs = [
    { stem: '2026-11-09T0025', changes: [{ page: 'a/10.x', what: 'No change', why: 'fine' }, { page: 'a/20.y', what: 'reworded', why: 'w' }, { raw: 'plain text' }] },
    { stem: '2026-11-08T0847', changes: [{ page: 'b/10.z', what: 'cut a repeat', why: 'w' }, { page: 'b/20.q', what: 'Fixed a claim', why: 'w' }] },
  ]

  it('lists changes newest run first and skips "No change" entries and raw strings', () => {
    expect(glassboxLatelyChanges(runs).map((c) => c.page)).toEqual(['a/20.y', 'b/10.z', 'b/20.q'])
  })

  it('stops at the limit', () => {
    expect(glassboxLatelyChanges(runs, 2).map((c) => c.page)).toEqual(['a/20.y', 'b/10.z'])
  })

  it('is empty when no run changed anything', () => {
    expect(glassboxLatelyChanges([{ stem: 's', changes: [{ raw: 'x' }] }])).toEqual([])
  })
})

describe('glassboxGuidePath', () => {
  it('drops the two-digit prefix and maps index to the guide landing', () => {
    expect(glassboxGuidePath('git-github/60.attribution')).toBe('/t/glassbox/guide/git-github/attribution')
    expect(glassboxGuidePath('walkthroughs/asking-for-a-change')).toBe('/t/glassbox/guide/walkthroughs/asking-for-a-change')
    expect(glassboxGuidePath('index')).toBe('/t/glassbox/guide')
  })
})

describe('the workshop memory page', () => {
  const { body } = splitFrontmatter(readFileSync(join(root, 'layers/glassbox/content/workshop/pages/index.md'), 'utf8'))

  it('stays within 2,500 words, not counting its component lines', () => {
    const words = body.split('\n').filter((line) => !line.startsWith('::')).join(' ').split(/\s+/).filter(Boolean)
    expect(words.length).toBeLessThanOrEqual(2500)
  })

  it('puts the Lately list before the memory text', () => {
    expect(body.indexOf('::workshop-lately')).toBeGreaterThan(-1)
    expect(body.indexOf('::workshop-lately')).toBeLessThan(body.indexOf('## Agent notes'))
  })

  it('places the run list after its text', () => {
    expect(body.indexOf('::workshop-runs')).toBeGreaterThan(body.indexOf('## Agent notes'))
  })

  it('shows no update checks', () => {
    expect(body).not.toContain('::workshop-checks')
  })
})

describe('glassbox-update checks', () => {
  it('links only pages that exist, by the path glassboxGuidePath builds', () => {
    const { pages } = parse(readFileSync(join(root, 'layers/glassbox/content/workshop/checks/update.yml'), 'utf8')) as { pages: { page: string }[] }
    for (const { page } of pages) expect(glassboxGuidePath(page)).toBe(glassboxSitePath('guide', `${page}.md`))
  })

  // A moved page must be renamed here, or it silently loses its check date (glassbox-curate, Move).
  it('names only guide pages that exist', () => {
    const { pages } = parse(readFileSync(join(root, 'layers/glassbox/content/workshop/checks/update.yml'), 'utf8')) as { pages: { page: string }[] }
    expect(pages.map((p) => p.page).filter((page) => !existsSync(join(root, 'layers/glassbox/content/guide/pages', `${page}.md`)))).toEqual([])
  })
})
