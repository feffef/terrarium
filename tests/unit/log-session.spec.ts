// Unit coverage for the session-log helper's pure core (ADR-0009). The git plumbing
// (fetch → rebuild → push) is side-effecting and exercised via `--dry-run`; here we
// pin the two guards that decide whether an entry is safe to land on `main`:
// schema validation (the L1 stand-in) and the canonical `<date>-<session>.yml` filename.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parse as parseYaml } from 'yaml'
import {
  authorMain,
  committedFiles,
  CURRENT_SESSIONS_SCHEMA_VERSION,
  closureRefusal,
  expectedFilename,
  land,
  loadAuthorContext,
  mergeAuthored,
  pendingMain,
  reportReads,
  mergedWorktreesToRemove,
  gitWorktrees,
  validateAuthored,
  type WorktreeSeam,
} from '../../scripts/session/log-session.ts'
import type { Finding } from '../../scripts/git/check-worktrees.ts'
import { extractTrace } from '../../scripts/session/transcript-trace.ts'
import { findTruncatedScalars, validateEntry } from '../../scripts/session/journal-files.ts'
import type { AuthoredScratch } from '../../scripts/session/transcript-trace.ts'

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
  docsRead: [{ path: 'GLOSSARY.md', reason: 'domain model' }],
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
    expect(validateEntry({ ...valid, learnings: ['inferred a thing'], ideas: ['an idea'] }).ok).toBe(true)
    expect('learnings' in valid).toBe(false) // absent is fine — they are optional
    expect(validateEntry(valid).ok).toBe(true)
  })

  it('accepts derived adrHints and refuses other shapes, and never takes them authored', () => {
    const adrHints = [{ adr: 4, via: 'text', readAfter: false, by: 'main' }]
    expect(validateEntry({ ...valid, adrHints }).ok).toBe(true)
    expect(validateEntry({ ...valid, adrHints: [{ adr: 4, via: 'bash', readAfter: false, by: 'main' }] }).ok).toBe(false)
    const authored = { session: 's', goal: 'g', status: 'completed', outcome: 'o', summary: 's', frictions: [] }
    expect(validateAuthored({ ...authored, adrHints }).ok).toBe(false)
  })

  it('rejects a non-string entry in learnings (must be a plain string array)', () => {
    expect(validateEntry({ ...valid, learnings: [{ note: 'x' }] }).ok).toBe(false)
  })

  // #1941: one verdict list for the whole session; only subagentVerdicts went.
  it('accepts what subagents loaded or read, with or without it, and refuses subagentVerdicts', () => {
    const bySub = { rulesLoadedBySubagents: ['.claude/rules/adr-0012.md'], docsReadBySubagents: ['docs/agents/x.md'] }
    expect(validateEntry({ ...valid, ...bySub }).ok).toBe(true)
    expect(validateEntry({ ...valid, rulesLoadedBySubagents: ['.claude/rules/adr-0012.md'] }).ok).toBe(true)
    const sv = { path: '.claude/rules/adr-0012.md', kind: 'rule', agent: 'Triage #12', reason: 'r', useful: 'yes' }
    expect(validateEntry({ ...valid, subagentVerdicts: [sv] }).ok).toBe(false)
    expect(validateAuthored({ session: 's', goal: 'g', status: 'completed', outcome: 'o', summary: 's', frictions: [], subagentVerdicts: [sv] }).ok).toBe(false)
  })

  // The one log that carried subagentVerdicts, migrated by the owner's one-off exception to ADR-0009.
  it('validates the migrated log, its subagent verdict now in ruleVerdicts', () => {
    const log = parseYaml(readFileSync('layers/journal/content/archived/sessions/2026-10-14-session_01NVG22rfEsjhW9zkcCco6W8.yml', 'utf8'))
    expect(validateEntry(log).ok).toBe(true)
    expect(log.ruleVerdicts).toContainEqual(expect.objectContaining({ path: '.claude/rules/tenant-layers.md', useful: 'partly' }))
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
  it('refuses an authored docsReadViaShell and points at reported', () => {
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
      expect(res.errors).toContain('reported')
    }
  })

  // #3009: docsRead is derived and ruleVerdicts is gone; reported is required.
  it('refuses docsRead and ruleVerdicts by name, and a log without reported', () => {
    const base = { session: 'session_01A', goal: 'g', status: 'completed', outcome: 'o', summary: 's', frictions: [] }
    for (const field of ['docsRead', 'ruleVerdicts']) {
      const res = validateAuthored({ ...base, reported: [], [field]: [] })
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.errors).toContain(`${field}: cannot be authored`)
    }
    const missing = validateAuthored(base)
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.errors).toContain('reported')
    expect(validateAuthored({ ...base, reported: [] }).ok).toBe(true)
    expect(validateAuthored({ ...base, reported: [{ path: 'docs/agents/pr-workflow.md', why: 'the merge steps' }] }).ok).toBe(true)
  })

  it('requires a value on a reported rule, refuses one on a doc, and names the old helped key', () => {
    const base = { session: 'session_01A', goal: 'g', status: 'completed', outcome: 'o', summary: 's', frictions: [] }
    const ok = (reported: unknown[]) => validateAuthored({ ...base, reported }).ok
    expect(ok([{ path: '.claude/rules/adr-0004.md', value: 'steered', why: 'gate first' }])).toBe(true)
    expect(ok([{ path: '.claude/rules/adr-0004.md' }])).toBe(false)
    expect(ok([{ path: '.claude/rules/adr-0004.md', value: 'yes' }])).toBe(false)
    expect(ok([{ path: '.claude/rules/adr-0004.md', value: 'confirmed' }])).toBe(false)
    expect(ok([{ path: 'docs/agents/pr-workflow.md', value: 'backed' }])).toBe(false)
    const doc = validateAuthored({ ...base, reported: [{ path: 'adr-0004.md', value: 'backed' }] })
    if (!doc.ok) expect(doc.errors).toContain('a .claude/rules/ path needs a value')
    const old = validateAuthored({ ...base, helped: [] })
    expect(old.ok).toBe(false)
    if (!old.ok) expect(old.errors).toContain('renamed to reported')
  })
})

