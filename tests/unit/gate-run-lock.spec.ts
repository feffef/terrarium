// Per-checkout run lock for gate:scoped (#2660): a second run beside a live one
// must refuse, but a dead run's leftover lock must not block the next.
import { describe, expect, it } from 'vitest'
import { runLockHolder } from '../../scripts/gate/gate.ts'

describe('runLockHolder()', () => {
  it('names a live holder, so the new run refuses', () => {
    expect(runLockHolder(4242, () => true)).toBe(4242)
  })

  it('ignores a dead holder, so the new run takes over', () => {
    expect(runLockHolder(4242, () => false)).toBeNull()
  })

  it('takes the lock when no lock file exists', () => {
    expect(runLockHolder(null, () => true)).toBeNull()
  })
})
