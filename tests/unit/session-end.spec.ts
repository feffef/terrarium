// Unit coverage for the landing handler's two #148 behaviors: it lands from a
// gitignored staging copy (never the working tree), and the sentinel gate makes
// re-runs on every live `Stop` cheap — landing only when the authored scratch
// changes. The push plumbing itself is covered by log-session-push.spec.ts; here
// `land` is stubbed so we observe *what path* it is handed and *when* it is called.
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { handle, isAlreadyLanded, scratchHashOf } from '../../scripts/session-end.ts'
import { SESSIONS_DIR } from '../../scripts/log-session.ts'
import { STAGING_DIR, type AuthoredScratch } from '../../scripts/session-trace.ts'

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
      landFn,
      mainVersionFn: () => yaml,
    })
    expect(res.action).toBe('skipped-unchanged')
    expect(landFn).not.toHaveBeenCalled()
    expect(existsSync(stagingAbs)).toBe(false)
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