describe('reportReads (the names reported is picked from)', () => {
  // Builds a fake harness transcript store so the report can be driven end to
  // end — it is the agent-facing half of #1074's loop, and its silence rules
  // matter as much as its output.
  // The docs a fixture can show, written to a real root so the output
  // matcher's index (issue #1545) has something to credit against. A command
  // is a bare string (no output) or a `[command, output]` pair: what the
  // result showed is stated per case, never inferred from the command text.
  const FIXTURE_DOCS: Record<string, string> = {
    'docs/agents/guards.md': 'The mechanical PreToolUse guards that hold rules prose stopped holding.',
    'GLOSSARY.md': 'The terms every agent needs regardless of task, and the Tenants roster.',
  }
  type Cmd = string | [command: string, output: string] | { read: string }
  let n = 0
  const bash = (entry: Cmd): Record<string, unknown>[] => {
    // Relative: the noise filter drops absolute tmpdir paths.
    if (typeof entry === 'object' && !Array.isArray(entry)) {
      const input = { file_path: entry.read }
      return [{ type: 'assistant', message: { content: [{ type: 'tool_use', id: `toolu_${++n}`, name: 'Read', input }] } }]
    }
    const [command, output] = typeof entry === 'string' ? [entry, ''] : entry
    const id = `toolu_${++n}`
    return [
      { type: 'assistant', message: { content: [{ type: 'tool_use', id, name: 'Bash', input: { command } }] } },
      { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: output }] } },
    ]
  }
  const jsonl = (cwd: string, commands: Cmd[]): string =>
    [{ type: 'user', cwd, message: { content: 'go' } }, ...commands.flatMap(bash)]
      .map((r) => JSON.stringify(r))
      .join('\n')
  function store(commands: Cmd[], subagentCommands?: Cmd[], meta?: string): { home: string; root: string } {
    const root = mkdtempSync(join(tmpdir(), 'shellread-root-'))
    for (const [rel, text] of Object.entries(FIXTURE_DOCS)) {
      mkdirSync(dirname(join(root, rel)), { recursive: true })
      writeFileSync(join(root, rel), `# heading\n\n${text}\n`)
    }
    const home = mkdtempSync(join(tmpdir(), 'shellread-home-'))
    const dir = join(home, '.claude', 'projects', root.replace(/[/.]/g, '-'))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'session.jsonl'), jsonl(root, commands))
    if (subagentCommands) {
      const subs = join(dir, 'session', 'subagents')
      mkdirSync(subs, { recursive: true })
      writeFileSync(join(subs, 'agent-a1.jsonl'), jsonl(root, subagentCommands))
      if (meta !== undefined) writeFileSync(join(subs, 'agent-a1.meta.json'), meta)
    }
    return { home, root }
  }
  const run = ({ home, root }: { home: string; root: string }): string[] => {
    const lines: string[] = []
    vi.stubEnv('HOME', home)
    try {
      reportReads(loadAuthorContext(root, root), (l) => lines.push(l))
    } finally {
      vi.unstubAllEnvs()
    }
    return lines
  }

  it('lists the detected paths and the rule that rejected each near-miss', () => {
    const fixture = store([['cat docs/agents/guards.md', FIXTURE_DOCS['docs/agents/guards.md']!], 'ls docs/adr/0001-x.md'])
    const out = run(fixture).join('\n')
    expect(out).toContain('docs/agents/guards.md')
    expect(out).toContain('not a reader command')
    expect(out).toContain('SHELL-READ-DETECTION')
  })

  it('says nothing at all when there is nothing to check', () => {
    expect(run(store(['echo hello', 'git status']))).toEqual([])
  })

  it('degrades to silence when the transcript store is missing', () => {
    expect(run({ home: mkdtempSync(join(tmpdir(), 'shellread-empty-')), root: mkdtempSync(join(tmpdir(), 'shellread-noroot-')) })).toEqual([])
  })

  const withRule = (fixture: { home: string; root: string }, rule: string, at = '') => {
    const dir = join(fixture.home, '.claude', 'projects', fixture.root.replace(/[/.]/g, '-'), at)
    const file = join(dir, at ? 'agent-a1.jsonl' : 'session.jsonl')
    const load = { type: 'attachment', attachment: { type: 'nested_memory', path: join(fixture.root, `.claude/rules/${rule}`) } }
    writeFileSync(file, `${readFileSync(file, 'utf8')}\n${JSON.stringify(load)}`)
    return fixture
  }

  it("lists the main agent's own rules and docs by name only, never a subagent's", () => {
    const guards: Cmd = ['cat docs/agents/guards.md', FIXTURE_DOCS['docs/agents/guards.md']!]
    const fixture = withRule(store([['cat GLOSSARY.md', FIXTURE_DOCS['GLOSSARY.md']!]], [guards]), 'adr-0012.md')
    withRule(fixture, 'adr-0099.md', 'session/subagents')
    const out = run(fixture)
    expect(out.filter((l) => /^ {4}[^\s(]\S*$/.test(l))).toEqual(['    .claude/rules/adr-0012.md', '    GLOSSARY.md'])
    expect(out.join('\n')).not.toMatch(/verdict|useful/)
  })

  it('lists a doc both it and a subagent read, and a Read-tool doc', () => {
    const ctx: Cmd = ['cat GLOSSARY.md', FIXTURE_DOCS['GLOSSARY.md']!]
    const out = run(store([ctx, { read: 'docs/agents/guards.md' }], [ctx]))
    expect(out.filter((l) => /^ {4}[^\s(]\S*$/.test(l))).toEqual(['    docs/agents/guards.md', '    GLOSSARY.md'])
  })

  it('lists the always-loaded rules, marked, with what each value means', () => {
    const fixture = store(['git status'])
    const dir = join(fixture.home, '.claude', 'projects', fixture.root.replace(/[/.]/g, '-'))
    const start = { type: 'attachment', attachment: { type: 'instructions', files: [{ path: join(fixture.root, '.claude/rules/adr-0003.md') }] } }
    writeFileSync(join(dir, 'session.jsonl'), `${readFileSync(join(dir, 'session.jsonl'), 'utf8')}\n${JSON.stringify(start)}`)
    const out = run(fixture).join('\n')
    expect(out).toContain('    .claude/rules/adr-0003.md (loaded at start)')
    expect(out).toContain('  steered  you did')
    expect(out).toContain('  backed   it matched')
  })

  it('caps the near-miss list rather than burying the detected paths', () => {
    const many = Array.from({ length: 9 }, (_, i) => `echo docs/agents/d${i}.md`)
    const out = run(store(many)).join('\n')
    expect(out).toContain('Not counted as read via shell (9)')
    expect(out).toContain('…and 4 more')
    // One rule line per rendered near-miss (each also echoes its command).
    expect(out.match(/not a reader command/g)?.length).toBe(5)
  })

  // Issue #2687: the report before the first --author pass, writing nothing.
  describe('pendingMain()', () => {
    const pending = (fixture: { home: string; root: string }) => {
      const logs: string[] = []
      vi.spyOn(console, 'log').mockImplementation((l: string) => void logs.push(l))
      vi.stubEnv('HOME', fixture.home)
      try {
        pendingMain({ cwd: fixture.root })
      } finally {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
      }
      return logs.join('\n')
    }

    it('prints the loaded rules', () => {
      const fixture = withRule(withRule(store(['git status']), 'adr-0012.md'), 'adr-0013.md')
      expect(pending(fixture)).toContain('    .claude/rules/adr-0012.md\n    .claude/rules/adr-0013.md')
    })

    it('says so in one line when nothing loaded or was read', () => {
      expect(pending(store(['git status']))).toBe('log-session: no rule loaded and no doc read; author reported: [].')
    })
  })

  describe('authorMain()', () => {
    const authored = 'session: session_01A\ngoal: g\nstatus: completed\noutcome: o\nsummary: s\nfrictions: []\nreported: []\n'
    // `exit` throws so a refusal is catchable; `log` lines are what the agent sees.
    function author(
      fixture: { home: string; root: string },
      { mainSchemaFn = () => null, scratchAbs = join(fixture.root, 'scratch.json'), extra = '', status = 'completed', worktrees }: {
        mainSchemaFn?: (entry: unknown) => { errors: string; unknownKeys: string[] | null } | null
        worktrees?: WorktreeSeam
        scratchAbs?: string
        extra?: string
        status?: string
      } = {},
    ) {
      const yml = join(fixture.root, 'authored.yml')
      writeFileSync(yml, authored.replace('completed', status) + extra)
      const logs: string[] = []
      const errors: string[] = []
      vi.spyOn(console, 'log').mockImplementation((l: string) => void logs.push(l))
      vi.spyOn(console, 'error').mockImplementation((l: string) => void errors.push(l))
      vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('EXIT')
      })
      vi.stubEnv('HOME', fixture.home)
      let exited = false
      try {
        authorMain([yml], { cwd: fixture.root, scratchAbs, mainSchemaFn, worktrees })
      } catch (err) {
        if ((err as Error).message !== 'EXIT') throw err
        exited = true
      } finally {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
      }
      return { logs, errors: errors.join('\n'), exited, scratchWritten: existsSync(scratchAbs) }
    }

    // Issue #2521: a completed log after a merge with no close-session since is refused.
    it('refuses a completed log after a merge without close-session, and writes no scratch', () => {
      const res = author(store(['pnpm tsx scripts/github/merge-pr.ts 12']))
      expect(res).toMatchObject({ exited: true, scratchWritten: false })
      expect(res.errors).toContain('Invoke the close-session Skill first, then author again')
    })

    it('still accepts a completed log with no merge, or a merge with another status', () => {
      expect(author(store(['ls']))).toMatchObject({ exited: false, scratchWritten: true })
      const merged = store(['pnpm tsx scripts/github/merge-pr.ts 12'])
      expect(author(merged, { status: 'blocked' })).toMatchObject({ exited: false, scratchWritten: true })
    })
    // Issue #2721: the worktree sweep at close, behind a seam so no real worktree is touched.
    describe('worktree sweep', () => {
      const stranded = finding({ path: '/r/.claude/worktrees/wt-a', uncommitted: true })
      const seam = (findings: Finding[], removed: string[] = []): WorktreeSeam => ({
        read: () => ({
          result: { findings, failures: findings.filter((f) => !f.isPrimary && (f.uncommitted || f.unpushed) && !f.excusedBy) },
          current: '/r',
          onMainLine: [],
        }),
        remove: (paths) => (removed.push(...paths), paths),
      })

      it('refuses a completed log while a linked worktree holds unrescued work, naming its path', () => {
        const res = author(store(['ls']), { worktrees: seam([stranded]) })
        expect(res).toMatchObject({ exited: true, scratchWritten: false })
        expect(res.errors).toContain('/r/.claude/worktrees/wt-a')
        expect(res.errors).toMatch(/push it, or remove it/)
      })

      it('records one minor Friction, not a refusal, on abandoned, however often it re-runs', () => {
        const fixture = store(['ls'])
        const scratchAbs = join(fixture.root, 'scratch.json')
        const opts = { status: 'abandoned', scratchAbs, worktrees: seam([stranded]) }
        expect(author(fixture, opts)).toMatchObject({ exited: false, scratchWritten: true })
        author(fixture, opts)
        const frictions = JSON.parse(readFileSync(scratchAbs, 'utf8')).frictions
        expect(frictions).toHaveLength(1)
        expect(frictions[0]).toMatchObject({ severity: 'minor' })
        expect(frictions[0].description).toContain('/r/.claude/worktrees/wt-a')
      })

      it('passes cleanly and removes nothing when every linked worktree is clean and unmerged', () => {
        const removed: string[] = []
        const fixture = store(['ls'])
        const scratchAbs = join(fixture.root, 'scratch.json')
        const worktrees = seam([finding({ path: '/r', isPrimary: true }), finding({})], removed)
        expect(author(fixture, { scratchAbs, worktrees })).toMatchObject({ exited: false, scratchWritten: true })
        expect(removed).toEqual([])
        expect(JSON.parse(readFileSync(scratchAbs, 'utf8')).frictions).toEqual([])
      })

      it('removes merged worktrees even when it refuses, and says so', () => {
        const removed: string[] = []
        const merged = finding({ path: '/r/.claude/worktrees/done', mergedToMain: true })
        const res = author(store(['ls']), { worktrees: seam([merged, stranded], removed) })
        expect(res.exited).toBe(true)
        expect(removed).toEqual(['/r/.claude/worktrees/done'])
        expect(res.logs.join('\n')).toContain('/r/.claude/worktrees/done')
      })

      it('warns and still writes the scratch when git state cannot be read', () => {
        const unreadable: WorktreeSeam = {
          read: () => {
            throw new Error('not a repo')
          },
          remove: () => [],
        }
        const res = author(store(['ls']), { worktrees: unreadable })
        expect(res).toMatchObject({ exited: false, scratchWritten: true })
        expect(res.errors).toContain('worktree sweep skipped')
      })
    })

    const tmpDirs: string[] = []
    afterAll(() => tmpDirs.forEach((d) => rmSync(d, { recursive: true, force: true })))
    const written = [
      '✓ authored scratch written → .session-logs/pending.scratch.json',
      '  the Stop hook will stitch it with the derived trace and commit, live, at the end of this turn.',
    ]

    it("leaves the output unchanged when main's schema accepts the stitched entry", () => {
      let checked: unknown
      expect(author(store(['git status']), { mainSchemaFn: (e) => ((checked = e), null) }).logs).toEqual(written)
      expect(checked).toMatchObject({ goal: 'g', summary: 's' })
    })

    it("treats a schema check that can't run as main unreadable: same output, exit 0", () => {
      const crash = () => {
        throw new Error('child process failed')
      }
      expect(author(store(['git status']), { mainSchemaFn: crash })).toMatchObject({ logs: written, exited: false, scratchWritten: true })
    })

    it("holds, rather than promising a commit, when main's schema rejects the stitched entry", () => {
      const reject = () => ({ errors: "  (root): Unrecognized key(s) in object: 'newField'", unknownKeys: null })
      const { logs, scratchWritten } = author(store(['git status']), { mainSchemaFn: reject })
      const out = logs.join('\n')
      expect(scratchWritten).toBe(true)
      expect(out).toContain("Unrecognized key(s) in object: 'newField'")
      expect(out).toContain('first turn that ends after that merge, so stay subscribed to the schema PR.')
      expect(out).not.toContain('at the end of this turn')
    })

    it('says the log lands without the fields main does not know, rather than holding', () => {
      const strip = () => ({ errors: "  (root): Unrecognized key(s) in object: 'newField'", unknownKeys: ['newField'] })
      const out = author(store(['git status']), { mainSchemaFn: strip }).logs.join('\n')
      expect(out).toContain('does not know newField')
      expect(out).not.toContain('first turn that ends after that merge')
    })
  })
})

