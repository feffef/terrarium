// Unit tests for the poll-then-merge helper's pure core (issue #667):
// the check-run verdict aggregation (the `enable_pr_auto_merge`-replacing
// logic — a still-`in_progress` run must not read as failing, matching
// `docs/agents/pr-workflow.md`'s guidance), the failing-name extraction, and
// the poll loop's resolve/timeout behavior. The `gh api`/REST shell and the
// actual merge call are a thin wrapper over these, exercised by running the
// script directly. The shared `gh`/`rest` strategy decision
// (`pickFetchStrategy`) is single-homed in `list-open-issues.ts` and tested
// there.
import { describe, expect, it, vi } from 'vitest'
import {
  failingCheckNames,
  dependabotBumpRefusal,
  DEPENDABOT_LOGIN,
  factCheckedBlobRefusal,
  humanMergeRefusal,
  humanMergeWaiver,
  mergeRequestFields,
  mergeRetryingBaseModified,
  GUEST_PIPELINE_LABEL,
  parseClosingKeywordIssues,
  pollUntilResolved,
  prMetaFromPull,
  prOriginRefusal,
  readyForHumanRefusal,
  reconcileClosingKeywords,
  reviewedFor,
  simpleChangeRefusal,
  verdictFromCheckRuns,
  verdictRefusal,
  type PrFile,
  type RawCheckRun,
  type ReviewEvidence,
} from '../../scripts/github/merge-pr.ts'
import { rulePaths } from '../../scripts/lib/adr-rules.ts'

describe('verdictFromCheckRuns()', () => {
  it('is pending when there are no check runs yet', () => {
    expect(verdictFromCheckRuns([])).toBe('pending')
  })

  it('is pending while any run is still in_progress, even if others are green', () => {
    const runs: RawCheckRun[] = [
      { name: 'gate', status: 'completed', conclusion: 'success' },
      { name: 'slow-job', status: 'in_progress', conclusion: null },
    ]
    expect(verdictFromCheckRuns(runs)).toBe('pending')
  })

  it('is pending while any run is still queued', () => {
    const runs: RawCheckRun[] = [{ name: 'gate', status: 'queued', conclusion: null }]
    expect(verdictFromCheckRuns(runs)).toBe('pending')
  })

  it('is green when every run is completed with a non-failing conclusion', () => {
    const runs: RawCheckRun[] = [
      { name: 'gate', status: 'completed', conclusion: 'success' },
      { name: 'optional', status: 'completed', conclusion: 'skipped' },
      { name: 'informational', status: 'completed', conclusion: 'neutral' },
    ]
    expect(verdictFromCheckRuns(runs)).toBe('green')
  })

  it('is red when any completed run failed', () => {
    const runs: RawCheckRun[] = [
      { name: 'gate', status: 'completed', conclusion: 'failure' },
    ]
    expect(verdictFromCheckRuns(runs)).toBe('red')
  })

  it('treats cancelled, timed_out, action_required, and stale as failing too', () => {
    for (const conclusion of ['cancelled', 'timed_out', 'action_required', 'stale']) {
      expect(verdictFromCheckRuns([{ name: 'gate', status: 'completed', conclusion }])).toBe('red')
    }
  })

  it('is red, not pending, when a real failure sits alongside a still-running run', () => {
    const runs: RawCheckRun[] = [
      { name: 'gate', status: 'completed', conclusion: 'failure' },
      { name: 'slow-job', status: 'in_progress', conclusion: null },
    ]
    expect(verdictFromCheckRuns(runs)).toBe('red')
  })
})

describe('failingCheckNames()', () => {
  it('names only the runs with a failing conclusion', () => {
    const runs: RawCheckRun[] = [
      { name: 'gate', status: 'completed', conclusion: 'failure' },
      { name: 'lint', status: 'completed', conclusion: 'success' },
      { name: 'e2e', status: 'completed', conclusion: 'cancelled' },
    ]
    expect(failingCheckNames(runs)).toEqual(['gate', 'e2e'])
  })

  it('is empty when nothing failed', () => {
    const runs: RawCheckRun[] = [{ name: 'gate', status: 'completed', conclusion: 'success' }]
    expect(failingCheckNames(runs)).toEqual([])
  })
})

describe('mergeRequestFields()', () => {
  it('pins the polled head SHA alongside the merge method', () => {
    expect(mergeRequestFields('squash', 'abc123')).toEqual({ merge_method: 'squash', sha: 'abc123' })
  })

  it('sends a waiver as the merge commit message', () => {
    expect(mergeRequestFields('merge', 'abc', 'note')).toEqual({ merge_method: 'merge', sha: 'abc', commit_message: 'note' })
  })
})

