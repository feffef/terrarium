// Unit tests for the verdict-line script's pure core (issue #2833). The git
// and GitHub reads are a thin shell over these.
import { describe, expect, it } from 'vitest'
import { verdictLine, headMismatchWarning, resolveSha, isHexSha } from '../../scripts/github/verdict-line.ts'

const SHA = '0123456789abcdef0123456789abcdef01234567'

describe('verdictLine', () => {
  it('prints the full SHA on a line merge-pr.ts accepts', () => {
    expect(verdictLine(SHA)).toBe(`Reviewed: ${SHA}`)
    expect(verdictLine(SHA)).toMatch(/^Reviewed: `?([0-9a-f]{7,40})`?\s*$/im)
  })
})

describe('isHexSha', () => {
  it('accepts 7 to 40 hex digits in either case and rejects the rest', () => {
    expect(isHexSha('0123abc')).toBe(true)
    expect(isHexSha(SHA.toUpperCase())).toBe(true)
    for (const bad of ['', 'abc12', 'xyz1234', `${SHA}0`, 'HEAD']) expect(isHexSha(bad)).toBe(false)
  })
})

describe('resolveSha', () => {
  it('expands an abbreviated SHA to the PR head, with no warning', () => {
    expect(resolveSha('0123456', SHA, 7)).toEqual({ sha: SHA, warning: null })
  })

  it('matches a prefix ignoring case', () => {
    expect(resolveSha('0123456789ABCDEF', SHA, 7).sha).toBe(SHA)
  })

  it('keeps a full matching SHA without a warning', () => {
    expect(resolveSha(SHA, SHA, 7)).toEqual({ sha: SHA, warning: null })
  })

  it('keeps the given SHA and warns when it is no prefix of the PR head', () => {
    const r = resolveSha('fffffff', SHA, 7)
    expect(r.sha).toBe('fffffff')
    expect(r.warning).toContain(SHA)
  })

  it('has nothing to compare without a PR head', () => {
    expect(resolveSha('0123abc', null, 7)).toEqual({ sha: '0123abc', warning: null })
  })
})

describe('headMismatchWarning', () => {
  it('is null when HEAD is the PR head, ignoring case', () => {
    expect(headMismatchWarning(SHA, SHA.toUpperCase(), 7)).toBeNull()
  })

  it('names both SHAs when they differ', () => {
    const w = headMismatchWarning(SHA, 'f'.repeat(40), 7)
    expect(w).toContain(SHA)
    expect(w).toContain('f'.repeat(40))
    expect(w).toContain('#7')
  })
})
