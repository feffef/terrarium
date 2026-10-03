// Candidate owner corrections to `visitor-loop`'s output since a cutoff — the
// search behind that Skill's owner-memory step, which runs kept skipping when
// it was prose alone (issue #1515).
//
// Usage:  tsx scripts/owner-corrections.ts [--since <iso>]
//   Default cutoff: the last commit touching visitor-loop's decisions.md.
//   Prints a JSON array of { kind, url, relatesTo, files?, excerpt }:
//   - review:        a human comment or review on a visitor-loop PR;
//   - rework:        a merged PR that names a visitor-loop PR (revert,
//                    "follow-up to #N") or touches files one touched shortly
//                    before (`files` = the overlap);
//   - issue-comment: a human comment on a thread that references one.
//   "Human" = no ADR-0017 provenance (`isAiAuthored`), never the author field.
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isAiAuthored } from './check-triage-drift.ts'
import { fetchOriginMain } from './git-helpers.ts'
import { getJson, parseOwnerRepo } from './list-open-issues.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const DECISIONS = '.agents/skills/visitor-loop/decisions.md'
const VISITOR_LOOP_BRANCH = /^claude\/visitor-loop-/
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
}

/** A PR review, review comment, or issue/PR conversation comment. `threadText`
 *  is the title + body of the issue/PR it sits on. */
export interface Comment {
  url: string
  body: string
  createdAt: string
  login: string
  threadNumber: number
  threadText: string
}

export interface Candidate {
  kind: 'review' | 'rework' | 'issue-comment'
  url: string
  relatesTo: number
  files?: string[]
  excerpt: string
}

// ── Pure core (unit-tested) ─────────────────────────────────────────────────

function mentions(text: string, n: number): boolean {
  return new RegExp(`#${n}(?!\\d)`).test(text)
}

/** The numbers a PR names as something it reverts or follows up: any #N in
 *  its title, or one after a revert/follow-up verb in its body. A bare
 *  citation (a blog post or audit quoting the PR) is not a rework. */
export function reworkedNumbers(pr: Pick<Pr, 'title' | 'body'>): number[] {
  const refs = [
    ...pr.title.matchAll(/#(\d+)/g),
    ...pr.body.matchAll(/(?:revert|follow[- ]?up|rework|undo|restor|replac)[^\n#]{0,40}#(\d+)/gi),
  ]
  return [...new Set(refs.map((m) => Number(m[1])))]
}

function excerpt(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, EXCERPT_CHARS)
}

export function findCandidates(since: string, prs: Pr[], comments: Comment[]): Candidate[] {
  const sinceMs = Date.parse(since)
  const visitorPrs = prs.filter((p) => VISITOR_LOOP_BRANCH.test(p.headRef))
  const visitorNumbers = new Set(visitorPrs.map((p) => p.number))
  const out: Candidate[] = []

  for (const pr of prs) {
    if (visitorNumbers.has(pr.number) || pr.mergedAt === null) continue
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
      const named = reworkedNumbers(pr).includes(vl.number)
      const files = pr.files.filter((f) => owner.get(f) === vl)
      if (named || files.length > 0) {
        out.push({ kind: 'rework', url: pr.url, relatesTo: vl.number, files, excerpt: excerpt(pr.title) })
      }
    }
  }

  for (const c of comments) {
    if (Date.parse(c.createdAt) <= sinceMs || !c.body.trim() || c.login.endsWith('[bot]') || isAiAuthored(c.body)) {
      continue
    }
    if (visitorNumbers.has(c.threadNumber)) {
      out.push({ kind: 'review', url: c.url, relatesTo: c.threadNumber, excerpt: excerpt(c.body) })
      continue
    }
    for (const n of visitorNumbers) {
      if (mentions(`${c.threadText}\n${c.body}`, n)) {
        out.push({ kind: 'issue-comment', url: c.url, relatesTo: n, excerpt: excerpt(c.body) })
      }
    }
  }
  return out
}

// ── Shell (thin) ──────────────────────────────────────────────────────────────

interface RawPull {
  number: number
  html_url: string
  title: string
  body: string | null
  head: { ref: string }
  merged_at: string | null
  merge_commit_sha: string | null
  updated_at: string
}

interface RawComment {
  html_url: string
  body: string | null
  created_at?: string
  submitted_at?: string
  user: { login: string } | null
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
    return [] // squash/rebase merges or a sha not on main: no first-parent diff to read
  }
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
  }
}

function threadNumber(apiUrl: string): number {
  return Number(apiUrl.slice(apiUrl.lastIndexOf('/') + 1))
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
  // A revert or follow-up can name a visitor-loop PR older than the listing.
  const sinceMs = Date.parse(cutoff)
  const named = prs
    .filter((p) => p.mergedAt !== null && Date.parse(p.mergedAt) > sinceMs)
    .flatMap(reworkedNumbers)
  for (const n of new Set(named)) {
    if (prByNumber.has(n)) continue
    try {
      const p = getJson<RawPull>(`${repo}/pulls/${n}`, cwd)
      if (VISITOR_LOOP_BRANCH.test(p.head.ref)) prs.push(toPr(p, cwd))
    } catch {
      // #n is an issue, not a PR
    }
  }

  const sinceQuery = `since=${encodeURIComponent(cutoff)}`
  const raw: Array<RawComment & { thread: number }> = [
    ...allPages<RawComment>(`${repo}/issues/comments?${sinceQuery}`, cwd).map((c) => ({ ...c, thread: threadNumber(c.issue_url!) })),
    ...allPages<RawComment>(`${repo}/pulls/comments?${sinceQuery}`, cwd).map((c) => ({ ...c, thread: threadNumber(c.pull_request_url!) })),
    ...rawPulls
      .filter((p) => VISITOR_LOOP_BRANCH.test(p.head.ref) && Date.parse(p.updated_at) > Date.parse(cutoff))
      .flatMap((p) => allPages<RawComment>(`${repo}/pulls/${p.number}/reviews?`, cwd).map((r) => ({ ...r, thread: p.number }))),
  ]

  // Thread text is only needed for a human comment off a visitor-loop PR, so
  // the per-thread fetch stays rare.
  const threadTexts = new Map<number, string>()
  const threadText = (c: RawComment & { thread: number }): string => {
    if (!c.body?.trim() || isAiAuthored(c.body)) return ''
    const pr = prByNumber.get(c.thread)
    if (pr) return `${pr.title}\n${pr.body ?? ''}`
    if (!threadTexts.has(c.thread)) {
      const issue = getJson<{ title: string; body: string | null }>(`${repo}/issues/${c.thread}`, cwd)
      threadTexts.set(c.thread, `${issue.title}\n${issue.body ?? ''}`)
    }
    return threadTexts.get(c.thread)!
  }
  const comments: Comment[] = raw.map((c) => ({
    url: c.html_url,
    body: c.body ?? '',
    createdAt: c.submitted_at ?? c.created_at ?? '',
    login: c.user?.login ?? '',
    threadNumber: c.thread,
    threadText: threadText(c),
  }))
  return findCandidates(cutoff, prs, comments)
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`owner-corrections: ${msg}`)
  process.exit(1)
}

function main(): void {
  const argv = process.argv.slice(2)
  let since: string | undefined
  if (argv[0] === '--since') {
    since = argv[1]
    if (!since || Number.isNaN(Date.parse(since))) fail(`not a valid ISO instant: ${since}`)
  } else if (argv.length > 0) {
    fail('usage: tsx scripts/owner-corrections.ts [--since <iso>]')
  }
  process.stdout.write(JSON.stringify(ownerCorrections(since), null, 2) + '\n')
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