describe('humanMergeWaiver() — --owner-approved (#3022)', () => {
  const globs = ['docs/adr/**']
  const files = ['app/app.vue', 'docs/adr/0004.md']

  it('does not waive a rebase, which drops the commit message', () => {
    expect(humanMergeWaiver(files, globs, 'merge it', 'rebase')).toBeNull()
  })

  it('records the owner quote and the waived files', () => {
    const note = humanMergeWaiver(files, globs, 'merge it', 'merge')
    expect(note).toContain('merge it')
    expect(note).toContain('docs/adr/0004.md')
  })

  it('waives nothing without a quote, or for a blank one', () => {
    expect(humanMergeWaiver(files, globs, undefined, 'merge')).toBeNull()
    expect(humanMergeWaiver(files, globs, '', 'merge')).toBeNull()
  })

  it('has nothing to waive when no Human-only file changed', () => {
    expect(humanMergeWaiver(['app/app.vue'], globs, 'merge it', 'merge')).toBeNull()
  })

  it('does not waive an unreadable rule', () => {
    expect(humanMergeWaiver(files, [], 'merge it', 'merge')).toBeNull()
  })
})

describe('prOriginRefusal()', () => {
  const meta = {
    sha: 's',
    body: '',
    headRepo: 'feffef/terrarium',
    authorLogin: 'feffef',
    authorAssociation: 'OWNER',
    labels: ['bug'],
  }

  it('allows a Trusted-authored PR from this repo', () => {
    expect(prOriginRefusal(meta, 'feffef', 'terrarium')).toBeNull()
    expect(prOriginRefusal({ ...meta, authorAssociation: 'COLLABORATOR' }, 'Feffef', 'Terrarium')).toBeNull()
  })

  it('refuses a fork PR, even from a Trusted author', () => {
    expect(prOriginRefusal({ ...meta, headRepo: 'someone/terrarium' }, 'feffef', 'terrarium')).toMatch(/fork/)
    expect(prOriginRefusal({ ...meta, headRepo: null }, 'feffef', 'terrarium')).toMatch(/fork/)
  })

  it('refuses a Public-authored PR from this repo', () => {
    for (const a of ['CONTRIBUTOR', 'FIRST_TIME_CONTRIBUTOR', 'NONE']) {
      expect(prOriginRefusal({ ...meta, authorAssociation: a }, 'feffef', 'terrarium')).toMatch(/Public/)
    }
  })

  it('refuses a guest-pipeline PR, though an agent opened it as the owner (ADR-0023)', () => {
    expect(prOriginRefusal({ ...meta, labels: ['bug', GUEST_PIPELINE_LABEL] }, 'feffef', 'terrarium')).toMatch(
      /owner merges a guest-pipeline PR \(ADR-0023\)/,
    )
  })
})

// `gh api` and the REST path read the same `pulls/{number}` JSON; both hand it here.
describe('prMetaFromPull()', () => {
  const pull = {
    head: { sha: 'abc', repo: { full_name: 'feffef/terrarium' } },
    body: null,
    user: { login: 'feffef' },
    author_association: 'OWNER',
    labels: [{ name: 'guest-pipeline' }, { name: 'bug' }],
  }

  it('reads the label names alongside the origin fields', () => {
    expect(prMetaFromPull(pull)).toEqual({
      sha: 'abc',
      body: '',
      headRepo: 'feffef/terrarium',
      authorLogin: 'feffef',
      authorAssociation: 'OWNER',
      labels: ['guest-pipeline', 'bug'],
    })
  })

  it('reads a deleted head repo as null', () => {
    expect(prMetaFromPull({ ...pull, head: { sha: 'abc', repo: null } }).headRepo).toBeNull()
  })
})

