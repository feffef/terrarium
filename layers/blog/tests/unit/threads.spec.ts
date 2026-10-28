import { describe, expect, it } from 'vitest'
import { groupBlogThreads } from '../../app/utils/threads'

const post = (persona: string, path: string, publishedAt: string, reactsTo?: { persona: string; path: string }) =>
  ({ persona, path, publishedAt, reactsTo })

describe('groupBlogThreads', () => {
  it('follows reply chains to their root and lists each thread oldest-first', () => {
    const a = post('eyra', '/a', '2026-10-01')
    const b = post('david', '/b', '2026-10-02', { persona: 'eyra', path: '/a' })
    const c = post('kevin', '/c', '2026-10-03', { persona: 'david', path: '/b' })
    expect(groupBlogThreads([c, b, a])).toEqual([[a, b, c]])
  })

  it('drops posts with no replies and orders threads by latest activity', () => {
    const old1 = post('eyra', '/o1', '2026-09-01')
    const old2 = post('david', '/o2', '2026-09-02', { persona: 'eyra', path: '/o1' })
    const new1 = post('karen', '/n1', '2026-10-01')
    const new2 = post('kevin', '/n2', '2026-10-02', { persona: 'karen', path: '/n1' })
    const alone = post('david', '/x', '2026-10-05')
    expect(groupBlogThreads([alone, old1, new2, old2, new1])).toEqual([[new1, new2], [old1, old2]])
  })

  it('roots a reply whose parent is not published and survives a cycle', () => {
    const orphanA = post('david', '/a', '2026-10-01', { persona: 'eyra', path: '/gone' })
    const orphanB = post('kevin', '/b', '2026-10-02', { persona: 'david', path: '/a' })
    const x = post('eyra', '/x', '2026-10-03', { persona: 'karen', path: '/y' })
    const y = post('karen', '/y', '2026-10-04', { persona: 'eyra', path: '/x' })
    expect(groupBlogThreads([orphanA, orphanB])).toEqual([[orphanA, orphanB]])
    expect(() => groupBlogThreads([x, y])).not.toThrow()
  })
})
