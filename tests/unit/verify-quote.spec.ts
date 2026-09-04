import { describe, expect, it } from 'vitest'
import { normalize, verifyQuote } from '../../scripts/verify-quote.ts'

describe('normalize()', () => {
  it('collapses markdown links to their visible text', () => {
    expect(normalize('see the [PR body](https://example.com/pr/1) for detail')).toBe(
      'see the PR body for detail',
    )
  })

  it('folds line-wrapped whitespace into single spaces', () => {
    expect(normalize('a line-wrapped\nsentence that\n  keeps going')).toBe(
      'a line-wrapped sentence that keeps going',
    )
  })

  it('trims leading/trailing whitespace', () => {
    expect(normalize('  padded  ')).toBe('padded')
  })
})

describe('verifyQuote()', () => {
  it('passes when the quote matches after normalization', () => {
    const source = 'The agent backdated the request,\nnot the [human](https://example.com/x).'
    expect(verifyQuote('The agent backdated the request, not the human.', source)).toBe(true)
  })

  it('fails when the quote text is not actually in the source', () => {
    const source = 'The human backdated the request, not the agent.'
    expect(verifyQuote('the agent backdated the request', source)).toBe(false)
  })

  it('is not a meaning check — a text-identical quote can invert the source\'s point', () => {
    // Text match only, per the script's doc comment: it verifies the substring
    // is present, not that the surrounding context is what the source meant.
    const source = 'The human ordered the backdate; the agent merely applied it.'
    expect(verifyQuote('the agent merely applied it', source)).toBe(true)
  })
})
