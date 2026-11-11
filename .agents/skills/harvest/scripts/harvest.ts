// The harvest helper: the mechanical half of the `harvest` Skill. It lists the
// ideas and learnings in recent session logs that no Seedling issue has taken
// yet, renders the `Harvested:` key lines a Seedling carries, and checks a body
// before and after it is posted. Judgement (clustering, relevance) stays in the
// Skill. State lives in the issues themselves: a key line on ANY issue body
// (open or closed, whatever its title) marks an entry as harvested.
//
// Usage:
//   tsx .agents/skills/harvest/scripts/harvest.ts extract [--kind ideas|learnings] [--out PATH]
//   tsx .agents/skills/harvest/scripts/harvest.ts block <extract.json> <n> [n...]
//   tsx .agents/skills/harvest/scripts/harvest.ts check-body <body-file> --extract <extract.json> [--title T]
//   tsx .agents/skills/harvest/scripts/harvest.ts check-posted <issue-number> <body-file>
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isExternalSession } from '../../../../shared/schemas/session.ts'
import { fail, flagValue, root, runIfMain } from '../../../../scripts/lib/cli.ts'
import { getJson, listAll, resolveAccess } from '../../../../scripts/lib/github-client.ts'
import { readSessionLogs, type SessionLog } from '../../../../scripts/session/journal-files.ts'
import { flattenText } from '../../../../scripts/session/extract-frictions.ts'

export const WINDOW_DAYS = 28
/** GitHub rejects a body over 65,536 characters; stay well under. */
export const BODY_LIMIT = 60_000
export const NOTE = 'Machine-read, keep as is:'
/** Runs of these Skills log ideas on purpose and never act on them; harvest's own logs too. */
export const SKIPPED_TRIGGERS = new Set(['harvest', 'visitor-loop', 'audit-skills'])
const HEAVY = new Set(['moderate', 'major', 'blocker'])

/** The whole key line. Its alphabet holds none of `& < > " '`, so HTML-entity
 *  decoding cannot change it. A session id is `session_...` or a raw UUID. */
export const KEY_RE = /^Harvested: (\S+) (idea|learning) ([0-9a-f]{8})$/

export type Kind = 'idea' | 'learning'

export interface Entry {
  /** Position in the ordered list; the handle `block` takes. */
  n: number
  key: string
  line: string
  kind: Kind
  session: string
  file: string
  startedAt: string
  endedAt: string
  goal: string
  outcome: string
  prs: string[]
  /** The session logged a `moderate`-or-worse Friction. */
  heavy: boolean
  text: string
  /** Issues whose keys already name this session: a hint for a reworded entry. */
  sameSession: number[]
}

// ── Pure core (unit-tested) ───────────────────────────────────────────────────

export function entryKey(session: string, kind: Kind, text: string): string {
  const hash = createHash('sha1').update(flattenText(text)).digest('hex').slice(0, 8)
  return `${session} ${kind} ${hash}`
}

const lines = (body: string): string[] => body.split(/\r?\n/).map((l) => l.trimEnd())

/** The keys on whole, well-formed lines of a body. */
export function parseKeys(body: string): string[] {
  return lines(body).flatMap((l) => {
    const m = KEY_RE.exec(l)
    return m ? [`${m[1]} ${m[2]} ${m[3]}`] : []
  })
}

export interface IssueBody {
  number: number
  body: string | null
}

/** What the issues already hold: every harvested key, and per session the issues naming it. */
export interface HarvestState {
  keys: Set<string>
  bySession: Map<string, number[]>
}

type Draft = Omit<Entry, 'n'>

export function harvestedState(issues: IssueBody[]): HarvestState {
  const keys = new Set<string>()
  const bySession = new Map<string, number[]>()
  for (const { number, body } of issues) {
    for (const key of parseKeys(body ?? '')) {
      keys.add(key)
      const session = key.split(' ')[0]!
      const seen = bySession.get(session) ?? []
      if (!seen.includes(number)) bySession.set(session, [...seen, number])
    }
  }
  return { keys, bySession }
}

/** The ideas and learnings of one log; an external log (ADR-0009) keeps its
 *  ideas and drops its learnings. */
