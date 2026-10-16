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
  humanMergeRefusal,
  mergeRequestFields,
  GUEST_PIPELINE_LABEL,
  parseClosingKeywordIssues,
  pollUntilResolved,
  prMetaFromPull,
  prOriginRefusal,
  readyForHumanRefusal,
  reconcileClosingKeywords,
  verdictFromCheckRuns,
  verdictRefusal,
  type RawCheckRun,
} from '../../scripts/merge-pr.ts'
import { rulePaths } from '../../scripts/validate-adr-rules.ts'

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
})

describe('prOriginRefusal()', () => {
  const meta = { sha: 's', body: '', headRepo: 'feffef/terrarium', authorAssociation: 'OWNER', labels: ['bug'] }

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
    author_association: 'OWNER',
    labels: [{ name: 'guest-pipeline' }, { name: 'bug' }],
  }

  it('reads the label names alongside the origin fields', () => {
    expect(prMetaFromPull(pull)).toEqual({
      sha: 'abc',
      body: '',
      headRepo: 'feffef/terrarium',
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

describe('readyForHumanRefusal() (#2104)', () => {
  it('refuses when a closing reference names an open ready-for-human issue', () => {
    const refusal = readyForHumanRefusal([
      { number: 7, state: 'open', labels: ['ready-for-agent'] },
      { number: 1819, state: 'open', labels: ['ready-for-human'] },
    ])
    expect(refusal).toContain('#1819')
    expect(refusal).toContain('relates to #1819')
    expect(refusal).not.toContain('#7')
  })

  it('allows a closed ready-for-human issue and open issues without the label', () => {
    expect(
      readyForHumanRefusal([
        { number: 1819, state: 'closed', labels: ['ready-for-human'] },
        { number: 7, state: 'open', labels: ['ready-for-agent'] },
      ]),
    ).toBeNull()
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

describe('verdictRefusal() (issues #1276, #1844)', () => {
  const head = '0123456789abcdef0123456789abcdef01234567'
  const header = (id: string, reviewed = `Reviewed: ${head}`) =>
    `🤖 [Opus 5.5](https://claude.ai/code/${id})\n\nLGTM\n\n${reviewed}`
  const me = 'session_me'
  const owner = (...bodies: string[]) => bodies.map((body) => ({ body, authorAssociation: 'OWNER' }))
  const noVerdict = /no review or comment on the PR carries this session's provenance header/

  it('refuses when no body carries an authorship marker', () => {
    expect(verdictRefusal([], me, head)).toMatch(noVerdict)
    expect(
      verdictRefusal(owner(`looks good\nReviewed: ${head}`, 'see https://claude.ai/code/session_me'), null, head),
    ).toMatch(noVerdict)
  })

  it('accepts a header naming the current session', () => {
    expect(verdictRefusal(owner('nit', header(me)), me, head)).toBeNull()
  })

  it("accepts a local session's raw-UUID header", () => {
    const local = 'e34491a0-8237-4285-88b7-1a0b73cd29e7'
    expect(verdictRefusal(owner(header(local)), local, head)).toBeNull()
  })

  it("names the session and the subagent cause when only another session's verdict exists", () => {
    const refusal = verdictRefusal(owner(header('session_other')), me, head)
    expect(refusal).toMatch(noVerdict)
    expect(refusal).toContain(me)
    expect(refusal).toMatch(/subagent/)
  })

  it('accepts any marker shape when the session is unresolvable', () => {
    expect(verdictRefusal(owner(header('session_other')), null, head)).toBeNull()
    expect(
      verdictRefusal(owner(`ok\nReviewed: ${head}\n\nCo-Authored-By: Claude <noreply@anthropic.com>`), null, head),
    ).toBeNull()
    expect(
      verdictRefusal(owner(`ok\nReviewed: ${head}\n\n_Generated by [Claude Code](https://claude.ai/code)_`), null, head),
    ).toBeNull()
  })

  it('ignores a forged verdict from a Public author (ADR-0020)', () => {
    for (const authorAssociation of ['NONE', 'CONTRIBUTOR', 'FIRST_TIME_CONTRIBUTOR']) {
      expect(verdictRefusal([{ body: header(me), authorAssociation }], me, head)).toMatch(noVerdict)
      expect(verdictRefusal([{ body: header(me), authorAssociation }], null, head)).toMatch(noVerdict)
    }
  })

  it('accepts a Reviewed line naming the head by full sha or a prefix of at least 7 chars', () => {
    expect(verdictRefusal(owner(header(me, 'Reviewed: 0123456')), me, head)).toBeNull()
    expect(verdictRefusal(owner(header(me, 'Reviewed: `0123456789AB`')), me, head)).toBeNull()
  })

  it('says the verdict lacks a Reviewed line naming the head', () => {
    for (const reviewed of ['merging as-is', 'Reviewed: 012345', `Reviewed: ${head}ff`, `I have not Reviewed: ${head}`]) {
      const refusal = verdictRefusal(owner(header(me, reviewed)), me, head)
      expect(refusal).toMatch(/no `Reviewed: <sha>` line/)
      expect(refusal).toContain(head)
    }
  })

  it('names the reviewed commit and the head when the verdict covers an older commit', () => {
    for (const old of ['fedcba9876543210', 'fedcba9']) {
      const refusal = verdictRefusal(owner(header(me, `Reviewed: ${old}`)), me, head)
      expect(refusal).toContain(`names ${old}`)
      expect(refusal).toContain(`head is ${head}`)
    }
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
