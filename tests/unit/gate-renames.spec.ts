// A rename must report its OLD path too: renaming a test to `docs/x.md`
// otherwise looks inert and skips the heavy layers that would notice it's gone.
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { changedPaths, decideScope } from '../../scripts/gate.ts'
import { commitFile, createGitFixture, git, type GitFixture } from '../support/git-fixture.ts'

let fixture: GitFixture

beforeAll(() => {
  fixture = createGitFixture('gate-renames')
  const { work } = fixture
  commitFile(work, 'tests/unit/a.spec.ts', 'the same body, so git pairs it as a rename', 'c1')
  commitFile(work, 'tests/unit/b.spec.ts', 'another body git will pair as a rename', 'c2')
  git(work, ['push', '-q', 'origin', 'main'])
  git(work, ['checkout', '-qb', 'feature'])
  mkdirSync(join(work, 'docs'))
})

afterAll(() => {
  if (fixture) rmSync(fixture.dir, { recursive: true, force: true })
})

describe('changedPaths() on a rename to an inert path', () => {
  it('lists the old path of a committed rename, so the change is not inert', () => {
    git(fixture.work, ['mv', 'tests/unit/a.spec.ts', 'docs/a.md'])
    git(fixture.work, ['commit', '-qm', 'rename a'])
    const changed = changedPaths(fixture.work, true)
    expect(changed).toContain('tests/unit/a.spec.ts')
    expect(decideScope(changed).skipHeavy).toBe(false)
  })

  it('lists the old path of a staged, uncommitted rename too', () => {
    git(fixture.work, ['mv', 'tests/unit/b.spec.ts', 'docs/b.md'])
    expect(changedPaths(fixture.work, true)).toContain('tests/unit/b.spec.ts')
  })
})