describe('mergeAuthored() — merge on re-fire (issue #688)', () => {
  const pass1: AuthoredScratch = {
    session: 'session_01A',
    goal: 'Run /digest for 2026-07-24',
    status: 'completed',
    outcome: 'Digest authored, PR #680 merged green',
    summary: 'First firing did the work.',
    prs: ['680'],
    learnings: ['auto-merge can report a false negative'],
    frictions: [{ description: 'auto-merge false negative', solution: 'poll again', severity: 'minor' }],
  }
  const pass2: AuthoredScratch = {
    session: 'session_01A',
    goal: 'Run /digest for 2026-07-25',
    status: 'completed',
    outcome: 'No-op — nothing to move',
    summary: 'Second firing found nothing to do.',
    prs: ['680', '681'],
    learnings: ['a Routine can fire twice in one session'],
    frictions: [
      { description: '/digest fired as a plain message', solution: 'name the Routine', severity: 'nit' },
      pass1.frictions[0]!, // the same friction reported again — must not double up
    ],
  }
  it('merges a second pass: lists union (deduped), prose takes the later pass', () => {
    const merged = mergeAuthored(pass1, pass2)
    expect(merged.frictions).toEqual([...pass1.frictions, pass2.frictions[0]])
    expect(merged.prs).toEqual(['680', '681'])
    expect(merged.learnings).toEqual([...pass1.learnings!, ...pass2.learnings!])
    expect(merged.goal).toBe(pass2.goal)
    expect(merged.outcome).toBe(pass2.outcome)
    expect(merged.summary).toBe(pass2.summary)
  })

  it('merges reported by path, the later pass winning', () => {
    const h = (why: string) => ({ path: '.claude/rules/adr-0012.md', why })
    const merged = mergeAuthored({ ...pass1, reported: [h('first'), { path: 'GLOSSARY.md' }] }, { ...pass2, reported: [h('second')] })
    expect(merged.reported).toEqual([h('second'), { path: 'GLOSSARY.md' }])
  })

  it('replaces, never merges, a scratch left behind by a different session', () => {
    const other = { ...pass2, session: 'session_01B' }
    expect(mergeAuthored(pass1, other)).toEqual(other)
  })
})

