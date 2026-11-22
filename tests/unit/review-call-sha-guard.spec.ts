// Coverage for the review-call sha guard (issue #3580; contract in
// `scripts/hooks/review-call-sha-guard.ts`).
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GUARD_MESSAGE, lacksReviewSha } from '../../scripts/hooks/review-call-sha-guard.ts'
import { runTsx } from '../support/run-script.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = join(root, 'scripts', 'hooks', 'review-call-sha-guard.ts')
const SHA = '0123456789abcdef0123456789abcdef01234567'

describe('lacksReviewSha()', () => {
  it('DENIES a code-review call with bare origin/main args', () => {
    expect(lacksReviewSha({ skill: 'code-review', args: 'origin/main' })).toBe(true)
    expect(lacksReviewSha({ skill: 'code-review' })).toBe(true)
  })

  it('DENIES a plugin-prefixed code-review call with bare args, as merge-pr counts it', () => {
    expect(lacksReviewSha({ skill: 'x:code-review', args: 'origin/main' })).toBe(true)
  })

  it('ALLOWS the --review-call form, which names the head sha', () => {
    expect(lacksReviewSha({ skill: 'code-review', args: `origin/main (reviewing head ${SHA})` })).toBe(false)
  })

  it('ALLOWS other Skills and calls naming no skill', () => {
    expect(lacksReviewSha({ skill: 'tdd', args: 'origin/main' })).toBe(false)
    expect(lacksReviewSha({})).toBe(false)
    expect(lacksReviewSha(null)).toBe(false)
  })
})

describe('the deny message', () => {
  it('names the verdict-line command and says to paste its args whole', () => {
    expect(GUARD_MESSAGE).toContain('pnpm exec tsx scripts/github/verdict-line.ts --review-call')
    expect(GUARD_MESSAGE).toMatch(/paste the printed args whole/)
  })
})

describe('the CLI as the PreToolUse hook', () => {
  const run = (args: string): string =>
    runTsx(SCRIPT, {
      input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Skill', tool_input: { skill: 'code-review', args } }),
    }).trim()

  it('END TO END: denies bare args, stays silent with a sha', () => {
    const deny = JSON.parse(run('origin/main')).hookSpecificOutput
    expect(deny.permissionDecision).toBe('deny')
    expect(deny.permissionDecisionReason).toContain('verdict-line.ts --review-call')
    expect(run(`origin/main (reviewing head ${SHA})`)).toBe('')
  })
})