describe('parseClosingKeywordIssues()', () => {
  it('finds a single "Closes #N" reference', () => {
    expect(parseClosingKeywordIssues('Closes #42')).toEqual([42])
  })

  it('finds each keyword on its own line (PR #955\'s well-formed body)', () => {
    const body = 'Closes #948\nCloses #950\nCloses #952\nCloses #954'
    expect(parseClosingKeywordIssues(body)).toEqual([948, 950, 952, 954])
  })

  it('finds every number in a comma-separated list after one keyword, even though GitHub itself only recognizes the first (per GitHub\'s own "keyword before each reference" requirement)', () => {
    const body = 'Closes #948, #950, #952, #954'
    expect(parseClosingKeywordIssues(body)).toEqual([948, 950, 952, 954])
  })

  it('handles an "and" before the last item in a list', () => {
    expect(parseClosingKeywordIssues('Fixes #1, #2, and #3')).toEqual([1, 2, 3])
  })

  it('recognizes fix/fixes/fixed/resolve/resolves/resolved/close/closed too', () => {
    for (const keyword of ['Fix', 'Fixes', 'Fixed', 'Resolve', 'Resolves', 'Resolved', 'Close', 'Closed']) {
      expect(parseClosingKeywordIssues(`${keyword} #7`)).toEqual([7])
    }
  })

  it('is case-insensitive', () => {
    expect(parseClosingKeywordIssues('closes #7')).toEqual([7])
  })

  it('matches a keyword followed by a colon, inside quotes or a negation, as GitHub does (#2104)', () => {
    expect(parseClosingKeywordIssues('Fixes: #1819')).toEqual([1819])
    expect(parseClosingKeywordIssues("don't write 'fix: #1819'")).toEqual([1819])
  })

  it('deduplicates and sorts ascending', () => {
    expect(parseClosingKeywordIssues('Closes #5\nFixes #3, #5')).toEqual([3, 5])
  })

  it('ignores a cross-repo owner/repo#N reference', () => {
    expect(parseClosingKeywordIssues('Fixes octo-org/octo-repo#100')).toEqual([])
  })

  it('ignores a bare issue mention with no closing keyword', () => {
    expect(parseClosingKeywordIssues('See #42 for context')).toEqual([])
  })

  it('is empty for a body with no closing keywords', () => {
    expect(parseClosingKeywordIssues('Just a plain description, no keywords here.')).toEqual([])
  })
})

describe('readyForHumanRefusal() (#2104, #2691)', () => {
  it('refuses open ready-for-human and unlabelled issues, naming the reword', () => {
    const refusal = readyForHumanRefusal([
      { number: 7, state: 'open', labels: ['ready-for-agent'] },
      { number: 1819, state: 'open', labels: ['ready-for-human'] },
      { number: 2660, state: 'open', labels: ['needs-triage'] },
      { number: 2661, state: 'open', labels: [] },
    ])
    expect(refusal).toContain('relates to #1819')
    expect(refusal).toContain('relates to #2660')
    expect(refusal).toContain('relates to #2661')
    expect(refusal).not.toContain('#7')
  })

  it('allows an open ready-for-agent issue and ignores closed issues', () => {
    expect(
      readyForHumanRefusal([
        { number: 1819, state: 'closed', labels: ['ready-for-human'] },
        { number: 2660, state: 'closed', labels: [] },
        { number: 7, state: 'open', labels: ['ready-for-agent', 'bug'] },
      ]),
    ).toBeNull()
  })
})

describe('factCheckedBlobRefusal() (#2370)', () => {
  const post = 'layers/blog/content/karen/pages/2026-10-30-receipts.md'
  const blob = 'a'.repeat(40)
  const added = (sha: string) => [{ filename: post, status: 'added', sha }]

  it('allows a blog-post PR whose post blob matches its Fact-checked line', () => {
    expect(factCheckedBlobRefusal(`Tally: 12 claims.\nFact-checked: \`${blob}\`\n`, added(blob))).toBeNull()
  })

  it('refuses a blog-post PR whose post changed after the fact-check', () => {
    const refusal = factCheckedBlobRefusal(`Fact-checked: ${blob}`, added('b'.repeat(40)))
    expect(refusal).toContain(post)
    expect(refusal).toContain(blob)
  })

  it('refuses a blog-post PR with no Fact-checked line', () => {
    expect(factCheckedBlobRefusal('Tally: 12 claims.', added(blob))).toContain('Fact-checked:')
  })

  it('leaves PRs that add no blog post alone, including edits to an existing post', () => {
    expect(factCheckedBlobRefusal('', [{ filename: 'scripts/x.ts', status: 'added', sha: blob }])).toBeNull()
    expect(factCheckedBlobRefusal('', [{ filename: post, status: 'modified', sha: blob }])).toBeNull()
  })
})

