import { describe, expect, it } from 'vitest'
import { flagValue, isMain, OUTPUT_FILE_THRESHOLD, resolveOutputTarget } from '../../scripts/lib/cli.ts'

describe('flagValue()', () => {
  it('reads the value after the flag', () => {
    expect(flagValue(['gather', '--days', '5'], '--days')).toBe('5')
  })
  it('is undefined when the flag is absent or last', () => {
    expect(flagValue(['gather'], '--days')).toBeUndefined()
    expect(flagValue(['--days'], '--days')).toBeUndefined()
  })
})

describe('resolveOutputTarget()', () => {
  it('--out wins at any length', () => {
    expect(resolveOutputTarget(['--out', '/o.json'], 1, '/default.json')).toBe('/o.json')
  })
  it('falls back to the default path only above the threshold', () => {
    expect(resolveOutputTarget([], OUTPUT_FILE_THRESHOLD, '/default.json')).toBeNull()
    expect(resolveOutputTarget([], OUTPUT_FILE_THRESHOLD + 1, '/default.json')).toBe('/default.json')
  })
})

describe('isMain()', () => {
  it('is false for a module that is not the entry script', () => {
    expect(isMain('file:///elsewhere/not-the-entry.ts')).toBe(false)
  })
})
