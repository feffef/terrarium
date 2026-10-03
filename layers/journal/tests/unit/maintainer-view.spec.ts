// The maintainer view's flag logic (layers/journal/app/utils/maintainerView.ts),
// driven with a fake storage so no browser is needed.
import { describe, expect, it } from 'vitest'
import { resolveMaintainerView } from '../../app/utils/maintainerView.ts'

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

describe('resolveMaintainerView', () => {
  it('is off with no flag and nothing stored', () => {
    expect(resolveMaintainerView('', () => fakeStorage())).toBe(false)
  })

  it('turns on from ?maintainer and remembers it for later pages with no URL flag', () => {
    const store = fakeStorage()
    expect(resolveMaintainerView('?maintainer', () => store)).toBe(true)
    expect(resolveMaintainerView('', () => store)).toBe(true)
  })

  it('accepts ?maintainer=1 and ignores unrelated params', () => {
    expect(resolveMaintainerView('?x=1&maintainer=1', () => fakeStorage())).toBe(true)
    expect(resolveMaintainerView('?x=1', () => fakeStorage())).toBe(false)
  })

  it('turns off and forgets on ?maintainer=0', () => {
    const store = fakeStorage()
    resolveMaintainerView('?maintainer', () => store)
    expect(resolveMaintainerView('?maintainer=0', () => store)).toBe(false)
    expect(resolveMaintainerView('', () => store)).toBe(false)
  })

  it('does not treat a stray stored value as on', () => {
    expect(resolveMaintainerView('', () => fakeStorage({ 'terrarium:maintainer': 'yes' }))).toBe(false)
  })

  it('still honours the URL flag when storage throws, and is off without one', () => {
    const blocked = () => {
      throw new DOMException('blocked', 'SecurityError')
    }
    expect(resolveMaintainerView('?maintainer', blocked)).toBe(true)
    expect(resolveMaintainerView('', blocked)).toBe(false)
  })
})
