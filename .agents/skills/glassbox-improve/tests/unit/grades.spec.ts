// The pure core of grades.ts: the record, the plan, report checks, the tally,
// the blind comparisons, the next record and the drafts report. The git shell runs in the Skill.
import { describe, expect, it } from 'vitest'
import type { GlassboxGit } from '../../../../../layers/glassbox/page-checks.ts'
import { blindPair, claimShards, judgeBrief, raterBrief, comparisonResult, coverageProblems, decodeVerdict, draftsReport, gateMerged, nextRecord, pageHash, parseReport, runEntry, planPages, readRecord, reportProblems, sourcesHash, tally, trimPage, type GradeRecord, type PageRecord, type Plan, type Report, type RunEntry, type Step, type Tally } from '../../scripts/grades.ts'

const page = '---\ntitle: Hooks\nrevision: abc\nrevisionDate: 2026-10-01\n---\nBody\n::excerpt{path="a.ts" lines="3-5"}\n'

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

describe('sourcesHash', () => {
  it('changes when a cited file changes, not with the order the page cites them', () => {
    const files: Record<string, string> = { 'a.ts': 'a', 'b.ts': 'b' }
    const read = (p: string) => files[p]
    const before = sourcesHash(['a.ts', 'b.ts', 'a.ts'], read)
    expect(sourcesHash(['b.ts', 'a.ts'], read)).toBe(before)
    files['b.ts'] = 'b2'
    expect(sourcesHash(['a.ts', 'b.ts'], read)).not.toBe(before)
  })
})

describe('readRecord', () => {
  it('starts a v2 file fresh and turns its waiting candidates into steps', () => {
    const v2 = `run: 2026-11-02
pages:
  claude-code/01.claude-md: { hash: h, grades: {}, grade: A }
candidates:
  - { kind: promote nuxt-content/05.mdc-components, pages: [nuxt-content/05.mdc-components], gist: MDC components., since: 2026-11-01 }
  - { kind: re-cut skill-pack/02.planning-with-the-pack, pages: [skill-pack/02.planning-with-the-pack], gist: Split wayfinder into its own Lesson., since: 2026-11-02 }
  - { kind: re-cut nuxt-vue/05.vue-components + nuxt-vue/07.css-custom-properties, pages: [nuxt-vue/05.vue-components, nuxt-vue/07.css-custom-properties], gist: Move ProgressBar's custom properties to CSS custom properties., since: 2026-11-02 }
`
    expect(readRecord(v2)).toEqual({
      version: 3,
      pages: {},
      steps: [
        { id: 'promote-mdc-components', kind: 'promote', pages: ['nuxt-content/05.mdc-components'], raised: ['2026-11-01'], status: 'pending', gist: 'MDC components.' },
        { id: 'split-planning-with-the-pack', kind: 'split', pages: ['skill-pack/02.planning-with-the-pack'], raised: ['2026-11-02'], status: 'pending', gist: 'Split wayfinder into its own Lesson.' },
        { id: 'move-vue-components-into-css-custom-properties', kind: 'move', pages: ['nuxt-vue/05.vue-components'], into: 'nuxt-vue/07.css-custom-properties', raised: ['2026-11-02'], status: 'pending', gist: "Move ProgressBar's custom properties to CSS custom properties." },
      ],
    })
  })
  it('reads an absent file as empty', () => {
    expect(readRecord(undefined)).toEqual({ version: 3, pages: {}, steps: [] })
  })
})

const run = (date: string, extra: Partial<RunEntry> = {}): RunEntry => ({ run: date, base: 'b', pagesRead: 1, pagesChecked: 1, falseClaimsFixed: 0, edits: 0, gatePassed: 0, gateStopped: 0, aComparisons: 0, stepsTaken: 0, stepsRefused: 0, ...extra })
const rec = (read: string, extra: Partial<PageRecord> = {}): PageRecord => ({ hash: 'h', sources: 's', read, checked: read, lenses: {}, ...extra })

