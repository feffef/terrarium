// Unit tests for the harvest helper's pure core: key rendering and parsing, the
// harvested-state scan, entry ordering, and the before/after-posting checks.
// The IO shell (GitHub listing, files) is exercised by running the script.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { root } from '../../../../../scripts/lib/cli.ts'
import { decodeHtmlEntities } from '../../../../../scripts/lib/github-client.ts'
import {
  BODY_LIMIT,
  NOTE,
  REQUIRED_HEADINGS,
  authoredOf,
  blockOutput,
  buildEntries,
  checkBody,
  checkClusters,
  comparePosted,
  entryKey,
  evidenceReport,
  groupedEvidenceReport,
  harvestedState,
  issuesPath,
  loadIssues,
  noteTexts,
  parseEvidenceArgs,
  parseKeys,
  productDecisions,
  renderBlock,
  renderList,
  rulingFiles,
  summaryOf,
  type Entry,
} from '../../scripts/harvest.ts'

const SESSION = 'session_013zxzeAAAAAAAAAAAAAAAAAA'
const UUID = 'fd29c728-8222-4915-94ab-25776442397b'
const NOW = Date.parse('2026-11-11T12:00:00Z')
const DAY = 86_400_000

const log = (over: Record<string, unknown>) => ({
  file: `${over.session}.yml`,
  data: { session: SESSION, startedAt: '2026-11-10T09:00:00Z', endedAt: '2026-11-10T10:00:00Z', goal: 'g', outcome: 'o', prs: [], frictions: [], ...over },
})
const noState = { keys: new Set<string>(), bySession: new Map<string, number[]>() }

describe('entryKey() and parseKeys()', () => {
  it('hashes whitespace-flattened text, so a re-wrapped entry keeps its key', () => {
    expect(entryKey(SESSION, 'idea', 'add   a\nlink checker')).toBe(entryKey(SESSION, 'idea', 'add a link checker'))
    expect(entryKey(SESSION, 'idea', 'a')).toMatch(/^session_\S+ idea [0-9a-f]{8}$/)
  })

  it('round-trips a rendered line, for a session id and a UUID', () => {
    for (const id of [SESSION, UUID]) {
      const key = entryKey(id, 'learning', 'x')
      expect(parseKeys(`prose\nHarvested: ${key}\nmore`)).toEqual([key])
    }
  })

  it('survives HTML-entity decoding unchanged', () => {
    const line = `Harvested: ${entryKey(UUID, 'idea', 'a & b <c> "d"')}`
    expect(decodeHtmlEntities(line)).toBe(line)
  })

  it('reads CRLF bodies and ignores trailing spaces', () => {
    const key = entryKey(SESSION, 'idea', 'x')
    expect(parseKeys(`a\r\nHarvested: ${key}  \r\nb\r\n`)).toEqual([key])
  })

  it('ignores a line that is not whole, or has a malformed key', () => {
    const key = entryKey(SESSION, 'idea', 'x')
    expect(parseKeys(`see Harvested: ${key}\nHarvested: ${key} extra\nHarvested: ${SESSION} idea XYZ12345`)).toEqual([])
  })
})

describe('harvestedState()', () => {
  it('collects keys from any body and the issues naming each session', () => {
    const a = entryKey(SESSION, 'idea', 'a')
    const b = entryKey(SESSION, 'learning', 'b')
    const state = harvestedState([
      { number: 5, body: `Harvested: ${a}` },
      { number: 9, body: `Harvested: ${b}\nHarvested: ${a}` },
      { number: 11, body: null },
    ])
    expect([...state.keys].sort()).toEqual([a, b].sort())
    expect(state.bySession.get(SESSION)).toEqual([5, 9])
  })
})

describe('noteTexts()', () => {
  it('keeps both kinds of an internal log', () => {
    expect(noteTexts({ ideas: ['i'], learnings: ['l'] })).toEqual([
      { kind: 'idea', text: 'i' },
      { kind: 'learning', text: 'l' },
    ])
  })

  it('drops the learnings of an external log (ADR-0009)', () => {
    expect(noteTexts({ external: true, ideas: ['i'], learnings: ['l'] })).toEqual([{ kind: 'idea', text: 'i' }])
  })

  it('drops blank entries', () => {
    expect(noteTexts({ ideas: ['  ', 'real'] })).toEqual([{ kind: 'idea', text: 'real' }])
  })
})

