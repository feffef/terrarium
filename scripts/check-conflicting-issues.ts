// The conflicting-issue cross-check (issue #798): a PR touching a file has no
// mechanical way today to know an *open* issue separately schedules that same
// file for deletion or removal. PR #789 was caught mid-review only because a
// human happened to read the full issue history (issue #784, `ready-for-agent`,
// instructed deleting `SESSION_TRAILER_GLOBAL` as unused — the very symbol
// #789 was repurposing). This script is the mechanical cross-check option 2
// from #798 recommends, scoped conservatively for a first pass.
//
// **File-level matching only** — issue #798 explicitly scopes out
// symbol-level precision for this first pass. A "hit" means: an open issue's
// body contains BOTH one of the changed file paths (verbatim substring) AND
// one of a small fixed deletion-language keyword list. That's a heuristic,
// not a proof the issue actually schedules the file for deletion — it is
// advisory, meant to be eyeballed by a reviewer before merge, not a hard gate
// (CLAUDE.md's human-only/ADR-0004 boundary: this never runs in CI).
//
// Two ways to get the changed-file list, mirroring how a reviewer actually
// has the PR in front of them:
//   - `<base> <head>` — resolved locally via `git diff --name-only
//     <base>...<head>`, no GitHub call at all.
//   - `--pr <number>` — resolved from the GitHub API: the PR's file list via
//     `gh api .../pulls/<n>/files` (or the REST fallback), and open issues via
//     the same `.../issues?state=open` listing `list-open-issues.ts` already
//     uses. Reuses that module's `gh`/REST strategy switch
//     (`pickFetchStrategy`, `hasGhBinary`, `envToken`, `parseNextLink`,
//     `parseOwnerRepo`, `decodeHtmlEntities`) rather than reinventing it — the
//     same shared base `check-triage-drift.ts` already imports from (issue
//     #505/#507).
//
// Usage:
//   tsx scripts/check-conflicting-issues.ts <base> <head>
//   tsx scripts/check-conflicting-issues.ts --pr <number>
//   Prints any hits as JSON: { issueNumber, issueTitle, issueUrl, filePath,
//   matchedKeyword }[]. Empty array (`[]`) means no hits — still exits 0
//   either way; this is advisory, never a failing gate.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  decodeHtmlEntities,
  envToken,
  hasGhBinary,
  parseNextLink,
  parseOwnerRepo,
  pickFetchStrategy,
  type FetchStrategy,
} from './list-open-issues.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── Types ───────────────────────────────────────────────────────────────────

/** One open issue as read off the GitHub REST `issues` list endpoint, trimmed
 *  to what the match needs — unlike `list-open-issues.ts`'s `OpenIssue`, this
 *  keeps `body`: the whole point here is searching issue text, not just
 *  metadata. */
export interface RawConflictIssue {
  number: number
  title: string
  body: string | null
  html_url: string
  pull_request?: unknown
}

/** One open issue past the screen (real issue, not a PR mixed into the same
 *  REST endpoint — see `RawConflictIssue`). */
export interface ConflictCandidateIssue {
  number: number
  title: string
  body: string
  htmlUrl: string
}

/** One flagged conflict: `filePath` (one of the PR's changed files) and
 *  `matchedKeyword` (one deletion-language keyword) both appear, verbatim, in
 *  `issueNumber`'s open-issue body. */
export interface ConflictHit {
  issueNumber: number
  issueTitle: string
  issueUrl: string
  filePath: string
  matchedKeyword: string
}

// ── Pure core (unit-tested) ─────────────────────────────────────────────────

/** The fixed first-pass keyword list (issue #798's own scoping: "a small
 *  fixed keyword list is fine, this is a first-pass heuristic, not precise").
 *  Matched case-insensitively as a plain substring — not a word-boundary
 *  regex — so "deleted"/"removes"/etc. still count; the tradeoff (more
 *  recall, more false positives) matches the "advisory, not a hard gate"
 *  framing above. */