describe('planPages', () => {
  const current = (pages: string[]) => Object.fromEntries(pages.map((p) => [p, { hash: 'h', sources: 's' }]))

  it('reads every page on the first v3 run, Relevance included', () => {
    const plan = planPages({ version: 3, pages: {}, steps: [] }, current(['a/01.x', 'a/02.y']), [])
    expect(plan.read).toEqual(['a/01.x', 'a/02.y'])
    expect(plan.relevance).toBe('first v3 run')
  })

  it('reads changed pages plus the third of the guide read longest ago', () => {
    const pages: GradeRecord['pages'] = {}
    for (const [p, read] of [['a/01', '2026-11-01'], ['a/02', '2026-10-01'], ['a/03', '2026-11-01'], ['a/04', '2026-10-15'], ['a/05', '2026-11-01'], ['a/06', '2026-11-01']] as const) pages[p] = rec(read)
    pages['a/03'] = rec('2026-11-01', { sources: 'old' })
    pages['gone'] = rec('2026-11-01')
    const plan = planPages({ version: 3, run: '2026-11-01', pages, steps: [] }, { ...current(['a/01', 'a/02', 'a/04', 'a/05', 'a/06', 'a/07']), 'a/03': { hash: 'h', sources: 's' } }, [run('2026-11-01', { relevance: true })])
    expect(plan.changed).toEqual(['a/03', 'a/07'])
    expect(plan.rotation).toEqual(['a/02', 'a/04', 'a/01'])
    expect(plan.read).toEqual(['a/01', 'a/02', 'a/03', 'a/04', 'a/07'])
    expect(plan.stale).toEqual(['gone'])
    expect(plan.relevance).toBe('pages added or gone: a/07, gone')
  })

  it('runs Relevance when none of the last 4 runs did', () => {
    const record: GradeRecord = { version: 3, pages: { 'a/01': rec('2026-11-01') }, steps: [] }
    const runs = ['2026-11-04', '2026-11-03', '2026-11-02', '2026-11-01'].map((d) => run(d))
    expect(planPages(record, current(['a/01']), runs).relevance).toBe('none of the last 4 runs rated it')
    expect(planPages(record, current(['a/01']), [...runs.slice(0, 3), run('2026-11-01', { relevance: true })]).relevance).toBeUndefined()
  })
})

describe('trimPage', () => {
  it('keeps the title and prose, cuts code to a line count and long lines to 200 chars', () => {
    const text = `---\ntitle: Hooks\ndescription: D\nrevision: abc\n---\nIntro ${'x'.repeat(300)}\n\n::excerpt{path="a.ts" lines="1-2"}\n\`\`\`ts\none\ntwo\n\`\`\`\n::\n\n\`\`\`json\n{}\n\`\`\`\nEnd.\n`
    expect(trimPage(text)).toBe(`title: Hooks\ndescription: D\n\nIntro ${'x'.repeat(194)}…\n\n[Excerpt of a.ts: 2 lines]\n\n[code: 1 line]\nEnd.\n`)
  })
})