describe('buildEntries()', () => {
  const since = NOW - 28 * DAY

  it('keeps only logs that ended in the window and skips scheduled-run triggers', () => {
    const { entries } = buildEntries(
      [
        log({ session: 'session_in', ideas: ['in'] }),
        log({ session: 'session_old', endedAt: '2026-09-01T00:00:00Z', ideas: ['old'] }),
        ...['harvest', 'audit-skills'].map((trigger) => log({ session: `session_${trigger}`, trigger, ideas: ['x'] })),
        log({ session: 'session_other', trigger: 'digest', ideas: ['kept'] }),
        log({ session: 'session_visit', trigger: 'visitor-loop', ideas: ['visited'] }),
      ],
      noState,
      since,
    )
    expect(entries.map((e) => e.session).sort()).toEqual(['session_in', 'session_other', 'session_visit'])
  })

  it('carries the session start, falling back to its end when the log has none', () => {
    const { entries } = buildEntries(
      [log({ session: 'session_a', ideas: ['a'] }), log({ session: 'session_b', startedAt: null, ideas: ['b'] })],
      noState,
      since,
    )
    const start = (s: string) => entries.find((e) => e.session === s)!.startedAt
    expect(start('session_a')).toBe('2026-11-10T09:00:00.000Z')
    expect(start('session_b')).toBe('2026-11-10T10:00:00.000Z')
  })

  it('keeps only the requested kind, and does not count the other as harvested', () => {
    const logs = [log({ ideas: ['i'], learnings: ['l'] })]
    expect(buildEntries(logs, noState, since, ['idea']).entries.map((e) => e.kind)).toEqual(['idea'])
    expect(buildEntries(logs, noState, since, ['learning']).entries.map((e) => e.kind)).toEqual(['learning'])
    expect(buildEntries(logs, noState, since).entries).toHaveLength(2)
    const taken = { keys: new Set([entryKey(SESSION, 'learning', 'l')]), bySession: new Map<string, number[]>() }
    expect(buildEntries(logs, taken, since, ['idea']).skippedHarvested).toBe(0)
  })

  it('skips a log with no session id: its key could not be parsed back', () => {
    expect(buildEntries([log({ session: '', ideas: ['x'] })], noState, since).entries).toEqual([])
  })

  it('skips harvested entries and counts them', () => {
    const key = entryKey(SESSION, 'idea', 'done')
    const { entries, skippedHarvested } = buildEntries(
      [log({ ideas: ['done', 'new'] })],
      { keys: new Set([key]), bySession: new Map([[SESSION, [3]]]) },
      since,
    )
    expect(entries.map((e) => e.text)).toEqual(['new'])
    expect(skippedHarvested).toBe(1)
    expect(entries[0]!.sameSession).toEqual([3])
  })

  it('ranks newest first whatever Friction its session logged, and alternates kinds', () => {
    const { entries } = buildEntries(
      [
        log({ session: 'session_a', endedAt: '2026-11-09T00:00:00Z', ideas: ['a-idea'], learnings: ['a-learn'] }),
        log({ session: 'session_b', endedAt: '2026-11-10T00:00:00Z', ideas: ['b-idea'] }),
        log({ session: 'session_c', endedAt: '2026-11-01T00:00:00Z', ideas: ['c-idea'], frictions: [{ severity: 'major' }] }),
      ],
      noState,
      since,
    )
    // ideas by recency: b, a, c (a major Friction does not lift c); learnings: a. Alternating, then the rest.
    expect(entries.map((e) => e.text)).toEqual(['b-idea', 'a-learn', 'a-idea', 'c-idea'])
    expect(entries.map((e) => e.n)).toEqual([1, 2, 3, 4])
  })
})

