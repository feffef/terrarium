// Candidate owner corrections to `visitor-loop`'s output since a cutoff — the
// search behind that Skill's owner-memory step, which runs kept skipping when
// it was prose alone (issue #1515).
//
// Usage:  tsx scripts/owner-corrections.ts [--since <iso>] [--check <tally-file>]
//   Default cutoff: the last commit touching visitor-loop's decisions.md.
//   --check: exit 1 naming each candidate the tally doesn't resolve on its own
//   line (a run once dismissed ten as a group, #1721).
//   Prints a JSON array of { kind, url, relatesTo, files?, excerpt }:
//   - review:        a human comment or review on a visitor-loop PR;
//   - rework:        a merged non-bot PR whose title or body references a visitor-loop
//                    PR (#N or its URL), or that touches files one touched in
//                    the 3 days before it merged (`files` = the overlap);
//   - issue-comment: a human comment on a thread that references one.
//   "Human": bot accounts are excluded by account type; among the rest,
//   ADR-0017 provenance (`isAiAuthored`) separates agent writes, which land
//   under the owner's login, from the owner's own.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isAiAuthored } from './check-triage-drift.ts'
import { fetchOriginMain } from './git-helpers.ts'
import { getJson, parseOwnerRepo } from './list-open-issues.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const DECISIONS = '.agents/skills/visitor-loop/decisions.md'
// The harness pins most runs to a session branch, so the title is the stable marker (issue #1515).
const VISITOR_LOOP_BRANCH = /^claude\/visitor-loop-/
const VISITOR_LOOP_TITLE = /^visitor-loop[ (]/i
/** How long after a visitor-loop PR merges a file overlap still counts as rework. */
const OVERLAP_WINDOW_MS = 3 * 86_400_000
const EXCERPT_CHARS = 200

// ── Types ───────────────────────────────────────────────────────────────────

export interface Pr {
  number: number
  url: string
  title: string
  body: string
  headRef: string
  mergedAt: string | null
  files: string[]
  isBot?: boolean
}

/** A PR review, review comment, or issue/PR conversation comment. `threadText`
 *  is the title + body of the issue/PR it sits on. */
export interface Comment {
  url: string
  body: string
  createdAt: string
  threadNumber: number
  threadText: string
  isBot: boolean
}

export interface Candidate {
  kind: 'review' | 'rework' | 'issue-comment'
  url: string
  relatesTo: number
  files?: string[]
  excerpt: string
}

// ── Pure core (unit-tested) ─────────────────────────────────────────────────

/** Every issue/PR number `text` references, as `#N` or as a GitHub
 *  `/pull/N` or `/issues/N` URL. */
export function mentions(text: string): number[] {
  const refs = text.matchAll(/(?:#|github\.com\/[^/\s]+\/[^/\s]+\/(?:pull|issues)\/)(\d+)(?!\d)/g)
  return [...new Set([...refs].map((m) => Number(m[1])))]
}

export function isVisitorLoopPr(p: Pick<Pr, 'headRef' | 'title'>): boolean {
  return VISITOR_LOOP_BRANCH.test(p.headRef) || VISITOR_LOOP_TITLE.test(p.title)
}

function isHuman(c: Pick<Comment, 'body' | 'isBot'>): boolean {
  return !c.isBot && c.body.trim() !== '' && !isAiAuthored(c.body)
}

function excerpt(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, EXCERPT_CHARS)
}

export function findCandidates(since: string, prs: Pr[], comments: Comment[]): Candidate[] {
  const sinceMs = Date.parse(since)
  const visitorPrs = prs.filter(isVisitorLoopPr)
  const visitorNumbers = new Set(visitorPrs.map((p) => p.number))
  const out: Candidate[] = []

  for (const pr of prs) {
    if (visitorNumbers.has(pr.number) || pr.mergedAt === null || pr.isBot) continue
    const mergedMs = Date.parse(pr.mergedAt)
    if (mergedMs <= sinceMs) continue
    const earlier = visitorPrs
      .filter((vl) => vl.mergedAt !== null && Date.parse(vl.mergedAt) < mergedMs)
      .sort((a, b) => Date.parse(b.mergedAt!) - Date.parse(a.mergedAt!))
    // Each file is pinned on the latest visitor-loop PR that touched it, so
    // older runs that once touched a hot file don't each surface again.
    const owner = new Map<string, Pr>()
    for (const f of pr.files) {
      const vl = earlier.find((v) => v.files.includes(f))
      if (vl && mergedMs - Date.parse(vl.mergedAt!) <= OVERLAP_WINDOW_MS) owner.set(f, vl)
    }
    for (const vl of earlier) {
      const named = mentions(`${pr.title}\n${pr.body}`).includes(vl.number)
      const files = pr.files.filter((f) => owner.get(f) === vl)
      if (named || files.length > 0) {
        out.push({ kind: 'rework', url: pr.url, relatesTo: vl.number, files, excerpt: excerpt(pr.title) })
      }
    }
  }

  for (const c of comments) {
    if (Date.parse(c.createdAt) <= sinceMs || !isHuman(c)) continue
    if (visitorNumbers.has(c.threadNumber)) {
      out.push({ kind: 'review', url: c.url, relatesTo: c.threadNumber, excerpt: excerpt(c.body) })
      continue
    }
    for (const n of mentions(`${c.threadText}\n${c.body}`)) {
      if (visitorNumbers.has(n)) out.push({ kind: 'issue-comment', url: c.url, relatesTo: n, excerpt: excerpt(c.body) })
    }
  }
  return out
}

/** The candidates `tally` doesn't resolve, one per URL. A line resolves the
 *  candidate its first `#N` (a rework PR) or URL names, when it also says
 *  "not a ruling" or "decisions.md". */
export function unresolved(candidates: Candidate[], tally: string): Candidate[] {
  const resolved = new Set(
    tally
      .split('\n')
      .filter((l) => /not a ruling|decisions\.md/i.test(l))
      .map((l) => l.match(/https?:\/\/[^\s<>`*]+|#\d+/)?.[0].replace(/[:,.;)\]]+$/, '')),
  )
  const seen = new Set<string>()
  return candidates.filter((c) => {
    const named = resolved.has(c.url) || (c.kind === 'rework' && resolved.has(`#${threadNumber(c.url)}`))
    if (named || seen.has(c.url)) return false
    seen.add(c.url)
    return true
  })
}

// ── Shell (thin) ──────────────────────────────────────────────────────────────

interface RawPull {
  number: number
  html_url: string
  title: string
  body: string | null
  head: { ref: string }
  user: RawComment['user']
  merged_at: string | null
  merge_commit_sha: string | null
  updated_at: string
}

interface RawComment {
  html_url: string
  body: string | null
  created_at?: string
  submitted_at?: string
  user: { login: string; type?: string } | null
  issue_url?: string
  pull_request_url?: string
}

/** Every page of `path` (which already has a `?`), stopping early once `done` says so. */
function allPages<T>(path: string, cwd: string, done: (page: T[]) => boolean = () => false): T[] {
  const out: T[] = []
  for (let page = 1; ; page++) {
    const items = getJson<T[]>(`${path}&per_page=100&page=${page}`, cwd)
    out.push(...items)
    if (items.length < 100 || done(items)) return out
  }
}

function lastDecisionsCommit(cwd: string): string {
  return execFileSync('git', ['log', '-1', '--format=%cI', 'origin/main', '--', DECISIONS], {
    cwd,
    encoding: 'utf8',
  }).trim()
}

function mergeFiles(sha: string | null, cwd: string): string[] {
  if (!sha) return []
  try {
    const raw = execFileSync('git', ['diff', '--no-renames', '--name-only', `${sha}^1`, sha], { cwd, encoding: 'utf8' })
    return raw.split('\n').filter(Boolean)
  } catch {
    return [] // a sha not on main; a rebase merge's sha is only its last commit, so it undercounts instead
  }
}

function isVisitorLoopPull(p: RawPull): boolean {
  return isVisitorLoopPr({ headRef: p.head.ref, title: p.title })
}

function toPr(p: RawPull, cwd: string): Pr {
  return {
    number: p.number,
    url: p.html_url,
    title: p.title,
    body: p.body ?? '',
    headRef: p.head.ref,
    mergedAt: p.merged_at,
    files: p.merged_at ? mergeFiles(p.merge_commit_sha, cwd) : [],
    isBot: isBotAccount(p.user),
  }
}

function isBotAccount(user: RawComment['user']): boolean {
  return user?.type ? user.type === 'Bot' : (user?.login ?? '').endsWith('[bot]')
}

function threadNumber(url: string): number {
  return Number(url.slice(url.lastIndexOf('/') + 1))
}

export function ownerCorrections(since: string | undefined, cwd = root): Candidate[] {
  fetchOriginMain(cwd, 'origin', undefined, true)
  const cutoff = since ?? lastDecisionsCommit(cwd)
  const originUrl = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd, encoding: 'utf8' }).trim()
  const ownerRepo = parseOwnerRepo(originUrl)
  if (ownerRepo === null) throw new Error(`could not parse owner/repo from origin remote: ${originUrl}`)
  const repo = `repos/${ownerRepo.owner}/${ownerRepo.repo}`

  // A visitor-loop PR can be reworked up to OVERLAP_WINDOW_MS after it merged.
  const floorMs = Date.parse(cutoff) - OVERLAP_WINDOW_MS
  const rawPulls = allPages<RawPull>(`${repo}/pulls?state=all&sort=updated&direction=desc`, cwd, (page) =>
    Date.parse(page[page.length - 1]!.updated_at) < floorMs,
  ).filter((p) => Date.parse(p.updated_at) >= floorMs)
  const prs = rawPulls.map((p) => toPr(p, cwd))
  const prByNumber = new Map(rawPulls.map((p) => [p.number, p]))

  const sinceQuery = `since=${encodeURIComponent(cutoff)}`
  const raw: Array<RawComment & { thread: number }> = [
    ...allPages<RawComment>(`${repo}/issues/comments?${sinceQuery}`, cwd).map((c) => ({ ...c, thread: threadNumber(c.issue_url!) })),
    ...allPages<RawComment>(`${repo}/pulls/comments?${sinceQuery}`, cwd).map((c) => ({ ...c, thread: threadNumber(c.pull_request_url!) })),
    ...rawPulls
      .filter((p) => isVisitorLoopPull(p) && Date.parse(p.updated_at) > Date.parse(cutoff))
      .flatMap((p) => allPages<RawComment>(`${repo}/pulls/${p.number}/reviews?`, cwd).map((r) => ({ ...r, thread: p.number }))),
  ]

  // Only human comments matter, which keeps the per-thread fetch rare.
  const threadTexts = new Map<number, string>()
  const threadText = (c: RawComment & { thread: number }): string => {
    const pr = prByNumber.get(c.thread)
    if (pr) return `${pr.title}\n${pr.body ?? ''}`
    if (!threadTexts.has(c.thread)) {
      const issue = getJson<{ title: string; body: string | null }>(`${repo}/issues/${c.thread}`, cwd)
      threadTexts.set(c.thread, `${issue.title}\n${issue.body ?? ''}`)
    }
    return threadTexts.get(c.thread)!
  }
  const comments: Comment[] = raw
    .map((c) => ({ c, body: c.body ?? '', isBot: isBotAccount(c.user) }))
    .filter(isHuman)
    .map(({ c, body, isBot }) => ({
      url: c.html_url,
      body,
      createdAt: c.submitted_at ?? c.created_at ?? '',
      threadNumber: c.thread,
      threadText: threadText(c),
      isBot,
    }))

  // A revert, follow-up or human comment can name a visitor-loop PR older than the listing.
  const sinceMs = Date.parse(cutoff)
  const named = [
    ...prs.filter((p) => p.mergedAt !== null && Date.parse(p.mergedAt) > sinceMs).flatMap((p) => mentions(`${p.title}\n${p.body}`)),
    ...comments.flatMap((c) => mentions(`${c.threadText}\n${c.body}`)),
  ]
  for (const n of new Set(named)) {
    if (prByNumber.has(n)) continue
    let p: RawPull
    try {
      p = getJson<RawPull>(`${repo}/pulls/${n}`, cwd)
    } catch (err) {
      if (/HTTP 404|Not Found/.test(String(err))) continue // #n is an issue, not a PR
      throw err
    }
    if (isVisitorLoopPull(p)) prs.push(toPr(p, cwd))
  }
  return findCandidates(cutoff, prs, comments)
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`owner-corrections: ${msg}`)
  process.exit(1)
}

function main(): void {
  const argv = process.argv.slice(2)
  const flags = new Map<string, string>()
  for (let i = 0; i < argv.length; i += 2) {
    const [flag, value] = [argv[i]!, argv[i + 1]]
    if (!['--since', '--check'].includes(flag) || !value) fail('usage: tsx scripts/owner-corrections.ts [--since <iso>] [--check <tally-file>]')
    flags.set(flag, value)
  }
  const since = flags.get('--since')
  if (since !== undefined && Number.isNaN(Date.parse(since))) fail(`not a valid ISO instant: ${since}`)
  const candidates = ownerCorrections(since)
  const tallyFile = flags.get('--check')
  if (tallyFile === undefined) {
    process.stdout.write(JSON.stringify(candidates, null, 2) + '\n')
  } else {
    const missing = unresolved(candidates, readFileSync(tallyFile, 'utf8'))
    if (missing.length > 0) fail(`unresolved candidates (give each its own line):\n${missing.map((c) => `  ${c.url} ${c.excerpt}`).join('\n')}`)
    console.log(`owner-corrections: all ${new Set(candidates.map((c) => c.url)).size} candidates resolved`)
  }
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
