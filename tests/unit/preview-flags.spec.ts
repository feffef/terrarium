// L3 — pure arg-parsing seam for the value-taking flags of `scripts/ui/preview.ts shot`
// and `scripts/ui/screenshot.ts` (`--wait`, `--wait-for`, issue #364; `--scheme`;
// `--full`, `--mobile` and the `review` verb's shots, issue #2112).
// Keeps the positional `<route> <out> [WxH]` parsing unaware of the flags, so
// this is where the extraction contract is pinned.
import { describe, expect, it } from 'vitest'
import { extractFlag, extractSwitch } from '../../scripts/lib/cli.ts'
import { parseScheme } from '../../scripts/ui/screenshot.ts'
import { reviewShots } from '../../scripts/ui/preview.ts'

describe('extractFlag()', () => {
  it('pulls a flag and its value out, leaving the positionals', () => {
    const { value, rest } = extractFlag(['/r', 'out.png', '--wait', '3000'], '--wait')
    expect(value).toBe('3000')
    expect(rest).toEqual(['/r', 'out.png'])
  })

  it('returns undefined value and the args unchanged when the flag is absent', () => {
    const { value, rest } = extractFlag(['/r', 'out.png', '1280x800'], '--wait')
    expect(value).toBeUndefined()
    expect(rest).toEqual(['/r', 'out.png', '1280x800'])
  })

  it('keeps a selector value with spaces intact', () => {
    const { value, rest } = extractFlag(['/r', 'out.png', '--wait-for', '.mermaid-diagram svg'], '--wait-for')
    expect(value).toBe('.mermaid-diagram svg')
    expect(rest).toEqual(['/r', 'out.png'])
  })

  it('lets two extractions compose without disturbing each other', () => {
    const first = extractFlag(['/r', 'o.png', '--wait-for', '.x', '--wait', '500'], '--wait-for')
    const second = extractFlag(first.rest, '--wait')
    expect(first.value).toBe('.x')
    expect(second.value).toBe('500')
    expect(second.rest).toEqual(['/r', 'o.png'])
  })

  it('takes the last value when a flag repeats', () => {
    const { value, rest } = extractFlag(['--wait', '100', '--wait', '200'], '--wait')
    expect(value).toBe('200')
    expect(rest).toEqual([])
  })

  it('leaves value undefined when the flag is trailing (no value follows)', () => {
    const { value, rest } = extractFlag(['/r', 'out.png', '--wait'], '--wait')
    expect(value).toBeUndefined()
    expect(rest).toEqual(['/r', 'out.png'])
  })
})

describe('parseScheme()', () => {
  it('passes light, dark and an absent flag through', () => {
    expect(parseScheme('light')).toBe('light')
    expect(parseScheme('dark')).toBe('dark')
    expect(parseScheme(undefined)).toBeUndefined()
  })

  it('throws a usage message for anything else', () => {
    expect(() => parseScheme('Dark')).toThrow('Invalid --scheme "Dark"')
  })
})

describe('extractSwitch()', () => {
  it('reports a present switch and removes it, keeping the positionals', () => {
    expect(extractSwitch(['/r', '--full', 'out.png'], '--full')).toEqual({ on: true, rest: ['/r', 'out.png'] })
  })

  it('reports an absent switch and leaves the args unchanged', () => {
    expect(extractSwitch(['/r', 'out.png', '390x844'], '--mobile')).toEqual({ on: false, rest: ['/r', 'out.png', '390x844'] })
  })
})

describe('reviewShots()', () => {
  it('plans four full-page shots: desktop and mobile, light and dark', () => {
    expect(reviewShots('out')).toEqual([
      { out: 'out/desktop-light.png', windowSize: '1280,900', scheme: 'light', mobile: false },
      { out: 'out/desktop-dark.png', windowSize: '1280,900', scheme: 'dark', mobile: false },
      { out: 'out/mobile-light.png', windowSize: '390,844', scheme: 'light', mobile: true },
      { out: 'out/mobile-dark.png', windowSize: '390,844', scheme: 'dark', mobile: true },
    ])
  })
})
