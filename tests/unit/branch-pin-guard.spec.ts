// Coverage for the branch-pin guard (issue #666; rationale and detection
// contract in `scripts/branch-pin-guard.ts`). Six tests: the pure core's
// decisions over real-shaped transcript records, and the CLI's fail-OPEN
// behaviour on a payload it cannot inspect — the departure from the roster's
// fail-closed default (`docs/agents/guards.md`).
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkBranchCreation, formatGuardMessage } from '../../scripts/branch-pin-guard.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = join(root, 'scripts', 'branch-pin-guard.ts')

/** The session's first record, carrying the branch the harness checked out. */
function startedOn(branch: string): Record<string, unknown> {
  return { type: 'user', gitBranch: branch, message: { role: 'user', content: 'go' } }
}

function bashTurn(command: string): Record<string, unknown> {
  return { type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Bash', input: { command } }] } }
}

const FETCHED = [startedOn('claude/zen-heisenberg-k97op1'), bashTurn('git fetch origin main')]

describe('checkBranchCreation() — the pure predicate (issue #666)', () => {
  it('DENIES: the recorded regression — branching to a self-invented name off the pinned branch', () => {
    const finding = checkBranchCreation('Bash', { command: 'git checkout -b digest/2026-08-17 origin/main' }, FETCHED)
    expect(finding).toEqual({ kind: 'pin', pinned: 'claude/zen-heisenberg-k97op1', created: 'digest/2026-08-17' })
    expect(formatGuardMessage(finding!)).toContain('claude/zen-heisenberg-k97op1')
  })

  it('ALLOWS: re-creating the pinned branch itself, by any of the three shapes', () => {
    for (const command of [
      'git checkout -B claude/zen-heisenberg-k97op1 origin/main',
      'git switch -c claude/zen-heisenberg-k97op1',
      'git branch claude/zen-heisenberg-k97op1',
      'git checkout -b "claude/zen-heisenberg-k97op1"',
    ]) {
      expect(checkBranchCreation('Bash', { command }, FETCHED)).toBeNull()
    }
  })

  it('ALLOWS: a session that started on main/master — there is no pin to keep', () => {
    for (const branch of ['main', 'master']) {
      const records = [startedOn(branch), bashTurn('git fetch origin main')]
      expect(checkBranchCreation('Bash', { command: 'git checkout -b claude/issue-666-branch-pin-guard' }, records)).toBeNull()
    }
  })

  it('ALLOWS: `git worktree add … -b`, and every non-creating branch shape', () => {
    for (const command of [
      'git worktree add ../wt-a -b claude/subagent-a origin/main',
      // `-B` off a non-main start point re-points an existing branch — this is
      // how a review session checks out someone else's PR branch.
      'git checkout -B claude/issue-999-other origin/claude/issue-999-other',
      'git branch -d stale/branch',
      'git branch --show-current',
      'git checkout claude/zen-heisenberg-k97op1',
      // A long multi-line script: the pin check must not fire on prose or on a
      // branch NAME mentioned somewhere other than a creating command.
      'echo git branch other-name\ngit status --short',
    ]) {
      expect(checkBranchCreation('Bash', { command }, FETCHED)).toBeNull()
    }
  })

  it('DENIES: creating a branch before any `git fetch … origin` this session', () => {
    const records = [startedOn('main'), bashTurn('pnpm install')]
    expect(checkBranchCreation('Bash', { command: 'git checkout -b feature/x' }, records)).toEqual({ kind: 'no-fetch', created: 'feature/x' })
    // The fetch may be in this very command, which the transcript cannot yet show.
    expect(checkBranchCreation('Bash', { command: 'git fetch origin main\ngit checkout -b feature/x origin/main' }, records)).toBeNull()
  })

  it('FAILS OPEN: an unreadable transcript, a non-Bash tool, and a payload it cannot inspect', () => {
    expect(checkBranchCreation('Bash', { command: 'git checkout -b anything' }, null)).toBeNull()
    expect(checkBranchCreation('Edit', { command: 'git checkout -b anything' }, FETCHED)).toBeNull()
    expect(checkBranchCreation('Bash', null, FETCHED)).toBeNull()
    const out = execFileSync('pnpm', ['exec', 'tsx', SCRIPT], { cwd: root, input: 'not json', encoding: 'utf8' }).trim()
    expect(out).toBe('')
  })
})
