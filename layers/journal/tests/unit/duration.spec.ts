import { describe, expect, it } from 'vitest'
import { formatJournalDuration } from '../../app/utils/duration'

describe('formatJournalDuration', () => {
  it('shows seconds below an hour', () => {
    expect(formatJournalDuration(45)).toBe('45s')
    expect(formatJournalDuration(192)).toBe('3m 12s')
    expect(formatJournalDuration(1147)).toBe('19m 7s')
    expect(formatJournalDuration(60)).toBe('1m 0s')
    expect(formatJournalDuration(3599)).toBe('59m 59s')
  })
  it('shows whole minutes from an hour, with no days unit', () => {
    expect(formatJournalDuration(3600)).toBe('1h 0m')
    expect(formatJournalDuration(5642)).toBe('1h 34m')
    expect(formatJournalDuration(120 * 3600 + 3 * 60 + 20)).toBe('120h 3m')
  })
})
