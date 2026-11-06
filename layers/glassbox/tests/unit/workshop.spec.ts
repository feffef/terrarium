import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { splitFrontmatter } from '../../../../scripts/lib/frontmatter.ts'
import { root } from '../../../../shared/expand.ts'
import { glassboxCheckRows, glassboxRunChange, glassboxRunStart } from '../../app/utils/workshop.ts'

describe('glassboxRunStart', () => {
  it('reads the UTC start time off the run entry\'s filename', () => {
    expect(glassboxRunStart('2026-11-06T1530')).toBe('2026-11-06 15:30 UTC')
  })
})

describe('glassboxRunChange', () => {
  const pages = { 'claude-code/01.claude-md': { path: '/claude-code/claude-md', title: 'CLAUDE.md' } }

  it('splits "page | what | why" and links a page that resolves', () => {
    expect(glassboxRunChange('claude-code/01.claude-md | cut a duplicate | the Lesson restated another', pages)).toEqual({
      page: 'claude-code/01.claude-md',
      to: '/claude-code/claude-md',
      what: 'cut a duplicate',
      why: 'the Lesson restated another',
    })
  })

  it('leaves a page that does not resolve unlinked', () => {
    expect(glassboxRunChange('gone/01.page | a | b', pages)).toEqual({ page: 'gone/01.page', what: 'a', why: 'b' })
  })

  it('keeps pipes inside the reason', () => {
    expect(glassboxRunChange('p | a | b | c', {})).toEqual({ page: 'p', what: 'a', why: 'b | c' })
  })

  it('falls back to the raw string when it does not split into three parts', () => {
    expect(glassboxRunChange('one | two', pages)).toEqual({ raw: 'one | two' })
    expect(glassboxRunChange('plain text', pages)).toEqual({ raw: 'plain text' })
  })
})

describe('glassboxCheckRows', () => {
  const pages = [
    { stem: 'a/01.x', path: '/a/x', title: 'X' },
    { stem: 'a/02.y', path: '/a/y', title: 'Y' },
    { stem: 'b/01.z', path: '/b/z', title: 'Z' },
  ]

  it('lists never-checked pages first, then oldest check first, ties by path', () => {
    const rows = glassboxCheckRows(pages, [
      { page: 'b/01.z', checked: '2026-11-01' },
      { page: 'a/01.x', checked: '2026-11-01' },
    ])
    expect(rows.map((r) => [r.stem, r.checked])).toEqual([
      ['a/02.y', undefined],
      ['a/01.x', '2026-11-01'],
      ['b/01.z', '2026-11-01'],
    ])
  })

  it('ignores a check for a page that no longer exists', () => {
    expect(glassboxCheckRows(pages, [{ page: 'gone/01.q', checked: '2026-11-01' }]).map((r) => r.stem)).toEqual(['a/01.x', 'a/02.y', 'b/01.z'])
  })
})

describe('the workshop memory page', () => {
  const { body } = splitFrontmatter(readFileSync(join(root, 'layers/glassbox/content/workshop/pages/index.md'), 'utf8'))

  it('stays within 1,500 words, not counting its component lines', () => {
    const words = body.split('\n').filter((line) => !line.startsWith('::')).join(' ').split(/\s+/).filter(Boolean)
    expect(words.length).toBeLessThanOrEqual(1500)
  })

  it('places both lists after its text', () => {
    expect(body.indexOf('::workshop-runs')).toBeGreaterThan(body.indexOf('## Memory'))
    expect(body.indexOf('::workshop-checks')).toBeGreaterThan(body.indexOf('::workshop-runs'))
  })
})
