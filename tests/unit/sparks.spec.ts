// Unit tests for the sparks helper's pure core (issue #440) — keyword
// extraction, overlap scoring, and the naive mechanical clustering signal.
// The FS/CLI shell is exercised by running the script directly.
import { describe, expect, it } from 'vitest'
import {
  buildSparkClusters,
  clusterByKeywords,
  clusterLabel,
  gatherSparkRecords,
  keywordOverlap,
  readSparkMaterial,
  sparkKeywords,
  type SessionSparkMaterial,
  type SparkRecord,
} from '../../scripts/sparks.ts'

describe('sparkKeywords()', () => {
  it('lowercases, strips punctuation, and drops short/stop words', () => {
    expect(sparkKeywords('Investigate the worktree HEAD drift.')).toEqual(['drift', 'head', 'investigate', 'worktree'])
  })

  it('dedupes and sorts alphabetically', () => {
    expect(sparkKeywords('worktree worktree Worktree drift')).toEqual(['drift', 'worktree'])
  })

  it('returns an empty list when nothing survives the filter', () => {
    expect(sparkKeywords('it was the that this')).toEqual([])
  })
})

describe('keywordOverlap()', () => {
  it('is the Jaccard overlap of two keyword sets', () => {
    expect(keywordOverlap(['worktree', 'drift', 'stale'], ['worktree', 'drift'])).toBeCloseTo(2 / 3)
  })

  it('is 0 when either side is empty', () => {
    expect(keywordOverlap([], ['a'])).toBe(0)
    expect(keywordOverlap(['a'], [])).toBe(0)
  })

  it('is 1 for identical sets', () => {
    expect(keywordOverlap(['a', 'b'], ['b', 'a'])).toBe(1)
  })
})

describe('clusterByKeywords()', () => {
  it('joins items whose keywords clear the threshold, else starts a new cluster', () => {
    const items = [
      { id: 1, keywords: ['worktree', 'stale', 'head'] },
      { id: 2, keywords: ['worktree', 'stale', 'branch'] }, // overlaps #1
      { id: 3, keywords: ['digest', 'utc', 'boundary'] }, // unrelated
    ]
    const clusters = clusterByKeywords(items, 0.4)
    expect(clusters).toHaveLength(2)
    expect(clusters[0]!.map((i) => i.id)).toEqual([1, 2])
    expect(clusters[1]!.map((i) => i.id)).toEqual([3])
  })

  it('accumulating the cluster\'s keyword union can dilute it, stopping a weak chain from over-merging', () => {
    // #2 joins #1 (they share one of three unioned keywords, clearing 0.3).
    // #3 shares a keyword with #2 alone, but measured against the CLUSTER's
    // now-larger accumulated union the same single shared keyword scores
    // below threshold — so a weak transitive chain doesn't run away into one
    // blob, it settles into two clusters.
    const items = [
      { id: 1, keywords: ['alpha', 'beta'] },
      { id: 2, keywords: ['beta', 'gamma'] },
      { id: 3, keywords: ['gamma', 'delta'] },
    ]
    const clusters = clusterByKeywords(items, 0.3)
    expect(clusters).toHaveLength(2)
    expect(clusters[0]!.map((i) => i.id)).toEqual([1, 2])
    expect(clusters[1]!.map((i) => i.id)).toEqual([3])
  })

  it('gives every item its own cluster with an empty keyword set', () => {
    const items = [{ id: 1, keywords: [] }, { id: 2, keywords: [] }]
    expect(clusterByKeywords(items)).toHaveLength(2)
  })
})

describe('clusterLabel()', () => {
  it('picks the two most-shared keywords, frequency desc then alpha', () => {
    const items = [
      { keywords: ['worktree', 'stale', 'head'] },
      { keywords: ['worktree', 'stale', 'branch'] },
    ]
    expect(clusterLabel(items)).toBe('stale · worktree')
  })

  it('falls back to "general" when there are no keywords at all', () => {
    expect(clusterLabel([{ keywords: [] }])).toBe('general')
  })
})