export const DELETION_KEYWORDS = ['delete', 'remove', 'unused', 'no longer needed'] as const
export type DeletionKeyword = (typeof DELETION_KEYWORDS)[number]

/** Every deletion-language keyword (see `DELETION_KEYWORDS`) that appears,
 *  case-insensitively, anywhere in `body`. Order matches `DELETION_KEYWORDS`,
 *  not appearance order in the text — this is a presence check, not a
 *  position-sensitive parse (file-level matching only, issue #798). */
export function findDeletionKeywords(body: string): DeletionKeyword[] {
  const lower = body.toLowerCase()
  return DELETION_KEYWORDS.filter((keyword) => lower.includes(keyword))
}

/** True when `filePath` appears verbatim in `body` — the file-level match
 *  issue #798 scopes this first pass to (no symbol-level precision). Case
 *  *sensitive*: a file path is a literal identifier, and case-insensitive
 *  matching a short path segment (e.g. `shared/kinds.ts` vs a prose
 *  sentence's "Shared Kinds") would trade too much precision for a marginal
 *  recall gain. */
export function bodyMentionsFilePath(body: string, filePath: string): boolean {
  return body.includes(filePath)
}

/** Every conflict hit between one candidate issue and the PR's changed file
 *  list: a hit requires the issue body to name the file AND carry at least
 *  one deletion keyword (checked once for the whole body, not per file — see
 *  `findDeletionKeywords`). One `ConflictHit` per (file, matched keyword)
 *  pair, so a body naming several keywords surfaces all of them rather than
 *  picking one arbitrarily. */
export function findConflictHits(issue: ConflictCandidateIssue, changedFiles: string[]): ConflictHit[] {
  const keywords = findDeletionKeywords(issue.body)
  if (keywords.length === 0) return []
  const hits: ConflictHit[] = []
  for (const filePath of changedFiles) {
    if (!bodyMentionsFilePath(issue.body, filePath)) continue
    for (const keyword of keywords) {
      hits.push({
        issueNumber: issue.number,
        issueTitle: issue.title,
        issueUrl: issue.htmlUrl,
        filePath,
        matchedKeyword: keyword,
      })
    }
  }
  return hits
}

/** `findConflictHits` across every candidate issue, in issue order. */
export function findAllConflictHits(issues: ConflictCandidateIssue[], changedFiles: string[]): ConflictHit[] {
  return issues.flatMap((issue) => findConflictHits(issue, changedFiles))
}

/** Turn one raw REST issue record into a `ConflictCandidateIssue`, or `null`
 *  if it's actually a pull request (the REST `issues` endpoint mixes both in,
 *  same quirk `list-open-issues.ts`/`check-triage-drift.ts` screen for) or has
 *  no body to search. */
export function toConflictCandidateIssue(raw: RawConflictIssue): ConflictCandidateIssue | null {
  if (raw.pull_request !== undefined) return null
  if (!raw.body) return null
  return {
    number: raw.number,
    title: decodeHtmlEntities(raw.title),
    body: decodeHtmlEntities(raw.body),
    htmlUrl: raw.html_url,
  }
}

/** Splits `git diff --name-only`/`gh api .../files` output into a clean file
 *  path list — trims blank lines, nothing else (a path itself is never
 *  re-validated against the filesystem; the caller may be diffing two refs
 *  where a deleted file no longer exists on disk). */
