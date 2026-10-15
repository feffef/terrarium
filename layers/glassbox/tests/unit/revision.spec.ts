import { describe, expect, it } from 'vitest'
import { formatGlassboxDate } from '../../app/utils/revision.ts'

describe('formatGlassboxDate', () => {
  it('reads like "14 Oct 2026"', () => {
    expect(formatGlassboxDate('2026-10-14')).toBe('14 Oct 2026')
    expect(formatGlassboxDate('2026-01-01')).toBe('1 Jan 2026')
    expect(formatGlassboxDate('2026-09-30')).toBe('30 Sep 2026')
  })
})
