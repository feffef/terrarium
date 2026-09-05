// Unit coverage for the session-log helper's pure core (ADR-0009). The git plumbing
// (fetch → rebuild → push) is side-effecting and exercised via `--dry-run`; here we
// pin the two guards that decide whether an entry is safe to land on `main`:
// schema validation (the L1 stand-in) and the canonical `<date>-<session>.yml` filename.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CURRENT_SESSIONS_SCHEMA_VERSION,
  expectedFilename,
  findTruncatedScalars,
  land,
  mergeAuthored,
  reportShellReads,
  validateAuthored,
  validateEntry,
  writeScratch,
} from '../../scripts/log-session.ts'
import type { AuthoredScratch } from '../../scripts/session-trace.ts'

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

describe('findTruncatedScalars() — the unquoted-`#` guard', () => {
  it('catches an outcome truncated at an unquoted `#`, recovering the full value', () => {
    // `outcome: PR #354 merged` parses as just "PR" (the rest is a YAML comment) —
    // the exact footgun that produced the `outcome: PR` logs on main.
    const hits = findTruncatedScalars('outcome: PR #354 merged\ngoal: hi\n')
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ keyPath: 'outcome', value: 'PR', full: 'PR #354 merged' })
  })

  it('reports the nested key path for a truncated value inside a list', () => {
    const yaml = 'docsRead:\n  - path: a.vue\n    reason: routing #the resolver\n'
    const hits = findTruncatedScalars(yaml)
    expect(hits).toHaveLength(1)
    expect(hits[0]?.keyPath).toBe('docsRead.reason')
  })

  it('does not flag a properly quoted value containing `#`', () => {
    expect(findTruncatedScalars('outcome: "PR #354 merged"\n')).toEqual([])
  })

  it('does not flag a `#` inside a block scalar (it is literal there)', () => {
    // The Skill points agents at `>-` for summaries; a `#` in the body is content.
    expect(findTruncatedScalars('summary: >-\n  landed PR #354 and closed it\n')).toEqual([])
  })

  it('returns [] on unparseable YAML (the parseYaml step surfaces that error)', () => {
    expect(findTruncatedScalars('key: [unterminated\n')).toEqual([])
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
  const relPath = 'layers/journal/content/current/sessions/2026-07-04-session_x.yml'

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

describe('derived-only fields cannot be authored', () => {
  // `.strict()` would reject it as an anonymous "Unrecognized key"; the named
  // refusal exists because the right next action — log a Friction — is not
  // guessable from that (issue #1074).
  it('refuses an authored docsReadViaShell and names the friction route', () => {
    const res = validateAuthored({
      session: 'session_01A',
      goal: 'g',
      status: 'completed',
      outcome: 'o',
      summary: 's',
      frictions: [],
      docsReadViaShell: ['docs/agents/x.md'],
    })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.errors).toContain('cannot be authored')
      expect(res.errors).toContain('SHELL-READ-DETECTION')
    }
  })
})

describe('reportShellReads (the author-time verification report)', () => {
  // Builds a fake harness transcript store so the report can be driven end to
  // end — it is the agent-facing half of #1074's loop, and its silence rules
  // matter as much as its output.
  const bash = (command: string) => ({
    type: 'assistant',
    message: { content: [{ type: 'tool_use', name: 'Bash', input: { command } }] },
  })
  function store(cwd: string, commands: string[]): string {
    const home = mkdtempSync(join(tmpdir(), 'shellread-home-'))
    const dir = join(home, '.claude', 'projects', cwd.replace(/[/.]/g, '-'))
    mkdirSync(dir, { recursive: true })
    const records = [{ type: 'user', cwd, message: { content: 'go' } }, ...commands.map(bash)]
    writeFileSync(join(dir, 'session.jsonl'), records.map((r) => JSON.stringify(r)).join('\n'))
    return home
  }
  const run = (cwd: string, home: string): string[] => {
    const lines: string[] = []
    vi.stubEnv('HOME', home)
    try {
      reportShellReads(cwd, (l) => lines.push(l))
    } finally {
      vi.unstubAllEnvs()
    }
    return lines
  }

  it('lists the detected paths and the rule that rejected each near-miss', () => {
    const home = store('/repo', ['cat docs/agents/guards.md', 'ls docs/adr/0001-x.md'])
    const out = run('/repo', home).join('\n')
    expect(out).toContain('docs/agents/guards.md')
    expect(out).toContain('not a reader command')
    expect(out).toContain('SHELL-READ-DETECTION')
  })

  it('says nothing at all when there is nothing to check', () => {
    expect(run('/repo', store('/repo', ['echo hello', 'git status']))).toEqual([])
  })

  it('degrades to silence when the transcript store is missing', () => {
    expect(run('/repo', mkdtempSync(join(tmpdir(), 'shellread-empty-')))).toEqual([])
  })

  it('caps the near-miss list rather than burying the detected paths', () => {
    const many = Array.from({ length: 9 }, (_, i) => `echo docs/agents/d${i}.md`)
    const out = run('/repo', store('/repo', many)).join('\n')
    expect(out).toContain('Not counted (9)')
    expect(out).toContain('…and 4 more')
    // One rule line per rendered near-miss (each also echoes its command).
    expect(out.match(/not a reader command/g)?.length).toBe(5)
  })
})

