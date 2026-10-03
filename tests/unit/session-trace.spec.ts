// Unit coverage for the session-trace extractor + stitch (ADR-0009 amendment) —
// the pure, deterministic core that turns a transcript into the mechanical half
// of a session log and merges it with the authored scratch. The git plumbing
// lives in log-session.ts (already covered); here we pin the derivation and the
// merge rules, and prove a stitched entry satisfies the frozen schema.
import { describe, expect, it } from 'vitest'
import {
  DERIVED_REASON,
  DERIVED_REASON_COMMAND,
  DERIVED_REASON_EDITED,
  deriveTrigger,
  extractTrace,
  findLatestTranscript,
  loadDocLineIndex,
  foldSubagentTrace,
  normalizeRemoteSessionId,
  parseTranscript,
  readSubagentJsonls,
  resolveGroundTruthSessionId,
  shellReadScanOf,
  stitch,
  subagentTranscriptPaths,
  type AuthoredScratch,
} from '../../scripts/session-trace.ts'
import { validateEntry } from '../../scripts/log-session.ts'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { buildDocLineIndex } from '../../scripts/shell-reads.ts'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// A tiny synthetic transcript: two assistant turns, a Read, an Edit, a Skill, a
// subagent, a noise read (node_modules), spanning two timestamps — plus the two
// harness shapes a slash-command expansion arrives in (string content and a text
// block), and a tool_result carrying a command tag that must NOT count.
const transcript = [
  { type: 'user', sessionId: 'session_01ABC', cwd: '/repo', gitBranch: 'feat/x', entrypoint: 'remote', version: '2.1.0', timestamp: '2026-07-06T10:00:00Z', message: { content: '<command-message>digest is running…</command-message>\n<command-name>/digest</command-name>' } },
  { type: 'user', timestamp: '2026-07-06T10:00:01Z', message: { content: [
    { type: 'text', text: '<command-name>frictions-to-fixes</command-name>\n<command-args></command-args>' },
  ] } },
  { type: 'user', timestamp: '2026-07-06T10:00:02Z', message: { content: [
    { type: 'tool_result', content: 'transcript excerpt: <command-name>/not-invoked</command-name>' },
  ] } },
  { type: 'assistant', timestamp: '2026-07-06T10:00:10.000Z', message: { model: 'claude-opus-4-8', content: [
    { type: 'tool_use', name: 'Read', input: { file_path: '/repo/CONTEXT.md' } },
    { type: 'tool_use', name: 'Read', input: { file_path: '/repo/node_modules/dep/index.js' } },
  ] } },
  { type: 'assistant', timestamp: '2026-07-06T10:05:00Z', message: { model: 'claude-opus-4-8', content: [
    { type: 'tool_use', name: 'Read', input: { file_path: '/repo/app.ts' } },
    { type: 'tool_use', name: 'Edit', input: { file_path: '/repo/app.ts' } },
    { type: 'tool_use', name: 'Skill', input: { skill: 'tdd' } },
    { type: 'tool_use', name: 'Agent', input: { subagent_type: 'Explore', description: 'find X' } },
  ] } },
].map((r) => JSON.stringify(r)).join('\n')

// Isolates tests from a real ambient CLAUDE_CODE_REMOTE_SESSION_ID (issue #387).
const NO_ENV = {}

