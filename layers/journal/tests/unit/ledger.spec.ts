// The Friction Ledger page's ranking (layers/journal/app/utils/ledger.ts).
import { describe, expect, it } from 'vitest'
import { ledgerPanels } from '../../app/utils/ledger.ts'
import type { FrictionClusterDoc, Severity } from '../../app/types/journal.ts'

function cluster(name: string, severities: Severity[]): FrictionClusterDoc {
  return {
    name,
    summary: `${name} summary`,
    cause: `${name} cause`,
    surface: 'safe',
    status: 'open',
    occurrences: severities.map((severity, i) => ({ session: `${name}-${i}`, date: `2026-10-0${i + 1}`, severity, description: `${name} ${i}`, solution: 'fix' })),
  }
}

describe('ledgerPanels', () => {
  it('keeps only the two highest severities that exist in severe, each cluster where it ranks higher', () => {
    const clusters = [
      cluster('two-majors', ['major', 'major']),
      cluster('one-major', ['major']),
      cluster('many-mods', Array(9).fill('moderate')),
      cluster('one-mod', ['moderate']),
      cluster('many-nits', Array(5).fill('nit')),
      cluster('one-minor', ['minor']),
    ]
    const { severe, frequent } = ledgerPanels(clusters, 'current', new Set(), 'archived')
    expect(severe.map((e) => e.name)).toEqual(['two-majors', 'one-major', 'one-mod'])
    expect(frequent.map((e) => e.name)).toEqual(['many-mods', 'many-nits', 'one-minor'])
  })

  it('uses the next two levels when there is no blocker, and covers every cluster once', () => {
    const clusters = [cluster('b', ['blocker']), cluster('m', ['major']), cluster('n', ['nit'])]
    const { severe, frequent } = ledgerPanels(clusters, 'current', new Set(), 'archived')
    expect(severe.map((e) => e.name)).toEqual(['b', 'm'])
    expect(frequent.map((e) => e.name)).toEqual(['n'])
    expect(ledgerPanels([cluster('a', ['moderate']), cluster('b', ['nit'])], 'current', new Set(), 'archived').severe.map((e) => e.name)).toEqual(['a', 'b'])
  })

  it('links each occurrence to its session log in the right Space, newest first', () => {
    const [e] = ledgerPanels([cluster('x', ['nit', 'minor'])], 'current', new Set(['x-1']), 'archived').severe
    expect(e!.occurrences).toEqual([
      { date: '2026-10-02', severity: 'minor', to: '/t/journal/current#session-x-1' },
      { date: '2026-10-01', severity: 'nit', to: '/t/journal/archived#session-x-0' },
    ])
  })
})

describe('ledgerPanels text', () => {
  it('carries the visitor summary and the detailed cause', () => {
    const [e] = ledgerPanels([cluster('x', ['nit'])], 'current', new Set(), 'archived').severe
    expect(e).toMatchObject({ summary: 'x summary', cause: 'x cause' })
  })
})

describe('ledgerPanels goals', () => {
  it('carries the session goal onto an occurrence when this Space has it', () => {
    const [e] = ledgerPanels([cluster('x', ['nit'])], 'current', new Set(['x-0']), 'archived', { 'x-0': 'Fix the gate' }).severe
    expect(e!.occurrences[0]!.goal).toBe('Fix the gate')
  })
})

describe('ledgerPanels reports', () => {
  const logged = (name: string, texts: { description: string; solution: string }[]): FrictionClusterDoc => ({
    ...cluster(name, texts.map(() => 'nit')),
    occurrences: texts.map((t, i) => ({ session: `${name}-${i}`, date: `2026-10-0${i + 1}`, severity: 'nit' as const, ...t })),
  })

  it('lists the friction an occurrence carries with its solution once, linked to the Space that holds it', () => {
    const t = { description: 'Gate ran twice', solution: 'Add a guard' }
    const [e] = ledgerPanels([logged('x', [t, t])], 'current', new Set(['x-0']), 'archived').severe
    expect(e!.reports).toEqual([{ ...t, date: '2026-10-02', to: '/t/journal/archived#session-x-1' }])
  })
})

describe('ledgerPanels fixes', () => {
  const fixed = (fixes: { pr: number; date: string }[], fixedOn = '2026-10-12'): FrictionClusterDoc => ({
    ...cluster('x', ['nit']),
    status: 'fixed',
    fixedOn,
    ref: 'issue #5; PR #7',
    fixes: fixes.map((f) => ({ ...f, summary: `fix ${f.pr}` })),
  })

  it('lists fixes newest first with their PR link, and none when there are none', () => {
    const [e] = ledgerPanels([fixed([{ pr: 1, date: '2026-10-05' }, { pr: 2, date: '2026-10-12' }])], 'current', new Set(), 'archived').severe
    expect(e!.fixes.map((f) => f.pr)).toEqual([2, 1])
    expect(e!.fixes[0]).toMatchObject({ summary: 'fix 2', url: 'https://github.com/feffef/terrarium/pull/2' })
    expect(ledgerPanels([fixed([])], 'current', new Set(), 'archived').severe[0]!.fixes).toEqual([])
  })
})