describe('committedFiles() — files the session changed through its own commits (#2386)', () => {
  // `git log --name-only --format=%x1e%B%x1f` output: RS, body, US, then the files.
  const commit = (body: string, files: string[]) => `\x1e${body}\n\x1f\n\n${files.join('\n')}\n`
  const mine = 'Claude-Session: https://claude.ai/code/session_01A'

  it('lists the files of commits whose trailer names this session, and only those', () => {
    const log = [
      commit(`Fix the gate\n\n${mine}\n`, ['scripts/gate/gate.ts', 'docs/x.md']),
      commit('Fix\n\nClaude-Session: https://claude.ai/code/session_01AB\n', ['other.ts']),
      commit('Mentions session_01A in prose only\n', ['prose.ts']),
      commit(`Again\n\n${mine}\n`, ['docs/x.md', 'app/a.vue']),
    ].join('')
    expect(committedFiles(log, 'session_01A')).toEqual(['scripts/gate/gate.ts', 'docs/x.md', 'app/a.vue'])
  })

  it("drops noise paths and the session's own log commits", () => {
    const log = commit(`Log\n\n${mine}\n`, [
      'layers/journal/content/current/sessions/2026-10-21-session_01A.yml',
      'node_modules/x/index.js',
      'app/b.vue',
    ])
    expect(committedFiles(log, 'session_01A')).toEqual(['app/b.vue'])
  })

  it('is empty when git gave nothing (unavailable or no commits)', () => {
    expect(committedFiles('', 'session_01A')).toEqual([])
  })
})

