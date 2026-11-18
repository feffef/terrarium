// WCAG AA (4.5:1) for the Atlas's text colours on their real ground, in both
// themes (#3430). Reads theme.css so the stylesheet stays the only home of the
// colours; `--atlas-faint` is ornament only, so it is deliberately not tested.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../../app/assets/theme.css', import.meta.url), 'utf8')

type Vars = Record<string, string>
type Rgb = [number, number, number]

/** Body of the `{...}` block whose brace sits at `text[open]`. */
function block(text: string, open: number): string {
  let depth = 0
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}' && --depth === 0) return text.slice(open + 1, i)
  }
  throw new Error('unbalanced braces in theme.css')
}

/** Custom properties of every `selector { ... }` rule whose line starts with `indent`. */
function rule(text: string, selector: string, indent: string): Vars {
  const re = new RegExp(`^${indent}${selector.replace('.', '\\.')} \\{`, 'gm')
  const out: Vars = {}
  for (const m of text.matchAll(re)) {
    const body = block(text, m.index + m[0].length - 1)
    for (const [, name, value] of body.matchAll(/(--[\w-]+):\s*([^;]+?);/g)) out[name!] = value!
  }
  return out
}

const darkBlocks = [...css.matchAll(/@media \(prefers-color-scheme: dark\) \{/g)]
  .map((m) => block(css, m.index + m[0].length - 1))

/** Custom properties of `selector`: its top-level rule, plus its dark media rule in dark. */
function scope(selector: string, theme: 'light' | 'dark'): Vars {
  const dark = theme === 'dark' ? darkBlocks.map((b) => rule(b, selector, '  ')) : []
  return Object.assign(rule(css, selector, ''), ...dark)
}

function rgb(value: string): Rgb {
  const hex = /^#([0-9a-f]{6})/i.exec(value)
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1]!.slice(i, i + 2), 16)) as Rgb
  const fn = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(value)
  if (fn) return [Number(fn[1]), Number(fn[2]), Number(fn[3])]
  throw new Error(`unparsed colour: ${value}`)
}

function luminance(c: Rgb): number {
  const [r, g, b] = c.map((v) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

/** `.atlas`'s `--atlas-ground`: the biome tint mixed over the paper in sRGB. */
function ground(v: Vars): Rgb {
  const amount = parseFloat(v['--biome-tint-amount']!) / 100
  const tint = rgb(v['--biome-tint']!)
  return rgb(v['--atlas-paper']!).map((c, i) => Math.round(tint[i]! * amount + c * (1 - amount))) as Rgb
}

describe('contrast()', () => {
  it('matches the WCAG reference values', () => {
    expect(contrast([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5)
    expect(contrast([119, 119, 119], [255, 255, 255])).toBeCloseTo(4.48, 2)
  })
})

describe('theme.css', () => {
  it('still mixes the tint over the paper, as ground() assumes', () => {
    expect(css).toMatch(/--atlas-ground:\s*color-mix\(in srgb, var\(--biome-tint\) var\(--biome-tint-amount\), var\(--atlas-paper\)\)/)
  })
})

describe.each(['light', 'dark'] as const)('%s theme text', (theme) => {
  describe.each(['canopy', 'floor', 'pool'])('%s', (biome) => {
    // Tint and amount are set once, in the light rule; dark overrides the paper.
    const v = { ...scope(':root', theme), ...scope(`.atlas--${biome}`, 'light'), ...scope(`.atlas--${biome}`, theme) }
    const grounds: Record<string, Rgb> = { ground: ground(v), 'paper-2': rgb(v['--atlas-paper-2']!) }
    const pairs = ['--atlas-ink', '--atlas-muted', '--biome-accent'].flatMap((fg) =>
      Object.keys(grounds).map((bg) => [fg, bg] as const))

    it.each(pairs)('%s on %s reaches 4.5:1', (fg, bg) => {
      expect(contrast(rgb(v[fg]!), grounds[bg]!)).toBeGreaterThanOrEqual(4.5)
    })
  })
})
