// The harvest helper: the mechanical half of the `harvest` Skill. It lists the
// ideas and learnings in recent session logs that no Seedling issue has taken
// yet, renders the `Harvested:` key lines a Seedling carries, and checks a body
// before and after it is posted. Judgement (clustering, relevance) stays in the
// Skill. State lives in the issues themselves: a key line on ANY issue body
// (open or closed, whatever its title) marks an entry as harvested.
//
// Usage:
//   tsx .agents/skills/harvest/scripts/harvest.ts extract [--kind ideas|learnings] [--out PATH]
//   tsx .agents/skills/harvest/scripts/harvest.ts list <extract.json>
//   tsx .agents/skills/harvest/scripts/harvest.ts block <extract.json> <n> [n...]
//   tsx .agents/skills/harvest/scripts/harvest.ts check-clusters <harvest-checks.md> --extract <extract.json>
//   tsx .agents/skills/harvest/scripts/harvest.ts check-body <body-file> --extract <extract.json> [--title T]
//   tsx .agents/skills/harvest/scripts/harvest.ts check-posted <issue-number> <body-file>
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { isExternalSession } from '../../../../shared/schemas/session.ts'
import { fail, flagValue, root, runIfMain } from '../../../../scripts/lib/cli.ts'
import { bareAngleBracketSpan } from '../../../../scripts/hooks/github-provenance-guard.ts'
import { getJson, listAll, resolveAccess } from '../../../../scripts/lib/github-client.ts'
import { readSessionLogs, type SessionLog } from '../../../../scripts/session/journal-files.ts'
import { flattenText } from '../../../../scripts/session/extract-frictions.ts'

export const WINDOW_DAYS = 7
/** GitHub rejects a body over 65,536 characters; stay well under. */
export const BODY_LIMIT = 60_000
export const NOTE = 'Machine-read, keep as is:'
/** Runs of these Skills log notes that are not for Seedlings; harvest's own logs too. */
export const SKIPPED_TRIGGERS = new Set(['harvest', 'audit-skills'])

/** The whole key line. Its alphabet holds none of `& < > " '`, so HTML-entity
 *  decoding cannot change it. A session id is `session_...` or a raw UUID. The
 *  `retro` form is the run's Seedling about the Skill itself (SKILL.md step 5). */
export const KEY_RE = /^Harvested: (\S+ (?:(?:idea|learning) [0-9a-f]{8}|retro))$/

/** A session id in either form (`session_...` or a raw UUID): the owner cannot open one. */
const SESSION_ID_RE = /session_[A-Za-z0-9]{6,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/

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
    return m ? [m[1]!] : []
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

/** Unharvested entries from logs that ended in the window, newest first within a
 *  kind. Recency is the only signal: ranking by a session's Friction would bury the
 *  positive and creative ideas of a smooth session. The two kinds alternate (idea
 *  first) and one that runs out lets the other continue. */
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
        text: flattenText(text),
        sameSession: state.bySession.get(session) ?? [],
      })
    }
  }
  const rank = (a: Draft, b: Draft) => b.endedAt.localeCompare(a.endedAt) || a.key.localeCompare(b.key)
  const ideas = all.filter((e) => e.kind === 'idea').sort(rank)
  const learnings = all.filter((e) => e.kind === 'learning').sort(rank)
  const ordered: Draft[] = []
  for (let i = 0; i < Math.max(ideas.length, learnings.length); i++) {
    if (ideas[i]) ordered.push(ideas[i]!)
    if (learnings[i]) ordered.push(learnings[i]!)
  }
  return { entries: ordered.map((e, i) => ({ ...e, n: i + 1 })), skippedHarvested }
}

/** One line per entry in extract order. A session's start, PRs, goal, outcome and source
 *  file print once, as an `S<n>` line before its first entry, so everything the relevance
 *  checks read is here and needs no lookup in the JSON (the key and line are derivable
 *  with `block`). */
export function renderList(entries: Entry[]): string {
  const handles = new Map<string, string>()
  const out: string[] = []
  for (const e of entries) {
    let h = handles.get(e.session)
    if (!h) {
      h = `S${handles.size + 1}`
      handles.set(e.session, h)
      out.push(`${h} ${e.session} | started ${e.startedAt} | prs ${e.prs.join(',') || '-'} | goal: ${e.goal} | outcome: ${e.outcome} | file: ${e.file}`)
    }
    const filed = e.sameSession.length ? ` | same session in issues ${e.sameSession.map((n) => `#${n}`).join(',')}` : ''
    out.push(`${e.n} ${e.kind} ${e.endedAt.slice(0, 10)} ${h}${filed}: ${e.text}`)
  }
  return out.join('\n')
}