describe('mergeRetryingBaseModified()', () => {
  const baseModified = () =>
    new Error('GitHub REST API PUT pulls/1/merge failed: HTTP 405: {"message":"Base branch was modified. Review and try the merge again."}')

  it('merges once without a retry flag when the first call succeeds', () => {
    const merge = vi.fn(() => 'abc')
    expect(mergeRetryingBaseModified(merge)).toEqual({ sha: 'abc', retried: false })
    expect(merge).toHaveBeenCalledTimes(1)
  })

  it('retries once after a 405 "Base branch was modified" and reports the retry', () => {
    const merge = vi.fn().mockImplementationOnce(() => { throw baseModified() }).mockReturnValueOnce('def')
    expect(mergeRetryingBaseModified(merge)).toEqual({ sha: 'def', retried: true })
    expect(merge).toHaveBeenCalledTimes(2)
  })

  it('matches the gh path, whose error carries the stderr text (illustrative wording, not captured from gh)', () => {
    const ghErr = new Error('Command failed: gh api ...\ngh: Base branch was modified (HTTP 405)')
    const merge = vi.fn().mockImplementationOnce(() => { throw ghErr }).mockReturnValueOnce('ghi')
    expect(mergeRetryingBaseModified(merge).retried).toBe(true)
  })

  it('lets a second 405 propagate as a failure', () => {
    const merge = vi.fn(() => { throw baseModified() })
    expect(() => mergeRetryingBaseModified(merge)).toThrow('Base branch was modified')
    expect(merge).toHaveBeenCalledTimes(2)
  })

  it('does not retry other errors, including a 405 with another message', () => {
    for (const msg of [
      'HTTP 409: Head branch was modified',
      'HTTP 405: Pull Request is not mergeable',
      'HTTP 409: Base branch was modified (pulls/405/merge)',
      'boom',
    ]) {
      const merge = vi.fn(() => { throw new Error(msg) })
      expect(() => mergeRetryingBaseModified(merge)).toThrow(msg)
      expect(merge).toHaveBeenCalledTimes(1)
    }
  })
})

describe('reconcileClosingKeywords()', () => {
  it('closes only the still-open issues a body names with a closing keyword', async () => {
    const states: Record<number, string> = { 1: 'open', 2: 'closed', 3: 'open' }
    const closer = vi.fn()
    const result = await reconcileClosingKeywords(
      'Closes #1, #2, #3',
      (n) => states[n]!,
      closer,
    )
    expect(result).toEqual({ closed: [1, 3], failed: [] })
    expect(closer).toHaveBeenCalledTimes(2)
    expect(closer).toHaveBeenCalledWith(1)
    expect(closer).toHaveBeenCalledWith(3)
  })

  it('does nothing when the body names no issues', async () => {
    const closer = vi.fn()
    const result = await reconcileClosingKeywords('No keywords here.', () => 'open', closer)
    expect(result).toEqual({ closed: [], failed: [] })
    expect(closer).not.toHaveBeenCalled()
  })

  it('collects a failure without throwing and keeps reconciling the rest', async () => {
    const closer = vi.fn()
    const reader = vi.fn((n: number) => {
      if (n === 2) throw new Error('boom')
      return 'open'
    })
    const result = await reconcileClosingKeywords('Closes #1, #2, #3', reader, closer, async () => {})
    expect(result.closed).toEqual([1, 3])
    expect(result.failed).toEqual([2])
  })

  it('retries once after a delay and succeeds, so a benign read-then-close race (issue #1181) never reaches `failed`', async () => {
    const closer = vi.fn()
    let attempts = 0
    const reader = vi.fn((n: number) => {
      if (n === 2) {
        attempts += 1
        if (attempts === 1) throw new Error('transient')
      }
      return 'open'
    })
    const delay = vi.fn(async () => {})
    const result = await reconcileClosingKeywords('Closes #1, #2, #3', reader, closer, delay)
    expect(result).toEqual({ closed: [1, 2, 3], failed: [] })
    expect(delay).toHaveBeenCalledTimes(1)
    expect(delay).toHaveBeenCalledWith(1500)
  })

  it('only records a failure once both the first attempt and the retry throw', async () => {
    const closer = vi.fn()
    const reader = vi.fn((n: number) => {
      if (n === 2) throw new Error('still broken')
      return 'open'
    })
    const delay = vi.fn(async () => {})
    const result = await reconcileClosingKeywords('Closes #1, #2, #3', reader, closer, delay)
    expect(result.closed).toEqual([1, 3])
    expect(result.failed).toEqual([2])
    expect(delay).toHaveBeenCalledTimes(1)
  })
})