describe('extractTrace()', () => {
  const trace = extractTrace(parseTranscript(transcript), NO_ENV)

  it('derives identity + timings from the transcript, not self-report', () => {
    expect(trace.session).toBe('session_01ABC')
    expect(trace.gitBranch).toBe('feat/x')
    expect(trace.entrypoint).toBe('remote')
    expect(trace.startedAt).toBe('2026-07-06T10:00:00Z')
    expect(trace.endedAt).toBe('2026-07-06T10:05:00Z')
    expect(trace.durationSec).toBe(300)
  })

  it('counts models + tools and captures subagents', () => {
    expect(trace.models).toEqual({ 'claude-opus-4-8': 2 })
    expect(trace.toolCounts).toEqual({ Read: 3, Edit: 1, Skill: 1, Agent: 1 })
    expect(trace.subagents).toEqual([{ type: 'Explore', task: 'find X', model: undefined }])
  })

  it('filters noise, then relativizes repo paths to how the agent cites them', () => {
    expect(trace.filesRead).toEqual(['CONTEXT.md', 'app.ts']) // node_modules dropped, cwd stripped
    expect(trace.filesEdited).toEqual(['app.ts'])
  })

  it('unions Skill tool calls with slash-command expansions, ignoring tool_results', () => {
    expect(trace.skillsUsed).toEqual(['tdd', 'digest', 'frictions-to-fixes']) // '/not-invoked' excluded
    expect(trace.commandSkills).toEqual(['digest', 'frictions-to-fixes'])
    expect(trace.toolCounts.Skill).toBe(1) // the expansion is not a tool call
  })

  it('omits trigger for a non-remote_trigger session (this fixture is entrypoint: remote)', () => {
    expect(trace.entrypoint).toBe('remote')
    expect(trace.trigger).toBeUndefined()
  })

  it('prefers a real CLAUDE_CODE_REMOTE_SESSION_ID env var over the transcript\'s own sessionId (issue #387)', () => {
    const withCcr = extractTrace(parseTranscript(transcript), { CLAUDE_CODE_REMOTE_SESSION_ID: 'cse_REALSESSION123' })
    expect(withCcr.session).toBe('session_REALSESSION123') // NOT the transcript's 'session_01ABC'
  })
})

// A dispatched subagent's own transcript: same record shape as the parent's,
// flagged `isSidechain`. Its reads are invisible to the parent transcript —
// that gap is what foldSubagentTrace closes (issue #796).
const subagentTranscript = [
  { type: 'user', sessionId: 'session_01ABC', cwd: '/repo', isSidechain: true, timestamp: '2026-07-06T10:01:00Z', message: { content: 'go' } },
  { type: 'assistant', isSidechain: true, timestamp: '2026-07-06T10:02:00Z', message: { model: 'claude-sonnet-5', content: [
    { type: 'tool_use', name: 'Read', input: { file_path: '/repo/docs/agents/pr-workflow.md' } },
    { type: 'tool_use', name: 'Read', input: { file_path: '/repo/app.ts' } }, // also read by the parent
    { type: 'tool_use', name: 'Write', input: { file_path: '/repo/new.ts' } },
    { type: 'tool_use', name: 'Skill', input: { skill: 'code-review' } },
  ] } },
].map((r) => JSON.stringify(r)).join('\n')

describe('foldSubagentTrace() — subagent work counts as the session\'s (issue #796)', () => {
  const parent = extractTrace(parseTranscript(transcript), NO_ENV)
  const folded = foldSubagentTrace(parent, [parseTranscript(subagentTranscript)], NO_ENV)

  it('unions the attention fields, deduping a path both read', () => {
    expect(folded.filesRead).toEqual(['CONTEXT.md', 'app.ts', 'docs/agents/pr-workflow.md'])
    expect(folded.filesEdited).toEqual(['app.ts', 'new.ts'])
    expect(folded.skillsUsed).toEqual(['tdd', 'digest', 'frictions-to-fixes', 'code-review'])
  })

  it('leaves the parent-scoped fields alone, so counts stay comparable', () => {
    expect(folded.models).toEqual(parent.models) // no claude-sonnet-5 from the subagent
    expect(folded.toolCounts).toEqual(parent.toolCounts)
    expect(folded.durationSec).toBe(parent.durationSec)
    expect(folded.subagents).toEqual(parent.subagents)
  })

  it('is identity for a session that dispatched nobody', () => {
    expect(foldSubagentTrace(parent, [], NO_ENV)).toBe(parent)
  })
})