describe('closureRefusal() — a completed log hand-written after a merge (#2424, #2521)', () => {
  const tool = (name: string, input: Record<string, unknown>) => ({
    type: 'assistant',
    message: { content: [{ type: 'tool_use', name, input }] },
  })
  const merge = tool('Bash', { command: 'pnpm tsx scripts/github/merge-pr.ts 12' })
  const mcpMerge = tool('mcp__github__merge_pull_request', { pullNumber: 12 })
  const close = tool('Skill', { skill: 'close-session' })
  const refuse = (status: string, ...records: Record<string, unknown>[]) => closureRefusal(status, extractTrace(records))

  it('refuses when completed, merged and never closed afterwards', () => {
    expect(refuse('completed', merge)).toMatch(/close-session/)
    expect(refuse('completed', mcpMerge)).toMatch(/close-session/)
  })
  it('refuses when the only close came before the last merge', () => {
    expect(refuse('completed', close, merge)).toMatch(/close-session/)
  })
  it('is silent when close-session ran after the merge', () => {
    expect(refuse('completed', merge, close)).toBeUndefined()
  })
  it('is silent when the close Skill call carries its name in `command`', () => {
    expect(refuse('completed', merge, tool('Skill', { command: 'close-session' }))).toBeUndefined()
  })
  it('is silent without a merge', () => {
    expect(refuse('completed', tool('Bash', { command: 'ls' }))).toBeUndefined()
  })
  it('is silent for a non-completed status', () => {
    expect(refuse('blocked', merge)).toBeUndefined()
  })
})

