// Unit tests for the worktree sweep's pure core (issue #427): the
// `git worktree list --porcelain` parser and the pass/fail sweep decision —
// where a classification bug would hide. The git shell (isDirty,
// unpushedCount, readWorktreeStates) is a thin wrapper over these, exercised
// by running the script directly against the real tree
// (`tsx scripts/check-worktrees.ts`) rather than against fixtures here, since
// it needs no real worktrees provisioned to be trusted.
import { describe, expect, it } from 'vitest'
import { parseWorktreeList, primaryWorktreePath, sweep, type WorktreeState } from '../../scripts/check-worktrees.ts'

describe('parseWorktreeList()', () => {
  it('parses the primary worktree (no locked/prunable, branch present)', () => {
    const porcelain = 'worktree /repo\nHEAD abc123\nbranch refs/heads/main\n'
    expect(parseWorktreeList(porcelain)).toEqual([
      { path: '/repo', head: 'abc123', branch: 'main', bare: false, detached: false, locked: false, prunable: false },
    ])
  })

  it('parses a linked worktree with a locked reason', () => {
    const porcelain = 'worktree /repo/.claude/worktrees/agent-x\nHEAD def456\nbranch refs/heads/claude/foo\nlocked claude agent agent-x (pid 1 start 2)\n'
    expect(parseWorktreeList(porcelain)).toEqual([
      {
        path: '/repo/.claude/worktrees/agent-x',
        head: 'def456',
        branch: 'claude/foo',
        bare: false,
        detached: false,
        locked: true,
        prunable: false,
      },
    ])
  })

  it('parses a detached HEAD worktree (no branch line)', () => {
    const porcelain = 'worktree /repo/detached\nHEAD abc123\ndetached\n'
    const worktrees = parseWorktreeList(porcelain)
    expect(worktrees).toHaveLength(1)
    expect(worktrees[0]?.branch).toBeNull()
    expect(worktrees[0]?.detached).toBe(true)
  })

  it('parses a bare worktree and a prunable one', () => {
    const porcelain = 'worktree /repo/bare\nbare\n\nworktree /repo/stale\nHEAD abc123\nbranch refs/heads/gone\nprunable gitdir file points to non-existent location\n'
    const [bare, stale] = parseWorktreeList(porcelain)
    expect(bare).toMatchObject({ path: '/repo/bare', bare: true })
    expect(stale).toMatchObject({ path: '/repo/stale', prunable: true, branch: 'gone' })
  })

  it('parses multiple worktrees separated by blank lines, in list order', () => {
    const porcelain = [
      'worktree /repo',
      'HEAD aaa',
      'branch refs/heads/main',
      '',
      'worktree /repo/.claude/worktrees/agent-1',
      'HEAD bbb',
      'branch refs/heads/claude/one',
      'locked',
      '',
      'worktree /repo/.claude/worktrees/agent-2',
      'HEAD ccc',
      'branch refs/heads/claude/two',
      '',
    ].join('\n')
    const worktrees = parseWorktreeList(porcelain)
    expect(worktrees.map((w) => w.path)).toEqual([
      '/repo',
      '/repo/.claude/worktrees/agent-1',
      '/repo/.claude/worktrees/agent-2',
    ])
  })

  it('returns an empty array for empty input', () => {
    expect(parseWorktreeList('')).toEqual([])
  })
})

describe('primaryWorktreePath()', () => {
  it('is the common dir\'s parent directory', () => {
    expect(primaryWorktreePath('/repo/.git')).toBe('/repo')
  })
})

const state = (overrides: Partial<WorktreeState> = {}): WorktreeState => ({
  path: '/repo/.claude/worktrees/agent-x',
  branch: 'claude/foo',
  isPrimary: false,
  dirty: false,
  unpushedCount: 0,
  ...overrides,
})

describe('sweep()', () => {
  it('passes (no failures) when every linked worktree is clean and pushed', () => {
    const { failures } = sweep([
      state({ path: '/repo', isPrimary: true, dirty: true, unpushedCount: 3 }), // primary: never a failure
      state({ dirty: false, unpushedCount: 0 }),
    ])
    expect(failures).toEqual([])
  })

  it('flags a linked worktree with uncommitted changes', () => {
    const { failures } = sweep([state({ dirty: true, unpushedCount: 0 })])
    expect(failures).toEqual([
      { path: '/repo/.claude/worktrees/agent-x', branch: 'claude/foo', isPrimary: false, uncommitted: true, unpushed: false },
    ])
  })

  it('flags a linked worktree with unpushed commits', () => {
    const { failures } = sweep([state({ dirty: false, unpushedCount: 2 })])
    expect(failures).toEqual([
      { path: '/repo/.claude/worktrees/agent-x', branch: 'claude/foo', isPrimary: false, uncommitted: false, unpushed: true },
    ])
  })

  it('flags a linked worktree that is both dirty and unpushed', () => {
    const { failures } = sweep([state({ dirty: true, unpushedCount: 5 })])
    expect(failures[0]).toMatchObject({ uncommitted: true, unpushed: true })
  })

  it('never flags the primary worktree, however dirty or far ahead', () => {
    const { failures } = sweep([state({ path: '/repo', isPrimary: true, dirty: true, unpushedCount: 99 })])
    expect(failures).toEqual([])
  })

  it('treats an undeterminable unpushed count (null) as not-proven-unpushed, not a pass bypass', () => {
    const { failures } = sweep([state({ dirty: false, unpushedCount: null })])
    expect(failures).toEqual([])
    const { failures: stillDirty } = sweep([state({ dirty: true, unpushedCount: null })])
    expect(stillDirty).toHaveLength(1)
  })

  it('reports every worktree (including primary) in findings, but only linked ones in failures', () => {
    const { findings, failures } = sweep([
      state({ path: '/repo', isPrimary: true, dirty: false, unpushedCount: 0 }),
      state({ dirty: true, unpushedCount: 0 }),
    ])
    expect(findings).toHaveLength(2)
    expect(failures).toHaveLength(1)
  })
})
