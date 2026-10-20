// The Friction Ledger page's ranking (layers/journal/app/utils/ledger.ts).
import { describe, expect, it } from 'vitest'
import { ledgerFixState, ledgerPanels, ledgerWindowStart } from '../../app/utils/ledger.ts'
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

describe('ledgerFixState', () => {
  const asOf = '2026-10-20'
  const state = (fixDates: string[], occurrences: string[]) => ledgerFixState('tracked', fixDates.map((date) => ({ date })), occurrences, asOf)

  it('has no state without a merged PR', () => {
    expect(state([], ['2026-10-01'])).toBeUndefined()
  })

  it('is still recurring, with the count, when occurrences are dated after the latest PR', () => {
    expect(state(['2026-10-02', '2026-10-06'], ['2026-10-01', '2026-10-05', '2026-10-07', '2026-10-08'])).toEqual({ state: 'still recurring', since: 2 })
  })

  it('is likely fixed after a quiet spell, and fix landed before it; the PR\'s own day does not count', () => {
    expect(state(['2026-10-05'], ['2026-10-01', '2026-10-05'])).toEqual({ state: 'likely fixed', since: 0 })
    expect(state(['2026-10-17'], ['2026-10-01'])).toEqual({ state: 'likely fixed', since: 0 })
    expect(state(['2026-10-18'], ['2026-10-01'])).toEqual({ state: 'fix landed', since: 0 })
  })

  it('has no state for an accepted cluster, even with merged PRs and later occurrences', () => {
    expect(ledgerFixState('accepted', [{ date: '2026-10-02' }], ['2026-10-05'], asOf)).toBeUndefined()
  })
})

describe('ledgerPanels fixes and state', () => {
  const merged = (fixes: { pr: number; date: string }[], ...extra: Partial<FrictionClusterDoc>[]): FrictionClusterDoc => ({
    ...cluster('x', ['nit']),
    fixes: fixes.map((f) => ({ ...f, summary: `fix ${f.pr}` })),
    ...Object.assign({}, ...extra),
  })

  it('lists fixes newest first with their PR link, and none when there are none', () => {
    const [e] = ledgerPanels([merged([{ pr: 1, date: '2026-10-05' }, { pr: 2, date: '2026-10-12' }])], 'current', new Set(), 'archived').severe
    expect(e!.fixes.map((f) => f.pr)).toEqual([2, 1])
    expect(e!.fixes[0]).toMatchObject({ summary: 'fix 2', url: 'https://github.com/feffef/terrarium/pull/2' })
    expect(ledgerPanels([merged([])], 'current', new Set(), 'archived').severe[0]!.fixes).toEqual([])
  })

  it('lists at most the newest five PRs', () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ pr: i + 1, date: `2026-09-0${i + 1}` }))
    const [e] = ledgerPanels([merged(many)], 'current', new Set(), 'archived').severe
    expect(e!.fixes.map((f) => f.pr)).toEqual([7, 6, 5, 4, 3])
  })

  it('shows the stored status without a merged PR and the derived state with one, measured to the newest occurrence in the ledger', () => {
    const clusters = [
      { ...cluster('plain', ['nit']), status: 'on-trial' as const },
      { ...merged([{ pr: 1, date: '2026-09-30' }]), name: 'late' },
      { ...cluster('newest', ['nit', 'nit', 'nit', 'nit', 'nit']) },
    ]
    const { severe, frequent } = ledgerPanels(clusters, 'current', new Set(), 'archived')
    const byName = Object.fromEntries([...severe, ...frequent].map((e) => [e.name, e]))
    expect(byName.plain).toMatchObject({ state: 'on trial', since: 0 })
    expect(byName.late).toMatchObject({ state: 'still recurring', since: 1 })
  })

  it('shows accepted over the derived state, still counting and listing occurrences and fixes', () => {
    const accepted = { ...merged([{ pr: 1, date: '2026-09-30' }]), status: 'accepted' as const }
    const [e] = ledgerPanels([accepted], 'current', new Set(), 'archived').severe
    expect(e).toMatchObject({ state: 'accepted', since: 0, count: 1 })
    expect(e!.fixes.map((f) => f.pr)).toEqual([1])
  })

  it('carries notes to the page without changing the state', () => {
    const notes = '2026-10-20 design: a CLAUDE.md line dropped: costs every session more than the slip'
    const [e] = ledgerPanels([{ ...cluster('n', ['major']), notes }], 'current', new Set(), 'archived').severe
    expect(e).toMatchObject({ state: 'open', notes })
  })
})

describe('ledgerPanels window', () => {
  it('counts, ranks and lists only occurrences from the window start, and drops a cluster with none', () => {
    // cluster() dates occurrence i on 2026-10-0(i+1).
    const clusters = [cluster('old-major', ['major', 'nit', 'nit']), cluster('gone', ['blocker']), cluster('new', ['nit', 'nit', 'minor'])]
    const { severe, frequent } = ledgerPanels(clusters, 'current', new Set(), 'archived', {}, '2026-10-02')
    expect([...severe, ...frequent].map((e) => [e.name, e.count, e.worst])).toEqual([['new', 2, 'minor'], ['old-major', 2, 'nit']])
    expect(severe[0]!.occurrences.map((o) => o.date)).toEqual(['2026-10-03', '2026-10-02'])
  })

  it('keeps the fix state on every occurrence, so a fix merged before the window still counts', () => {
    const c = { ...cluster('x', ['nit', 'nit', 'nit']), fixes: [{ pr: 1, date: '2026-10-01', summary: 'fix' }] }
    const [e] = ledgerPanels([c], 'current', new Set(), 'archived', {}, '2026-10-03').severe
    expect(e).toMatchObject({ count: 1, state: 'still recurring', since: 2 })
  })

  it('covers exactly the last N dates, today included', () => {
    expect(ledgerWindowStart('2026-10-20', 2)).toBe('2026-10-19')
    expect(ledgerWindowStart('2026-03-01', 14)).toBe('2026-02-16')
  })
})
