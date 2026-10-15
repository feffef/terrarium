import { describe, expect, it } from 'vitest'
import font from '../../mermaid-font.ts'

describe('Glass Box diagram font', () => {
  it('draws diagrams in Instrument Sans under its private family name', () => {
    expect(font.face).toBe('Glass Box Sans')
    expect(font.woff2).toBe('layers/glassbox/app/assets/fonts/instrument-sans-latin-wght-normal.woff2')
  })
})