function finding(over: Partial<Finding>): Finding {
  const base: Finding = {
    path: '/r/.claude/worktrees/wt',
    branch: 'b',
    isPrimary: false,
    uncommitted: false,
    unpushed: false,
    mergedToMain: false,
    contentPushed: false,
    excusedBy: null,
  }
  return { ...base, ...over }
}

describe('mergedWorktreesToRemove() — cleanup at close (#2721)', () => {
  it('selects clean linked worktrees whose HEAD is merged, never one with uncommitted work', () => {
    const findings = [
      finding({ path: '/r', isPrimary: true, mergedToMain: true }),
      finding({ path: '/r/wt/current', mergedToMain: true }),
      finding({ path: '/r/wt/clean-merged', mergedToMain: true }),
      finding({ path: '/r/wt/dirty-merged', uncommitted: true, mergedToMain: true, excusedBy: 'merged-to-main' }),
      finding({ path: '/r/wt/unmerged', unpushed: true }),
      finding({ path: '/r/wt/content-pushed', uncommitted: true, contentPushed: true, excusedBy: 'content-pushed' }),
    ]
    expect(mergedWorktreesToRemove(findings, '/r/wt/current', [])).toEqual(['/r/wt/clean-merged'])
  })
  it('keeps a worktree whose HEAD is on the origin/main first-parent line: a build agent may have just added it', () => {
    const findings = [finding({ path: '/r/wt/fresh', mergedToMain: true }), finding({ path: '/r/wt/done', mergedToMain: true })]
    expect(mergedWorktreesToRemove(findings, '/r', ['/r/wt/fresh'])).toEqual(['/r/wt/done'])
  })
})