describe('renderList()', () => {
  const entry = (over: Partial<Entry>): Entry => ({
    n: 1,
    key: 'k',
    line: 'l',
    kind: 'idea',
    session: 'session_a',
    file: 'layers/journal/content/current/sessions/a.yml',
    startedAt: '2026-11-09T01:23:55.000Z',
    endedAt: '2026-11-09T02:15:16.000Z',
    goal: 'The goal',
    outcome: 'The outcome',
    prs: ['2994', '2995'],
    text: 'The idea text',
    sameSession: [],
    ...over,
  })

  it('carries everything the relevance checks read, so none needs a lookup in the JSON', () => {
    const out = renderList([entry({ sameSession: [3074, 3070] })])
    for (const needle of ['session_a', '2026-11-09T01:23:55.000Z', 'prs 2994,2995', 'goal: The goal', 'outcome: The outcome', 'sessions/a.yml', '1 idea 2026-11-09', '#3074,#3070', 'The idea text']) {
      expect(out).toContain(needle)
    }
  })

  it('prints a session header once, before its first entry, and keeps the entry order', () => {
    const out = renderList([entry({ n: 1 }), entry({ n: 2, session: 'session_b' }), entry({ n: 3, kind: 'learning' })]).split('\n')
    expect(out.filter((l) => l.startsWith('S')).map((l) => l.slice(0, 12))).toEqual(['S1 session_a', 'S2 session_b'])
    expect(out.filter((l) => /^\d/.test(l)).map((l) => l.slice(0, 3))).toEqual(['1 i', '2 i', '3 l'])
    expect(out[1]).toContain('S1')
    expect(out[4]).toContain('S1')
  })

  it('shows - for a session with no PRs and adds nothing when no issue names the session', () => {
    const out = renderList([entry({ prs: [] })])
    expect(out).toContain('prs - |')
    expect(out).not.toContain('same session in issues')
  })
})

