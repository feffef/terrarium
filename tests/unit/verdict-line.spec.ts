// Unit tests for the verdict-line script's pure core (issue #2833). The git
// and GitHub reads are a thin shell over these.
import { describe, expect, it } from 'vitest'
import { verdictLine, headMismatchWarning } from '../../scripts/github/verdict-line.ts'

const SHA = '0123456789abcdef0123456789abcdef01234567'

describe('verdictLine', () => {
  it('prints the full SHA on a line merge-pr.ts accepts', () => {
    expect(verdictLine(SHA)).toBe(`Reviewed: ${SHA}`)
    expect(verdictLine(SHA)).toMatch(/^Reviewed: `?([0-9a-f]{7,40})`?\s*$/im)
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