describe('subagentTranscriptPaths()', () => {
  it('finds the harness\'s sibling subagents/ directory, sorted, .jsonl only', () => {
    const dir = mkdtempSync(join(tmpdir(), 'trace-'))
    const parent = join(dir, 'session-uuid.jsonl')
    writeFileSync(parent, '')
    const subs = join(dir, 'session-uuid', 'subagents')
    mkdirSync(subs, { recursive: true })
    writeFileSync(join(subs, 'agent-b.jsonl'), '')
    writeFileSync(join(subs, 'agent-a.jsonl'), '')
    writeFileSync(join(subs, 'agent-a.meta.json'), '{}') // metadata, not a transcript
    expect(subagentTranscriptPaths(parent)).toEqual([join(subs, 'agent-a.jsonl'), join(subs, 'agent-b.jsonl')])
  })

  it('recurses into a subagent that dispatched its own subagent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'trace-'))
    const parent = join(dir, 'session-uuid.jsonl')
    writeFileSync(parent, '')
    const subs = join(dir, 'session-uuid', 'subagents')
    mkdirSync(subs, { recursive: true })
    writeFileSync(join(subs, 'agent-a.jsonl'), '')
    const deeper = join(subs, 'agent-a', 'subagents') // depth 2, same naming rule
    mkdirSync(deeper, { recursive: true })
    writeFileSync(join(deeper, 'agent-a1.jsonl'), '')
    expect(subagentTranscriptPaths(parent)).toEqual([
      join(subs, 'agent-a.jsonl'),
      join(deeper, 'agent-a1.jsonl'),
    ])
  })

  it('returns [] when no subagent ran', () => {
    const dir = mkdtempSync(join(tmpdir(), 'trace-'))
    const parent = join(dir, 'session-uuid.jsonl')
    writeFileSync(parent, '')
    expect(subagentTranscriptPaths(parent)).toEqual([])
  })
})

describe('readSubagentJsonls()', () => {
  it('reads each transcript, and skips one it cannot read rather than throwing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'trace-'))
    const parent = join(dir, 'session-uuid.jsonl')
    writeFileSync(parent, '')
    const subs = join(dir, 'session-uuid', 'subagents')
    mkdirSync(subs, { recursive: true })
    writeFileSync(join(subs, 'agent-a.jsonl'), 'A')
    // A directory named like a transcript: readdir lists it, readFileSync throws
    // on it — the hook must lose that one contribution, not the whole trace.
    mkdirSync(join(subs, 'agent-b.jsonl'))
    expect(readSubagentJsonls(parent)).toEqual([{ label: 'a', jsonl: 'A' }])
  })

  it('returns [] for a session that dispatched nobody', () => {
    const dir = mkdtempSync(join(tmpdir(), 'trace-'))
    const parent = join(dir, 'session-uuid.jsonl')
    writeFileSync(parent, '')
    expect(readSubagentJsonls(parent)).toEqual([])
  })
})

describe('deriveTrigger() — issue #449 Gap 1', () => {
  const records = (userContent: unknown) =>
    parseTranscript(
      [
        JSON.stringify({
          type: 'user',
          timestamp: '2026-07-13T04:08:40Z',
          entrypoint: 'remote_trigger',
          message: { content: userContent },
        }),
      ].join('\n'),
    )

  it('derives the slash-command name from a Routine-fired first turn', () => {
    const trace = extractTrace(
      records('<command-message>audit-docs is running…</command-message>\n<command-name>/audit-docs</command-name>'),
      NO_ENV,
    )
    expect(trace.trigger).toBe('audit-docs')
  })

  it('falls back to the first line of a freeform Routine prompt with no slash command', () => {
    const trace = extractTrace(
      records('Check whether the deploy PR is still green and merge it if so.\nMore detail below.'),
      NO_ENV,
    )
    expect(trace.trigger).toBe('Check whether the deploy PR is still green and merge it if so.')
  })

  it('is absent for a non-remote_trigger session even with a slash command in the first turn', () => {
    const jsonl = [
      JSON.stringify({
        type: 'user',
        timestamp: '2026-07-13T04:08:40Z',
        entrypoint: 'remote',
        message: { content: '<command-name>/digest</command-name>' },
      }),
    ].join('\n')
    expect(deriveTrigger(parseTranscript(jsonl), 'remote')).toBeUndefined()
  })

  it('is absent when the first user turn has no text at all', () => {
    const trace = extractTrace(records([{ type: 'tool_result', content: 'no text blocks here' }]), NO_ENV)
    expect(trace.trigger).toBeUndefined()
  })
})

