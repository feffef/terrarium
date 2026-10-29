// The pure core of grades.ts: the page hash, the plan's reader split, the A
// election, report checks and the next grades.yml. The git shell runs in the Skill.
import { describe, expect, it } from 'vitest'
import { elect, middle, structural, nextRecord, pageHash, parseReport, planPages, reportProblems, tally, type GradeRecord, type Plan, type Report } from '../../scripts/grades.ts'

const page = '---\ntitle: Hooks\nrevision: abc\nrevisionDate: 2026-10-01\n---\nBody\n::excerpt{path="a.ts" lines="3-5"}\n'

const report = (rater: Report['rater'], top10: string[], extra: Partial<Report> = {}): Report => ({
  rater,
  pages: top10.map((p) => ({ page: p, grade: 'B' })),
  top10,
  ...extra,
})

describe('pageHash', () => {
  it('keeps a body line that only looks like a pin', () => {
    expect(pageHash(page.replace('Body', 'revision: x'))).not.toBe(pageHash(page.replace('Body', '')))
  })
  it('ignores a re-pin and a moved Excerpt range', () => {
    const repinned = page.replace('revision: abc', 'revision: def').replace('lines="3-5"', 'lines="4-6"')
    expect(pageHash(repinned)).toBe(pageHash(page))
  })
  it('sees a changed sentence', () => {
    expect(pageHash(page.replace('Body', 'Text'))).not.toBe(pageHash(page))
  })
})

describe('planPages', () => {
  const graded = (run: string) => ({ hash: 'h', grade: 'B' as const, grades: { sonnet: { grade: 'B' as const, run }, fable: { grade: 'B' as const, run }, opus: { grade: 'B' as const, run } } })

  it('has all three read every page while no page is A', () => {
    const record: GradeRecord = { pages: { 'a/01.x': graded('2026-10-01') }, candidates: [] }
    expect(planPages(record, { 'a/01.x': 'h', 'a/02.y': 'h' }).allThree).toEqual(['a/01.x', 'a/02.y'])
  })

  it('splits unchanged non-A pages evenly among the models, and flags stale entries', () => {
    const pages: GradeRecord['pages'] = { 'a/00.top': { ...graded('2026-10-01'), grade: 'A' }, gone: graded('2026-10-01') }
    const hashes: Record<string, string> = { 'a/00.top': 'h', 'walkthroughs/w': 'h', 'a/09.new': 'h' }
    for (let i = 1; i <= 6; i++) {
      pages[`a/0${i}.p`] = graded('2026-10-01')
      hashes[`a/0${i}.p`] = 'h'
    }
    pages['a/01.p'] = { ...graded('2026-10-01'), readByAll: true }
    pages['a/02.p'] = { ...graded('2026-10-01'), hash: 'old' }
    const plan = planPages({ pages, candidates: [] }, hashes)
    expect(plan.allThree).toEqual(['a/00.top', 'a/01.p', 'a/02.p', 'a/09.new', 'walkthroughs/w'])
    expect(Object.values(plan.lone).map((l) => l.length)).toEqual([2, 1, 1])
    expect(plan.stale).toEqual(['gone'])
  })

  it('gives a lone page to the model that graded it longest ago', () => {
    const pages: GradeRecord['pages'] = { 'a/00.top': { ...graded('2026-10-05'), grade: 'A' } }
    pages['a/01.p'] = { ...graded('2026-10-05'), grades: { ...graded('2026-10-05').grades, opus: { grade: 'B', run: '2026-10-01' } } }
    const plan = planPages({ pages, candidates: [] }, { 'a/00.top': 'h', 'a/01.p': 'h' })
    expect(plan.lone.opus).toEqual(['a/01.p'])
  })
})

describe('middle', () => {
  it('takes the middle of three, or the only one', () => {
    expect(middle(['B', 'D', 'C'])).toBe('C')
    expect(middle(['C'])).toBe('C')
  })
})

