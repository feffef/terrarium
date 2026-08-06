// The gate hole `changedPaths()`'s unshallow closes (#849).
//
// Needs real git, not a stubbed one: the defect is in what `merge-base` actually
// computes on a truncated commit graph, which a stub would fake away. Why a
// shallow `merge-base` can under-report: docs/agents/git-conventions.md.
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { changedPaths, decideScope } from '../../scripts/gate.ts'
import { commitFile, createGitFixture, git, shallowClone, type GitFixture } from '../support/git-fixture.ts'

let fixture: GitFixture
let clone: string

// `--depth=5` is load-bearing: it must cut the long main→c3 path (the true
// merge-base) while leaving the short main→merge→side→c2 path intact, so
// `merge-base` can still see c2 and answers with it. A deeper clone reaches c3
// and answers correctly; a shallower one sees no common commit and fails.
const DEPTH = 5

beforeAll(() => {
  fixture = createGitFixture('gate-shallow-base')
  const { work } = fixture

  commitFile(work, 'base.txt', 'v1', 'c1')
  commitFile(work, 'other.txt', 'v1', 'c2')
  git(work, ['branch', '-q', 'sidebase']) // side forks here — the OLD commit
  const c3 = commitFile(work, 'shared/expand.ts', 'export const x = 1', 'c3: land a non-inert change')
  git(work, ['branch', '-q', 'feature']) // feature forks here — the TRUE merge-base

  // A long main→c3 path, so c3 sits deeper than the clone depth…
  for (const n of [1, 2, 3, 4]) commitFile(work, `a/${n}.ts`, 'x', `a${n}`)
  // …and a short path back to c2 via a merge, which keeps c2 visible.
  git(work, ['checkout', '-q', 'sidebase'])
  git(work, ['checkout', '-qb', 'side'])
  commitFile(work, 's.txt', 'x', 's1')
  git(work, ['checkout', '-q', 'main'])
  commitFile(work, 'm/1.ts', 'x', 'm1')
  git(work, ['merge', '-q', '--no-ff', 'side', '-m', 'merge side'])
  commitFile(work, 'm/2.ts', 'x', 'm2')

  // The revert is what makes the wrong base UNDER-report rather than over-report.
  git(work, ['checkout', '-q', 'feature'])
  git(work, ['revert', '--no-edit', c3])
  commitFile(work, 'docs/note.md', 'hello', 'docs-only tweak')
  git(work, ['checkout', '-q', 'main'])
  git(work, ['push', '-q', 'origin', 'main', 'feature'])

  clone = shallowClone(fixture, 'shallow', DEPTH)
  git(clone, ['checkout', '-q', 'feature'])
})

afterAll(() => {
  if (fixture) rmSync(fixture.dir, { recursive: true, force: true })
})

describe('a shallow clone can produce a silently-wrong merge-base (#849)', () => {
  it('answers merge-base with a commit that is neither a graft boundary nor parentless', () => {
    const wrong = git(clone, ['merge-base', 'origin/main', 'HEAD'])
    expect(wrong).not.toBe(git(fixture.work, ['merge-base', 'main', 'feature']))

    // Both detection strategies #849 proposed would miss it — which is why the
    // fix repairs the clone instead of trying to spot a bad answer.
    expect(git(clone, ['log', '-1', '--format=%P', wrong])).not.toBe('')
    expect(readFileSync(join(clone, '.git/shallow'), 'utf8').split('\n')).not.toContain(wrong)
  })

  it('OMITS a non-inert path from the diff — the failure is NOT a safe superset', () => {
    const wrong = git(clone, ['merge-base', 'origin/main', 'HEAD'])
    const understated = git(clone, ['diff', '--name-only', `${wrong}..HEAD`]).split('\n').filter(Boolean)
    expect(understated).toContain('docs/note.md')
    expect(understated).not.toContain('shared/expand.ts')

    // …and that omission is what flips the gate decision.
    expect(decideScope(understated).skipHeavy).toBe(true)
    expect(decideScope([...understated, 'shared/expand.ts']).skipHeavy).toBe(false)
  })
})

describe('changedPaths() against that clone (#849)', () => {
  // The fixture's origin is a local path, so the unshallow always succeeds here
  // — this is the success path the stub tests in gate-scope.spec.ts cannot cover.
  it('completes the clone and then sees the path the shallow base hid', () => {
    const changed = changedPaths(clone)

    // Ordered so a regression reports the hole itself, not an implementation
    // detail: without the unshallow this skips the heavy layers.
    expect(decideScope(changed).skipHeavy).toBe(false)
    expect(changed).toContain('shared/expand.ts')
    expect(git(clone, ['rev-parse', '--is-shallow-repository'])).toBe('false')
  })
})