describe('normalizeRemoteSessionId() / resolveGroundTruthSessionId() — issue #387', () => {
  it('maps a CLAUDE_CODE_REMOTE_SESSION_ID cse_ id onto the session_ form', () => {
    expect(normalizeRemoteSessionId('cse_019W471jzQDwoZmKzJKtE4vk')).toBe('session_019W471jzQDwoZmKzJKtE4vk')
  })

  it('returns undefined for an absent or differently-shaped value', () => {
    expect(normalizeRemoteSessionId(undefined)).toBeUndefined()
    expect(normalizeRemoteSessionId('not-a-cse-id')).toBeUndefined()
  })

  it('prefers the normalized env id over the transcript session id when both are present', () => {
    expect(
      resolveGroundTruthSessionId('b84dc292-4954-52dc-b693-5681f040259e', {
        CLAUDE_CODE_REMOTE_SESSION_ID: 'cse_019W471jzQDwoZmKzJKtE4vk',
      }),
    ).toBe('session_019W471jzQDwoZmKzJKtE4vk')
  })

  it('falls back to the transcript session id for a plain local CLI session (no CCR env var)', () => {
    expect(resolveGroundTruthSessionId('b84dc292-4954-52dc-b693-5681f040259e', {})).toBe(
      'b84dc292-4954-52dc-b693-5681f040259e',
    )
  })

  it('returns undefined when neither source is available', () => {
    expect(resolveGroundTruthSessionId(undefined, {})).toBeUndefined()
  })
})

describe('stitch()', () => {
  const trace = extractTrace(parseTranscript(transcript), NO_ENV)
  const scratch: AuthoredScratch = {
    session: 'session_01ABC',
    goal: 'Prove the stitch',
    status: 'completed',
    outcome: 'It merges',
    summary: 'Authored summary.',
    docsRead: [{ path: 'CONTEXT.md', reason: 'the domain model' }],
    skillsUsed: [],
    frictions: [],
  }
  const entry = stitch(scratch, trace)

  it('takes interpretive fields from the scratch and mechanical from the trace', () => {
    expect(entry.summary).toBe('Authored summary.')
    expect(entry.startedAt).toBe('2026-07-06T10:00:00Z') // derived, not authored
    expect(entry.durationSec).toBe(300)
    expect(entry.models).toEqual({ 'claude-opus-4-8': 2 })
    expect(entry.gitBranch).toBe('feat/x')
  })

  it('takes session from the resolved ground truth, not the hand-typed authored value (issue #387/#449 postmortem)', () => {
    const wronglyAuthored: AuthoredScratch = { ...scratch, session: 'session_TOTALLY_WRONG' }
    const mismatched = stitch(wronglyAuthored, trace)
    expect(mismatched.session).toBe('session_01ABC') // trace's resolved ground truth, not the authored typo
  })

  it('falls back to the authored session only when the trace has none at all', () => {
    const noSessionTrace = { ...trace, session: undefined }
    const fallback = stitch(scratch, noSessionTrace)
    expect(fallback.session).toBe('session_01ABC') // scratch.session, the last resort
  })

  it('keeps the agent-curated reason and does not duplicate an already-cited read', () => {
    const docs = entry.docsRead as { path: string; reason: string }[]
    const ctx = docs.filter((d) => d.path === 'CONTEXT.md')
    expect(ctx).toHaveLength(1)
    expect(ctx[0]?.reason).toBe('the domain model') // authored reason preserved, not clobbered
  })

  it('folds an uncited-but-also-edited read in with the edited-specific reason', () => {
    const docs = entry.docsRead as { path: string; reason: string }[]
    const appTs = docs.filter((d) => d.path === 'app.ts')
    expect(appTs).toEqual([{ path: 'app.ts', reason: DERIVED_REASON_EDITED }])
  })

  it('folds an observed-but-uncited skill in, with provenance for command-invoked ones', () => {
    const skills = entry.skillsUsed as { name: string; reason: string }[]
    expect(skills).toEqual([
      { name: 'tdd', reason: DERIVED_REASON },
      { name: 'digest', reason: DERIVED_REASON_COMMAND },
      { name: 'frictions-to-fixes', reason: DERIVED_REASON_COMMAND },
    ])
  })

  it('drops empty mechanical collections but a stitched entry stays schema-valid', () => {
    const res = validateEntry(entry)
    expect(res.ok).toBe(true)
  })

  it('omits trigger when the trace has none, carries it through and stays schema-valid when it does', () => {
    expect('trigger' in entry).toBe(false)
    const withTrigger = stitch(scratch, { ...trace, trigger: 'audit-docs' })
    expect(withTrigger.trigger).toBe('audit-docs')
    expect(validateEntry(withTrigger).ok).toBe(true)
  })

  it('omits learnings/ideas entirely when the scratch has none', () => {
    expect('learnings' in entry).toBe(false)
    expect('ideas' in entry).toBe(false)
  })

  it('carries authored learnings/ideas through and stays schema-valid', () => {
    const withNotes = stitch(
      { ...scratch, learnings: ['layer `~/` resolves to the main app'], ideas: ['cluster frictions into tags'] },
      trace,
    )
    expect(withNotes.learnings).toEqual(['layer `~/` resolves to the main app'])
    expect(withNotes.ideas).toEqual(['cluster frictions into tags'])
    expect(validateEntry(withNotes).ok).toBe(true)
  })
})