export function parseChangedFileList(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

// ── GitHub / git shell (thin) ────────────────────────────────────────────────

function readOriginUrl(cwd: string): string {
  return execFileSync('git', ['remote', 'get-url', 'origin'], { cwd, encoding: 'utf8' }).trim()
}

/** Changed files between two refs, resolved entirely locally — no GitHub call
 *  at all, mirroring how `merged-since.ts` stays git-only where it can. */
export function changedFilesFromGitDiff(base: string, head: string, cwd = root): string[] {
  const raw = execFileSync('git', ['diff', '--name-only', `${base}...${head}`], { cwd, encoding: 'utf8' })
  return parseChangedFileList(raw)
}

function readPrFilesViaGh(owner: string, repo: string, prNumber: number, cwd: string): string[] {
  const raw = execFileSync(
    'gh',
    [
      'api',
      '--method',
      'GET',
      `repos/${owner}/${repo}/pulls/${prNumber}/files`,
      '-f',
      'per_page=100',
      '--paginate',
      '--jq',
      '.[].filename',
    ],
    { cwd, encoding: 'utf8' },
  )
  return parseChangedFileList(raw)
}

function readOpenIssuesViaGh(owner: string, repo: string, cwd: string): RawConflictIssue[] {
  const raw = execFileSync(
    'gh',
    [
      'api',
      '--method',
      'GET',
      `repos/${owner}/${repo}/issues`,
      '-f',
      'state=open',
      '-f',
      'per_page=100',
      '--paginate',
      '--jq',
      '.[]',
    ],
    { cwd, encoding: 'utf8' },
  )
  return raw
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as RawConflictIssue)
}

