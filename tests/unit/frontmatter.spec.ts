import { describe, expect, it } from 'vitest'
import { frontmatterBlock, splitFrontmatter } from '../../scripts/lib/frontmatter.ts'

describe('splitFrontmatter()', () => {
  it('splits LF and CRLF files alike', () => {
    expect(splitFrontmatter('---\ntitle: A\n---\nbody\n')).toEqual({ frontmatter: { title: 'A' }, body: 'body\n' })
    expect(splitFrontmatter('---\r\ntitle: A\r\n---\r\nbody')).toEqual({ frontmatter: { title: 'A' }, body: 'body' })
  })

  it('returns {} and the whole text when there is no frontmatter', () => {
    expect(splitFrontmatter('just text')).toEqual({ frontmatter: {}, body: 'just text' })
  })

  it('coerces a scalar block to {}', () => {
    expect(splitFrontmatter('---\nplain\n---\nx').frontmatter).toEqual({})
  })
})

describe('frontmatterBlock()', () => {
  it('reports the YAML and the span a caller can slice off', () => {
    const text = '---\nadr: abc\n---\nbody'
    const block = frontmatterBlock(text)
    expect(block?.yaml).toBe('adr: abc')
    expect(text.slice(block!.length)).toBe('body')
  })
})
