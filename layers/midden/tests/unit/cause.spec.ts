// The Trench's cause-of-death filter (layers/midden/app/utils/cause.ts) and its
// agreement with the schema enum.
import { describe, expect, it } from 'vitest'
import { MIDDEN_CAUSES, middenCauseFromQuery, middenCauseTally } from '../../app/utils/cause.ts'
import { artifactSchema } from '../../tenant.config.ts'

describe('MIDDEN_CAUSES', () => {
  it('matches the schema enum, in order', () => {
    expect(MIDDEN_CAUSES.map((c) => c.cause)).toEqual(artifactSchema.shape.cause.options)
  })

  it('is required and rejects a cause outside the six', () => {
    expect(artifactSchema.shape.cause.safeParse(undefined).success).toBe(false)
    expect(artifactSchema.shape.cause.safeParse('superseded').success).toBe(false)
  })
})

describe('middenCauseFromQuery', () => {
  it('accepts a known cause and ignores anything else', () => {
    expect(middenCauseFromQuery('cut-as-excess')).toBe('cut-as-excess')
    expect(middenCauseFromQuery('superseded')).toBeUndefined()
    expect(middenCauseFromQuery('toString')).toBeUndefined()
    expect(middenCauseFromQuery(['cut-as-excess'])).toBeUndefined()
    expect(middenCauseFromQuery(undefined)).toBeUndefined()
  })
})

describe('middenCauseTally', () => {
  it('counts Sites per cause in chip order and drops causes no Site holds', () => {
    const tally = middenCauseTally([['cut-as-excess', 'closed-by-owner'], ['cut-as-excess'], []])
    expect(tally.map((t) => [t.meta.cause, t.sites])).toEqual([
      ['closed-by-owner', 1],
      ['cut-as-excess', 2],
    ])
  })
})