describe('reports', () => {
  const plan: Plan = { base: 'b', pages: ['a/01.x', 'a/02.y', 'walkthroughs/w'], read: ['a/01.x', 'walkthroughs/w'], changed: [], rotation: [], relevance: 'first v3 run', stale: [] }
  const good: Report = {
    rater: 'A',
    pages: [
      { page: 'a/01.x', lenses: { clarity: { grade: 'C', findings: [{ quote: 'q', fix: 'f' }] }, reasoning: { grade: 'B' } } },
      { page: 'walkthroughs/w', lenses: { clarity: { grade: 'B' }, reasoning: { grade: 'n/a' } } },
    ],
  }

  it('parses the last yaml block of a hand-back', () => {
    expect(parseReport('```yaml\nrater: B\n```\ntext\n```yaml\nrater: A\npages: []\n```\n')).toEqual({ rater: 'A', pages: [] })
    expect(() => parseReport('```yaml\nrater: opus\n```')).toThrow('rater is opus, not one of A, B, C')
  })

  it('accepts a report that grades its lenses on its pages', () => {
    expect(reportProblems(good, plan)).toEqual([])
  })

  it('rejects an unknown lens id, another rater\'s lens, a missing grade, an A, and a C or D without its finding', () => {
    const bad: Report = {
      rater: 'A',
      pages: [
        { page: 'a/01.x', lenses: { clarity: { grade: 'A' }, reasoning: { grade: 'D' }, evidence: { grade: 'B' }, tone: { grade: 'B' } } as never },
        { page: 'a/02.y', lenses: { clarity: { grade: 'B' }, reasoning: { grade: 'B' } } },
      ],
    }
    expect(reportProblems(bad, plan)).toEqual([
      'A: a/01.x clarity is A; raters grade B, C, D or n/a',
      'A: a/01.x reasoning is D without a finding',
      'A: a/01.x grades evidence, not one of its lenses (clarity, reasoning)',
      'A: a/01.x grades tone, an unknown lens',
      'A: graded a/02.y, which is not in its plan',
    ])
  })

  it('takes n/a for Reasoning and Transfer on Walkthroughs only', () => {
    const swapped: Report = { rater: 'A', pages: [
      { page: 'a/01.x', lenses: { clarity: { grade: 'B' }, reasoning: { grade: 'n/a' } } },
      { page: 'walkthroughs/w', lenses: { clarity: { grade: 'B' }, reasoning: { grade: 'B' } } },
    ] }
    expect(reportProblems(swapped, plan)).toEqual(['A: a/01.x reasoning is n/a, which only a Walkthrough takes', 'A: walkthroughs/w reasoning must be n/a on a Walkthrough'])
  })

  it('has each rater grade each of its pages once, rater C across its shards', () => {
    const c = (pages: string[]): Report => ({ rater: 'C', pages: pages.map((page) => ({ page, lenses: {} })) })
    const b: Report = { rater: 'B', pages: plan.pages.map((page) => ({ page, lenses: {} })) }
    expect(coverageProblems([good, b, c(['a/01.x']), c(['walkthroughs/w'])], plan)).toEqual([])
    expect(coverageProblems([good, b, c(['a/01.x']), c(['a/01.x'])], plan)).toEqual(['C: no grades for walkthroughs/w', 'C: graded a/01.x twice'])
    expect(claimShards({ read: Array.from({ length: 17 }, (_, i) => `p${i}`) }).map((s) => s.length)).toEqual([8, 8, 1])
  })

  it('has rater B grade every page, Relevance when due, and rater C report its claim check', () => {
    const b: Report = { rater: 'B', pages: plan.pages.map((page) => ({ page, lenses: { placement: { grade: 'B' } } })) }
    expect(reportProblems(b, plan)).toEqual(['B: a/01.x has no relevance grade', 'B: a/02.y has no relevance grade', 'B: walkthroughs/w has no relevance grade'])
    expect(reportProblems(b, { ...plan, relevance: undefined })).toEqual([])
    const c: Report = { rater: 'C', pages: [
      { page: 'a/01.x', lenses: { evidence: { grade: 'B' }, transfer: { grade: 'B' } }, claims: ['hooks run in parallel'], docs: 'https://code.claude.com/docs/en/hooks' },
      { page: 'walkthroughs/w', lenses: { evidence: { grade: 'B' }, transfer: { grade: 'n/a' } } },
    ] }
    expect(reportProblems(c, plan)).toEqual(['C: walkthroughs/w has no claim check (claims and docs)'])
  })

  it('rejects a step of an unknown kind', () => {
    expect(reportProblems({ ...good, steps: [{ kind: 'recut' as never, pages: ['a/01.x'], gist: 'g' }] }, plan)).toEqual(['A: step recut is not one of merge, split, move, cut, promote, lesson, section'])
  })
})

