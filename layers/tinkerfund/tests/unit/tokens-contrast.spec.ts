// WCAG AA for the Instrument colour tokens, in both themes (story #1376: "check
// this with a script or test, not by eye"). Reads the tokens straight from the
// theme's `light-dark()` pairs, so the stylesheet stays their only home.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../../app/assets/theme.css', import.meta.url), 'utf8')

function tokens(theme: 'light' | 'dark'): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [, name, light, dark] of css.matchAll(/--tf-([\w-]+):\s*light-dark\(\s*(#[0-9a-f]{6})\s*,\s*(#[0-9a-f]{6})\s*\)/gi)) {
    out[name!] = (theme === 'light' ? light : dark)!
  }
  return out
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

// Text needs 4.5:1 (WCAG 1.4.3); the accent as a filled bar or chip border and
// the link-coloured focus ring need 3:1 (1.4.11). Hairlines (`line`, `grid`)
// are decoration. Accent text on accent-soft is the one pair that stays
// UI-only (light: 4.39:1), so never set text that way.
const TEXT = 4.5
const UI = 3
const PAIRS: [fg: string, bg: string, min: number][] = [
  ['ink', 'bg', TEXT], ['ink', 'surface', TEXT], ['ink', 'accent-soft', TEXT],
  ['muted', 'bg', TEXT], ['muted', 'surface', TEXT], ['muted', 'accent-soft', TEXT],
  ['link', 'bg', TEXT], ['link', 'surface', TEXT],
  ['accent', 'surface', TEXT], ['accent', 'bg', TEXT], ['accent-ink', 'accent', TEXT],
  ['good', 'surface', TEXT], ['warn', 'surface', TEXT], ['bad', 'surface', TEXT],
  ['good', 'bg', TEXT], ['warn', 'bg', TEXT], ['bad', 'bg', TEXT],
  ['mark-ink', 'mark', TEXT],
  ['surface', 'ink', TEXT],
  ['accent', 'accent-soft', UI],
]

describe('contrast()', () => {
  it('matches the WCAG reference values', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
    expect(contrast('#ffffff', '#ffffff')).toBe(1)
  })
})

describe.each(['light', 'dark'] as const)('%s theme tokens', (theme) => {
  const t = tokens(theme)

  it.each(PAIRS)('%s on %s reaches %s:1', (fg, bg, min) => {
    expect(t[fg], `--tf-${fg} is not a light-dark() token`).toBeDefined()
    expect(t[bg], `--tf-${bg} is not a light-dark() token`).toBeDefined()
    expect(contrast(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(min)
  })
})