export function noteTexts(raw: Record<string, unknown>): { kind: Kind; text: string }[] {
  const take = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter((s) => flattenText(s)) : [])
  return [
    ...take(raw.ideas).map((text) => ({ kind: 'idea' as const, text })),
    ...(isExternalSession(raw) ? [] : take(raw.learnings).map((text) => ({ kind: 'learning' as const, text }))),
  ]
}

const isHeavy = (raw: Record<string, unknown>): boolean =>
  Array.isArray(raw.frictions) && raw.frictions.some((f) => HEAVY.has(String((f as Record<string, unknown>)?.severity)))

/** Unharvested entries from logs that ended in the window, ordered: within a kind,
 *  sessions that logged a heavy Friction first, then newest first; the two kinds
 *  alternate (idea first) and one that runs out lets the other continue. */
export function buildEntries(
  logs: SessionLog[],
  state: HarvestState,
  since: number,
  kinds: Kind[] = ['idea', 'learning'],
): { entries: Entry[]; skippedHarvested: number } {
  const all: Draft[] = []
  let skippedHarvested = 0
  for (const { file, data } of logs) {
    const ended = new Date(data.endedAt as string | Date)
    if (Number.isNaN(ended.getTime()) || ended.getTime() < since) continue
    if (SKIPPED_TRIGGERS.has(String(data.trigger ?? ''))) continue
    const session = String(data.session ?? '')
    // An id-less log cannot carry a parseable key.
    if (!session) continue
    // `??` because new Date(null) is the epoch, which would pass the NaN check below.
    const started = new Date((data.startedAt ?? data.endedAt) as string | Date)
    for (const { kind, text } of noteTexts(data)) {
      if (!kinds.includes(kind)) continue
      const key = entryKey(session, kind, text)
      if (state.keys.has(key)) {
        skippedHarvested++
        continue
      }
      all.push({
        key,
        line: `Harvested: ${key}`,
        kind,
        session,
        file,
        startedAt: (Number.isNaN(started.getTime()) ? ended : started).toISOString(),
        endedAt: ended.toISOString(),
        goal: flattenText(data.goal),
        outcome: flattenText(data.outcome),
        prs: Array.isArray(data.prs) ? data.prs.map(String) : [],
        heavy: isHeavy(data),
        text: flattenText(text),
        sameSession: state.bySession.get(session) ?? [],
      })
    }
  }
  const rank = (a: Draft, b: Draft) =>
    Number(b.heavy) - Number(a.heavy) || b.endedAt.localeCompare(a.endedAt) || a.key.localeCompare(b.key)
  const ideas = all.filter((e) => e.kind === 'idea').sort(rank)
  const learnings = all.filter((e) => e.kind === 'learning').sort(rank)
  const ordered: Draft[] = []
  for (let i = 0; i < Math.max(ideas.length, learnings.length); i++) {
    if (ideas[i]) ordered.push(ideas[i]!)
    if (learnings[i]) ordered.push(learnings[i]!)
  }
  return { entries: ordered.map((e, i) => ({ ...e, n: i + 1 })), skippedHarvested }
}

/** The note plus the key lines of the given entries: what a Seedling body pastes. */
export function renderBlock(entries: Entry[]): string {
  return [NOTE, ...entries.map((e) => e.line)].join('\n')
}

/** What is wrong with a Seedling body before it is posted (empty: fine). The
 *  provenance guard already enforces the session header and bare angle brackets. */
export function checkBody(body: string, emitted: Set<string>, title?: string): string[] {
  const problems: string[] = []
  const ls = lines(body)
  if (title !== undefined && !title.startsWith('Seedling:')) problems.push('title must start with "Seedling:"')
  if (body.length > BODY_LIMIT) problems.push(`body is ${body.length} characters, over ${BODY_LIMIT}`)
  for (const l of ls) if (l.startsWith('Harvested:') && !KEY_RE.test(l)) problems.push(`malformed key line: ${l}`)
  const keyIdx = ls.flatMap((l, i) => (KEY_RE.test(l) ? [i] : []))
  if (!keyIdx.length) problems.push('no Harvested: key line')
  for (const key of parseKeys(body)) if (!emitted.has(key)) problems.push(`key not emitted by this run's extract: ${key}`)
  const note = ls.indexOf(NOTE)
  if (note < 0) problems.push(`missing the line "${NOTE}"`)
  else {
    if (!ls.slice(0, note).some((l) => /^Agent seedling\b/.test(l))) problems.push('no banner line starting "Agent seedling" above the key block')
    const block = ls.slice(note + 1).findIndex((l) => !KEY_RE.test(l))
    const blockEnd = block < 0 ? ls.length : note + 1 + block
    if (keyIdx.some((i) => i <= note || i >= blockEnd)) problems.push('key lines must sit in one block directly under the note')
  }
  return problems
}