describe('pollUntilResolved()', () => {
  it('returns immediately once the first fetch already resolves', async () => {
    const runs: RawCheckRun[] = [{ name: 'gate', status: 'completed', conclusion: 'success' }]
    const fetchRuns = vi.fn().mockResolvedValue(runs)
    const result = await pollUntilResolved(fetchRuns, { intervalMs: 1, timeoutMs: 1000 })
    expect(result).toEqual({ verdict: 'green', runs })
    expect(fetchRuns).toHaveBeenCalledTimes(1)
  })

  it('keeps polling through pending states until a resolved verdict lands', async () => {
    const pending: RawCheckRun[] = [{ name: 'gate', status: 'in_progress', conclusion: null }]
    const red: RawCheckRun[] = [{ name: 'gate', status: 'completed', conclusion: 'failure' }]
    const fetchRuns = vi
      .fn()
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(red)
    const result = await pollUntilResolved(fetchRuns, { intervalMs: 1, timeoutMs: 1000 })
    expect(result).toEqual({ verdict: 'red', runs: red })
    expect(fetchRuns).toHaveBeenCalledTimes(3)
  })

  it('gives up at the timeout and reports pending rather than throwing', async () => {
    const pending: RawCheckRun[] = [{ name: 'gate', status: 'in_progress', conclusion: null }]
    const fetchRuns = vi.fn().mockResolvedValue(pending)
    const result = await pollUntilResolved(fetchRuns, { intervalMs: 5, timeoutMs: 12 })
    expect(result.verdict).toBe('pending')
    expect(result.runs).toEqual(pending)
  })
})

describe('simpleChangeRefusal() (#3483)', () => {
  const file = (filename: string, additions: number, deletions = 0, status = 'modified'): PrFile => ({
    filename, additions, deletions, status,
  })

  it('accepts at most 2 files and 10 lines, a file counting its larger side', () => {
    expect(simpleChangeRefusal([file('a.md', 2, 7), file('b.md', 3, 1)])).toBeNull()
    expect(simpleChangeRefusal([file('a.md', 6, 6), file('b.md', 5)])).toMatch(/11 lines/)
  })

  it('refuses a third file', () => {
    expect(simpleChangeRefusal([file('a.md', 1), file('b.md', 1), file('c.md', 1)])).toMatch(/3 files/)
  })

  it('refuses an added, renamed or copied file', () => {
    for (const status of ['added', 'renamed', 'copied']) {
      expect(simpleChangeRefusal([file('n.md', 1, 0, status)])).toContain('n.md')
    }
  })

  it('refuses code, hook and workflow paths, a rename source included', () => {
    for (const name of ['a.ts', 'b.js', 'c.vue', 'scripts/hooks/x.sh', '.claude/workflows/w.json']) {
      expect(simpleChangeRefusal([file(name, 1)])).toContain(name)
    }
    expect(simpleChangeRefusal([{ ...file('b.md', 1), previousFilename: 'old.ts' }])).toContain('old.ts')
  })

  it('fails closed on a missing line count', () => {
    expect(simpleChangeRefusal([{ filename: 'a.md', status: 'modified' }])).toMatch(/lines/)
  })
})