describe('tally', () => {
  const today = '2026-11-05'
  const plan: Plan = { base: 'b', pages: ['a/01.p', 'a/02.p', 'a/03.p', 'a/04.p', 'b/01.p'], read: ['a/01.p', 'a/02.p', 'a/03.p', 'a/04.p', 'b/01.p'], changed: [], rotation: [], stale: [] }
  const lensesOf = (grades: Record<string, unknown>) => grades as Report['pages'][number]['lenses']
  const reportA = (pages: Record<string, Record<string, unknown>>, top3: Report['top3'] = {}): Report => ({ rater: 'A', pages: Object.entries(pages).map(([page, l]) => ({ page, lenses: lensesOf(l) })), top3 })
  const allB = { clarity: { grade: 'B' }, reasoning: { grade: 'B' } }
  const record = (pages: GradeRecord['pages'] = {}, steps: Step[] = []): GradeRecord => ({ version: 3, run: '2026-11-02', pages, steps })

  it('orders the work: false claims, page checks, deficits weakest page first, then gaps', () => {
    const a = reportA({
      'a/01.p': { clarity: { grade: 'C', findings: [{ quote: 'q1', fix: 'f1' }] }, reasoning: { grade: 'B' } },
      'a/02.p': { clarity: { grade: 'B', gaps: [{ section: 'Lede', exemplar: 'a/04.p', take: 't' }] }, reasoning: { grade: 'D', findings: [{ quote: 'q2', fix: 'f2' }] } },
      'a/03.p': allB, 'a/04.p': allB, 'b/01.p': allB,
    })
    const c: Report = { rater: 'C', pages: [{ page: 'b/01.p', lenses: {}, falseClaims: [{ quote: 'runs daily', source: 'x.ts:3' }] }] }
    const held = record({ 'a/04.p': { hash: 'h', sources: 's', lenses: { clarity: { grade: 'A', run: '2026-11-02' } } } })
    const result = tally(held, plan, [a, c], [], { 'a/03.p': ['stop "1. X" has 81 words'] }, today)
    expect(result.items.map((i) => [i.id, i.kind, i.page, i.lens ?? '', i.skipped ?? ''])).toEqual([
      ['f1', 'falseClaim', 'b/01.p', '', ''],
      ['f2', 'check', 'a/03.p', '', ''],
      ['f3', 'deficit', 'a/02.p', 'reasoning', ''],
      ['f4', 'deficit', 'a/01.p', 'clarity', ''],
      ['f5', 'gap', 'a/02.p', 'clarity', ''],
    ])
  })

  it('skips a gap whose exemplar holds no A on its lens, or on a lens the page was edited on within the last 5 runs', () => {
    const a = reportA({
      'a/01.p': { clarity: { grade: 'B', gaps: [{ section: 'Lede', exemplar: 'a/03.p', take: 't' }] }, reasoning: { grade: 'B', gaps: [{ section: 'Why', exemplar: 'a/04.p', take: 't' }] } },
      'a/02.p': allB, 'a/03.p': allB, 'a/04.p': allB, 'b/01.p': allB,
    })
    const runs = ['2026-11-04', '2026-11-03', '2026-11-02', '2026-11-01', '2026-10-31'].map((d) => run(d))
    const held = record({
      'a/01.p': { hash: 'h', sources: 's', lenses: {}, edited: { run: '2026-10-31', lenses: ['reasoning'] } },
      'a/04.p': { hash: 'h', sources: 's', lenses: { reasoning: { grade: 'A', run: '2026-11-02' } } },
    })
    expect(tally(held, plan, [a], runs, {}, today).items.map((i) => i.skipped)).toEqual(['a/03.p holds no A on clarity', 'edited on reasoning within the last 5 runs'])
    held.pages['a/01.p']!.edited!.run = '2026-10-30'
    expect(tally(held, plan, [a], runs, {}, today).items.map((i) => i.skipped)).toEqual(['a/03.p holds no A on clarity', undefined])
  })

  it('queues raised steps once each, and refuses the inverse of a step taken within the last 5 runs', () => {
    const taken: Step = { id: 'merge-02-into-03', kind: 'merge', pages: ['a/02.p'], into: 'a/03.p', raised: ['2026-10-30'], status: 'taken', decided: '2026-11-02', gist: 'g' }
    const b: Report = { rater: 'B', pages: [], steps: [
      { kind: 'split', pages: ['a/03.p'], into: 'a/02.p', gist: 'split it back' },
      { kind: 'cut', pages: ['a/04.p'], gist: 'nothing relies on it' },
    ] }
    const c: Report = { rater: 'C', pages: [], steps: [{ kind: 'cut', pages: ['a/04.p'], gist: 'again' }] }
    const result = tally(record({}, [taken]), plan, [b, c], [run('2026-11-02')], {}, today)
    expect(result.steps.map((s) => [s.id, s.status, s.raised])).toEqual([
      ['merge-02-into-03', 'taken', ['2026-10-30']],
      ['split-p-into-p', 'refused', [today]],
      ['cut-p', 'pending', [today]],
    ])
  })

  it('compares each top-3 candidate with the Subject\'s 3 most recent A holders on that lens', () => {
    const a = reportA({ 'a/01.p': allB, 'a/02.p': allB, 'a/03.p': allB, 'a/04.p': allB, 'b/01.p': allB }, { clarity: ['a/01.p'] })
    const holder = (won: string) => ({ hash: 'h', sources: 's', lenses: { clarity: { grade: 'A' as const, run: won, wins: [won] } } })
    const held = record({ 'a/02.p': holder('2026-10-01'), 'a/03.p': holder('2026-10-20'), 'a/04.p': holder('2026-10-10'), 'b/01.p': holder('2026-11-01') })
    held.pages['a/05.p'] = holder('2026-11-01')
    const result = tally(held, { ...plan, pages: [...plan.pages, 'a/05.p'] }, [a], [], {}, today)
    expect(result.comparisons.map((c) => [c.id, c.lens, c.candidate, c.against])).toEqual([
      ['a1', 'clarity', 'a/01.p', 'a/05.p'],
      ['a2', 'clarity', 'a/01.p', 'a/03.p'],
      ['a3', 'clarity', 'a/01.p', 'a/04.p'],
    ])
  })

  it('compares a candidate in a Subject with no holder against 2 other B pages, other candidates first', () => {
    const a = reportA({ 'a/01.p': allB, 'a/02.p': allB, 'a/03.p': allB, 'a/04.p': { clarity: { grade: 'C', findings: [{ quote: 'q', fix: 'f' }] }, reasoning: { grade: 'B' } }, 'b/01.p': allB }, { reasoning: ['a/03.p', 'a/04.p', 'b/01.p'] })
    const result = tally(record(), plan, [a], [], {}, today)
    // a/04.p has a deficit and b/01.p has no other B page in its Subject.
    expect(result.comparisons.map((c) => [c.candidate, c.against])).toEqual([['a/03.p', 'a/04.p'], ['a/03.p', 'a/01.p']])
    expect(result.waiting).toEqual(['a/04.p on reasoning: it has work this run', 'b/01.p on reasoning: b has fewer than 2 other B pages'])
  })

  it('stops at 10 comparisons a run', () => {
    const pages = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`a/0${i}.p`, allB]))
    const wide: Plan = { ...plan, pages: Object.keys(pages), read: Object.keys(pages) }
    const a = reportA(pages, { clarity: ['a/00.p', 'a/01.p', 'a/02.p'], reasoning: ['a/03.p', 'a/04.p', 'a/05.p'] })
    const result = tally(record(), wide, [a], [], {}, today)
    expect(result.comparisons).toHaveLength(10)
    expect(result.waiting).toEqual(['a/05.p on reasoning: no comparisons left this run'])
  })
})

