// Unit tests for the skills-lock integrity gate's pure core — the drift
// classification (missing / unpinned / drifted / match) where correctness bugs
// would hide. The file IO (readLock/readOnDisk/write) is a thin wrapper over
// `diffLock`, exercised by running the script directly against the real tree
// (`tsx scripts/verify-skills-lock.ts`).
import { describe, expect, it } from 'vitest'
import { diffLock, sha256, type LockEntry } from '../../scripts/verify-skills-lock.ts'

const H_A = sha256('pack skill A body')
const H_B = sha256('pack skill B body')

const lock: Record<string, LockEntry> = {
  alpha: { source: 'mattpocock/skills', installedSha256: H_A },
  beta: { source: 'mattpocock/skills', installedSha256: H_B },
}

describe('sha256()', () => {
  it('is deterministic and hex-encoded', () => {
    expect(sha256('x')).toBe(sha256('x'))
    expect(sha256('x')).toMatch(/^[0-9a-f]{64}$/)
    expect(sha256('x')).not.toBe(sha256('y'))
  })
})

describe('diffLock()', () => {
  it('passes when every on-disk hash matches its pin', () => {
    const res = diffLock(lock, new Map([['alpha', H_A], ['beta', H_B]]))
    expect(res.checked).toBe(2)
    expect(res.findings).toEqual([])
  })

  it('flags a DRIFTED skill whose on-disk content differs from its pin', () => {
    const res = diffLock(lock, new Map([['alpha', H_A], ['beta', sha256('edited!')]]))
    expect(res.findings).toEqual([
      { name: 'beta', kind: 'drifted', expected: H_B, actual: sha256('edited!') },
    ])
  })

  it('flags a MISSING skill (locked but no SKILL.md on disk)', () => {
    const res = diffLock(lock, new Map([['alpha', H_A], ['beta', null]]))
    expect(res.findings).toEqual([{ name: 'beta', kind: 'missing' }])
  })

  it('flags an UNPINNED skill (no installedSha256 in the lock yet)', () => {
    const partial: Record<string, LockEntry> = { alpha: { source: 'x' } }
    const res = diffLock(partial, new Map([['alpha', H_A]]))
    expect(res.findings).toEqual([{ name: 'alpha', kind: 'unpinned', actual: H_A }])
  })

  it('reports several findings at once and counts every locked entry', () => {
    const res = diffLock(
      { ...lock, gamma: { source: 'x' } },
      new Map([['alpha', H_A], ['beta', sha256('changed')], ['gamma', null]]),
    )
    expect(res.checked).toBe(3)
    expect(res.findings.map((f) => `${f.name}:${f.kind}`)).toEqual([
      'beta:drifted',
      'gamma:missing',
    ])
  })
})
