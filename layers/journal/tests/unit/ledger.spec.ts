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
    occurrences: severities.map((severity, i) => ({ session: `${name}-${i}`, date: `2026-10-0${i + 1}`, severity })),
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
  const logged = (severity: Severity, description: string, solution: string) => ({ severity, description, solution })

  it("lists what a session logged with its solution once, linked to the Space that holds it", () => {
    const c = cluster('x', ['nit', 'nit'])
    const same = [logged('nit', 'Gate ran twice', 'Add a guard')]
    const [e] = ledgerPanels([c], 'current', new Set(['x-0']), 'archived', {}, { 'x-0': same, 'x-1': same }).severe
    expect(e!.reports).toEqual([
      { description: 'Gate ran twice', solution: 'Add a guard', date: '2026-10-02', to: '/t/journal/archived#session-x-1' },
    ])
  })

  it('skips a session whose Frictions of that severity are ambiguous, and is empty without any', () => {
    const [e] = ledgerPanels([cluster('x', ['nit'])], 'current', new Set(['x-0']), 'archived', {}, {
      'x-0': [logged('nit', 'a', 'A'), logged('nit', 'b', 'B'), logged('major', 'c', 'C')],
    }).severe
    expect(e!.reports).toEqual([])
    expect(ledgerPanels([cluster('y', ['nit'])], 'current', new Set(), 'archived').severe[0]!.reports).toEqual([])
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

  it('lists fixes newest first with their PR link, and names the PR merged on fixedOn in the pill', () => {
    const [e] = ledgerPanels([fixed([{ pr: 1, date: '2026-10-05' }, { pr: 2, date: '2026-10-12' }])], 'current', new Set(), 'archived').severe
    expect(e!.fixes.map((f) => f.pr)).toEqual([2, 1])
    expect(e!.fixes[0]).toMatchObject({ summary: 'fix 2', url: 'https://github.com/feffef/terrarium/pull/2' })
    expect(e!.fixedPr).toEqual({ number: 2, url: 'https://github.com/feffef/terrarium/pull/2' })
  })

  it('falls back to the newest fix, and shows no PR for a cluster that is not fixed or has no fixes', () => {
    const [a] = ledgerPanels([fixed([{ pr: 1, date: '2026-10-05' }], '2026-10-09')], 'current', new Set(), 'archived').severe
    expect(a!.fixedPr?.number).toBe(1)
    const [b] = ledgerPanels([{ ...fixed([{ pr: 1, date: '2026-10-05' }]), status: 'open' }], 'current', new Set(), 'archived').severe
    expect(b!.fixedPr).toBeUndefined()
    expect(b!.fixes).toHaveLength(1)
    const [c] = ledgerPanels([fixed([])], 'current', new Set(), 'archived').severe
    expect(c).toMatchObject({ fixes: [], fixedPr: undefined })
  })
})
