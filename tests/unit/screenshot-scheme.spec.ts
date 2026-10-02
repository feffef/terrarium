// L3 — the `--scheme` value contract shared by `scripts/screenshot.ts` and `scripts/preview.ts shot`.
import { describe, expect, it } from 'vitest'
import { parseScheme } from '../../scripts/screenshot.ts'

describe('parseScheme()', () => {
  it('accepts light and dark', () => {
    expect(parseScheme('light')).toBe('light')
    expect(parseScheme('dark')).toBe('dark')
  })

  it('rejects anything else, including a missing value', () => {
    expect(parseScheme('Dark')).toBeUndefined()
    expect(parseScheme('')).toBeUndefined()
  })
})