describe('blind comparisons', () => {
  it('shows the challenger as X or Y by the coin, and decodes a verdict against that', () => {
    expect(blindPair('new', 'old', () => true)).toEqual({ X: 'new', Y: 'old', challenger: 'X' })
    expect(blindPair('new', 'old', () => false)).toEqual({ X: 'old', Y: 'new', challenger: 'Y' })
    expect(['X', 'Y', 'equal'].map((v) => decodeVerdict(v, 'Y'))).toEqual(['loss', 'win', 'equal'])
    expect(() => decodeVerdict('both', 'X')).toThrow('verdict both is not X, Y or equal')
  })

  it('merges an edit on 2 wins of 3; equal counts as a fail', () => {
    expect(gateMerged(['win', 'win', 'loss'])).toBe(true)
    expect(gateMerged(['win', 'equal', 'equal'])).toBe(false)
    expect(gateMerged(['win', 'win'])).toBeUndefined()
  })

  it('decides an A comparison on its first judge\'s loss, else on 2 wins of 3', () => {
    expect(comparisonResult(['equal'])).toBe('loss')
    expect(comparisonResult(['win'])).toBeUndefined()
    expect(comparisonResult(['win', 'loss', 'win'])).toBe('win')
    expect(comparisonResult(['win', 'loss', 'equal'])).toBe('loss')
  })
})

