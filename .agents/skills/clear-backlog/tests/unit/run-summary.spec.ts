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
    expect(out).toContain('  relatedTo: #12\n  staleClaims:\n    - README has the typo twice: only once now (source: README.md:4)\n  sideFindings:\n    - docs/b.md links nowhere (source: docs/b.md:3)\n  writes:\n    - labelled ready-for-agent')
  })

  it('ends with missing and grouping, and never prints verdicts', () => {
    expect(out).toMatch(/missing: #14\ngrouping:\n {2}#11, #12 \(shared: README\.md\)\n?$/)
    expect(out).not.toContain('SECRET-11-RULE')
  })
})

describe('--triage evidence fields', () => {
  const out = runSummary(fixture('explore-evidence.output'), '--triage')

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

describe('logs', () => {
  it('ends with the workflow logs when there are any, and prints no logs section when there are none', () => {
    expect(runSummary(fixture('explore-evidence.output'), '--triage')).toMatch(
      /\n\nlogs:\n {2}- \[triage #21\] \[harness: subagent output matched instruction-shaped pattern\(s\): settings-json\]$/,
    )
    expect(runSummary(fixture('explore.output'), '--triage')).not.toContain('logs:')
    expect(runSummary(fixture('build.output'), '--build')).not.toContain('logs:')
  })
})

describe('--build', () => {
  const out = runSummary(fixture('build.output'), '--build')

  it('reads a result saved as a JSON string and prints one block per branch, even the workflow\'s stage-threw fallback', () => {
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
      'crash-14 failed\n  reason: stage threw',
    ])
  })
})

describe('the command line', () => {
  const script = join(import.meta.dirname, '../../scripts/run-summary.ts')
  const cli = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', script, ...args], { encoding: 'utf8' })

  it.each(['--triage', '--build'])('rejects several outputs for %s with the usage line', (mode) => {
    const run = cli(fixture('explore.output'), fixture('build.output'), mode)
    expect(run.status).toBe(1)
    expect(run.stderr).toContain('usage: run-summary.ts')
  })

  it('rejects an unknown mode with the usage line, not a stack trace', () => {
    const run = cli(fixture('build.output'), '--verdict')
    expect(run.status).toBe(1)
    expect(run.stderr).toContain('usage: run-summary.ts')
    expect(run.stderr).not.toMatch(/\n\s+at /)
  })
})
