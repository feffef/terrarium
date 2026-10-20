import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { runSummary } from '../../scripts/run-summary.ts'

const fixture = (name: string) => join(import.meta.dirname, 'fixtures', name)

describe('--triage', () => {
  const out = runSummary(fixture('explore.output'), '--triage')

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
    expect(out).toContain('  relatedTo: #12\n  sideFindings:\n    - docs/b.md links nowhere\n  writes:\n    - labelled ready-for-agent')
  })

  it('ends with missing and grouping, and never prints verdicts', () => {
    expect(out).toMatch(/missing: #14\ngrouping:\n {2}#11, #12 \(shared: README\.md\)\n?$/)
    expect(out).not.toContain('SECRET-11-RULE')
  })
})

describe('--build', () => {
  const out = runSummary(fixture('build.output'), '--build')

  it('reads a result saved as a JSON string and prints one block per branch', () => {
    expect(out.split('\n\n')).toEqual([
      [
        'fix-typo-11 ready-to-push',
        '  worktree: /wt/a',
        '  commits: abc123, def456',
        '  decisions:',
        '    - kept the old anchor',
        '  judgementCalls:',
        '    - Shorter wording (README.md): could drop a clause',
      ].join('\n'),
      'rename-12 needs-owner\n  question: Go or Start? a) Go b) Start; pick b',
      [
        'big-13 failed',
        '  worktree: /wt/c',
        '  commits: fff000',
        '  reason: review capped at 3 rounds',
        '  openFindings:',
        '    - Missing test: no test for empty input',
      ].join('\n'),
    ])
  })
})

describe('--verdicts', () => {
  it('merges a triage run to one entry per path, keeping the most useful verdict and its reasons', () => {
    expect(runSummary(fixture('explore.output'), '--verdicts')).toBe(
      [
        'ruleVerdicts:',
        '  - { path: ".claude/rules/adr-0004.md", reason: "triage #12: made me gate", useful: partly }',
        'docsRead:',
        '  - { path: "docs/agents/issue-tracker.md", reason: "triage #11: told me the labels", useful: yes }',
      ].join('\n'),
    )
  })

  it('merges a build run the same way, joining the reasons of equally useful verdicts', () => {
    expect(runSummary(fixture('build.output'), '--verdicts')).toBe(
      [
        'ruleVerdicts:',
        '  - { path: ".claude/rules/adr-0004.md", reason: "build fix-typo-11: ran the gate; fix fix-typo-11 r1: ran the gate", useful: yes }',
        'docsRead:',
        '  - { path: "docs/agents/pr-workflow.md", reason: "build big-13: steps for the push", useful: partly }',
      ].join('\n'),
    )
  })
})

describe('the command line', () => {
  it('rejects an unknown mode with the usage line, not a stack trace', () => {
    const script = join(import.meta.dirname, '../../scripts/run-summary.ts')
    const run = spawnSync(process.execPath, ['--import', 'tsx', script, fixture('build.output'), '--verdict'], { encoding: 'utf8' })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain('usage: run-summary.ts')
    expect(run.stderr).not.toMatch(/\n\s+at /)
  })
})
