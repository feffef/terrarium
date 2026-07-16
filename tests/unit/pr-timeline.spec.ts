// Unit tests for the pr-timeline helper's pure core — date-range arg parsing
// (both the YYYY-MM-DD and full-ISO-instant forms) and the half-open
// range-filter/sort — where correctness bugs would hide. The git shell is a
// thin wrapper over these, exercised by running the script directly
// (`tsx scripts/pr-timeline.ts <from> <to>`).
import { describe, expect, it } from 'vitest'
import { parseRangeArg, prTimeline, type PrTimelineRow } from '../../scripts/pr-timeline.ts'

describe('parseRangeArg()', () => {
  it('parses a YYYY-MM-DD date as UTC midnight', () => {
    expect(parseRangeArg('2026-07-01')).toBe('2026-07-01T00:00:00.000Z')
  })
  it('parses a full ISO instant, normalizing to UTC', () => {
    expect(parseRangeArg('2026-07-01T12:30:00+02:00')).toBe('2026-07-01T10:30:00.000Z')
  })
  it('parses a full ISO instant already in UTC', () => {
    expect(parseRangeArg('2026-07-01T12:30:00Z')).toBe('2026-07-01T12:30:00.000Z')
  })
  it('throws on an unparseable string', () => {
    expect(() => parseRangeArg('not-a-date')).toThrow()
  })
  it('throws on an empty string', () => {
    expect(() => parseRangeArg('')).toThrow()
  })
})

describe('prTimeline()', () => {
  const rows: PrTimelineRow[] = [
    { number: 1, title: 'at-from boundary (included)', mergedAtUtc: '2026-07-01T00:00:00.000Z', sha: 'a', commitCount: 1 },
    { number: 2, title: 'middle', mergedAtUtc: '2026-07-02T00:00:00.000Z', sha: 'b', commitCount: 2 },
    { number: 3, title: 'at-to boundary (excluded)', mergedAtUtc: '2026-07-03T00:00:00.000Z', sha: 'c', commitCount: 3 },
    { number: 4, title: 'before-from (excluded)', mergedAtUtc: '2026-06-30T23:59:59.000Z', sha: 'd', commitCount: 4 },
  ]

  it('keeps rows in the half-open [from, to) range: at `from` included, at `to` excluded', () => {
    const result = prTimeline(rows, '2026-07-01T00:00:00.000Z', '2026-07-03T00:00:00.000Z')
    expect(result.map((r) => r.number)).toEqual([1, 2])
  })

  it('sorts the surviving rows oldest-to-newest regardless of input order', () => {
    const shuffled = [rows[1]!, rows[0]!, rows[2]!]
    const result = prTimeline(shuffled, '2026-07-01T00:00:00.000Z', '2026-07-03T00:00:00.000Z')
    expect(result.map((r) => r.number)).toEqual([1, 2])
  })

  it('passes through the other fields untouched', () => {
    const result = prTimeline(rows, '2026-07-01T00:00:00.000Z', '2026-07-03T00:00:00.000Z')
    expect(result[0]).toEqual(rows[0])
  })

  it('returns an empty array when nothing falls in range', () => {
    expect(prTimeline(rows, '2020-01-01T00:00:00.000Z', '2020-01-02T00:00:00.000Z')).toEqual([])
  })
})