describe('docsReadViaShell (issues #1074, #1545)', () => {
  // Derived from what each Bash command's OUTPUT shows, never from the command
  // text: an injected doc-line index is the whole universe of what can be
  // credited (docs/research/shell-reads-by-output-matching.md).
  const GUARDS = ['# Guards', '', 'The mechanical PreToolUse guards that hold rules prose stopped holding.'].join('\n')
  const DOMAIN = ['# Domain', '', 'Multi-context vocabulary conventions for the Platform and its Tenants.'].join('\n')
  const CONTEXT = ['# Platform context', '', 'The terms every agent needs regardless of task, and the Tenants roster.'].join('\n')
  const index = buildDocLineIndex([
    { path: 'docs/agents/guards.md', text: GUARDS },
    { path: 'docs/agents/domain.md', text: DOMAIN },
    { path: 'CONTEXT.md', text: CONTEXT },
  ])
  let n = 0
  const bash = (command: string, output = ''): Record<string, unknown>[] => {
    const id = `toolu_${++n}`
    return [
      { type: 'assistant', timestamp: '2026-08-29T10:00:00.000Z', message: { model: 'claude-opus-5', content: [{ type: 'tool_use', id, name: 'Bash', input: { command } }] } },
      { type: 'user', timestamp: '2026-08-29T10:00:01.000Z', message: { content: [{ type: 'tool_result', tool_use_id: id, content: output }] } },
    ]
  }
  const withCwd = (...turns: Record<string, unknown>[][]): Record<string, unknown>[] => [
    { type: 'user', sessionId: 'session_01SH', cwd: '/repo', timestamp: '2026-08-29T09:59:00Z', message: { content: 'go' } },
    ...turns.flat(),
  ]
  const sub = (...turns: Record<string, unknown>[][]) => ({ label: 'Triage #1', records: withCwd(...turns) })

  it('credits a doc from the lines its output shows, whatever the command looked like', () => {
    const trace = extractTrace(withCwd(bash('cd /repo/docs/agents && for f in *.md; do cat "$f"; done', GUARDS)), process.env, index)
    expect(trace.docsReadViaShell).toEqual(['docs/agents/guards.md'])
    expect(trace.filesRead).toEqual([])
  })

  it('credits nothing without an index: the pure callers (guards, provenance) never see the field populated', () => {
    expect(extractTrace(withCwd(bash('cat docs/agents/guards.md', GUARDS))).docsReadViaShell).toEqual([])
  })

  it('credits nothing from a command whose output shows no line of the doc it named', () => {
    const trace = extractTrace(withCwd(bash('cat docs/agents/guards.md 2>/dev/null | head', '(Bash completed with no output)')), process.env, index)
    expect(trace.docsReadViaShell).toEqual([])
  })

  it('does NOT dedup against a Read of the same doc: both mechanisms are true', () => {
    const records = withCwd(bash('cat docs/agents/guards.md', GUARDS))
    records.push({
      type: 'assistant',
      timestamp: '2026-08-29T10:01:00.000Z',
      message: { model: 'claude-opus-5', content: [{ type: 'tool_use', name: 'Read', input: { file_path: '/repo/docs/agents/guards.md' } }] },
    })
    const trace = extractTrace(records, process.env, index)
    expect(trace.filesRead).toEqual(['docs/agents/guards.md'])
    expect(trace.docsReadViaShell).toEqual(['docs/agents/guards.md'])
  })

  it("folds a subagent's shell reads in, as #796 did for filesRead", () => {
    const parent = extractTrace(withCwd(bash('cat CONTEXT.md', CONTEXT)), process.env, index)
    const folded = foldSubagentTrace(parent, [withCwd(bash('cat docs/agents/domain.md', DOMAIN))], process.env, index)
    expect(folded.docsReadViaShell.sort()).toEqual(['CONTEXT.md', 'docs/agents/domain.md'])
  })

  it('stitches in only when non-empty, and only from the trace', () => {
    const authored: AuthoredScratch = { session: 'session_01SH', goal: 'g', status: 'completed', outcome: 'o', summary: 's', frictions: [] }
    const withReads = stitch(authored, extractTrace(withCwd(bash('cat CONTEXT.md', CONTEXT)), process.env, index))
    expect(withReads.docsReadViaShell).toEqual(['CONTEXT.md'])
    expect(validateEntry(withReads).ok).toBe(true)
    const without = stitch(authored, extractTrace(withCwd(bash('ls docs/', 'agents\nadr')), process.env, index))
    expect('docsReadViaShell' in without).toBe(false)
  })

  describe('the author-time advisory (shellReadScanOf)', () => {
    it('credits each path to the command and transcript whose output showed it, the session before a subagent', () => {
      const scan = shellReadScanOf(withCwd(bash('head CONTEXT.md', CONTEXT)), [sub(bash('cat CONTEXT.md', CONTEXT), bash('cat docs/agents/domain.md', DOMAIN))], { docIndex: index })
      expect([...scan.provenance]).toEqual([
        ['CONTEXT.md', { command: 'head CONTEXT.md', source: 'this session' }],
        ['docs/agents/domain.md', { command: 'cat docs/agents/domain.md', source: 'subagent: Triage #1' }],
      ])
      expect(scan.paths).toEqual(['CONTEXT.md', 'docs/agents/domain.md'])
    })

    it('explains, from the command text, why a doc a command named was not credited', () => {
      const scan = shellReadScanOf(withCwd(
        bash('cat foo.txt > docs/agents/new.md'),
        bash('ls docs/agents/guards.md', 'docs/agents/guards.md'),
        bash('sed -n 1,5p docs/agents/domain.md 2>/dev/null | head', '(Bash completed with no output)'),
      ), [], { docIndex: index })
      expect(scan.paths).toEqual([])
      expect(scan.nearMisses.map((m) => [m.path, m.rule])).toEqual([
        ['docs/agents/domain.md', 'named by the command, but its output shows no line of this doc'],
        ['docs/agents/new.md', 'redirect target: written, not read'],
        ['docs/agents/guards.md', 'not a reader command'],
      ])
    })

    it('does not explain a glob or loop away when the output credited the command: those are never why a doc is missing', () => {
      const scan = shellReadScanOf(withCwd(bash('for f in docs/agents/*.md; do cat "$f"; done', GUARDS)), [], { docIndex: index })
      expect(scan.paths).toEqual(['docs/agents/guards.md'])
      expect(scan.nearMisses).toEqual([])
    })

    it('never calls a credited path a near-miss, under any spelling and from any record set', () => {
      const scan = shellReadScanOf(withCwd(bash('cat docs/agents/guards.md', GUARDS)), [sub(bash('echo ./docs/agents/guards.md', './docs/agents/guards.md'))], { docIndex: index })
      expect(scan.paths).toEqual(['docs/agents/guards.md'])
      expect(scan.nearMisses).toEqual([])
    })

    it('names the cd-resolved path in a near-miss, so the agent recognizes which file went unshown (#1454)', () => {
      const scan = shellReadScanOf(withCwd(bash('cd /repo/layers/tinkerfund; cat CONTEXT.md', '(Bash completed with no output)')), [], { docIndex: index })
      expect(scan.paths).toEqual([])
      expect(scan.nearMisses.map((m) => m.path)).toEqual(['layers/tinkerfund/CONTEXT.md'])
    })
  })

  describe('the filesystem index (loadDocLineIndex)', () => {
    it('indexes this repo\'s instruction docs and never a sink', () => {
      const repoRoot = join(import.meta.dirname, '../..')
      const idx = loadDocLineIndex(repoRoot)
      const docs = new Set(idx.byLine.values())
      expect(docs.has('CONTEXT.md')).toBe(true)
      expect(docs.has('docs/agents/guards.md')).toBe(true)
      expect(docs.has('.agents/skills/log-session/SKILL.md')).toBe(true)
      expect([...docs].some((d) => d.startsWith('.claude/') || d.endsWith('CLAUDE.md') || d === 'README.md')).toBe(false)
      const real = extractTrace(withCwd(bash('cat CONTEXT.md', readFileSync(join(repoRoot, 'CONTEXT.md'), 'utf8'))), process.env, idx)
      expect(real.docsReadViaShell).toEqual(['CONTEXT.md'])
    })

    it('treats every other file in the checkout as a sink, so a code line a doc quotes never credits the doc', () => {
      // `export default defineNuxtConfig({` is quoted in docs/agents/tenant-layers.md;
      // a Skill Inventory entry's `name:` line matches its SKILL.md frontmatter.
      const repoRoot = join(import.meta.dirname, '../..')
      const idx = loadDocLineIndex(repoRoot)
      for (const file of ['nuxt.config.ts', 'layers/journal/content/current/skills/resolving-merge-conflicts.yml']) {
        const trace = extractTrace(withCwd(bash(`cat ${file}`, readFileSync(join(repoRoot, file), 'utf8'))), process.env, idx)
        expect(trace.docsReadViaShell, file).toEqual([])
      }
    })
  })
})

