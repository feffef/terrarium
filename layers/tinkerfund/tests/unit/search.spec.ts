// Search (story #1382): the visitor's words become a safe `LIKE` term, and the
// Space's matching Campaigns come back best match first.
import { describe, expect, it } from 'vitest'
import { rankTinkerfundHits, tinkerfundSearchTerm } from '../../app/utils/search.ts'

describe('tinkerfundSearchTerm', () => {
  it('trims and collapses whitespace, including line breaks from the URL', () => {
    expect(tinkerfundSearchTerm('  one \n  key\t')).toBe('one key')
  })

  it('drops the LIKE wildcards % and _', () => {
    expect(tinkerfundSearchTerm('100%_mug')).toBe('100mug')
    expect(tinkerfundSearchTerm('%_%')).toBe('')
  })

  it('breaks up SQL comment markers but keeps a single hyphen', () => {
    expect(tinkerfundSearchTerm('one--key /* x */ rain-aware')).toBe('one-key / x / rain-aware')
  })
})

describe('rankTinkerfundHits', () => {
  const hit = (title: string) => ({ path: `/campaigns/${title.toLowerCase().replace(/ /g, '-')}`, title })

  it('puts a title that starts with the term first, then a title word, then anywhere in the title, then the rest', () => {
    const hits = ['Rock', 'Clamp', 'Solar Lamp Stand', 'Anti-Lamp', 'Lamp Oil', 'Book'].map(hit)
    expect(rankTinkerfundHits(hits, 'LAMP').map((h) => h.title)).toEqual(['Lamp Oil', 'Anti-Lamp', 'Solar Lamp Stand', 'Clamp', 'Book', 'Rock'])
  })
})
