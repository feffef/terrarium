// Unit tests for the guest-demo in-flight marker's pure core (issue #570):
// presence, most-recent-labeled-at extraction, and the staleness/freshness
// checks `poll-guest-tickets.ts` and `guest-intake-scan.ts` both share.
import { describe, expect, it } from 'vitest'
import {
  hasMarker,
  isMarkerFresh,
  isMarkerStale,
  mostRecentMarkerLabeledAt,
  MARKER_LABEL,
  MARKER_STALE_MINUTES,
  type RawLabelEventRecord,
} from '../../scripts/guest-marker.ts'

describe('hasMarker()', () => {
  it('is true when the marker label is present', () => {
    expect(hasMarker(['ready-for-agent', MARKER_LABEL])).toBe(true)
  })
  it('is false when the marker label is absent', () => {
    expect(hasMarker(['ready-for-agent'])).toBe(false)
  })
  it('is false for an empty label list', () => {
    expect(hasMarker([])).toBe(false)
  })
})

describe('mostRecentMarkerLabeledAt()', () => {
  it('returns null when there is no labeled event for the marker', () => {
    const events: RawLabelEventRecord[] = [{ event: 'labeled', created_at: '2026-07-18T00:00:00Z', label: { name: 'ready-for-agent' } }]
    expect(mostRecentMarkerLabeledAt(events)).toBeNull()
  })
  it('returns null for an empty event list', () => {
    expect(mostRecentMarkerLabeledAt([])).toBeNull()
  })
  it('ignores unlabeled events and other event types', () => {
    const events: RawLabelEventRecord[] = [
      { event: 'unlabeled', created_at: '2026-07-18T00:00:00Z', label: { name: MARKER_LABEL } },
      { event: 'commented', created_at: '2026-07-18T00:05:00Z' },
    ]
    expect(mostRecentMarkerLabeledAt(events)).toBeNull()
  })
  it('picks the latest labeled event for the marker across multiple add/remove cycles', () => {
    const events: RawLabelEventRecord[] = [
      { event: 'labeled', created_at: '2026-07-18T00:00:00Z', label: { name: MARKER_LABEL } },
      { event: 'unlabeled', created_at: '2026-07-18T00:10:00Z', label: { name: MARKER_LABEL } },
      { event: 'labeled', created_at: '2026-07-18T00:20:00Z', label: { name: MARKER_LABEL } },
    ]
    expect(mostRecentMarkerLabeledAt(events)).toBe('2026-07-18T00:20:00Z')
  })
  it('ignores labeled events for a different label', () => {
    const events: RawLabelEventRecord[] = [{ event: 'labeled', created_at: '2026-07-18T00:00:00Z', label: { name: 'needs-info' } }]
    expect(mostRecentMarkerLabeledAt(events)).toBeNull()
  })
  it('ignores a labeled event with no created_at', () => {
    const events: RawLabelEventRecord[] = [{ event: 'labeled', label: { name: MARKER_LABEL } }]
    expect(mostRecentMarkerLabeledAt(events)).toBeNull()
  })
})

describe('isMarkerStale()', () => {
  const now = new Date('2026-07-18T02:00:00Z')
  it(`is false for a marker younger than ${MARKER_STALE_MINUTES} minutes`, () => {
    expect(isMarkerStale('2026-07-18T01:59:00Z', now)).toBe(false)
  })
  it(`is false exactly at the ${MARKER_STALE_MINUTES}-minute boundary`, () => {
    const labeledAt = new Date(now.getTime() - MARKER_STALE_MINUTES * 60 * 1000).toISOString()
    expect(isMarkerStale(labeledAt, now)).toBe(false)
  })
  it(`is true for a marker older than ${MARKER_STALE_MINUTES} minutes`, () => {
    const labeledAt = new Date(now.getTime() - (MARKER_STALE_MINUTES * 60 * 1000 + 1)).toISOString()
    expect(isMarkerStale(labeledAt, now)).toBe(true)
  })
})

describe('isMarkerFresh()', () => {
  const now = new Date('2026-07-18T02:00:00Z')
  it('is true (skip) for a recently-applied marker', () => {
    const events: RawLabelEventRecord[] = [{ event: 'labeled', created_at: '2026-07-18T01:50:00Z', label: { name: MARKER_LABEL } }]
    expect(isMarkerFresh(events, now)).toBe(true)
  })
  it('is false (reclaimable) for a marker applied well past the staleness window', () => {
    const events: RawLabelEventRecord[] = [{ event: 'labeled', created_at: '2026-07-18T00:00:00Z', label: { name: MARKER_LABEL } }]
    expect(isMarkerFresh(events, now)).toBe(false)
  })
  it('fails closed (treated as fresh/skip) when no labeled event can be found', () => {
    expect(isMarkerFresh([], now)).toBe(true)
  })
})
