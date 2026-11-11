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
    expect(buildSummary(fixture('build.output'), tmp())).not.toContain('logs:')
  })
})

const tmp = () => mkdtempSync(join(tmpdir(), 'run-summary-'))

/** A fake home whose one workflow run journal starts the given labelled agents. */
function home(runId: string, agents: Record<string, string>): string {
  const h = tmp()
  const dir = join(h, '.claude/projects/-repo/session-1/subagents/workflows', runId)
  mkdirSync(dir, { recursive: true })
  const lines = [{ type: 'launched' }, ...Object.entries(agents).map(([label, agentId]) => ({ type: 'started', agentId, label, phase: 'Review' })), { type: 'result', agentId: 'x' }]
  writeFileSync(join(dir, 'journal.jsonl'), lines.map((l) => JSON.stringify(l)).join('\n') + '\n')
  return h
}

describe('--build', () => {
  const dir = tmp()
  const out = buildSummary(fixture('build.output'), dir)

  it('reads a result saved as a JSON string and prints one block per branch, each finding numbered with its kind, even the stage-threw fallback', () => {
    expect(out.split('\n\n')).toEqual([
      [
        'fix/typo-11 reviewed r1',
        '  worktree: /wt/a',
        '  commits: abc123, def456',
        '  decisions:',
        '    - kept the old anchor',
        `  Standards: ${join(dir, 'fix-typo-11/Standards-r1.json')}`,
        '    1 nit: Shorter wording (README.md)',
        `  Spec: ${join(dir, 'fix-typo-11/Spec-r1.json')}`,
        '    1 defect: Wrong anchor (README.md)',
        '    2 missing-test: No test',
      ].join('\n'),
      'rename-12 needs-owner\n  question: Go or Start? a) Go b) Start; pick b',
      'big-13 failed\n  worktree: /wt/c\n  commits: fff000\n  reason: round 2: a reviewer returned nothing',
      'crash-14 failed\n  reason: stage threw',
    ])
  })

  it('files each review whole, details included, for the builder to read', () => {
    const spec = JSON.parse(readFileSync(join(dir, 'fix-typo-11/Spec-r1.json'), 'utf8'))
    expect(spec.findings[0]).toEqual({ kind: 'defect', title: 'Wrong anchor', detail: 'links #old', file: 'README.md' })
    expect(findingsSummary(join(dir, 'fix-typo-11/Spec-r1.json'))).toBe('1 defect: Wrong anchor (README.md)\n2 missing-test: No test')
  })

  it('names the build and review agent ids from the run journal, by label', () => {
    const h = home('wf_1', { 'build fix/typo-11': 'a1', 'Standards fix/typo-11 r1': 'a2', 'Spec fix/typo-11 r1': 'a3', 'build rename-12': 'a4' })
    const block = buildSummary(fixture('build.output'), tmp(), 'wf_1', h).split('\n\n')
    expect(block[0]).toContain('\n  agents: build a1, Standards a2, Spec a3\n')
    expect(block[1]).toContain('\n  agents: build a4\n')
  })
})

describe('agentIds', () => {
  it('maps every started label to its id', () => {
    expect(agentIds('wf_2', home('wf_2', { 'build b': 'a1', 'Spec b r2': 'a2' }))).toEqual(new Map([['build b', 'a1'], ['Spec b r2', 'a2']]))
  })
})

describe('--findings', () => {
  it('says so when a re-check found nothing', () => {
    const file = join(tmp(), 'Spec-r1-c1.json')
    writeFileSync(file, JSON.stringify({ findings: [], summary: 'resolved' }))
    expect(findingsSummary(file)).toBe('no findings')
  })
})

describe('the command line', () => {
  const script = join(import.meta.dirname, '../../scripts/run-summary.ts')
  const cli = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', script, ...args], { encoding: 'utf8' })

  it.each([
    ['several outputs', [fixture('explore.output'), fixture('build.output'), '--triage']],
    ['--build without --dir', [fixture('build.output'), '--build']],
    ['--dir outside --build', [fixture('explore.output'), '--triage', '--dir', '/tmp/x']],
  ])('rejects %s with the usage line', (_name, args) => {
    const run = cli(...args)
    expect(run.status).toBe(1)
    expect(run.stderr).toContain('usage: run-summary.ts')
  })

  it('fails with the count, not a stack trace, when the run has no journal', () => {
    const run = spawnSync(process.execPath, ['--import', 'tsx', script, fixture('build.output'), '--build', '--dir', tmp(), '--run', 'wf_none'], {
      encoding: 'utf8',
      env: { ...process.env, HOME: tmp() },
    })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain('found 0 journals for run wf_none')
    expect(run.stderr).not.toMatch(/\n\s+at /)
  })

  it('rejects an unknown mode with the usage line, not a stack trace', () => {
    const run = cli(fixture('build.output'), '--verdict')
    expect(run.status).toBe(1)
    expect(run.stderr).toContain('usage: run-summary.ts')
    expect(run.stderr).not.toMatch(/\n\s+at /)
  })
})
