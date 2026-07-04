// Unit coverage for the session-log helper's pure core (ADR-0009). The git plumbing
// (fetch → rebuild → push) is side-effecting and exercised via `--dry-run`; here we
// pin the two guards that decide whether an entry is safe to land on `main`:
// schema validation (the L1 stand-in) and the canonical `<date>-<session>.yml` filename.
import { describe, expect, it } from 'vitest'
import { expectedFilename, validateEntry } from '../../scripts/log-session.ts'

const valid = {
  session: 'session_01HNmYFFBMxwQufmpeXMqLHK',
  startedAt: '2026-07-04T22:45:00Z',
  endedAt: '2026-07-04T23:27:08Z',
  kind: 'interactive',
  goal: 'Ship the log-session helper',
  status: 'completed',
  outcome: 'Helper + Skill landed',
  summary: 'A representative entry used to exercise the validator.',
  prs: ['5'],
  docsRead: [{ path: 'CONTEXT.md', reason: 'domain model' }],
  skillsUsed: [{ name: 'tdd', reason: 'test-first' }],
  frictions: [{ description: 'x', solution: 'y', severity: 'nit' }],
}

describe('validateEntry() — the L1 stand-in', () => {
  it('accepts a well-formed entry and coerces timestamp strings to Date', () => {
    const res = validateEntry(valid)
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.data.startedAt).toBeInstanceOf(Date)
  })

  it('defaults the optional list fields so a minimal entry is valid', () => {
    const { prs, docsRead, skillsUsed, ...minimal } = valid
    const res = validateEntry(minimal)
    expect(res.ok).toBe(true)
  })

  it('rejects an unknown field (schema is strict)', () => {
    expect(validateEntry({ ...valid, tag: 'ci' }).ok).toBe(false)
  })

  it('rejects an out-of-range severity', () => {
    const bad = { ...valid, frictions: [{ description: 'x', solution: 'y', severity: 'huge' }] }
    expect(validateEntry(bad).ok).toBe(false)
  })

  it('requires frictions to be present (forces reflection)', () => {
    const { frictions, ...noFrictions } = valid
    expect(validateEntry(noFrictions).ok).toBe(false)
  })

  it('rejects a non-mapping', () => {
    expect(validateEntry('nope').ok).toBe(false)
    expect(validateEntry(null).ok).toBe(false)
  })

  it('rejects an unparseable timestamp', () => {
    expect(validateEntry({ ...valid, startedAt: 'not-a-date' }).ok).toBe(false)
  })
})

describe('expectedFilename() — the canonical name', () => {
  it('is <startedAt-date>-<session>.yml in UTC', () => {
    const res = validateEntry(valid)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(expectedFilename(res.data)).toBe('2026-07-04-session_01HNmYFFBMxwQufmpeXMqLHK.yml')
    }
  })

  it('takes the date from startedAt in UTC, not local time', () => {
    // 23:30 in a +02:00 zone is still the 4th in UTC — the anchor the stem order uses.
    const res = validateEntry({ ...valid, session: 'session_TZ', startedAt: '2026-07-04T23:30:00+02:00' })
    expect(res.ok).toBe(true)
    if (res.ok) expect(expectedFilename(res.data)).toBe('2026-07-04-session_TZ.yml')
  })
})