describe('findLatestTranscript', () => {
  const plant = (cwd: string, names: string[]): string => {
    const home = mkdtempSync(join(tmpdir(), 'trace-home-'))
    const dir = join(home, '.claude', 'projects', cwd.replace(/[/.]/g, '-'))
    mkdirSync(dir, { recursive: true })
    for (const n of names) writeFileSync(join(dir, n), '{}')
    return home
  }

  it('encodes the cwd the way the harness store does', () => {
    const home = plant('/home/user/terrarium', ['a.jsonl'])
    expect(findLatestTranscript('/home/user/terrarium', home)).toBe(
      join(home, '.claude', 'projects', '-home-user-terrarium', 'a.jsonl'),
    )
  })

  it('returns undefined rather than throwing when there is nothing to find', () => {
    expect(findLatestTranscript('/repo', undefined)).toBeUndefined()
    expect(findLatestTranscript('/nope', plant('/repo', ['a.jsonl']))).toBeUndefined()
    expect(findLatestTranscript('/repo', plant('/repo', []))).toBeUndefined()
  })

  it('ignores the subagents subdirectory, which is not a session transcript', () => {
    const home = plant('/repo', ['a.jsonl'])
    mkdirSync(join(home, '.claude', 'projects', '-repo', 'a', 'subagents'), { recursive: true })
    expect(findLatestTranscript('/repo', home)).toContain('a.jsonl')
  })
})
