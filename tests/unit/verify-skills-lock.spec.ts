// Unit tests for the skills-lock integrity gate's pure core — the drift
// classification (missing / uncataloged / unpinned / drifted / match) and the
// line-preserving pin edit, where correctness bugs would hide. The file IO
// (readExternalNames/readInventory/readOnDisk/write) is a thin wrapper over these,
// exercised by running the script directly against the real tree
// (`tsx scripts/verify-skills-lock.ts`).
import { describe, expect, it } from 'vitest'
import { diffLock, setPinLine, sha256, type InventoryPin } from '../../scripts/verify-skills-lock.ts'

const H_A = sha256('pack skill A body')
const H_B = sha256('pack skill B body')

const names = ['alpha', 'beta']
const inv = (m: Record<string, InventoryPin>) => new Map(Object.entries(m))

describe('sha256()', () => {
  it('is deterministic and hex-encoded', () => {
    expect(sha256('x')).toBe(sha256('x'))
    expect(sha256('x')).toMatch(/^[0-9a-f]{64}$/)
    expect(sha256('x')).not.toBe(sha256('y'))
  })
})

describe('diffLock()', () => {
  it('passes when every on-disk hash matches its Inventory pin', () => {
    const res = diffLock(
      names,
      inv({ alpha: { cataloged: true, pin: H_A }, beta: { cataloged: true, pin: H_B } }),
      new Map([['alpha', H_A], ['beta', H_B]]),
    )
    expect(res.checked).toBe(2)
    expect(res.findings).toEqual([])
  })

  it('flags a DRIFTED skill whose on-disk content differs from its pin', () => {
    const res = diffLock(
      names,
      inv({ alpha: { cataloged: true, pin: H_A }, beta: { cataloged: true, pin: H_B } }),
      new Map([['alpha', H_A], ['beta', sha256('edited!')]]),
    )
    expect(res.findings).toEqual([
      { name: 'beta', kind: 'drifted', expected: H_B, actual: sha256('edited!') },
    ])
  })

  it('flags a MISSING skill (locked but no SKILL.md on disk) before anything else', () => {
    const res = diffLock(
      names,
      inv({ alpha: { cataloged: true, pin: H_A }, beta: { cataloged: false } }),
      new Map([['alpha', H_A], ['beta', null]]),
    )
    expect(res.findings).toEqual([{ name: 'beta', kind: 'missing' }])
  })

  it('flags an UNCATALOGED pack skill (no Inventory entry at all)', () => {
    const res = diffLock(
      names,
      inv({ alpha: { cataloged: true, pin: H_A } }), // beta absent from the Inventory map
      new Map([['alpha', H_A], ['beta', H_B]]),
    )
    expect(res.findings).toEqual([{ name: 'beta', kind: 'uncataloged', actual: H_B }])
  })

  it('flags an UNPINNED skill (entry exists but no installedSha256)', () => {
    const res = diffLock(
      ['alpha'],
      inv({ alpha: { cataloged: true } }),
      new Map([['alpha', H_A]]),
    )
    expect(res.findings).toEqual([{ name: 'alpha', kind: 'unpinned', actual: H_A }])
  })
})

describe('setPinLine()', () => {
  const entry = 'name: alpha\ncategory: general-engineering\nimportance: peripheral\nrole: >-\n  Some role.\n'

  it('inserts the pin right after the importance line, before the role block', () => {
    const out = setPinLine(entry, H_A)
    expect(out).toBe(
      `name: alpha\ncategory: general-engineering\nimportance: peripheral\ninstalledSha256: ${H_A}\nrole: >-\n  Some role.\n`,
    )
  })

  it('replaces an existing pin in place, touching nothing else', () => {
    const withPin = setPinLine(entry, H_A)
    const rewritten = setPinLine(withPin, H_B)
    expect(rewritten).toBe(withPin.replace(H_A, H_B))
    expect(rewritten).toContain('  Some role.')
  })

  it('appends a trailing newline when the source lacks one and has no anchor', () => {
    expect(setPinLine('name: alpha', H_A)).toBe(`name: alpha\ninstalledSha256: ${H_A}\n`)
  })
})
