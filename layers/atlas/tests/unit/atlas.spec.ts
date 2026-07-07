// Unit tests for the Atlas layer's pure logic (layers/atlas/app/utils/atlas.ts).
// The correctness-sensitive parts are the food-web reverse-edge derivation (both
// directions from one authored fact, #71) and the wrap-past-midnight rhythm math
// (#73) — a bug in either is invisible in a screenshot, so it's pinned here.
import { describe, expect, it } from 'vitest'
import {
  activeAt,
  rarityMeta,
  relationLabel,
  relationsFor,
  rhythmCells,
  signatureVars,
  type Edge,
} from '../../app/utils/atlas.ts'

describe('relationLabel()', () => {
  it('reads forward from the actor and reverse from the acted-upon', () => {
    expect(relationLabel('preys-on', 'out')).toBe('preys on')
    expect(relationLabel('preys-on', 'in')).toBe('preyed on by')
    expect(relationLabel('fears', 'in')).toBe('feared by')
    expect(relationLabel('pollinates', 'in')).toBe('pollinated by')
    expect(relationLabel('mimics', 'in')).toBe('mimicked by')
    expect(relationLabel('shelters', 'in')).toBe('sheltered by')
  })
})

describe('relationsFor()', () => {
  const edges: Edge[] = [
    { from: 'lumina-fabulae', to: 'mycora-susurrans', kind: 'pollinates', note: 'tends it at dusk' },
    { from: 'aranea-patiens', to: 'lumina-fabulae', kind: 'preys-on', note: 'the light goes out' },
  ]

  it('surfaces a specimen as the actor with the forward label', () => {
    const rels = relationsFor('lumina-fabulae', edges)
    const pollinate = rels.find((r) => r.other === 'mycora-susurrans')
    expect(pollinate).toMatchObject({ dir: 'out', label: 'pollinates', note: 'tends it at dusk' })
  })

  it('surfaces the same specimen as the acted-upon with the reverse label — one fact, both sides', () => {
    const rels = relationsFor('lumina-fabulae', edges)
    const preyed = rels.find((r) => r.other === 'aranea-patiens')
    expect(preyed).toMatchObject({ dir: 'in', label: 'preyed on by' })
  })

  it('returns nothing for a specimen no edge names', () => {
    expect(relationsFor('folium-mendax', edges)).toEqual([])
  })

  it('is deterministically ordered (by label, then counterpart)', () => {
    const a = relationsFor('lumina-fabulae', edges).map((r) => r.label)
    const b = relationsFor('lumina-fabulae', [...edges].reverse()).map((r) => r.label)
    expect(a).toEqual(b)
  })
})

describe('activeAt() / rhythmCells()', () => {
  it('matches a simple daytime band', () => {
    expect(activeAt(10, [[8, 17]])).toBe(true)
    expect(activeAt(17, [[8, 17]])).toBe(false) // end is exclusive
    expect(activeAt(7, [[8, 17]])).toBe(false)
  })

  it('handles a band that wraps past midnight', () => {
    const bands: [number, number][] = [[20, 4]]
    expect(activeAt(22, bands)).toBe(true)
    expect(activeAt(2, bands)).toBe(true)
    expect(activeAt(12, bands)).toBe(false)
  })

  it('renders 24 cells and counts an ever-waking creature as always on', () => {
    const cells = rhythmCells([[0, 24]])
    expect(cells).toHaveLength(24)
    expect(cells.every(Boolean)).toBe(true)
  })
})

describe('rarityMeta()', () => {
  it('grades the ladder and gives mythic its lone star', () => {
    expect(rarityMeta('abundant').dots).toBe(5)
    expect(rarityMeta('rare').dots).toBe(2)
    expect(rarityMeta('mythic').mark).toBe('✦')
  })
  it('falls back to common for an unknown grade', () => {
    expect(rarityMeta(undefined).grade).toBe('common')
  })
})

describe('signatureVars()', () => {
  it('maps up to three colours to --sig-1..3', () => {
    const vars = signatureVars([
      { name: 'a', hex: '#111111' },
      { name: 'b', hex: '#222222' },
      { name: 'c', hex: '#333333' },
      { name: 'd', hex: '#444444' },
    ])
    expect(vars).toEqual({ '--sig-1': '#111111', '--sig-2': '#222222', '--sig-3': '#333333' })
  })
  it('is empty for no signature', () => {
    expect(signatureVars(undefined)).toEqual({})
  })
})
