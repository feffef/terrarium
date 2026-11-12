import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { agentIds, buildSummary, findingsSummary, triageSummary } from '../../scripts/run-summary.ts'

const fixture = (name: string) => join(import.meta.dirname, 'fixtures', name)

describe('--triage', () => {
  const out = triageSummary(fixture('explore.output'))

  it('prints one block per result with the fields the orchestrator acts on', () => {
    expect(out).toContain(
      [
        '#12 grill publicAuthor=true',
        '  summary: Rename the button',
        '  brief: Rename it.',
        '  question: Which name?',
        '    a) Go',
        '    b) Start',
        '    pick: b (clearer)',
        '  files: README.md',
      ].join('\n'),
    )
    expect(out).toContain('#13 blocked publicAuthor=false\n  summary: Wait for Nuxt 5\n  blocker: Nuxt 5 is unreleased (npm view nuxt version)')
    expect(out).toContain('#15 close-duplicate publicAuthor=false\n  summary: Same as #11\n  canonical: #11')
    expect(out).toContain('  relatedTo: #12\n  staleClaims:\n    - README has the typo twice: only once now (source: README.md:4)\n  sideFindings:\n    - docs/b.md links nowhere (source: docs/b.md:3)\n  writes:\n    - labelled ready-for-agent')
  })

  it('ends with missing and grouping, and never prints verdicts', () => {
    expect(out).toMatch(/missing: #14\ngrouping:\n {2}#11, #12 \(shared: README\.md\)\n?$/)
    expect(out).not.toContain('SECRET-11-RULE')
  })
})

describe('--triage evidence fields', () => {
  const out = triageSummary(fixture('explore-evidence.output'))

  it('prints the background, what would flip the pick, each option check and the source count', () => {
    expect(out).toContain(
      [
        '  background: The button was named in #5, renamed in #9.',
        '  question: Which name?',
        '    a) Go',
        '    b) Start',
        '    pick: b) Start (clearer)',
        '    wouldChange: an owner preference for the short name',
        '  optionChecks:',
        '    - no: a) Go',
        '    - unverified: b) Start (settle by: a usage count, not logged)',
        '  sourcesRead: 2',
      ].join('\n'),
    )
  })
})

describe('--triage follow-ups', () => {
  it('prints the key question first, then each follow-up with its pick', () => {
    expect(triageSummary(fixture('explore-followups.output'))).toContain(
      ['  question: Show it at all?', '    a) Yes', '    b) No', '    pick: a) Yes (asked for)', '  followUp: Which pages?', '    a) Home only', '    b) All', '    pick: a) Home only (least noise)'].join('\n'),
    )
  })
})

describe('logs', () => {
  it('ends with the workflow logs when there are any, and prints no logs section when there are none', () => {
    expect(triageSummary(fixture('explore-evidence.output'))).toMatch(
      /\n\nlogs:\n {2}- \[triage #21\] \[harness: subagent output matched instruction-shaped pattern\(s\): settings-json\]$/,
    )
    expect(triageSummary(fixture('explore.output'))).not.toContain('logs:')
    expect(buildSummary(buildOutput(tmp()))).not.toContain('logs:')
  })
})

const tmp = () => mkdtempSync(join(tmpdir(), 'run-summary-'))

/** The build fixture, its branch folders moved under `dir`, saved as a new `.output`. */
function buildOutput(dir: string): string {
  const path = join(tmp(), 'build.output')
  writeFileSync(path, readFileSync(fixture('build.output'), 'utf8').replaceAll('/DIR', dir))
  return path
}

/** A fake home whose workflow run journal, in each given session, starts the given labelled agents. */
function home(runId: string, agents: Record<string, string>, sessions = ['session-1']): string {
  const h = tmp()
  const lines = [{ type: 'launched' }, ...Object.entries(agents).map(([label, agentId]) => ({ type: 'started', agentId, label, phase: 'Review' })), { type: 'result', agentId: 'x' }]
  for (const session of sessions) {
    const dir = join(h, '.claude/projects/-repo', session, 'subagents/workflows', runId)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'journal.jsonl'), lines.map((l) => JSON.stringify(l)).join('\n') + '\n')
  }
  return h
}