describe('verdictRefusal() (issues #1276, #1844, #3483)', () => {
  const head = '0123456789abcdef0123456789abcdef01234567'
  const reviewedSha = 'fedcba9876543210fedcba9876543210fedcba98'
  const header = (id: string, reviewed = `Reviewed: ${head}`) =>
    `🤖 [Opus 5.5](https://claude.ai/code/${id})\n\nLGTM\n\n${reviewed}`
  const me = 'session_me'
  const owner = (...bodies: string[]) => bodies.map((body) => ({ body, authorAssociation: 'OWNER' }))
  const noVerdict = /no review or comment on the PR carries this session's provenance header/
  const proven: ReviewEvidence = { reviewed: [head], filesSince: () => null }
  const run = (bodies: ReturnType<typeof owner>, ev = proven, files: PrFile[] = [], sessionId: string | null = me) =>
    verdictRefusal(bodies, sessionId, head, files, ev)
  const small = (filename: string, status = 'modified'): PrFile => ({ filename, status, additions: 2, deletions: 1 })

  it('refuses when no body carries an authorship marker', () => {
    expect(run([])).toMatch(noVerdict)
    expect(run(owner(`looks good\nReviewed: ${head}`, 'see https://claude.ai/code/session_me'), proven, [], null)).toMatch(noVerdict)
  })

  it('accepts a header naming the current session', () => {
    expect(run(owner('nit', header(me)))).toBeNull()
  })

  it("accepts a local session's raw-UUID header", () => {
    const local = 'e34491a0-8237-4285-88b7-1a0b73cd29e7'
    expect(run(owner(header(local)), proven, [], local)).toBeNull()
  })

  it("names the session and the subagent cause when only another session's verdict exists", () => {
    const refusal = run(owner(header('session_other')))
    expect(refusal).toMatch(noVerdict)
    expect(refusal).toContain(me)
    expect(refusal).toMatch(/subagent/)
  })

  it('accepts any marker shape when the session is unresolvable', () => {
    expect(run(owner(header('session_other')), proven, [], null)).toBeNull()
    expect(run(owner(`ok\nReviewed: ${head}\n\nCo-Authored-By: Claude <noreply@anthropic.com>`), proven, [], null)).toBeNull()
    expect(run(owner(`ok\nReviewed: ${head}\n\n_Generated by [Claude Code](https://claude.ai/code)_`), proven, [], null)).toBeNull()
  })

  it('ignores a forged verdict from a Public author (ADR-0020)', () => {
    for (const authorAssociation of ['NONE', 'CONTRIBUTOR', 'FIRST_TIME_CONTRIBUTOR']) {
      expect(run([{ body: header(me), authorAssociation }])).toMatch(noVerdict)
      expect(run([{ body: header(me), authorAssociation }], proven, [], null)).toMatch(noVerdict)
    }
  })

  it('accepts a Reviewed line naming the head by full sha or a prefix of at least 7 chars', () => {
    expect(run(owner(header(me, 'Reviewed: 0123456')))).toBeNull()
    expect(run(owner(header(me, 'Reviewed: `0123456789AB`')))).toBeNull()
  })

  it('says the verdict lacks a Reviewed line naming the head', () => {
    for (const reviewed of ['merging as-is', 'Reviewed: 012345', `Reviewed: ${head}ff`, `I have not Reviewed: ${head}`]) {
      const refusal = run(owner(header(me, reviewed)))
      expect(refusal).toMatch(/no `Reviewed: <sha>` line/)
      expect(refusal).toContain(head)
    }
  })

  it('names the reviewed commit and the head when the verdict covers an older commit', () => {
    for (const old of ['fedcba9876543210', 'fedcba9']) {
      const refusal = run(owner(header(me, `Reviewed: ${old}`)))
      expect(refusal).toContain(`names ${old}`)
      expect(refusal).toContain(`head is ${head}`)
    }
  })

  describe('review proof (#3483)', () => {
    it('refuses a Reviewed line no review in the transcript backs, naming the call to run', () => {
      const refusal = run(owner(header(me)), { reviewed: [reviewedSha], filesSince: () => null })
      expect(refusal).toMatch(/transcript shows no review of/)
      expect(refusal).toContain('verdict-line.ts --review-call')
    })

    it('accepts a proof by an abbreviated sha in either direction', () => {
      expect(run(owner(header(me)), { reviewed: [head.slice(0, 7)], filesSince: () => null })).toBeNull()
      expect(run(owner(header(me, 'Reviewed: 0123456')), proven)).toBeNull()
    })

    it('refuses with the fix when the transcript cannot be found', () => {
      const refusal = run(owner(header(me)), { reviewed: null, filesSince: () => null })
      expect(refusal).toMatch(/transcript was not found/)
      expect(refusal).toMatch(/CLAUDE_CODE_SESSION_ID/)
    })

    it('needs no proof for a plain Dependabot bump', () => {
      expect(run(owner(header(me)), { reviewed: 'exempt', filesSince: () => null })).toBeNull()
    })

    it('exempts only a Dependabot-authored PR from reading the transcript', () => {
      const proof = () => [head]
      expect(reviewedFor(DEPENDABOT_LOGIN, () => { throw new Error('read the transcript') })).toBe('exempt')
      expect(reviewedFor('feffef', proof)).toEqual([head])
      expect(reviewedFor('dependabot', () => null)).toBeNull()
    })
  })

  describe('Own-read verdict (#3395, #3483)', () => {
    const ownRead = `Own-read: ${head}`
    const edit = [small('a.md')]
    const noProof: ReviewEvidence = { reviewed: [], filesSince: () => null }

    it('accepts it for a simple diff', () => {
      expect(run(owner(header(me, ownRead)), noProof, [...edit, { ...small('b.md'), status: 'removed' }])).toBeNull()
    })

    it('needs no transcript for a simple diff', () => {
      expect(run(owner(header(me, ownRead)), { reviewed: null, filesSince: () => null }, edit)).toBeNull()
    })

    it('refuses it when the PR adds, renames or copies a file, saying a Reviewed line is needed', () => {
      const refusal = run(owner(header(me, ownRead)), noProof, [...edit, small('n.md', 'added')])
      expect(refusal).toContain('n.md')
      expect(refusal).toMatch(/Reviewed: /)
      expect(run(owner(header(me, ownRead)), noProof, [small('new.md', 'renamed')])).toContain('new.md')
      expect(run(owner(header(me, ownRead)), noProof, [small('c.md', 'copied')])).toContain('c.md')
    })

    it('refuses it past the countable bar, a code file included', () => {
      expect(run(owner(header(me, ownRead)), noProof, [small('a.ts')])).toMatch(/code, hook or workflow path/)
      const big = { filename: 'a.md', status: 'modified', additions: 11, deletions: 0 }
      expect(run(owner(header(me, ownRead)), noProof, [big])).toMatch(/11 lines/)
    })

    it('still accepts a proven Reviewed line for a larger diff', () => {
      expect(run(owner(header(me)), proven, [small('n.ts', 'added')])).toBeNull()
    })

    it('lets an Own-read line on the head stand in for an unproven Reviewed line on it', () => {
      const bodies = owner(header(me), header(me, ownRead))
      expect(run(bodies, noProof, edit)).toBeNull()
      expect(run(bodies, noProof, [small('a.ts')])).toMatch(/code, hook or workflow path/)
      expect(run(bodies, proven, [small('a.ts')])).toBeNull()
    })

    it('refuses an Own-read line naming an older commit', () => {
      const refusal = run(owner(header(me, 'Own-read: fedcba9')), noProof, edit)
      expect(refusal).toContain('names fedcba9')
    })

    describe('after a proven review', () => {
      const body = header(me, `Reviewed: ${reviewedSha}\n${ownRead}`)
      const evidence = (since: PrFile[] | null): ReviewEvidence => ({
        reviewed: [reviewedSha],
        filesSince: (sha) => (sha === reviewedSha ? since : null),
      })
      const big = [small('n.ts', 'added')]

      it('judges the fix since the reviewed sha, not the whole PR', () => {
        expect(run(owner(body), evidence([small('a.md')]), big)).toBeNull()
      })

      it('refuses a fix that fails the bar, naming the reviewed sha', () => {
        const refusal = run(owner(body), evidence([small('fix.ts')]), big)
        expect(refusal).toContain(`since the reviewed ${reviewedSha}`)
        expect(refusal).toContain('fix.ts')
      })

      it('refuses when the diff since the review cannot be read', () => {
        expect(run(owner(body), evidence(null), big)).toMatch(/diff could not be read/)
      })

      it('judges the whole PR when the named review is not proven', () => {
        const unproven: ReviewEvidence = { reviewed: [], filesSince: () => [small('a.md')] }
        expect(run(owner(body), unproven, big)).toContain('n.ts')
      })

      it('says the transcript is missing rather than asking for a review it cannot prove', () => {
        const none: ReviewEvidence = { reviewed: null, filesSince: () => [small('a.md')] }
        expect(run(owner(body), none, big)).toMatch(/transcript was not found/)
      })

      it('accepts the fix since a later proven review, whichever verdict came first', () => {
        const later = 'abcdef0123456789abcdef0123456789abcdef01'
        const bodies = owner(header(me, `Reviewed: ${reviewedSha}`), header(me, `Reviewed: ${later}\n${ownRead}`))
        const ev: ReviewEvidence = {
          reviewed: [reviewedSha, later],
          filesSince: (sha) => (sha === later ? [small('a.md')] : [small('big.ts')]),
        }
        expect(run(bodies, ev, big)).toBeNull()
        const neither: ReviewEvidence = { ...ev, filesSince: () => [small('big.ts')] }
        const refusal = run(bodies, neither, big)
        expect(refusal).toContain(`since the reviewed ${reviewedSha}`)
        expect(refusal).toContain(`since the reviewed ${later}`)
      })
    })
  })
})