describe('nextRecord and runEntry', () => {
  const today = '2026-11-05'
  const plan: Plan = { base: 'b', pages: ['a/01.p', 'a/02.p', 'a/03.p'], read: ['a/01.p', 'a/02.p'], changed: [], rotation: [], relevance: 'first v3 run', stale: [] }
  const current = { 'a/01.p': { hash: 'h1', sources: 's1' }, 'a/02.p': { hash: 'h2', sources: 's2' }, 'a/03.p': { hash: 'h3', sources: 's3' } }
  const old: GradeRecord = {
    version: 3,
    run: '2026-11-02',
    pages: {
      'a/01.p': { hash: 'h0', sources: 's0', read: '2026-11-02', checked: '2026-11-02', lenses: { clarity: { grade: 'A', run: '2026-10-20', wins: ['2026-10-15', '2026-10-20'] }, reasoning: { grade: 'B', run: '2026-11-02', wins: ['2026-11-02'] } } },
      'a/03.p': { hash: 'h3', sources: 's3', read: '2026-10-01', checked: '2026-10-01', lenses: { clarity: { grade: 'B', run: '2026-10-01' } } },
    },
    steps: [{ id: 'cut-old', kind: 'cut', pages: ['a/09.old'], raised: ['2026-09-01'], status: 'taken', decided: '2026-09-01', gist: 'g' }],
  }
  const result: Tally = {
    grades: { 'a/01.p': { clarity: 'C', reasoning: 'B' }, 'a/02.p': { clarity: 'D', reasoning: 'B' } },
    items: [
      { id: 'f1', page: 'a/01.p', kind: 'deficit', lens: 'clarity', grade: 'C', quote: 'q', fix: 'f', confirmed: false },
      { id: 'f2', page: 'a/02.p', kind: 'deficit', lens: 'clarity', grade: 'D', quote: 'q', fix: 'f', confirmed: true, edited: true },
      { id: 'f3', page: 'a/02.p', kind: 'falseClaim', quote: 'runs daily', source: 'x.ts:3', fix: 'correct it to match x.ts:3', confirmed: true, edited: true },
    ],
    steps: [
      { id: 'cut-old', kind: 'cut', pages: ['a/09.old'], raised: ['2026-09-01'], status: 'taken', decided: '2026-09-01', gist: 'g' },
      { id: 'merge-p-into-p', kind: 'merge', pages: ['a/03.p'], into: 'a/02.p', raised: [today], status: 'taken', gist: 'g' },
      { id: 'split-p', kind: 'split', pages: ['a/02.p'], raised: [today], status: 'refused', decided: today, gist: 'g' },
    ],
    comparisons: [
      { id: 'a1', lens: 'reasoning', candidate: 'a/01.p', against: 'a/03.p', votes: ['win', 'win', 'loss'], result: 'win' },
    ],
    waiting: [],
  }
  const runs = [run('2026-11-02'), run('2026-11-01'), run('2026-10-31'), run('2026-10-30')]

  it('writes this run\'s lens grades; an unconfirmed deficit leaves B and A stands; a second straight win takes A', () => {
    const next = nextRecord(old, plan, current, result, runs, today)
    expect(next.run).toBe(today)
    expect(next.pages['a/01.p']).toEqual({ hash: 'h1', sources: 's1', read: today, checked: today, lenses: { clarity: { grade: 'A', run: '2026-10-20', wins: ['2026-10-15', '2026-10-20'] }, reasoning: { grade: 'A', run: today, wins: ['2026-11-02', today] } } })
    expect(next.pages['a/02.p']).toEqual({ hash: 'h2', sources: 's2', read: today, checked: today, lenses: { clarity: { grade: 'D', run: today }, reasoning: { grade: 'B', run: today } }, edited: { run: today, lenses: ['clarity'] } })
    expect(next.pages['a/03.p']).toEqual(old.pages['a/03.p'])
  })

  it('takes A only through a confirmed deficit, and keeps a lone win only from the run before', () => {
    const lost = { ...result, items: [{ ...result.items[0]!, confirmed: true }], comparisons: [{ ...result.comparisons[0]!, result: 'loss' as const }] }
    const next = nextRecord(old, plan, current, lost, runs, today)
    expect(next.pages['a/01.p']!.lenses).toEqual({ clarity: { grade: 'C', run: today }, reasoning: { grade: 'B', run: today } })
    const gap = nextRecord({ ...old, run: '2026-10-25' }, plan, current, result, runs, today)
    expect(gap.pages['a/01.p']!.lenses.reasoning).toEqual({ grade: 'B', run: today, wins: [today] })
    const first = nextRecord({ version: 3, pages: {}, steps: [] }, plan, current, result, [], today)
    expect(first.pages['a/01.p']!.lenses.reasoning).toEqual({ grade: 'B', run: today, wins: [today] })
  })

  it('stamps steps decided this run and drops those decided before the last 5 runs', () => {
    expect(nextRecord(old, plan, current, result, runs, today).steps.map((s) => [s.id, s.status, s.decided])).toEqual([
      ['merge-p-into-p', 'taken', today],
      ['split-p', 'refused', today],
    ])
  })

  it('counts the run for runs.yml', () => {
    const gate = [{ page: 'a/02.p', criterion: 'clarity: f', votes: ['win', 'win', 'equal'] as const, merged: true }]
    const entry = runEntry({ run: today, base: 'b', session: 'session_x', pr: 2801, costUsd: 31.2 }, plan, result, [...gate.map((g) => ({ ...g, votes: [...g.votes] }))])
    expect(entry).toEqual({
      run: today, session: 'session_x', base: 'b', pr: 2801, costUsd: 31.2, relevance: true,
      pagesRead: 2, pagesChecked: 2, falseClaimsFixed: 1, edits: 1, gatePassed: 1, gateStopped: 0, aComparisons: 1, stepsTaken: 1, stepsRefused: 1,
      findings: [
        { page: 'a/01.p', lens: 'clarity', grade: 'C', quote: 'q', fix: 'f', confirmed: false, edited: false },
        { page: 'a/02.p', lens: 'clarity', grade: 'D', quote: 'q', fix: 'f', confirmed: true, edited: true },
      ],
      falseClaims: [{ page: 'a/02.p', claim: 'runs daily', evidence: 'x.ts:3', fixed: true }],
      gate: [{ page: 'a/02.p', criterion: 'clarity: f', votes: ['win', 'win', 'equal'], merged: true }],
      comparisons: [{ lens: 'reasoning', candidate: 'a/01.p', against: 'a/03.p', votes: ['win', 'win', 'loss'], result: 'win' }],
    })
  })
})