describe('--build', () => {
  const dir = tmp()
  const out = buildSummary(buildOutput(dir))

  it('reads a result saved as a JSON string and prints one block per branch, each finding numbered with its kind, even the stage-threw fallback', () => {
    expect(out.split('\n\n')).toEqual([
      [
        'fix/typo-11 reviewed r1',
        `  dir: ${join(dir, 'fix-typo-11')}`,
        '  worktree: /wt/a',
        '  commits: abc123, def456',
        `  Standards: ${join(dir, 'fix-typo-11/Standards-r1.json')}`,
        '    1 nit: Shorter wording (README.md)',
        `  Spec: ${join(dir, 'fix-typo-11/Spec-r1.json')}`,
        '    1 defect: Wrong anchor (README.md)',
        '    2 owner-call: Keep the old name?',
      ].join('\n'),
      `rename-12 needs-owner\n  dir: ${join(dir, 'rename-12')}\n  question: Go or Start? a) Go b) Start; pick b`,
      `big-13 failed\n  dir: ${join(dir, 'big-13')}\n  worktree: /wt/c\n  reason: round 2: a reviewer returned nothing`,
      'crash-14 failed\n  reason: stage threw',
    ])
  })

  it('files each review whole, details included, in its branch folder for the builder to read', () => {
    const spec = JSON.parse(readFileSync(join(dir, 'fix-typo-11/Spec-r1.json'), 'utf8'))
    expect(spec.findings[0]).toEqual({ kind: 'defect', title: 'Wrong anchor', detail: 'links #old', file: 'README.md' })
  })

  it('names the build and review agent ids from the run journal, by label', () => {
    const h = home('wf_1', { 'build fix/typo-11': 'a1', 'Standards fix/typo-11 r1': 'a2', 'Spec fix/typo-11 r1': 'a3', 'build rename-12': 'a4' })
    const block = buildSummary(buildOutput(tmp()), 'wf_1', h).split('\n\n')
    expect(block[0]).toContain('\n  agents: build a1, Standards a2, Spec a3\n')
    expect(block[1]).toContain('\n  agents: build a4\n')
  })
})

describe('agentIds', () => {
  it('maps every started label to its id', () => {
    expect(agentIds('wf_2', home('wf_2', { 'build b': 'a1', 'Spec b r2': 'a2' }))).toEqual(new Map([['build b', 'a1'], ['Spec b r2', 'a2']]))
  })

  it('skips stray files beside the project and session folders', () => {
    const h = home('wf_3', { 'build b': 'a1' })
    writeFileSync(join(h, '.claude/projects/stray.txt'), '')
    writeFileSync(join(h, '.claude/projects/-repo/session-1.jsonl'), '')
    expect(agentIds('wf_3', h)).toEqual(new Map([['build b', 'a1']]))
  })
})

describe('--findings', () => {
  const file = join(tmp(), 'Spec-r1-c1.json')
  writeFileSync(file, JSON.stringify({ findings: [{ kind: 'defect', title: 'Still wrong', detail: 'line 3', file: 'a.ts' }, { kind: 'owner-call', title: 'Rename?', detail: 'a) yes b) no; pick a' }], summary: 's' }))

  it('prints a re-check\'s findings numbered with their kind', () => {
    expect(findingsSummary(file)).toBe('1 defect: Still wrong (a.ts)\n2 owner-call: Rename?')
  })

  it('says so when a re-check found nothing', () => {
    const empty = join(tmp(), 'Spec-r1-c2.json')
    writeFileSync(empty, JSON.stringify({ findings: [], summary: 'resolved' }))
    expect(findingsSummary(empty)).toBe('no findings')
  })
})

describe('the command line', () => {
  const script = join(import.meta.dirname, '../../scripts/run-summary.ts')
  const cli = (args: string[], env: NodeJS.ProcessEnv = process.env) => spawnSync(process.execPath, ['--import', 'tsx', script, ...args], { encoding: 'utf8', env })

  it.each([
    ['several outputs', [fixture('explore.output'), fixture('build.output'), '--triage']],
    ['--run outside --build', [fixture('explore.output'), '--triage', '--run', 'wf_1']],
    ['--run outside --build with --findings', [fixture('build.output'), '--findings', '--run', 'wf_1']],
    ['an unknown mode', [fixture('build.output'), '--verdict']],
  ])('rejects %s with the usage line, not a stack trace', (_name, args) => {
    const run = cli(args)
    expect(run.status).toBe(1)
    expect(run.stderr).toContain('usage: run-summary.ts')
    expect(run.stderr).not.toMatch(/\n\s+at /)
  })

  it.each([
    ['no journal', 'wf_none', [] as string[], 'found 0 journals for run wf_none'],
    ['two journals', 'wf_two', ['s1', 's2'], 'found 2 journals for run wf_two'],
  ])('fails with the count, not a stack trace, when the run has %s', (_name, runId, sessions, message) => {
    const h = sessions.length ? home(runId, {}, sessions) : tmp()
    const run = cli([buildOutput(tmp()), '--build', '--run', runId], { ...process.env, HOME: h })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain(message)
    expect(run.stderr).not.toMatch(/\n\s+at /)
  })
})