describe('humanMergeRefusal() — the Human-only paths (ADR-0004)', () => {
  const globs = rulePaths('---\nadr: x\npaths:\n  - "docs/adr/**"\n  - "nuxt.config.ts"\n  - "shared/schemas/**"\n---\nbody\n')

  it('reads the rule\'s paths from its frontmatter', () => {
    expect(globs).toEqual(['docs/adr/**', 'nuxt.config.ts', 'shared/schemas/**'])
  })

  it('lets an ordinary PR through, a layer config included', () => {
    expect(humanMergeRefusal(['layers/blog/nuxt.config.ts', 'app/app.vue'], globs)).toBeNull()
  })

  it('refuses a PR that changes a listed file, naming it', () => {
    expect(humanMergeRefusal(['app/app.vue', 'shared/schemas/session.ts'], globs)).toContain('shared/schemas/session.ts')
  })

  it('fails closed when no paths could be read', () => {
    expect(humanMergeRefusal(['app/app.vue'], [])).toContain('refused')
  })

  it('refuses an ADR change even alongside a Prune Trial ledger entry (ADR-0004)', () => {
    const files = ['docs/adr/0004-objective-safety-gate.md', '.agents/prune-trials.yml']
    expect(humanMergeRefusal(files, globs)).toContain('docs/adr/0004-objective-safety-gate.md')
  })
})