/** The note plus the key lines of the given entries: what a Seedling body pastes. */
export function renderBlock(entries: Entry[]): string {
  return [NOTE, ...entries.map((e) => e.line)].join('\n')
}

/** What `block` prints: the pasteable block on stdout, and on stderr each source
 *  session's summary, once, for reading. Kept apart so stdout stays exactly what a
 *  body pastes. */
export function blockOutput(entries: Entry[], readLog: (file: string) => string): { out: string; err: string } {
  const firstOfSession = new Map<string, Entry>()
  for (const e of entries) if (!firstOfSession.has(e.session)) firstOfSession.set(e.session, e)
  const err = [...firstOfSession.values()].flatMap((e) => {
    const summary = summaryOf(readLog(e.file))
    return summary ? [`Summary of ${e.session}:\n${summary}`] : []
  })
  return { out: renderBlock(entries), err: err.join('\n\n') }
}

/** The `summary` of a session log's YAML; empty when absent or not text. */
export function summaryOf(yamlText: string): string {
  const summary = (parseYaml(yamlText) as { summary?: unknown } | null)?.summary
  return typeof summary === 'string' ? flattenText(summary) : ''
}

/** The tests of step 3, and the fields a cluster record carries. */
const TESTS = ['unbuilt', 'unfiled', 'unrejected', 'ledger', 'simplifying', 'unacted'] as const

/** What is wrong with the per-cluster record (empty: fine). A cluster is a `## ` block of
 *  `field: value` lines. An open one holds evidence for every test (`simplifying` only
 *  when workflow); a dropped one holds the evidence of the test it failed. Product
 *  clusters come before the first workflow one. */
