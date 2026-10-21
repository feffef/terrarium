import { describe, expect, it } from 'vitest'
import { claimsIn, claimsInDiff, mismatch } from '../../scripts/check-states.ts'

const claim = (word: string) => ({ file: 'f.yml', line: 1, num: 1, word })

describe('claimsInDiff', () => {
  const diff = [
    '+++ b/layers/journal/content/current/skills/a.yml',
    '@@ -10,0 +11,3 @@',
    '+    note: >-',
    '+      PR #2269 fixed it; #2240 CONFIRMED HOLDING and',
    `+      #2307 merged,${' '.repeat(70)}#99 unrelated text.`,
    '@@ -40 +43 @@',
    '+      issue #5 stays open',
  ].join('\n')

  it('pairs each number with the state words near it and reports the number\'s own line', () => {
    const got = claimsInDiff(diff).map((c) => `${c.file.split('/').pop()}:${c.line} #${c.num} ${c.word}`)
    expect(got).toContain('a.yml:12 #2269 fixed')
    expect(got).toContain('a.yml:13 #2307 merged')
    expect(got).toContain('a.yml:43 #5 open')
  })

  it('ignores a number with no state word near it', () => {
    expect(claimsInDiff(diff).filter((c) => c.num === 99)).toEqual([])
  })

  it('reads nothing from removed or context lines', () => {
    expect(claimsInDiff('+++ b/a.yml\n@@ -1 +1 @@\n-#7 merged\n context #8 closed')).toEqual([])
  })
})

describe('claimsIn', () => {
  it('leaves compounds, past states and clause breaks alone', () => {
    expect(claimsIn('an open-issue home for #5', 't', () => 1)).toEqual([])
    expect(claimsIn('#5 was open then', 't', () => 1)).toEqual([])
    expect(claimsIn('PR #5 was merged', 't', () => 1)).toHaveLength(1)
    expect(claimsIn('closed. Next, #5', 't', () => 1)).toEqual([])
    expect(claimsIn('merged #5 and #6', 't', () => 1).map((c) => c.num)).toEqual([5])
  })


  it('counts a state word once per number', () => {
    expect(claimsIn('#4 closed, then #4 closed again', 't', () => 1)).toHaveLength(1)
  })
})

describe('mismatch', () => {
  const open = { state: 'open' }
  const closed = { state: 'closed', state_reason: 'completed' }
  const wontfix = { state: 'closed', state_reason: 'not_planned' }
  const merged = { state: 'closed', pull_request: { merged_at: '2026-10-20T00:00:00Z' } }
  const unmerged = { state: 'closed', pull_request: { merged_at: null } }

  it('accepts what GitHub agrees with', () => {
    expect(mismatch(claim('open'), open)).toBeNull()
    expect(mismatch(claim('closed'), closed)).toBeNull()
    expect(mismatch(claim('fixed'), merged)).toBeNull()
    expect(mismatch(claim('merged'), merged)).toBeNull()
    expect(mismatch(claim('wontfix'), wontfix)).toBeNull()
  })

  it('flags a state GitHub does not hold, saying what it holds', () => {
    expect(mismatch(claim('closed'), open)).toBe('GitHub says open')
    expect(mismatch(claim('open'), closed)).toBe('GitHub says closed (completed)')
    expect(mismatch(claim('merged'), unmerged)).toBe('GitHub says closed')
    expect(mismatch(claim('wontfix'), closed)).toBe('GitHub says closed (completed)')
    expect(mismatch(claim('reopened'), merged)).toBe('GitHub says merged')
  })
})