describe('gatherSparkRecords()', () => {
  it('flattens ideas and learnings with session provenance, preserving authored order', () => {
    const sessions: SessionSparkMaterial[] = [
      { session: 's1', endedAt: '2026-07-07T00:00:00Z', ideas: ['idea a', 'idea b'], learnings: ['learning a'] },
      { session: 's2', endedAt: '2026-07-08T00:00:00Z', ideas: [], learnings: ['learning b'] },
    ]
    expect(gatherSparkRecords(sessions)).toEqual([
      { spark: 'idea a', kind: 'idea', session: 's1', date: '2026-07-07T00:00:00Z' },
      { spark: 'idea b', kind: 'idea', session: 's1', date: '2026-07-07T00:00:00Z' },
      { spark: 'learning a', kind: 'learning', session: 's1', date: '2026-07-07T00:00:00Z' },
      { spark: 'learning b', kind: 'learning', session: 's2', date: '2026-07-08T00:00:00Z' },
    ])
  })

  it('is empty for a session with neither field', () => {
    expect(gatherSparkRecords([{ session: 's1', endedAt: '2026-07-07T00:00:00Z', ideas: [], learnings: [] }])).toEqual([])
  })
})

describe('readSparkMaterial()', () => {
  it('keeps both ideas and learnings for an internal session (external absent)', () => {
    const raw = {
      session: 's1',
      endedAt: '2026-07-20T00:00:00Z',
      ideas: ['idea a'],
      learnings: ['learning a'],
    }
    expect(readSparkMaterial(raw)).toEqual({
      session: 's1',
      endedAt: '2026-07-20T00:00:00.000Z',
      ideas: ['idea a'],
      learnings: ['learning a'],
    })
  })

  it('keeps ideas but DROPS learnings for an external session (ADR-0009 amendment)', () => {
    const raw = {
      session: 's-ext',
      endedAt: '2026-07-20T00:00:00Z',
      external: true,
      ideas: ['toolchain-agnostic idea'],
      learnings: ['a Grok/Hermes-specific learning'],
    }
    expect(readSparkMaterial(raw)).toEqual({
      session: 's-ext',
      endedAt: '2026-07-20T00:00:00.000Z',
      ideas: ['toolchain-agnostic idea'],
      learnings: [],
    })
  })

  it('drops an external session that has ONLY learnings (nothing left to gather)', () => {
    const raw = { session: 's-ext', endedAt: '2026-07-20T00:00:00Z', external: true, learnings: ['x'] }
    expect(readSparkMaterial(raw)).toBeNull()
  })

  it('treats external:false the same as internal (both fields kept)', () => {
    const raw = { session: 's', endedAt: '2026-07-20T00:00:00Z', external: false, ideas: ['i'], learnings: ['l'] }
    expect(readSparkMaterial(raw)).toMatchObject({ ideas: ['i'], learnings: ['l'] })
  })

  it('returns null when a session has neither spark field', () => {
    expect(readSparkMaterial({ session: 's', endedAt: '2026-07-20T00:00:00Z' })).toBeNull()
  })
})

describe('buildSparkClusters()', () => {
  it('groups overlapping sparks and orders clusters biggest-first', () => {
    const records: SparkRecord[] = [
      { spark: 'stale worktree branch', kind: 'idea', session: 's1', date: '2026-07-07T00:00:00Z' },
      { spark: 'digest UTC boundary bug', kind: 'learning', session: 's2', date: '2026-07-08T00:00:00Z' },
      { spark: 'worktree branch stale head', kind: 'idea', session: 's3', date: '2026-07-09T00:00:00Z' },
    ]
    const clusters = buildSparkClusters(records, 0.4)
    expect(clusters).toHaveLength(2)
    expect(clusters[0]!.sparks).toHaveLength(2) // the two worktree sparks, biggest cluster first
    expect(clusters[0]!.sparks.map((s) => s.session)).toEqual(['s1', 's3'])
    expect(clusters[1]!.sparks.map((s) => s.session)).toEqual(['s2'])
  })

  it('never leaks the internal keywords field onto the output records', () => {
    const records: SparkRecord[] = [{ spark: 'a stale worktree', kind: 'idea', session: 's1', date: '2026-07-07T00:00:00Z' }]
    const [cluster] = buildSparkClusters(records)
    expect(Object.keys(cluster!.sparks[0]!)).toEqual(['spark', 'kind', 'session', 'date'])
  })

  it('is empty for an empty input', () => {
    expect(buildSparkClusters([])).toEqual([])
  })
})