export function checkClusters(text: string, sessionOf: Map<number, string>): string[] {
  const problems: string[] = []
  const blocks = text.split(/^## /m).slice(1)
  if (!blocks.length) return ['no "## " cluster blocks']
  let workflowSeen = false
  blocks.forEach((block, i) => {
    const f = new Map<string, string>()
    for (const l of block.split(/\r?\n/).slice(1)) {
      const m = /^([a-z]+):\s*(.*\S)\s*$/.exec(l)
      if (m) f.set(m[1]!, m[2]!)
    }
    const at = `cluster ${i + 1}`
    const label = f.get('label')
    if (label !== 'product' && label !== 'workflow') problems.push(`${at}: label must be product or workflow`)
    if (label === 'workflow') workflowSeen = true
    else if (label === 'product' && workflowSeen) problems.push(`${at}: a product cluster after a workflow one; check every product cluster first`)
    const ns = (f.get('entries') ?? '').split(',').map((n) => Number(n.trim()))
    if (!f.has('entries') || ns.some((n) => !sessionOf.has(n))) problems.push(`${at}: entries must list entry numbers of the extract`)
    else if (Number(f.get('sessions')) !== new Set(ns.map((n) => sessionOf.get(n))).size) problems.push(`${at}: sessions must be the count of distinct sessions behind the entries`)
    const verdict = f.get('verdict') ?? ''
    const dropped = /^dropped (\w+)$/.exec(verdict)?.[1]
    if (verdict !== 'open' && !dropped) problems.push(`${at}: verdict must be "open" or "dropped <test>"`)
    else if (dropped && !(TESTS as readonly string[]).includes(dropped)) problems.push(`${at}: "${dropped}" is not a test (${TESTS.join(', ')})`)
    if (dropped === 'simplifying' && label === 'product') problems.push(`${at}: the simplifying test is for workflow clusters`)
    const need = verdict === 'open' ? TESTS.filter((t) => t !== 'simplifying' || label === 'workflow') : dropped ? [dropped] : []
    for (const t of need) if (!f.has(t)) problems.push(`${at}: no "${t}:" evidence`)
  })
  return problems
}

/** The sections `body-template.md` asks for: a body without them sends the owner into the repo. */
export const REQUIRED_HEADINGS = [
  '## The idea',
  '## Why it matters',
  '## Where it came from',
  '## What would change',
  '## What I checked',
  '## Sources',
]

/** What is wrong with a Seedling body before it is posted (empty: fine). The
 *  provenance guard enforces the session header, and its own bare-angle-bracket rule
 *  is reused here so the failure shows before the post, not as a blocked call. */
export function checkBody(body: string, emitted: Set<string>, title?: string): string[] {
  const problems: string[] = []
  const ls = lines(body)
  for (const h of REQUIRED_HEADINGS) if (!ls.includes(h)) problems.push(`missing the section "${h}"`)
  // The header line and the key block carry ids by design, and Sources names the logs by filename.
  const sources = ls.indexOf('## Sources')
  const prose = ls.filter((l, i) => !KEY_RE.test(l) && !l.startsWith('🤖') && (sources < 0 || i < sources))
  if (prose.some((l) => SESSION_ID_RE.test(l))) problems.push('names a session id outside Sources: say its date and what it was doing')
  if (title !== undefined && !title.startsWith('Seedling:')) problems.push('title must start with "Seedling:"')
  for (const [field, text] of [['title', title], ['body', body]] as const) {
    const span = text === undefined ? null : bareAngleBracketSpan(text)
    if (span) problems.push(`bare angle-bracket span ${span} in the ${field}: wrap it in a fenced block, or GitHub drops it`)
  }
  if (body.length > BODY_LIMIT) problems.push(`body is ${body.length} characters, over ${BODY_LIMIT}`)
  for (const l of ls) if (l.startsWith('Harvested:') && !KEY_RE.test(l)) problems.push(`malformed key line: ${l}`)
  const keyIdx = ls.flatMap((l, i) => (KEY_RE.test(l) ? [i] : []))
  if (!keyIdx.length) problems.push('no Harvested: key line')
  const keys = parseKeys(body)
  const retro = keys.filter((k) => k.endsWith(' retro'))
  if (retro.length && keys.length > 1) problems.push('a retro Seedling carries its retro key alone')
  if (retro.length && !/^Seedling: retro\b/.test(title ?? '')) problems.push('a retro Seedling needs --title starting "Seedling: retro"')
  for (const key of keys) if (!emitted.has(key) && !retro.includes(key)) problems.push(`key not emitted by this run's extract: ${key}`)
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

// A Map, not an object: `--kind constructor` must not find an inherited member.
const KIND_BY_FLAG = new Map<string, Kind>([
  ['ideas', 'idea'],
  ['learnings', 'learning'],
])

/** The kinds `--kind` names; undefined (no flag) means both. */
function parseKinds(argv: string[]): Kind[] | undefined {
  if (!argv.includes('--kind')) return undefined
  const kind = KIND_BY_FLAG.get(flagValue(argv, '--kind') ?? '')
  return kind ? [kind] : fail('--kind must be ideas or learnings')
}

function cmdExtract(argv: string[]): void {
  const since = Date.now() - WINDOW_DAYS * 86_400_000
  const kinds = parseKinds(argv)
  const state = harvestedState(listIssueBodies())
  const { entries, skippedHarvested } = buildEntries(readSessionLogs(root, { archived: true }), state, since, kinds)
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
  if (cmd === 'list') {
    const [path] = argv
    if (!path) fail('usage: list <extract.json>')
    console.log(renderList(readExtract(path).entries))
    console.log(`\nMore on an entry or a session: jq '.entries[] | select(.n == 13)' ${path}`)
    console.log(`  jq -r '.entries[] | select(.session == "SESSION_ID") | .text' ${path}`)
    return
  }
  if (cmd === 'block') {
    const [path, ...ns] = argv
    if (!path || !ns.length) fail('usage: block <extract.json> <n> [n...]')
    const entries = readExtract(path).entries
    const picked = ns.map((n) => entries.find((e) => e.n === Number(n)) ?? fail(`no entry ${n} in ${path}`))
    const { out, err } = blockOutput(picked, (file) => readFileSync(join(root, file), 'utf8'))
    if (err) console.error(err)
    return console.log(out)
  }
  if (cmd === 'check-clusters') {
    const [file] = argv
    const extract = flagValue(argv, '--extract')
    if (!file || !extract) fail('usage: check-clusters <harvest-checks.md> --extract <extract.json>')
    const problems = checkClusters(readFileSync(file, 'utf8'), new Map(readExtract(extract).entries.map((e) => [e.n, e.session] as const)))
    if (problems.length) fail(problems.join('\n'))
    return console.log('check-clusters: ok')
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
  fail('unknown command; expected extract | list | block | check-clusters | check-body | check-posted')
}

runIfMain(import.meta.url, main)