describe('gitWorktrees.read() — a commitless worktree is not a merged one', () => {
  it('lists a worktree cut from an older main commit, so the sweep keeps it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wt-sweep-'))
    const g = (...a: string[]) => execFileSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { encoding: 'utf8' }).trim()
    try {
      g('init', '-q', '-b', 'main')
      g('commit', '-q', '--allow-empty', '-m', 'one')
      g('commit', '-q', '--allow-empty', '-m', 'two')
      g('update-ref', 'refs/remotes/origin/main', 'HEAD')
      g('worktree', 'add', '-q', '-b', 'build', join(dir, 'wt'), 'HEAD~1')
      const { result, onMainLine } = gitWorktrees.read(dir)
      const wt = result.findings.find((f) => f.branch === 'build')!
      expect(wt.mergedToMain).toBe(true)
      expect(mergedWorktreesToRemove(result.findings, dir, onMainLine)).toEqual([])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('still sweeps a worktree whose own commits were merged by a merge commit', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wt-sweep-'))
    const g = (...a: string[]) => execFileSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { encoding: 'utf8' }).trim()
    try {
      g('init', '-q', '-b', 'main')
      g('commit', '-q', '--allow-empty', '-m', 'one')
      g('worktree', 'add', '-q', '-b', 'done', join(dir, 'wt'), 'HEAD')
      execFileSync('git', ['-C', join(dir, 'wt'), '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'own'])
      g('commit', '-q', '--allow-empty', '-m', 'two')
      g('merge', '-q', '--no-ff', '-m', 'merge', 'done')
      g('update-ref', 'refs/remotes/origin/main', 'HEAD')
      const { result, onMainLine } = gitWorktrees.read(dir)
      expect(mergedWorktreesToRemove(result.findings, dir, onMainLine)).toHaveLength(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