// A bot's PR follows ADR-0004 (ADR-0020): a minor or patch bump may merge
// though it changes the Human-only `package.json` (#1889).
describe('dependabotBumpRefusal() (#1889)', () => {
  const meta = {
    sha: 's',
    body: '',
    headRepo: 'feffef/terrarium',
    authorLogin: 'dependabot[bot]',
    authorAssociation: 'NONE',
    labels: ['dependencies'],
  }
  const pkg = (patch: string) => ({ filename: 'package.json', patch })
  const lock = { filename: 'pnpm-lock.yaml', patch: '-x\n+y' }
  const bump = (name: string, from: string, to: string) => `-    "${name}": "${from}",\n+    "${name}": "${to}",`
  const refusal = (files: { filename: string; previousFilename?: string; patch?: string }[], m = meta) =>
    dependabotBumpRefusal(m, files, 'feffef', 'terrarium')

  it('allows minor and patch bumps within each major', () => {
    const patch = `@@ -10,7 +10,7 @@\n   "devDependencies": {\n${bump('vitest', '^3.2.4', '^3.3.0')}\n${bump('nuxt', '4.1.2', '4.1.3')}\n${bump('zod', '~0.3.1', '~0.3.2')}`
    expect(refusal([pkg(patch), lock])).toBeNull()
  })

  it('refuses a third file', () => {
    expect(refusal([pkg(bump('vitest', '^3.2.4', '^3.3.0')), lock, { filename: '.npmrc', patch: '+a' }])).toContain(
      '.npmrc',
    )
  })

  it('refuses a renamed file by its old path', () => {
    expect(refusal([{ ...pkg(bump('vitest', '^3.2.4', '^3.3.0')), previousFilename: 'old.json' }])).toContain('old.json')
  })

  it('refuses a lockfile-only change, which shows no versions to check', () => {
    expect(refusal([lock])).toMatch(/package\.json/)
  })

  it('refuses a major move', () => {
    expect(refusal([pkg(bump('vitest', '^3.2.4', '^4.0.0')), lock])).toContain('vitest')
  })

  it('treats a 0.x minor change as a major', () => {
    expect(refusal([pkg(bump('zod', '^0.3.1', '^0.4.0')), lock])).toContain('zod')
  })

  it('refuses a new direct dependency', () => {
    expect(refusal([pkg(`${bump('vitest', '^3.2.4', '^3.3.0')}\n+    "left-pad": "^1.0.0",`), lock])).toContain('left-pad')
  })

  it('refuses a changed line that is not a version pair, or a version it cannot read', () => {
    expect(refusal([pkg('+  "overrides": {'), lock])).toMatch(/refused/)
    expect(refusal([pkg(bump('foo', 'npm:bar@1.0.0', 'npm:bar@1.1.0')), lock])).toContain('foo')
  })

  it('refuses a name changed twice on one side', () => {
    expect(refusal([pkg(`${bump('vitest', '^3.2.4', '^3.3.0')}\n+    "vitest": "^3.4.0",`), lock])).toMatch(/single version change/)
  })

  it('refuses when GitHub omits the package.json patch', () => {
    expect(refusal([{ filename: 'package.json' }, lock])).toMatch(/patch/)
  })

  it('refuses a non-dependabot author', () => {
    expect(refusal([pkg(bump('vitest', '^3.2.4', '^3.3.0')), lock], { ...meta, authorLogin: 'dependabot' })).toMatch(
      /dependabot\[bot\]/,
    )
  })

  it('refuses a fork', () => {
    expect(refusal([pkg(bump('vitest', '^3.2.4', '^3.3.0')), lock], { ...meta, headRepo: 'x/terrarium' })).toMatch(/fork/)
  })
})