describe('checkBody() and comparePosted()', () => {
  const key = entryKey(SESSION, 'idea', 'x')
  const emitted = new Set([key])
  const entry = { line: `Harvested: ${key}` } as Entry
  const good = [
    '🤖 [Claude](https://claude.ai/code/session_x)',
    '',
    'Agent seedling from harvest, not approved.',
    '',
    renderBlock([entry]),
    '',
    ...REQUIRED_HEADINGS.flatMap((h) => [h, 'Text.', '']),
  ].join('\n')

  it('renders the note and the key lines', () => {
    expect(renderBlock([entry])).toBe(`${NOTE}\nHarvested: ${key}`)
  })

  it('accepts a well-formed body', () => {
    expect(checkBody(good, emitted, 'Seedling: x')).toEqual([])
  })

  it('rejects a missing key, a malformed key and a key the extract did not emit', () => {
    expect(checkBody('Agent seedling\n' + NOTE, emitted)).toContain('no Harvested: key line')
    expect(checkBody(good + '\nHarvested: oops', emitted).join()).toContain('malformed key line')
    expect(checkBody(good.replace(key, entryKey(SESSION, 'idea', 'other')), emitted).join()).toContain('not emitted by this run')
  })

  it('rejects a missing note or banner and a key outside the block', () => {
    expect(checkBody(good.replace(NOTE, 'Keys:'), emitted).join()).toContain('missing the line')
    expect(checkBody(good.replace('Agent seedling', 'Something'), emitted).join()).toContain('no banner')
    expect(checkBody(good + `\n\nHarvested: ${key}`, emitted).join()).toContain('one block')
  })

  it('rejects a body missing a template section, so the owner is not sent into the repo', () => {
    for (const h of REQUIRED_HEADINGS) expect(checkBody(good.replace(h, 'Other'), emitted)).toEqual([`missing the section "${h}"`])
  })

  it('rejects a session id in the prose but allows one under Sources, in the header and in the key block', () => {
    expect(checkBody(good.replace('## The idea\nText.', `## The idea\nSee ${SESSION}.`), emitted)).toEqual([
      'names a session id outside Sources: say its date and what it was doing',
    ])
    expect(checkBody(good.replace('## Sources\nText.', `## Sources\n${SESSION}.yml`), emitted)).toEqual([])
  })

  it('rejects a bare angle-bracket span in the body or title, but not one in code', () => {
    const bare = (text: string) => checkBody(good.replace('## The idea\nText.', `## The idea\n${text}`), emitted, 'Seedling: x')
    expect(bare('Reports "link text of <page>".').join()).toContain('bare angle-bracket span <page> in the body')
    expect(bare('Reports `of <page>` in code.')).toEqual([])
    expect(bare('A fence:\n```\n<page>\n```')).toEqual([])
    expect(checkBody(good, emitted, 'Seedling: a <b> c').join()).toContain('in the title')
  })

  it('lists in body-template.md the same headings check-body requires', () => {
    const template = readFileSync(new URL('../../body-template.md', import.meta.url), 'utf8')
    expect([...template.matchAll(/`(## [^`]+)`/g)].map((m) => m[1])).toEqual(REQUIRED_HEADINGS)
  })

  it('rejects a wrong title and an oversize body', () => {
    expect(checkBody(good, emitted, 'Idea: x')).toContain('title must start with "Seedling:"')
    expect(checkBody(good + 'x'.repeat(BODY_LIMIT), emitted).join()).toContain('over')
  })

  it('compares stored keys with the checked file', () => {
    expect(comparePosted(good, good)).toEqual([])
    expect(comparePosted(good.replace(key, ''), good)).toEqual([`stored body lacks key: ${key}`])
    expect(comparePosted(good + `\nHarvested: ${entryKey(UUID, 'idea', 'z')}`, good)).toHaveLength(1)
  })
})

describe('blockOutput(), authoredOf() and summaryOf()', () => {
  it("keeps stdout the pasteable block and sends each session's authored fields, once, to stderr", () => {
    const e = (session: string, n: number) => ({ session, file: `${session}.yml`, line: `Harvested: ${session} idea 0000000${n}` }) as Entry
    const read = (file: string) => `goal: G ${file[8]}\nsummary: Did ${file[8]!.toUpperCase()}.\ntoolCounts: {Bash: 3}\n`
    const entries = [e('session_a', 1), e('session_a', 2), e('session_b', 3)]
    expect(blockOutput(entries, read)).toEqual({
      out: renderBlock(entries),
      err: 'Session session_a:\ngoal: G a\nsummary: Did A.\n\nSession session_b:\ngoal: G b\nsummary: Did B.',
    })
  })

  it('reads goal, outcome, summary, frictions, ideas and learnings, and no trace field', () => {
    const yaml = [
      'goal: g',
      'outcome: o',
      'summary: >',
      '  Did',
      '  it.',
      'durationSec: 5',
      'filesEdited: [a.ts]',
      'frictions:',
      '  - {description: slow, solution: cache, severity: minor}',
      '  - {description: odd, solution: "", severity: nit}',
      'ideas: [i1]',
      'learnings: [l1, l2]',
    ].join('\n')
    expect(authoredOf(yaml)).toBe(
      'goal: g\noutcome: o\nsummary: Did it.\nfrictions:\n- slow; solution: cache\n- odd\nideas:\n- i1\nlearnings:\n- l1\n- l2',
    )
  })

  it('reads the summary of a log, and nothing when it is missing or not text', () => {
    expect(summaryOf('goal: g\nsummary: >\n  Did\n  it.\n')).toBe('Did it.')
    expect(summaryOf('goal: g\n')).toBe('')
    expect(summaryOf('summary: [a]\n')).toBe('')
  })

  it('reads nothing from a log that is empty or whose fields are not text', () => {
    expect(authoredOf('')).toBe('')
    expect(authoredOf('summary: [a]\nfrictions: []\n')).toBe('')
  })
})

describe('retro key', () => {
  const retro = `Harvested: ${SESSION} retro`
  const body = (keys: string[]) => ['🤖 x', 'Agent seedling from harvest.', NOTE, ...keys, '', ...REQUIRED_HEADINGS.flatMap((h) => [h, 'T.', ''])].join('\n')

  it('parses and passes check-body without an extract entry, when alone', () => {
    expect(parseKeys(retro)).toEqual([`${SESSION} retro`])
    expect(checkBody(body([retro]), new Set(), 'Seedling: retro on harvest')).toEqual([])
  })

  it('rejects a retro key beside an entry key', () => {
    const key = entryKey(SESSION, 'idea', 'x')
    expect(checkBody(body([`Harvested: ${key}`, retro]), new Set([key]))).toContain('a retro Seedling carries its retro key alone')
  })

  it('rejects a retro key under a title that is not a retro title', () => {
    expect(checkBody(body([retro]), new Set(), 'Seedling: retro on harvest')).toEqual([])
    for (const title of ['Seedling: a new idea', 'Seedling: retrofit it', undefined]) expect(checkBody(body([retro]), new Set(), title).join()).toContain('"Seedling: retro"')
  })
})

describe('checkClusters()', () => {
  const ns = new Map([[1, 'a'], [2, 'b'], [3, 'b']])
  const check = (text: string, sessions: Map<number, string>) => checkClusters(`stopped: quota filled\n${text}`, sessions)
  const open = (label: string, extra = '') =>
    `## c\nlabel: ${label}\nentries: 1, 2\nsessions: 2\nunbuilt: read x.ts\nunfiled: no match, title filter\nunrejected: none\nledger: none\nunacted: prs empty\n${extra}verdict: open\n`

  it('accepts open product and workflow clusters, and a drop naming its failed test', () => {
    const text = open('product') + open('workflow', 'simplifying: retires y\n') + '## d\nlabel: workflow\nentries: 3\nsessions: 1\nledger: entry z\nverdict: dropped ledger\n'
    expect(check(text, ns)).toEqual([])
  })

  it('refuses a missing field, a drop with no test, an unknown entry and an empty record', () => {
    expect(check(open('workflow'), ns)).toEqual(['cluster 1: no "simplifying:" evidence'])
    expect(check('## d\nlabel: product\nentries: 1\nsessions: 1\nverdict: dropped\n', ns).join()).toContain('verdict must be')
    expect(check(open('product').replace('1, 2', '9'), ns).join()).toContain('entry numbers')
    expect(check(open('product').replace('sessions: 2', 'sessions: 5'), ns).join()).toContain('distinct sessions')
    expect(check('nothing', ns)).toEqual(['no "## " cluster blocks'])
  })

  it('refuses a simplifying drop of a product cluster', () => {
    expect(check('## d\nlabel: product\nentries: 1\nsessions: 1\nsimplifying: s\nverdict: dropped simplifying\n', ns).join()).toContain('for workflow clusters')
  })

  it('refuses a product cluster after a workflow one', () => {
    expect(check(open('workflow', 'simplifying: r\n') + open('product'), ns).join()).toContain('check every product cluster first')
  })

  it('refuses a record with no stopped reason before the first cluster', () => {
    expect(checkClusters(open('product'), ns)).toEqual(['no "stopped:" reason line before the first cluster'])
    expect(checkClusters(`stopped: 30 checked\n${open('product')}`, ns)).toEqual([])
  })
})

describe('evidenceReport()', () => {
  const sources = {
    rulings: [
      { file: 'a.md', text: '# T\n- No RSS feeds for the Journal.\n- Footer stays small.' },
      { file: 'b.md', text: 'nothing here' },
    ],
    issues: [
      { number: 7, title: 'Seedling: add a feed', body: 'unrelated', state: 'closed', state_reason: 'not_planned' },
      { number: 8, title: 'Seedling: footer', body: 'Built: the RSS reader shipped', state: 'closed', state_reason: 'completed' },
      { number: 9, title: 'Other', body: null, state: 'open' },
    ],
    frictions: [
      { file: 'f1.yml', summary: 'Agents miss the rss step' },
      { file: 'f2.yml', summary: 'unrelated' },
    ],
  }

  it('prints rulings lines, issues (newest first among equals) by title or body, and friction summaries that match any keyword, case-insensitively', () => {
    expect(evidenceReport(['rss', 'FEED'], sources)).toBe(
      [
        'rulings:',
        'a.md:2: - No RSS feeds for the Journal.',
        'tracker:',
        '#8 closed completed: Seedling: footer',
        '#7 closed not_planned: Seedling: add a feed',
        'ledger:',
        'f1.yml: Agents miss the rss step',
      ].join('\n'),
    )
  })

  it('says a source matched nothing, so silence is never mistaken for evidence', () => {
    expect(evidenceReport(['zzz'], sources)).toBe('rulings:\n  (no match)\ntracker:\n  (no match)\nledger:\n  (no match)')
  })

  it('matches at the start of a word, so a short keyword does not flood', () => {
    expect(evidenceReport(['log'], { ...sources, frictions: [{ file: 'f3.yml', summary: 'the catalog logs' }, { file: 'f4.yml', summary: 'a catalog' }] })).toContain('f3.yml')
    expect(evidenceReport(['log'], { ...sources, frictions: [{ file: 'f4.yml', summary: 'a catalog' }] })).not.toContain('f4.yml')
  })

  it('matches a keyword that starts with a non-word character, such as an issue reference', () => {
    const r = evidenceReport(['#7'], { ...sources, frictions: [{ file: 'f5.yml', summary: 'see #7 and (#70)' }] })
    expect(r).toContain('f5.yml')
  })

  it('prints an open issue without a reason', () => {
    expect(evidenceReport(['other'], sources)).toContain('#9 open: Other')
  })

  describe('tracker cut', () => {
    const issue = (number: number, title: string) => ({ number, title, body: null, state: 'open' })
    const tracker = (kw: string[], issues: ReturnType<typeof issue>[]) => {
      const lines = evidenceReport(kw, { rulings: [], issues, frictions: [] }).split('\n')
      return lines.slice(lines.indexOf('tracker:') + 1, lines.indexOf('ledger:'))
    }
    const printed = (lines: string[]) => lines.filter((l) => l.startsWith('#')).map((l) => Number(/^#(\d+)/.exec(l)![1]))

    it('prints every hit of a one-keyword group when there are at most 10, with no omitted line', () => {
      const lines = tracker(['rss'], [issue(1, 'rss a'), issue(2, 'rss b'), issue(3, 'none')])
      expect(printed(lines)).toEqual([2, 1])
      expect(lines.join()).not.toContain('omitted')
    })

    it('keeps an old strong hit among many recent weak ones: 5 newest, the strong one, then the next newest', () => {
      // #1 is old and matches both keywords; #901..#940 are weak (one keyword) and inside the newest 100.
      const weak = Array.from({ length: 40 }, (_, i) => issue(i + 901, 'rss'))
      const filler = Array.from({ length: 60 }, (_, i) => issue(i + 941, 'unrelated'))
      const lines = tracker(['rss', 'feed'], [issue(1, 'rss feed'), ...weak, ...filler])
      expect(printed(lines)).toEqual([1, 940, 939, 938, 937, 936, 935, 934, 933, 932])
      expect(lines.at(-1)).toBe('  (31 more omitted)')
    })

    it('draws at least 5 of the 10 from the newest 100 issues when that many qualify', () => {
      // Ten strong old hits (#1-10), five weak hits among the newest 100 (#901-905).
      const old = Array.from({ length: 10 }, (_, i) => issue(i + 1, 'rss feed'))
      const filler = Array.from({ length: 95 }, (_, i) => issue(i + 906, 'x'))
      const recent = Array.from({ length: 5 }, (_, i) => issue(i + 901, 'rss'))
      const nums = printed(tracker(['rss', 'feed'], [...old, ...recent, ...filler]))
      expect(nums).toHaveLength(10)
      expect(nums.filter((n) => n >= 901)).toHaveLength(5)
    })

    it('tops up from the best-ranked older hits when fewer than 5 newest ones qualify', () => {
      const old = Array.from({ length: 12 }, (_, i) => issue(i + 1, 'rss feed'))
      const recent = [issue(901, 'rss'), issue(902, 'rss')]
      const filler = Array.from({ length: 98 }, (_, i) => issue(i + 903, 'x'))
      const nums = printed(tracker(['rss', 'feed'], [...old, ...recent, ...filler]))
      expect(nums).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 902, 901])
    })

    it('counts a named issue inside the newest 100 toward the recent quota', () => {
      const old = Array.from({ length: 12 }, (_, i) => issue(i + 1, 'rss feed'))
      const recent = Array.from({ length: 6 }, (_, i) => issue(i + 901, 'rss'))
      const filler = Array.from({ length: 94 }, (_, i) => issue(i + 907, 'x'))
      const nums = printed(tracker(['rss', 'feed', '#901'], [...old, ...recent, ...filler]))
      expect(nums.filter((n) => n >= 901)).toHaveLength(5)
      expect(nums).toContain(901)
      expect(nums).toHaveLength(10)
    })

    it('always prints an issue named by its number, however weak, and counts the rest as omitted', () => {
      const issues = [issue(5, 'rss feed'), ...Array.from({ length: 20 }, (_, i) => issue(i + 100, 'rss feed')), issue(7, 'unrelated')]
      for (const kw of ['#7', '7']) {
        const lines = tracker(['rss', kw], issues)
        expect(printed(lines)).toContain(7)
        expect(lines.at(-1)).toBe('  (12 more omitted)')
      }
    })

    it('prints more than 10 when more than 10 issues are named', () => {
      const issues = Array.from({ length: 12 }, (_, i) => issue(i + 1, 'x'))
      const kws = issues.map((i) => `#${i.number}`)
      expect(printed(tracker(kws, issues))).toHaveLength(12)
    })
  })
})

describe('productDecisions()', () => {
  it('keeps only the lines of the "## Product decisions" section, numbered as in the file', () => {
    const md = '# G\n- term\n## Product decisions\n- no plates (#1)\n## Next\n- other'
    expect(productDecisions(md)).toEqual('\n\n\n- no plates (#1)\n\n')
    expect(productDecisions('# G\n- term').trim()).toBe('')
  })
})

describe('rulingFiles()', () => {
  it('lists the fixed rulings files, the .out-of-scope files and one glossary per Tenant layer', () => {
    const dir = mkdtempSync(join(tmpdir(), 'harvest-rulings-'))
    mkdirSync(join(dir, '.out-of-scope'))
    writeFileSync(join(dir, '.out-of-scope', 'x.md'), '')
    mkdirSync(join(dir, 'layers', 'atlas'), { recursive: true })
    expect(rulingFiles(dir)).toEqual([
      '.out-of-scope/x.md',
      '.agents/skills/visitor-loop/decisions.md',
      '.agents/skills/glassbox-lesson/owner-decisions.md',
      'layers/atlas/GLOSSARY.md',
    ])
  })

  it('names only files that exist in the repo, so a moved rulings file fails here', () => {
    expect(rulingFiles(root).filter((f) => !existsSync(join(root, f)))).toEqual([])
  })
})

describe('groupedEvidenceReport()', () => {
  const sources = { rulings: [{ file: 'a.md', text: 'rss here\nfooter here' }], issues: [], frictions: [] }

  it('prints a single group exactly as evidenceReport does', () => {
    expect(groupedEvidenceReport([['rss']], sources)).toBe(evidenceReport(['rss'], sources))
  })

  it('prints one labelled block per group', () => {
    expect(groupedEvidenceReport([['rss'], ['footer', 'x']], sources)).toBe(
      [
        '## evidence: rss',
        evidenceReport(['rss'], sources),
        '',
        '## evidence: footer x',
        evidenceReport(['footer', 'x'], sources),
      ].join('\n'),
    )
  })
})

describe('parseEvidenceArgs()', () => {
  it('takes --extract and its value out of the keyword groups', () => {
    expect(parseEvidenceArgs(['a', '--extract', 'x.json', '--', 'b'])).toEqual({ groups: [['a'], ['b']], extract: 'x.json' })
    expect(parseEvidenceArgs(['--extract', 'x.json', 'a'])).toEqual({ groups: [['a']], extract: 'x.json' })
  })

  it('splits groups on a literal -- and drops empty ones', () => {
    expect(parseEvidenceArgs(['a', 'b', '--', 'c', '--', '--']).groups).toEqual([['a', 'b'], ['c']])
  })

  it('leaves extract unset without the flag', () => {
    expect(parseEvidenceArgs(['a', 'b'])).toEqual({ groups: [['a', 'b']], extract: undefined })
  })
})

describe('loadIssues()', () => {
  const dir = mkdtempSync(join(tmpdir(), 'harvest-issues-'))
  const extract = join(dir, 'extract.json')
  const fetchFresh = () => [{ n: 'fresh' }]

  it('reads the list saved next to the extract instead of fetching', () => {
    writeFileSync(issuesPath(extract), JSON.stringify([{ n: 'saved' }]))
    expect(loadIssues(extract, () => { throw new Error('fetched') })).toEqual([{ n: 'saved' }])
  })

  it('fetches when the saved list is absent or no extract is given', () => {
    expect(loadIssues(join(dir, 'other.json'), fetchFresh)).toEqual([{ n: 'fresh' }])
    expect(loadIssues(undefined, fetchFresh)).toEqual([{ n: 'fresh' }])
  })

  it('names the saved list <extract>.issues.json', () => {
    expect(issuesPath('/x/e.json')).toBe('/x/e.json.issues.json')
  })
})