describe('mergeAuthored() / writeScratch() — merge on re-fire (issue #688)', () => {
  const pass1: AuthoredScratch = {
    session: 'session_01A',
    goal: 'Run /digest for 2026-07-24',
    status: 'completed',
    outcome: 'Digest authored, PR #680 merged green',
    summary: 'First firing did the work.',
    prs: ['680'],
    frictions: [{ description: 'auto-merge false negative', solution: 'poll again', severity: 'minor' }],
  }
  const pass2: AuthoredScratch = {
    session: 'session_01A',
    goal: 'Run /digest for 2026-07-25',
    status: 'completed',
    outcome: 'No-op — nothing to move',
    summary: 'Second firing found nothing to do.',
    prs: [],
    frictions: [{ description: '/digest fired as a plain message', solution: 'name the Routine', severity: 'nit' }],
  }

  it('passes a single pass through unchanged (no existing scratch)', () => {
    expect(mergeAuthored(undefined, pass1)).toEqual(pass1)
  })

  it('unions frictions and prs, and takes the later pass for goal/status/outcome/summary', () => {
    const merged = mergeAuthored(pass1, pass2)
    expect(merged.goal).toBe(pass2.goal)
    expect(merged.status).toBe(pass2.status)
    expect(merged.outcome).toBe(pass2.outcome)
    expect(merged.summary).toBe(pass2.summary)
    expect(merged.prs).toEqual(['680'])
    expect(merged.frictions).toEqual([...pass1.frictions, ...pass2.frictions])
  })

  it('dedups a friction reported again with the same description + severity', () => {
    const merged = mergeAuthored(pass1, { ...pass2, frictions: [...pass2.frictions, pass1.frictions[0]!] })
    expect(merged.frictions).toHaveLength(2) // pass1's friction survives once, not twice
  })

  it('dedups prs shared by both passes', () => {
    const merged = mergeAuthored(pass1, { ...pass2, prs: ['680', '681'] })
    expect(merged.prs).toEqual(['680', '681'])
  })

  it('writeScratch() on a fresh path is byte-identical to writing the authored object directly', () => {
    const dir = mkdtempSync(join(tmpdir(), 'log-session-scratch-'))
    const scratchAbs = join(dir, 'pending.scratch.json')
    writeScratch(pass1, scratchAbs)
    expect(JSON.parse(readFileSync(scratchAbs, 'utf8'))).toEqual(pass1)
  })

  it('writeScratch() merges a second authoring pass with the first', () => {
    const dir = mkdtempSync(join(tmpdir(), 'log-session-scratch-'))
    const scratchAbs = join(dir, 'pending.scratch.json')
    writeScratch(pass1, scratchAbs)
    writeScratch(pass2, scratchAbs)
    const landed = JSON.parse(readFileSync(scratchAbs, 'utf8'))
    expect(landed.prs).toEqual(['680'])
    expect(landed.frictions).toHaveLength(2)
    expect(landed.outcome).toBe(pass2.outcome)
  })
})
