// The gate hole `changedPaths()`'s unshallow closes (#849).
//
// In a shallow clone `git merge-base` can return a commit that is *not* the
// true merge-base — an ordinary, fully-hydrated commit, neither listed in
// `.git/shallow` nor parentless, so nothing about it looks wrong. #849 reasoned
// that the resulting diff is therefore a harmless superset. It is not:
// `git diff A..B` compares the two *endpoints*, not the path between them, so a
// branch that REVERTS a change which landed between the wrong base and the true
// base restores that file to its wrong-base content and it drops out of the diff
// entirely. The classifier then sees an all-inert changeset and skips the heavy
// layers on a change that touched `shared/expand.ts`.
//
// This builds that topology against a local bare origin — no network — and
// pins both halves: the wrong base under-reports, and `changedPaths()` refuses
// to classify off it.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { changedPaths, decideScope } from '../../scripts/gate.ts'

let fixture: string
let shallowClone: string

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'gate-849',
      GIT_AUTHOR_EMAIL: 'gate-849@example.invalid',
      GIT_COMMITTER_NAME: 'gate-849',
      GIT_COMMITTER_EMAIL: 'gate-849@example.invalid',
    },
  }).trim()
}

function commit(cwd: string, path: string, body: string, message: string): string {
  mkdirSync(join(cwd, dirname(path)), { recursive: true })
  writeFileSync(join(cwd, path), `${body}\n`)
  git(cwd, ['add', '-A'])
  git(cwd, ['commit', '-qm', message])
  return git(cwd, ['rev-parse', 'HEAD'])
}

// `--depth=5` is load-bearing: it must cut the long main→c3 path (the true
// merge-base) while leaving the short main→merge→side→c2 path intact, so
// `merge-base` can still see c2 and answers with it. A deeper clone reaches c3
// and answers correctly; a shallower one sees no common commit and fails.
const DEPTH = 5

beforeAll(() => {
  fixture = mkdtempSync(join(tmpdir(), 'gate-shallow-base-'))
  const origin = join(fixture, 'origin.git')
  const work = join(fixture, 'work')
  // `-b main` on the bare repo too: without it HEAD points at a `master` that
  // is never pushed, and the clone warns about a nonexistent remote HEAD.
  git(fixture, ['init', '-q', '--bare', '-b', 'main', 'origin.git'])
  git(fixture, ['init', '-q', '-b', 'main', 'work'])
  git(work, ['remote', 'add', 'origin', origin])

  commit(work, 'base.txt', 'v1', 'c1')
  commit(work, 'other.txt', 'v1', 'c2')
  git(work, ['branch', '-q', 'sidebase']) // side forks here — the OLD commit
  const c3 = commit(work, 'shared/expand.ts', 'export const x = 1', 'c3: land a non-inert change')
  git(work, ['branch', '-q', 'feature']) // feature forks here — the TRUE merge-base

  // A long main→c3 path, so c3 sits deeper than the clone depth.
  for (const n of [1, 2, 3, 4]) commit(work, `a/${n}.ts`, 'x', `a${n}`)
  // …and a short path back to c2 via a merge, which keeps c2 visible.
  git(work, ['checkout', '-q', 'sidebase'])
  git(work, ['checkout', '-qb', 'side'])
  commit(work, 's.txt', 'x', 's1')
  git(work, ['checkout', '-q', 'main'])
  commit(work, 'm/1.ts', 'x', 'm1')
  git(work, ['merge', '-q', '--no-ff', 'side', '-m', 'merge side'])
  commit(work, 'm/2.ts', 'x', 'm2')

  git(work, ['checkout', '-q', 'feature'])
  git(work, ['revert', '--no-edit', c3])
  commit(work, 'docs/note.md', 'hello', 'docs-only tweak')
  git(work, ['checkout', '-q', 'main'])
  git(work, ['push', '-q', 'origin', 'main', 'feature'])

  shallowClone = join(fixture, 'shallow')
  git(fixture, ['clone', '-q', `--depth=${DEPTH}`, '--no-single-branch', `file://${origin}`, 'shallow'])
  git(shallowClone, ['checkout', '-q', 'feature'])
})

afterAll(() => {
  if (fixture) rmSync(fixture, { recursive: true, force: true })
})

describe('a shallow clone can produce a silently-wrong merge-base (#849)', () => {
  it('answers merge-base with a commit that is neither a graft boundary nor parentless', () => {
    const wrong = git(shallowClone, ['merge-base', 'origin/main', 'HEAD'])
    const truth = git(join(fixture, 'work'), ['merge-base', 'main', 'feature'])
    expect(wrong).not.toBe(truth)

    // Both detection strategies #849 proposed would miss it, which is why the
    // fix is to unshallow rather than to detect an untrustworthy base.
    expect(git(shallowClone, ['log', '-1', '--format=%P', wrong])).not.toBe('')
    const shallowFile = execFileSync('cat', [join(shallowClone, '.git/shallow')], { encoding: 'utf8' })
    expect(shallowFile.split('\n')).not.toContain(wrong)
  })

  it('OMITS a non-inert path from the diff — the failure is NOT a safe superset', () => {
    const wrong = git(shallowClone, ['merge-base', 'origin/main', 'HEAD'])
    const understated = git(shallowClone, ['diff', '--name-only', `${wrong}..HEAD`]).split('\n').filter(Boolean)
    expect(understated).toContain('docs/note.md')
    expect(understated).not.toContain('shared/expand.ts')

    // …and that omission is what flips the gate decision.
    expect(decideScope(understated).skipHeavy).toBe(true)
    expect(decideScope([...understated, 'shared/expand.ts']).skipHeavy).toBe(false)
  })
})

describe('changedPaths() against that clone (#849)', () => {
  it('never classifies off the untrustworthy base — it unshallows, or fails closed', () => {
    const changed = changedPaths(shallowClone)

    // Either the unshallow succeeded (the fixture's origin is a local path, so
    // it can) and the true set is visible, or it failed and we got `null`.
    // What must NEVER happen is the third outcome: the understated set that
    // skips the heavy layers.
    expect(decideScope(changed).skipHeavy).toBe(false)
    if (changed !== null) expect(changed).toContain('shared/expand.ts')
    expect(git(shallowClone, ['rev-parse', '--is-shallow-repository'])).toBe('false')
  })
})