describe('briefs', () => {
  const template = 'Rater {RATER} on {LENSES}; held: {HELD}.\n<!-- rater A C -->\nPages:\n{PAGES}\n<!-- /rater -->\n<!-- rater B -->\nAll of {TRIMMED}. {RELEVANCE}\n<!-- /rater -->\nEnd.\n'
  const fill = { commit: 'abc', scratch: 's', pages: ['a/01.x'], trimmed: 't.md', catalog: [], held: { clarity: ['a/02.y'] } }

  it('keeps only the sections marked for the rater, and its lenses', () => {
    expect(raterBrief(template, 'A', {}, fill)).toBe('Rater A on clarity, reasoning; held: clarity: a/02.y.\nPages:\n- layers/glassbox/content/guide/pages/a/01.x.md\nEnd.\n')
    expect(raterBrief(template, 'B', { relevance: 'first v3 run' }, fill)).toMatch(/^Rater B on placement, relevance; held: none yet\.\nAll of t\.md\. This run you also grade \*\*Relevance\*\* \(first v3 run\)/)
  })

  it('fences each version so a page\'s own code fences stay inside it', () => {
    expect(judgeBrief('{JUDGE}: {QUESTION}\n{X}\n{Y}', 'gate-1-2', 'Which?', 'x\n```ts\n1\n```\n', 'y')).toBe('gate-1-2: Which?\n````markdown\nx\n```ts\n1\n```\n````\n````markdown\ny\n````')
  })
})

