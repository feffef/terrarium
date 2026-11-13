// Unit tests for the harvest helper's pure core: key rendering and parsing, the
// harvested-state scan, entry ordering, and the before/after-posting checks.
// The IO shell (GitHub listing, files) is exercised by running the script.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decodeHtmlEntities } from '../../../../../scripts/lib/github-client.ts'
import {
  BODY_LIMIT,
  NOTE,
  REQUIRED_HEADINGS,
  blockOutput,
  buildEntries,
  checkBody,
  checkClusters,
  comparePosted,
  entryKey,
  harvestedState,
  noteTexts,
  parseKeys,
  renderBlock,
  renderList,
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

describe('blockOutput() and summaryOf()', () => {
  it('keeps stdout the pasteable block and sends each session summary, once, to stderr', () => {
    const e = (session: string, n: number) => ({ session, file: `${session}.yml`, line: `Harvested: ${session} idea 0000000${n}` }) as Entry
    const read = (file: string) => `summary: Did ${file[8]!.toUpperCase()}.\n`
    const entries = [e('session_a', 1), e('session_a', 2), e('session_b', 3)]
    expect(blockOutput(entries, read)).toEqual({ out: renderBlock(entries), err: 'Summary of session_a:\nDid A.\n\nSummary of session_b:\nDid B.' })
  })

  it('reads the summary of a log, and nothing when it is missing or not text', () => {
    expect(summaryOf('goal: g\nsummary: >\n  Did\n  it.\n')).toBe('Did it.')
    expect(summaryOf('goal: g\n')).toBe('')
    expect(summaryOf('summary: [a]\n')).toBe('')
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
  const open = (label: string, extra = '') =>
    `## c\nlabel: ${label}\nentries: 1, 2\nsessions: 2\nunbuilt: read x.ts\nunfiled: no match, title filter\nunrejected: none\nledger: none\nunacted: prs empty\n${extra}verdict: open\n`

  it('accepts open product and workflow clusters, and a drop naming its failed test', () => {
    const text = open('product') + open('workflow', 'simplifying: retires y\n') + '## d\nlabel: workflow\nentries: 3\nsessions: 1\nledger: entry z\nverdict: dropped ledger\n'
    expect(checkClusters(text, ns)).toEqual([])
  })

  it('refuses a missing field, a drop with no test, an unknown entry and an empty record', () => {
    expect(checkClusters(open('workflow'), ns)).toEqual(['cluster 1: no "simplifying:" evidence'])
    expect(checkClusters('## d\nlabel: product\nentries: 1\nsessions: 1\nverdict: dropped\n', ns).join()).toContain('verdict must be')
    expect(checkClusters(open('product').replace('1, 2', '9'), ns).join()).toContain('entry numbers')
    expect(checkClusters(open('product').replace('sessions: 2', 'sessions: 5'), ns).join()).toContain('distinct sessions')
    expect(checkClusters('nothing', ns)).toEqual(['no "## " cluster blocks'])
  })

  it('refuses a simplifying drop of a product cluster', () => {
    expect(checkClusters('## d\nlabel: product\nentries: 1\nsessions: 1\nsimplifying: s\nverdict: dropped simplifying\n', ns).join()).toContain('for workflow clusters')
  })

  it('refuses a product cluster after a workflow one', () => {
    expect(checkClusters(open('workflow', 'simplifying: r\n') + open('product'), ns).join()).toContain('check every product cluster first')
  })
})
