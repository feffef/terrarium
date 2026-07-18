// Unit coverage for the landing handler's two #148 behaviors: it lands from a
// gitignored staging copy (never the working tree), and the sentinel gate makes
// re-runs on every live `Stop` cheap — landing only when the authored scratch
// changes. The push plumbing itself is covered by log-session-push.spec.ts; here
// `land` is stubbed so we observe *what path* it is handed and *when* it is called.
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildDroppedScratchScratch,
  declaredClosure,
  DROPPED_SCRATCH_FRICTION,
  handle,
  isAlreadyLanded,
  recoverDroppedScratch,
  scratchHashOf,
  SESSION_ID_MISMATCH_FRICTION,
  withSessionIdMismatchFriction,
} from '../../scripts/session-end.ts'
import { SESSIONS_DIR, validateEntry } from '../../scripts/log-session.ts'
import { extractTrace, parseTranscript, stitch, STAGING_DIR, type AuthoredScratch } from '../../scripts/session-trace.ts'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

// A synthetic session id so the derived tree path can never collide with a real log.
const scratch: AuthoredScratch = {
  session: 'session_STAGINGSPEC000000000000',
  kind: 'interactive',
  goal: 'exercise the staging + gate paths',
  status: 'completed',
  outcome: 'ok',
  summary: 'A synthetic scratch for the session-end staging + gate unit tests.',
  frictions: [{ description: 'x', solution: 'y', severity: 'nit' }],
}

// One assistant record is enough to give the trace a start/end stamp so the
// stitched entry satisfies the frozen `sessions` schema (utcTimestamp fields).
const transcript = JSON.stringify({
  type: 'assistant',
  timestamp: '2026-07-04T22:45:00Z',
  sessionId: scratch.session,
  cwd: '/home/user/terrarium',
  gitBranch: 'main',
  message: { model: 'claude-opus-4-8', content: [] },
})

const filename = `2026-07-04-${scratch.session}.yml`
const expectedRel = `${SESSIONS_DIR}/${filename}`
const stagingAbs = join(repoRoot, STAGING_DIR, filename)
const treeAbs = join(repoRoot, expectedRel)

describe('handle() — lands from gitignored staging, never the tree (#148)', () => {
  afterEach(() => rmSync(stagingAbs, { force: true }))

  it('hands land() the staging path and leaves the working tree untouched', () => {
    rmSync(stagingAbs, { force: true })
    let seenAbs = ''
    const landFn = vi.fn((_rel: string, abs: string) => {
      seenAbs = abs
      return 'deadbeef0000'
    }) as unknown as typeof import('../../scripts/log-session.ts').land

    const res = handle(scratch, transcript, {
      dryRun: false,
      remote: 'origin',
      env: {},
      landFn,
      mainVersionFn: () => null, // not yet on main
    })

    expect(res.action).toBe('landed')
    expect(res.relPath).toBe(expectedRel)
    // land() received the staging byte-source, not the tree path…
    expect(seenAbs).toBe(stagingAbs)
    expect(seenAbs).toContain('/.session-logs/staged/')
    // …and the working tree never got an untracked session log.
    expect(existsSync(treeAbs)).toBe(false)
    // the staged copy was written as the byte source (the stub doesn't remove it).
    expect(existsSync(stagingAbs)).toBe(true)
  })

  it('skips — no land, no staging write — when the entry already matches main', () => {
    // First pass: capture the exact YAML handle() writes to staging.
    rmSync(stagingAbs, { force: true })
    let yaml = ''
    handle(scratch, transcript, {
      dryRun: false,
      remote: 'origin',
      env: {},
      mainVersionFn: () => null,
      landFn: ((_rel: string, abs: string) => {
        yaml = readFileSync(abs, 'utf8')
        return 'x'
      }) as unknown as typeof import('../../scripts/log-session.ts').land,
    })
    rmSync(stagingAbs, { force: true })
    expect(yaml).not.toBe('')

    // Second pass: main already has that YAML → the diff-guard short-circuits
    // before any staging write or land call.
    const landFn = vi.fn() as unknown as typeof import('../../scripts/log-session.ts').land
    const res = handle(scratch, transcript, {
      dryRun: false,
      remote: 'origin',
      env: {},
      landFn,
      mainVersionFn: () => yaml,
    })
    expect(res.action).toBe('skipped-unchanged')
    expect(landFn).not.toHaveBeenCalled()
    expect(existsSync(stagingAbs)).toBe(false)
  })
})