describe('draftsReport', () => {
  const old = 'a'.repeat(40)
  const base = 'b'.repeat(40)
  const expand = 'export function catalogFrom(cols) {\n  return cols\n}\n'
  const files: Record<string, Record<string, string>> = { [old]: { 'shared/expand.ts': expand }, [base]: { 'shared/expand.ts': `// moved\n${expand}` } }
  const commits: Record<string, { date: string; onMain: boolean }> = {
    [old]: { date: '2026-10-01T09:00:00+00:00', onMain: true },
    [base]: { date: '2026-10-29T09:00:00+00:00', onMain: true },
  }
  const fakeGit: GlassboxGit = { commit: (r) => commits[r], read: (r, path) => files[r]?.[path] }
  const draft = (title: string, pin: string, lines: string, next: string) => `---
title: ${title}
description: D
revision: '${pin}'
revisionDate: '${commits[pin]!.date.slice(0, 10)}'
${pin === base ? 'publishedAt: 2026-10-29\n' : ''}---
Collections come from one manifest.

## The concept

A Collection is one type of content.

Full reference: [Nuxt Content docs](https://content.nuxt.com/docs/collections/define)

## In Terrarium

::excerpt{path="shared/expand.ts" lines="${lines}"}
\`\`\`ts
export function catalogFrom(cols) {
  return cols
}
\`\`\`
::

### Why it's built this way

- **One expansion step.** One expansion step turns a manifest into Collections, so a Tenant never writes them by hand.

### What to watch for

Watch the manifest.

## Try it in your project

Write one manifest.

## Where next

- ${next}
`
  const input = {
    base,
    guide: { 'index.md': '---\ntitle: Home\n---\n', 'terrarium-practice/01.gate.md': '---\ntitle: The Gate\n---\n' },
    drafts: {
      'index.md': '---\ntitle: Drafts\n---\n',
      // Over the title cap, links another draft, no publishedAt, and its Excerpt moved by the base.
      'nuxt-content/04.query.md': draft('Patterns for querying collections', old, '1-3', '[Schemas](/t/glassbox/drafts/verification/schema)'),
      'verification/02.schema.md': draft('Schemas', base, '2-4', '[The Gate](/t/glassbox/guide/terrarium-practice/gate)'),
    },
    terms: [],
    journal: [],
  }

  it('lists every draft with its blockers as a guide page pinned to the base, a clean one too', () => {
    expect(draftsReport(input, fakeGit)).toBe(`# Drafts at ${base}, each checked as a guide page pinned to the base

## nuxt-content/04.query.md (39 lines)

- revision aaaaaaa (2026-10-01) is older than the base
- title "Patterns for querying collections" is 33 chars, more than 28
- the Excerpt of shared/expand.ts is not in the file at revision
- guide page links outside the guide: /t/glassbox/drafts/verification/schema
- no publishedAt

## verification/02.schema.md (40 lines)

- no problems
`)
  })
})