describe('elect', () => {
  const pool = Array.from({ length: 12 }, (_, i) => `l/${String(i).padStart(2, '0')}`)

  it('seats pages two raters put in their top 10, at most 10', () => {
    const top = pool.slice(0, 10)
    const e = elect([report('sonnet', top), report('fable', top), report('opus', [])], [], [], pool)
    expect(e.lessons).toEqual(top)
  })

  it('keeps an incumbent two raters still back, and lets a challenger with a lower rank sum replace the weakest', () => {
    const incumbents = pool.slice(0, 10)
    // l/10 is first for two raters; l/09 drops out of their lists, so it loses its seat.
    const top = ['l/10', ...pool.slice(0, 9)]
    const e = elect([report('sonnet', top), report('fable', top), report('opus', incumbents)], incumbents, [], pool)
    expect(e.lessons).toContain('l/10')
    expect(e.lessons).not.toContain('l/09')
    expect(e.lessons).toHaveLength(10)
  })

  it('does not replace a seat when the challenger ranks lower', () => {
    const incumbents = pool.slice(0, 10)
    const challenger = [...pool.slice(0, 9), 'l/10']
    const e = elect([report('sonnet', challenger), report('fable', incumbents), report('opus', incumbents)], incumbents, [], pool)
    expect(e.lessons).toEqual(incumbents)
  })

  it('never seats a page selected for an edit', () => {
    const top = pool.slice(0, 3)
    const e = elect([report('sonnet', top), report('fable', top), report('opus', top)], [], ['l/00'], pool)
    expect(e.lessons).toEqual(['l/01', 'l/02'])
  })

  it('makes the Walkthrough two raters name best A, else keeps the incumbent', () => {
    const ws = ['walkthroughs/a', 'walkthroughs/b']
    const named = (w: string) => ({ bestWalkthrough: w })
    expect(elect([report('sonnet', [], named(ws[1]!)), report('fable', [], named(ws[1]!)), report('opus', [])], [ws[0]!], [], ws).walkthrough).toBe(ws[1])
    expect(elect([report('sonnet', [], named(ws[1]!)), report('fable', [], named(ws[0]!)), report('opus', [])], [ws[0]!], [], ws).walkthrough).toBe(ws[0])
  })
})

describe('reports', () => {
  const plan: Plan = { base: 'b', allThree: ['l/01', 'walkthroughs/w'], lone: { sonnet: ['l/02'], fable: [], opus: [] }, stale: [] }

  it('parses the last yaml block of a hand-back', () => {
    const r = parseReport('notes\n```yaml\nrater: fable\npages: []\ntop10: []\n```\n')
    expect(r.rater).toBe('fable')
  })

  it('names a missing page, an A grade, and a top 10 entry it did not grade B', () => {
    const r: Report = { rater: 'sonnet', pages: [{ page: 'l/01', grade: 'C' }, { page: 'walkthroughs/w', grade: 'A' as never }], top10: ['l/01'] }
    expect(reportProblems(r, plan)).toEqual([
      'sonnet: no grade for l/02',
      'sonnet: walkthroughs/w has grade A; raters grade B, C or D',
      'sonnet: top10 lists l/01, which it did not grade B',
    ])
  })
})

describe('tally and nextRecord', () => {
  const plan: Plan = { base: 'b', allThree: ['l/01'], lone: { sonnet: ['l/02'], fable: ['l/03'], opus: [] }, stale: [] }
  const record: GradeRecord = { pages: { 'l/02': { hash: 'h', grades: {}, readByAll: true } }, candidates: [] }
  const reports: Report[] = [
    { rater: 'sonnet', pages: [{ page: 'l/01', grade: 'B' }, { page: 'l/02', grade: 'C', deficits: [{ criterion: 'Cut', quote: 'q', fix: 'f' }] }], top10: ['l/01'] },
    { rater: 'fable', pages: [{ page: 'l/01', grade: 'B' }, { page: 'l/03', grade: 'B' }], top10: ['l/01'] },
    { rater: 'opus', pages: [{ page: 'l/01', grade: 'C' }], top10: [] },
  ]

  it('sends a lone page whose reader raised something to all three next run', () => {
    expect(tally(record, plan, reports).triggered).toEqual(['l/02'])
  })

  it('writes this run\'s grades, the election and the flags', () => {
    const t = tally(record, plan, reports)
    const next = nextRecord(record, t, { run: '2026-10-30', hashes: { 'l/01': 'x', 'l/02': 'y', 'l/03': 'z' }, gapEdit: ['l/03'], readByAll: [] })
    expect(next.pages['l/01']).toMatchObject({ hash: 'x', grade: 'A', grades: { opus: { grade: 'C', run: '2026-10-30' } } })
    expect(next.pages['l/01']!.readByAll).toBeUndefined()
    expect(next.pages['l/02']).toMatchObject({ grade: 'C', readByAll: true })
    expect(next.pages['l/03']).toMatchObject({ grade: 'B', gapEdit: '2026-10-30' })
  })
})

describe('structural', () => {
  it('groups raises by draft and pages, most raters first', () => {
    const r = (rater: Report['rater'], extra: Partial<Report>) => report(rater, [], extra)
    const raises = structural([
      r('sonnet', { missingLessons: [{ concept: 'Hints', subject: 'claude-code', draft: 'claude-code/06.hints', rank: 2 }], recuts: [{ pages: ['b', 'a'], move: 'm' }] }),
      r('fable', { missingLessons: [{ concept: 'Hint hooks', subject: 'claude-code', draft: 'claude-code/06.hints', rank: 1 }] }),
      r('opus', { recuts: [{ pages: ['a', 'b'], move: 'n' }], missingLessons: [{ concept: 'Guests', subject: 'git-github', rank: 1 }] }),
    ])
    expect(raises.map((x) => [x.key, x.raters.length, x.rankSum])).toEqual([
      ['promote claude-code/06.hints', 2, 3],
      ['re-cut a + b', 2, undefined],
      ['new Lesson: Guests', 1, 1],
    ])
  })
})
