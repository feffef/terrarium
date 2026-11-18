// The on-ramp ordering shared by the landing's "New here?" cards and each
// on-ramp page's tour footer (layers/journal/app/utils/onramp.ts).
import { describe, expect, it } from 'vitest'
import { ONRAMP_LEADING, onrampSteps } from '../../app/utils/onramp.ts'

describe('ONRAMP_LEADING', () => {
  it('leads with the Glass Box guide, an absolute link outside the Journal', () => {
    expect(ONRAMP_LEADING.map((c) => c.to)).toEqual(['/t/glassbox/guide'])
    expect(ONRAMP_LEADING.every((c) => c.title && c.blurb)).toBe(true)
  })
})

describe('onrampSteps', () => {
  it('keeps only labelled on-ramp pages, in onramp order', () => {
    const steps = onrampSteps([
      { path: '/history', onramp: 3, onrampLabel: 'How it got this way' },
      { path: '/', onrampLabel: 'not on the ramp' },
      { path: '/architecture', onramp: 1, onrampLabel: 'How it is built', onrampBlurb: 'tech' },
      { path: '/unlabelled', onramp: 2 },
    ])
    expect(steps).toEqual([
      { path: '/architecture', label: 'How it is built', blurb: 'tech' },
      { path: '/history', label: 'How it got this way', blurb: undefined },
    ])
  })
})
