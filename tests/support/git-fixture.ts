// Throwaway git repositories for tests that need real git behaviour rather than
// a stubbed `git` on PATH — shallow-clone semantics above all, which no stub can
// fake because the thing under test is what `merge-base` computes (#849).
//
// Everything is local: a bare repo on disk serves as `origin` over `file://`, so
// clones, fetches, and `--unshallow` all work with no network.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

// Identity must be explicit: a CI runner has no global user.name/user.email, so
// `git commit` there fails without it.
const IDENTITY = {
  GIT_AUTHOR_NAME: 'terrarium-test',
  GIT_AUTHOR_EMAIL: 'terrarium-test@example.invalid',
  GIT_COMMITTER_NAME: 'terrarium-test',
  GIT_COMMITTER_EMAIL: 'terrarium-test@example.invalid',
}

/** Run git in `cwd` with a deterministic committer identity. */
export function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...IDENTITY } }).trim()
}

/** Write `path` (creating parents) and commit it. Returns the new commit's SHA. */
export function commitFile(cwd: string, path: string, body: string, message: string): string {
  mkdirSync(join(cwd, dirname(path)), { recursive: true })
  writeFileSync(join(cwd, path), `${body}\n`)
  git(cwd, ['add', '-A'])
  git(cwd, ['commit', '-qm', message])
  return git(cwd, ['rev-parse', 'HEAD'])
}

export interface GitFixture {
  /** Temp directory holding everything; `rmSync` it to clean up. */
  dir: string
  /** Path to the bare repo acting as `origin`. */
  origin: string
  /** Path to the working clone that pushes to `origin`. */
  work: string
}

/** A bare `origin` plus a working clone wired to it, both on `main`.
 *
 *  `-b main` on the bare repo matters: without it HEAD points at a `master`
 *  that is never pushed, and a later clone reports an empty repository. */
export function createGitFixture(prefix: string): GitFixture {
  const dir = mkdtempSync(join(tmpdir(), `${prefix}-`))
  const origin = join(dir, 'origin.git')
  const work = join(dir, 'work')
  git(dir, ['init', '-q', '--bare', '-b', 'main', 'origin.git'])
  git(dir, ['init', '-q', '-b', 'main', 'work'])
  git(work, ['remote', 'add', 'origin', origin])
  return { dir, origin, work }
}

/** Shallow-clone the fixture's origin into `dir/<name>` and return its path. */
export function shallowClone(fixture: GitFixture, name: string, depth: number): string {
  const path = join(fixture.dir, name)
  git(fixture.dir, ['clone', '-q', `--depth=${depth}`, '--no-single-branch', `file://${fixture.origin}`, name])
  return path
}