// `curl`, not Node's built-in `fetch` — same proxy-auth reasoning as
// `list-open-issues.ts`'s `curlGetPage` (issue #567), mirrored verbatim down
// to the header/body temp-file split for `Link`-header pagination.
function curlGetPage(url: string, token: string, cwd: string): { status: string; body: string; linkHeader: string | null } {
  const dir = mkdtempSync(join(tmpdir(), 'check-conflicting-issues-'))
  const headerFile = join(dir, 'headers')
  const bodyFile = join(dir, 'body')
  try {
    const status = execFileSync(
      'curl',
      [
        '-sS',
        '-o',
        bodyFile,
        '-D',
        headerFile,
        '-w',
        '%{http_code}',
        '-H',
        `Authorization: Bearer ${token}`,
        '-H',
        'Accept: application/vnd.github+json',
        '-H',
        'User-Agent: terrarium-check-conflicting-issues',
        url,
      ],
      { cwd, encoding: 'utf8' },
    ).trim()
    const body = readFileSync(bodyFile, 'utf8')
    const headers = readFileSync(headerFile, 'utf8')
    const linkLine = headers.split(/\r?\n/).find((l) => /^link:/i.test(l))
    return { status, body, linkHeader: linkLine ? linkLine.slice(linkLine.indexOf(':') + 1).trim() : null }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

async function fetchAllPagesViaRest<T>(initialUrl: string, token: string, cwd: string): Promise<T[]> {
  const out: T[] = []
  let url: string | null = initialUrl
  while (url) {
    const { status, body, linkHeader } = curlGetPage(url, token, cwd)
    if (status[0] !== '2') {
      throw new Error(`GitHub REST API request to ${url} failed: HTTP ${status}`)
    }
    out.push(...(JSON.parse(body) as T[]))
    url = parseNextLink(linkHeader)
  }
  return out
}

interface RawPrFile {
  filename: string
}

async function readPrFilesViaRest(
  owner: string,
  repo: string,
  prNumber: number,
  token: string,
  cwd: string,
): Promise<string[]> {
  const files = await fetchAllPagesViaRest<RawPrFile>(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
    token,
    cwd,
  )
  return files.map((f) => f.filename)
}

async function readOpenIssuesViaRest(
  owner: string,
  repo: string,
  token: string,
  cwd: string,
): Promise<RawConflictIssue[]> {
  return fetchAllPagesViaRest<RawConflictIssue>(
    `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100`,
    token,
    cwd,
  )
}

async function readChangedFilesFromPr(
  strategy: FetchStrategy,
  owner: string,
  repo: string,
  prNumber: number,
  cwd: string,
): Promise<string[]> {
  if (strategy === 'gh') return readPrFilesViaGh(owner, repo, prNumber, cwd)
  const token = envToken()
  if (!token) throw new Error('rest strategy chosen with no GH_TOKEN/GITHUB_TOKEN set')
  return readPrFilesViaRest(owner, repo, prNumber, token, cwd)
}

async function readOpenIssues(
  strategy: FetchStrategy,
  owner: string,
  repo: string,
  cwd: string,
): Promise<RawConflictIssue[]> {
  if (strategy === 'gh') return readOpenIssuesViaGh(owner, repo, cwd)
  const token = envToken()
  if (!token) throw new Error('rest strategy chosen with no GH_TOKEN/GITHUB_TOKEN set')
  return readOpenIssuesViaRest(owner, repo, token, cwd)
}

// ── Command ──────────────────────────────────────────────────────────────────

/** Runs the check against a locally-resolvable diff (`git diff --name-only
 *  <base>...<head>`) — still needs the GitHub open-issues listing, so a
 *  `gh`/token access path is required either way. */
export async function checkConflictingIssuesForDiff(base: string, head: string, cwd = root): Promise<ConflictHit[]> {
  const changedFiles = changedFilesFromGitDiff(base, head, cwd)
  return checkConflictingIssuesForFiles(changedFiles, cwd)
}

/** Runs the check for a PR by number — resolves both the changed-file list
 *  and the open-issue listing from the GitHub API/`gh`. */
export async function checkConflictingIssuesForPr(prNumber: number, cwd = root): Promise<ConflictHit[]> {
  const { strategy, owner, repo } = resolveAccess(cwd)
  const changedFiles = await readChangedFilesFromPr(strategy, owner, repo, prNumber, cwd)
  const rawIssues = await readOpenIssues(strategy, owner, repo, cwd)
  const issues = rawIssues.map(toConflictCandidateIssue).filter((x): x is ConflictCandidateIssue => x !== null)
  return findAllConflictHits(issues, changedFiles)
}

async function checkConflictingIssuesForFiles(changedFiles: string[], cwd: string): Promise<ConflictHit[]> {
  const { strategy, owner, repo } = resolveAccess(cwd)
  const rawIssues = await readOpenIssues(strategy, owner, repo, cwd)
  const issues = rawIssues.map(toConflictCandidateIssue).filter((x): x is ConflictCandidateIssue => x !== null)
  return findAllConflictHits(issues, changedFiles)
}

function resolveAccess(cwd: string): { strategy: FetchStrategy; owner: string; repo: string } {
  const originUrl = readOriginUrl(cwd)
  const ownerRepo = parseOwnerRepo(originUrl)
  if (ownerRepo === null) {
    throw new Error(`could not parse owner/repo from origin remote: ${originUrl}`)
  }
  const strategy = pickFetchStrategy(hasGhBinary(cwd), Boolean(envToken()))
  if (strategy === null) {
    throw new Error(
      'no GitHub access path available: `gh` is not installed and neither GH_TOKEN nor GITHUB_TOKEN is set',
    )
  }
  return { strategy, owner: ownerRepo.owner, repo: ownerRepo.repo }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`check-conflicting-issues: ${msg}`)
  process.exit(1)
}

function usage(): string {
  return (
    'usage: tsx scripts/check-conflicting-issues.ts <base> <head>\n' +
    '       tsx scripts/check-conflicting-issues.ts --pr <number>'
  )
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  let hits: ConflictHit[]
  if (argv[0] === '--pr') {
    const prArg = argv[1]
    const prNumber = Number(prArg)
    if (!prArg || !Number.isInteger(prNumber) || prNumber <= 0) fail(usage())
    hits = await checkConflictingIssuesForPr(prNumber)
  } else if (argv.length === 2) {
    const [base, head] = argv as [string, string]
    hits = await checkConflictingIssuesForDiff(base, head)
  } else {
    fail(usage())
  }
  if (hits.length > 0) {
    console.error(
      `check-conflicting-issues: ${hits.length} possible conflict(s) with an open issue — advisory only, ` +
        'eyeball each before merging:',
    )
  }
  process.stdout.write(JSON.stringify(hits, null, 2) + '\n')
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => fail(err instanceof Error ? err.message : String(err)))
}