describe('declaredClosure() / recoverDroppedScratch() — issue #449 Gap 3', () => {
  const droppedSession = 'session_DROPPEDSCRATCH00000000'
  const droppedStagingAbs = join(repoRoot, STAGING_DIR, `2026-07-06-${droppedSession}.yml`)
  afterEach(() => rmSync(droppedStagingAbs, { force: true }))

  // A transcript proving the session invoked log-session (closure declared),
  // spanning two timestamps so the trace stitches to a schema-valid entry.
  const closedTranscript = [
    { type: 'user', sessionId: droppedSession, cwd: '/home/user/terrarium', gitBranch: 'main', entrypoint: 'remote_trigger', version: '2.1.0', timestamp: '2026-07-06T10:00:00Z', message: { content: 'go' } },
    { type: 'assistant', timestamp: '2026-07-06T10:00:05Z', message: { model: 'claude-opus-4-8', content: [] } },
    { type: 'assistant', timestamp: '2026-07-06T10:30:00Z', message: { model: 'claude-opus-4-8', content: [
      { type: 'tool_use', name: 'Skill', input: { skill: 'log-session' } },
    ] } },
  ].map((r) => JSON.stringify(r)).join('\n')

  // Same shape, but the session never reached its own closure declaration —
  // the true #397 case, which must stay untouched by this recovery path.
  const neverClosedTranscript = [
    { type: 'user', sessionId: 'session_NEVERCLOSED0000000000', cwd: '/home/user/terrarium', timestamp: '2026-07-06T10:00:00Z', message: { content: 'go' } },
    { type: 'assistant', timestamp: '2026-07-06T10:05:00Z', message: { model: 'claude-opus-4-8', content: [] } },
  ].map((r) => JSON.stringify(r)).join('\n')

  it('declaredClosure() is true only when the trace shows a log-session invocation', () => {
    expect(declaredClosure(extractTrace(parseTranscript(closedTranscript), {}))).toBe(true)
    expect(declaredClosure(extractTrace(parseTranscript(neverClosedTranscript), {}))).toBe(false)
  })

  it('buildDroppedScratchScratch() produces a clearly-flagged, schema-valid placeholder', () => {
    const trace = extractTrace(parseTranscript(closedTranscript), {})
    const scratch = buildDroppedScratchScratch(trace)
    expect(scratch.status).toBe('abandoned')
    expect(scratch.kind).toBe('autonomous') // remote_trigger ⇒ best-effort autonomous guess
    expect(scratch.frictions).toEqual([
      expect.objectContaining({ description: DROPPED_SCRATCH_FRICTION, severity: 'major' }),
    ])
    expect(validateEntry(stitch(scratch, trace)).ok).toBe(true)
  })

  it('lands a placeholder log when closure was declared but nothing exists at its path yet', () => {
    let seenAbs = ''
    const landFn = vi.fn((_rel: string, abs: string) => {
      seenAbs = abs
      return 'deadbeef0000'
    })
    const res = recoverDroppedScratch(closedTranscript, {
      dryRun: false,
      remote: 'origin',
      env: {},
      landFn: landFn as unknown as typeof import('../../scripts/log-session.ts').land,
      mainVersionFn: () => null,
    })
    expect(res.action).toBe('landed')
    expect(res.relPath).toBe(`${SESSIONS_DIR}/2026-07-06-${droppedSession}.yml`)
    expect(landFn).toHaveBeenCalledOnce()
    // Structurally flagged, not just via friction text (Standards review, #449) —
    // a consumer can filter/label it without grepping prose.
    expect(readFileSync(seenAbs, 'utf8')).toContain('droppedScratchRecovery: true')
  })

  it('does nothing for a session that never declared closure — the #397 case stays untouched', () => {
    const landFn = vi.fn()
    const res = recoverDroppedScratch(neverClosedTranscript, {
      dryRun: false,
      remote: 'origin',
      env: {},
      landFn: landFn as unknown as typeof import('../../scripts/log-session.ts').land,
      mainVersionFn: () => null,
    })
    expect(res.action).toBe('skipped-no-scratch')
    expect(landFn).not.toHaveBeenCalled()
  })

  it('never overwrites a log (real or a prior placeholder) already at the expected path', () => {
    const landFn = vi.fn()
    const res = recoverDroppedScratch(closedTranscript, {
      dryRun: false,
      remote: 'origin',
      env: {},
      landFn: landFn as unknown as typeof import('../../scripts/log-session.ts').land,
      mainVersionFn: () => 'schemaVersion: 1\nsession: whatever\n', // something already lives there
    })
    expect(res.action).toBe('skipped-unchanged')
    expect(landFn).not.toHaveBeenCalled()
  })
})

describe('isAlreadyLanded() / scratchHashOf() — the landing gate (#148)', () => {
  const raw = JSON.stringify(scratch)

  it('lands when there is no sentinel yet', () => {
    expect(isAlreadyLanded(raw, null)).toBe(false)
  })

  it('no-ops when the sentinel hash matches the scratch bytes', () => {
    const sentinel = JSON.stringify({ scratchHash: scratchHashOf(raw), relPath: expectedRel })
    expect(isAlreadyLanded(raw, sentinel)).toBe(true)
  })

  it('lands again once the scratch changes (a new friction / updated outcome)', () => {
    const sentinel = JSON.stringify({ scratchHash: scratchHashOf(raw), relPath: expectedRel })
    const changed = JSON.stringify({ ...scratch, outcome: 'a materially different outcome' })
    expect(isAlreadyLanded(changed, sentinel)).toBe(false)
  })

  it('treats an unreadable sentinel as not-landed (fail open, so the log lands)', () => {
    expect(isAlreadyLanded(raw, 'not json{')).toBe(false)
  })
})

describe('withSessionIdMismatchFriction() — the recorded-signal half of the issue #387 guard', () => {
  it('is a no-op when there are no mismatches to report', () => {
    expect(withSessionIdMismatchFriction(scratch, [])).toBe(scratch)
  })

  it('appends a blocker friction carrying the greppable marker and the offending detail, without dropping existing frictions', () => {
    const withMismatch = withSessionIdMismatchFriction(scratch, [
      { sha: 'deadbeef0000', found: 'session_WRONG', expected: 'session_REAL' },
    ])
    expect(withMismatch.frictions).toHaveLength(scratch.frictions.length + 1)
    const added = withMismatch.frictions.at(-1)!
    expect(added.severity).toBe('blocker')
    expect(added.description).toContain(SESSION_ID_MISMATCH_FRICTION)
    expect(added.description).toContain('session_WRONG')
    expect(added.description).toContain('session_REAL')
    // original frictions untouched, not mutated in place
    expect(withMismatch.frictions.slice(0, -1)).toEqual(scratch.frictions)
  })
})
