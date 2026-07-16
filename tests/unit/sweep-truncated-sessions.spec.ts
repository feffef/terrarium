// Unit coverage for the back-catalog truncation sweep's pure core (issue #449
// Gap 5) — the detector must repair only what it can ground unambiguously in
// the entry itself, and flag (never guess at) everything else.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  applyFlag,
  applyRepair,
  detectTruncatedOutcome,
  sweep,
} from '../../scripts/sweep-truncated-sessions.ts'

describe('detectTruncatedOutcome()', () => {
  it('repairs a bare "PR" corroborated by exactly one prs entry (the confirmed #367 shape)', () => {
    expect(detectTruncatedOutcome({ outcome: 'PR', prs: ['198'] })).toEqual({
      suspect: true,
      repaired: 'PR #198 merged',
    })
  })

  it('is case-insensitive on the bare "pr" fragment', () => {
    expect(detectTruncatedOutcome({ outcome: 'pr', prs: ['5'] })).toMatchObject({ repaired: 'PR #5 merged' })
  })

  it('flags-only a bare value against MULTIPLE prs entries — which one is unrecoverable', () => {
    // The real "Both" / prs: [192, 197] case: a genuine signal, but not a safe guess.
    expect(detectTruncatedOutcome({ outcome: 'Both', prs: ['192', '197'] })).toEqual({ suspect: true })
  })

  it('does not flag an outcome that already cites one of its own prs', () => {
    expect(detectTruncatedOutcome({ outcome: 'PR #198 merged', prs: ['198'] })).toEqual({ suspect: false })
  })

  it('does not flag when there are no prs to corroborate against at all', () => {
    expect(detectTruncatedOutcome({ outcome: 'PR', prs: [] })).toEqual({ suspect: false })
    expect(detectTruncatedOutcome({ outcome: 'PR' })).toEqual({ suspect: false })
  })

  it('does not flag ordinary multi-word prose outcomes', () => {
    expect(detectTruncatedOutcome({ outcome: 'Filed 5 issues, merged 2 fixing PRs', prs: ['198'] })).toEqual({
      suspect: false,
    })
    expect(detectTruncatedOutcome({ outcome: 'Fixed, gated, merged', prs: ['198'] })).toEqual({ suspect: false })
  })

  it('does not flag a short outcome that is not suspiciously bare (has a digit)', () => {
    expect(detectTruncatedOutcome({ outcome: '2 issues filed', prs: ['198'] })).toEqual({ suspect: false })
  })

  it('handles a missing/non-string outcome without throwing', () => {
    expect(detectTruncatedOutcome({ prs: ['1'] })).toEqual({ suspect: false })
    expect(detectTruncatedOutcome({ outcome: 42, prs: ['1'] })).toEqual({ suspect: false })
  })
})

describe('applyRepair()', () => {
  it('quotes the repaired value in place, touching no other line', () => {
    const raw = 'session: s\noutcome: PR\nsummary: x\n'
    expect(applyRepair(raw, 'PR #198 merged')).toBe('session: s\noutcome: "PR #198 merged"\nsummary: x\n')
  })
})

describe('applyFlag()', () => {
  it('inserts historicallyTruncated right after the outcome line', () => {
    const raw = 'session: s\noutcome: Both\nsummary: x\n'
    expect(applyFlag(raw, 'outcome')).toBe('session: s\noutcome: Both\nhistoricallyTruncated:\n  - outcome\nsummary: x\n')
  })

  it('is idempotent — does not double-insert on an already-flagged file', () => {
    const already = 'session: s\noutcome: Both\nhistoricallyTruncated:\n  - outcome\nsummary: x\n'
    expect(applyFlag(already, 'outcome')).toBe(already)
  })
})

describe('sweep() — the FS shell, over a throwaway session-logs directory', () => {
  let dir: string

  function entry(session: string, outcome: string, prs: string[]): string {
    const prsYaml = prs.length ? `prs:\n${prs.map((n) => `  - "${n}"`).join('\n')}\n` : ''
    return [
      `session: ${session}`,
      'startedAt: 2026-07-05T09:50:00Z',
      'endedAt: 2026-07-05T10:00:00Z',
      'kind: interactive',
      'goal: test fixture',
      'status: completed',
      `outcome: ${outcome}`,
      'summary: a synthetic fixture entry',
      'frictions: []',
    ].join('\n') + '\n' + prsYaml
  }

  const files = {
    exact: 'exact.yml', // full text still present, unquoted — byte-exact recovery
    reconstructed: 'reconstructed.yml', // truly bare, one prs entry — safe reconstruction
    flagged: 'flagged.yml', // bare, but 2 prs entries — ambiguous, flag only
    clean: 'clean.yml', // ordinary complete prose — never touched
  }

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  function writeFixture(): void {
    dir = mkdtempSync(join(tmpdir(), 'sweep-sessions-'))
    writeFileSync(join(dir, files.exact), entry('session_exact', 'PR #99 merged; done', ['99']))
    writeFileSync(join(dir, files.reconstructed), entry('session_recon', 'PR', ['55']))
    writeFileSync(join(dir, files.flagged), entry('session_flag', 'Both', ['10', '20']))
    writeFileSync(join(dir, files.clean), entry('session_clean', 'Fixed and merged cleanly', ['77']))
  }

  it('classifies each fixture correctly on a dry run, writing nothing', () => {
    writeFixture()
    const report = sweep([dir], false)
    expect(report.repaired.map((f) => [f.session, f.source])).toEqual(
      expect.arrayContaining([
        ['session_exact', 'exact'],
        ['session_recon', 'reconstructed'],
      ]),
    )
    expect(report.flagged.map((f) => f.session)).toEqual(['session_flag'])
    // Dry run — the clean fixture's bytes are untouched, proving nothing was written.
    expect(readFileSync(join(dir, files.clean), 'utf8')).toBe(entry('session_clean', 'Fixed and merged cleanly', ['77']))
  })

  it('--write applies the exact and reconstructed repairs, and flags the ambiguous case', () => {
    writeFixture()
    sweep([dir], true)
    expect(readFileSync(join(dir, files.exact), 'utf8')).toContain('outcome: "PR #99 merged; done"')
    expect(readFileSync(join(dir, files.reconstructed), 'utf8')).toContain('outcome: "PR #55 merged"')
    const flaggedRaw = readFileSync(join(dir, files.flagged), 'utf8')
    expect(flaggedRaw).toContain('outcome: Both')
    expect(flaggedRaw).toContain('historicallyTruncated:\n  - outcome')
  })

  it('is idempotent — a second --write pass finds nothing left to do', () => {
    writeFixture()
    sweep([dir], true)
    const second = sweep([dir], true)
    expect(second.repaired).toEqual([])
    expect(second.flagged).toEqual([])
  })

  it('never touches the clean fixture', () => {
    writeFixture()
    sweep([dir], true)
    expect(readFileSync(join(dir, files.clean), 'utf8')).toBe(entry('session_clean', 'Fixed and merged cleanly', ['77']))
  })
})
