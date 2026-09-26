// The theme preference and Reset demo, both over tab-lifetime sessionStorage
// shared with every other Tenant on the origin (issue #1358, #1359).
import { describe, expect, it } from 'vitest'
import { readTinkerfundTheme, resetTinkerfundDemo, writeTinkerfundTheme } from '../../app/utils/demo.ts'

function memoryStorage(entries: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(entries))
  return {
    get length() { return map.size },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    clear: () => { throw new Error('Reset must never clear() storage other Tenants share') },
  }
}

describe('theme preference', () => {
  it('follows the system until the visitor picks a theme', () => {
    expect(readTinkerfundTheme(memoryStorage())).toBe('system')
  })

  it('round-trips an explicit pick, and System removes it again', () => {
    const storage = memoryStorage()
    writeTinkerfundTheme(storage, 'dark')
    expect(readTinkerfundTheme(storage)).toBe('dark')
    writeTinkerfundTheme(storage, 'system')
    expect(readTinkerfundTheme(storage)).toBe('system')
    expect(storage.length).toBe(0)
  })

  it('treats a tampered value as System', () => {
    expect(readTinkerfundTheme(memoryStorage({ 'tinkerfund:theme': 'sepia' }))).toBe('system')
  })
})

describe('resetTinkerfundDemo', () => {
  it('removes every Tinkerfund key and leaves other Tenants’ keys alone', () => {
    const storage = memoryStorage({
      'tinkerfund:theme': 'dark',
      'tinkerfund:prod:actions': '[]',
      'tinkerfund:qa:actions': '[]',
      'journal:accordion': 'open',
      tinkerfundish: 'keep',
    })
    resetTinkerfundDemo(storage)
    expect(Object.fromEntries([...Array(storage.length).keys()].map((i) => [storage.key(i), 1])))
      .toEqual({ 'journal:accordion': 1, tinkerfundish: 1 })
  })
})
