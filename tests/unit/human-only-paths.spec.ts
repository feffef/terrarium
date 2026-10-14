import { rmSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { HUMAN_MERGE_RULE } from '../../scripts/merge-pr.ts'
import { humanOnlyPaths } from '../../scripts/human-only-paths.ts'
import { commitFile, createGitFixture, git, type GitFixture } from '../support/git-fixture.ts'

const RULE = '---\npaths:\n  - ".claude/rules/**"\n  - "scripts/merge-pr.ts"\n---\n# rule\n'

let fixture: GitFixture

beforeAll(() => {
  fixture = createGitFixture('human-only-paths')
  const { work } = fixture
  commitFile(work, 'scripts/merge-pr.ts', 'a body git will pair as a rename', 'c1')
  commitFile(work, 'notes/plan.md', 'another body git will pair as a rename', 'c2')
  git(work, ['push', '-q', 'origin', 'main'])
  git(work, ['branch', 'no-rule'])
  commitFile(work, HUMAN_MERGE_RULE, RULE, 'rule')
  git(work, ['push', '-q', 'origin', 'main'])
  git(work, ['checkout', '-qb', 'feature'])
  commitFile(work, '.claude/rules/x.md', 'x', 'rule edit')
  commitFile(work, 'docs/a.md', 'a', 'doc')
  git(work, ['mv', 'scripts/merge-pr.ts', 'scripts/other.ts'])
  git(work, ['mv', 'notes/plan.md', '.claude/rules/plan.md'])
  git(work, ['commit', '-qm', 'renames'])
})

afterAll(() => {
  if (fixture) rmSync(fixture.dir, { recursive: true, force: true })
})

describe('humanOnlyPaths()', () => {
  it('lists touched Human-only paths, either side of a rename, and skips the rest', () => {
    expect(humanOnlyPaths(fixture.work)).toEqual(['.claude/rules/plan.md', '.claude/rules/x.md', 'scripts/merge-pr.ts'])
  })

  it('fails closed when main has no Human-only list', () => {
    git(fixture.work, ['update-ref', 'refs/remotes/origin/main', 'no-rule'])
    expect(() => humanOnlyPaths(fixture.work)).toThrow(/Human-only/)
  })
})