/** What differs between the keys of the file that passed `checkBody` and the keys GitHub stored. */
export function comparePosted(stored: string, file: string): string[] {
  const want = new Set(parseKeys(file))
  const got = new Set(parseKeys(stored))
  return [
    ...[...want].filter((k) => !got.has(k)).map((k) => `stored body lacks key: ${k}`),
    ...[...got].filter((k) => !want.has(k)).map((k) => `stored body has unexpected key: ${k}`),
  ]
}

// ── IO shell ──────────────────────────────────────────────────────────────────

interface RawIssue extends IssueBody {
  pull_request?: unknown
}

function listIssueBodies(): IssueBody[] {
  const access = resolveAccess(root)
  return listAll<RawIssue>(access, 'issues', { state: 'all' }).filter((i) => i.pull_request === undefined)
}

const DEFAULT_OUT = join(tmpdir(), 'harvest-extract.json')

const KIND_ARGS: Record<string, Kind> = { ideas: 'idea', learnings: 'learning' }

function cmdExtract(argv: string[]): void {
  const since = Date.now() - WINDOW_DAYS * 86_400_000
  const kindArg = flagValue(argv, '--kind')
  if (kindArg !== undefined && !KIND_ARGS[kindArg]) fail('--kind must be ideas or learnings')
  const state = harvestedState(listIssueBodies())
  const { entries, skippedHarvested } = buildEntries(
    readSessionLogs(root, { archived: true }),
    state,
    since,
    kindArg === undefined ? undefined : [KIND_ARGS[kindArg]!],
  )
  const out = flagValue(argv, '--out') ?? DEFAULT_OUT
  const count = (k: Kind) => entries.filter((e) => e.kind === k).length
  writeFileSync(out, JSON.stringify({ since: new Date(since).toISOString(), days: WINDOW_DAYS, skippedHarvested, entries }, null, 2) + '\n')
  console.log(`harvest: window ${new Date(since).toISOString()} .. now (${WINDOW_DAYS} days)`)
  console.log(`harvest: ${count('idea')} ideas and ${count('learning')} learnings unharvested; ${skippedHarvested} already harvested`)
  console.log(`harvest: ${entries.length} entries, ordered, written to ${out}`)
}

function readExtract(path: string): { entries: Entry[] } {
  return JSON.parse(readFileSync(path, 'utf8')) as { entries: Entry[] }
}

function main(): void {
  const [cmd, ...argv] = process.argv.slice(2)
  if (cmd === 'extract') return cmdExtract(argv)
  if (cmd === 'block') {
    const [path, ...ns] = argv
    if (!path || !ns.length) fail('usage: block <extract.json> <n> [n...]')
    const entries = readExtract(path).entries
    const picked = ns.map((n) => entries.find((e) => e.n === Number(n)) ?? fail(`no entry ${n} in ${path}`))
    return console.log(renderBlock(picked))
  }
  if (cmd === 'check-body') {
    const [file] = argv
    const extract = flagValue(argv, '--extract')
    if (!file || !extract) fail('usage: check-body <body-file> --extract <extract.json> [--title T]')
    const problems = checkBody(readFileSync(file, 'utf8'), new Set(readExtract(extract).entries.map((e) => e.key)), flagValue(argv, '--title'))
    if (problems.length) fail(problems.join('\n'))
    return console.log('check-body: ok')
  }
  if (cmd === 'check-posted') {
    const [number, file] = argv
    if (!number || !file) fail('usage: check-posted <issue-number> <body-file>')
    const issue = getJson<IssueBody>(resolveAccess(root), `issues/${Number(number)}`)
    const problems = comparePosted(issue.body ?? '', readFileSync(file, 'utf8'))
    if (problems.length) fail(problems.join('\n'))
    return console.log(`check-posted: #${number} stores the checked keys`)
  }
  fail('unknown command; expected extract | block | check-body | check-posted')
}

runIfMain(import.meta.url, main)
