// Unit coverage for the session-log helper's pure core (ADR-0009). The git plumbing
// (fetch → rebuild → push) is side-effecting and exercised via `--dry-run`; here we
// pin the two guards that decide whether an entry is safe to land on `main`:
// schema validation (the L1 stand-in) and the canonical `<date>-<session>.yml` filename.
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CURRENT_SESSIONS_SCHEMA_VERSION,
  expectedFilename,
  land,
  validateEntry,
} from '../../scripts/log-session.ts'

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
  it('accepts a well-formed entry and keeps timestamps as ISO-8601 strings', () => {
    // Timestamps stay strings so Nuxt Content stores the full instant verbatim
    // (a `z.date()` field truncates to a DATE column — YYYY-MM-DD, no time).
    const res = validateEntry(valid)
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.data.startedAt).toBe('2026-07-04T22:45:00Z')
  })

  it('rejects a date-only timestamp (a bare date loses the time-of-day)', () => {
    expect(validateEntry({ ...valid, startedAt: '2026-07-04' }).ok).toBe(false)
  })

  it('requires canonical UTC — rejects offset and zone-less timestamps', () => {
    // The field is UTC (…Z). A `+02:00` offset or a zone-less value would be
    // re-parsed in the viewer's zone client-side, reintroducing the drift.
    expect(validateEntry({ ...valid, startedAt: '2026-07-04T23:30:00+02:00' }).ok).toBe(false)
    expect(validateEntry({ ...valid, startedAt: '2026-07-04T22:45:00' }).ok).toBe(false)
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

  it('accepts optional learnings/ideas string arrays, and a log that omits them', () => {
    expect(validateEntry({ ...valid, learnings: ['inferred a thing'], ideas: ['a spark'] }).ok).toBe(true)
    expect('learnings' in valid).toBe(false) // absent is fine — they are optional
    expect(validateEntry(valid).ok).toBe(true)
  })

  it('rejects a non-string entry in learnings (must be a plain string array)', () => {
    expect(validateEntry({ ...valid, learnings: [{ note: 'x' }] }).ok).toBe(false)
  })

  it('rejects a non-mapping', () => {
    expect(validateEntry('nope').ok).toBe(false)
    expect(validateEntry(null).ok).toBe(false)
  })

  it('rejects an unparseable timestamp', () => {
    expect(validateEntry({ ...valid, startedAt: 'not-a-date' }).ok).toBe(false)
  })
})

describe('schemaVersion — the evolution spine (issue #60)', () => {
  it('accepts a v1-absent entry (all pre-versioning history — absent ⇒ 1)', () => {
    // The `valid` fixture omits schemaVersion, exactly like every existing log
    // on disk. Zero migration: they stay valid forever.
    expect('schemaVersion' in valid).toBe(false)
    expect(validateEntry(valid).ok).toBe(true)
  })

  it('accepts a v1-present entry (new logs write it explicitly)', () => {
    const res = validateEntry({ ...valid, schemaVersion: CURRENT_SESSIONS_SCHEMA_VERSION })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.data.schemaVersion).toBe(1)
  })

  it('rejects an unknown future version until the union is added', () => {
    // Bumping to v2 is a deliberate schema change (new object + z.union), not a
    // value any current file may carry.
    expect(validateEntry({ ...valid, schemaVersion: 2 }).ok).toBe(false)
  })

  it('pins the current version at 1', () => {
    expect(CURRENT_SESSIONS_SCHEMA_VERSION).toBe(1)
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

  it('takes the date from the UTC instant — a late-evening Z stamp stays that day', () => {
    // 23:59:59Z is still the 4th in UTC — the anchor the stem order uses.
    const res = validateEntry({ ...valid, session: 'session_Z', startedAt: '2026-07-04T23:59:59Z' })
    expect(res.ok).toBe(true)
    if (res.ok) expect(expectedFilename(res.data)).toBe('2026-07-04-session_Z.yml')
  })
})

describe('land() — cleanup after landing (issue #7)', () => {
  let absPath: string
  const relPath = 'tenants/journal/content/current/sessions/2026-07-04-session_x.yml'

  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), 'log-session-test-'))
    absPath = join(dir, '2026-07-04-session_x.yml')
    writeFileSync(absPath, 'session: x\n')
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('removes the working-copy scratch file after a successful push', () => {
    const push = vi.fn().mockReturnValue('abc123def456789')
    land(relPath, absPath, 'origin', { dryRun: false, push })
    expect(push).toHaveBeenCalledOnce()
    expect(existsSync(absPath)).toBe(false)
  })

  it('removes the scratch even when the push fails — never orphans it (#148)', () => {
    // A frozen-network push throws; the `finally` cleanup must still fire, so an
    // interrupted freeze leaves no file behind (in staging or, historically, the tree).
    const push = vi.fn().mockImplementation(() => {
      throw new Error('frozen network')
    })
    expect(() => land(relPath, absPath, 'origin', { dryRun: false, push })).toThrow('frozen network')
    expect(existsSync(absPath)).toBe(false)
  })

  it('keeps the working-copy file on --dry-run (nothing pushed, nothing removed)', () => {
    const push = vi.fn()
    const build = vi.fn().mockReturnValue('abc123def456789')
    land(relPath, absPath, 'origin', { dryRun: true, push, build })
    expect(build).toHaveBeenCalledOnce()
    expect(push).not.toHaveBeenCalled()
    expect(existsSync(absPath)).toBe(true)
  })
})
