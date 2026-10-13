// The Friction Ledger page's ranking (layers/journal/app/utils/ledger.ts).
import { describe, expect, it } from 'vitest'
import { LEDGER_SEVERE_SIZE, ledgerPanels, ledgerRefLinks } from '../../app/utils/ledger.ts'
import type { FrictionClusterDoc, Severity } from '../../app/types/journal.ts'

function cluster(name: string, severities: Severity[]): FrictionClusterDoc {
  return {
    name,
    cause: `${name} cause`,
    surface: 'safe',
    status: 'open',
    occurrences: severities.map((severity, i) => ({ session: `${name}-${i}`, date: `2026-10-0${i + 1}`, severity })),
  }
}

describe('ledgerPanels', () => {
  it('shows every cluster once: the top ranked by severity, the rest by count', () => {
    const clusters = [
      cluster('many-nits', Array(9).fill('nit')),
      ...Array.from({ length: LEDGER_SEVERE_SIZE }, (_, i) => cluster(`mod-${i}`, Array(i + 1).fill('moderate'))),
      cluster('one-major', ['major']),
      cluster('two-majors', ['major', 'major']),
    ]
    const { severe, frequent } = ledgerPanels(clusters, 'current', new Set(), 'archived')
    expect(severe.map((e) => e.name).slice(0, 3)).toEqual(['two-majors', 'one-major', 'mod-7'])
    expect(severe).toHaveLength(LEDGER_SEVERE_SIZE)
    expect(frequent.map((e) => e.name)).toEqual(['many-nits', 'mod-1', 'mod-0'])
  })

  it('fills the severe panel even when nothing is worse than moderate', () => {
    const { severe } = ledgerPanels([cluster('a', ['moderate']), cluster('b', ['nit'])], 'current', new Set(), 'archived')
    expect(severe.map((e) => e.name)).toEqual(['a', 'b'])
  })

  it('links each occurrence to its session log in the right Space, newest first', () => {
    const [e] = ledgerPanels([cluster('x', ['nit', 'minor'])], 'current', new Set(['x-1']), 'archived').severe
    expect(e!.occurrences).toEqual([
      { date: '2026-10-02', severity: 'minor', to: '/t/journal/current#session-x-1' },
      { date: '2026-10-01', severity: 'nit', to: '/t/journal/archived#session-x-0' },
    ])
  })
})

describe('ledgerRefLinks', () => {
  it('links the first issue and the first PR a ref names, whatever their order', () => {
    expect(ledgerRefLinks('PRs #1826, #1833; issue #1857 (filed)')).toEqual([
      { label: 'issue #1857', url: 'https://github.com/feffef/terrarium/issues/1857' },
      { label: 'PR #1826', url: 'https://github.com/feffef/terrarium/pull/1826' },
    ])
    expect(ledgerRefLinks('issues #835, #1651; commit b02ca418')).toEqual([
      { label: 'issue #835', url: 'https://github.com/feffef/terrarium/issues/835' },
    ])
    expect(ledgerRefLinks('docs only')).toEqual([])
    expect(ledgerRefLinks(undefined)).toEqual([])
  })
})
