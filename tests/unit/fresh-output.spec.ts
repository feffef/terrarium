// The e2e spec reuses the gate's `.output` only when nothing can have changed since the build
// (issue #907 is what a stale reuse costs). Times are set explicitly, never slept for.
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isFresh, reusableOutput } from '../support/fresh-output.ts'
import { commitFile, createGitFixture, type GitFixture } from '../support/git-fixture.ts'

describe('isFresh()', () => {
  it('is fresh when every source is older than or equal to the output', () => {
    expect(isFresh(100, [50, 100])).toBe(true)
  })

  it('is stale when any source is newer', () => {
    expect(isFresh(100, [50, 101])).toBe(false)
  })

  it('is fresh with no sources', () => {
    expect(isFresh(100, [])).toBe(true)
  })

  it('is stale when there is no output', () => {
    expect(isFresh(undefined, [])).toBe(false)
  })
})

describe('reusableOutput()', () => {
  const NOW = Math.floor(Date.now() / 1000)
  const OLD = NOW - 120
  const BUILT = NOW - 60
  let fixture: GitFixture
  let root: string

  const stamp = (path: string, seconds: number) => utimesSync(join(root, path), seconds, seconds)

  beforeEach(() => {
    fixture = createGitFixture('fresh-output')
    root = fixture.work
    commitFile(root, '.gitignore', '.output\n.pw-browsers', 'ignore')
    commitFile(root, 'src/a.ts', 'a', 'a')
    commitFile(root, 'src/b.ts', 'b', 'b')
    mkdirSync(join(root, '.output/server'), { recursive: true })
    writeFileSync(join(root, '.output/server/index.mjs'), '')
    for (const path of ['.', '.gitignore', 'src', 'src/a.ts', 'src/b.ts']) stamp(path, OLD)
    stamp('.output/server/index.mjs', BUILT)
  })

  afterEach(() => rmSync(fixture.dir, { recursive: true, force: true }))

  it('reuses an output built after every source, and reports when and the newest source edit', () => {
    stamp('src/b.ts', OLD + 30)
    expect(reusableOutput(root, {})).toEqual({
      dir: join(root, '.output'),
      builtAt: new Date(BUILT * 1000),
      latestEditAt: new Date((OLD + 30) * 1000),
    })
  })

  it('stays fresh when a gitignored directory appeared at the root after the build', () => {
    mkdirSync(join(root, '.pw-browsers'))
    stamp('.pw-browsers', BUILT + 10)
    stamp('.', BUILT + 10)
    expect(reusableOutput(root, {})).toBeDefined()
  })

  it('builds when a tracked file changed after the build', () => {
    stamp('src/a.ts', BUILT + 10)
    expect(reusableOutput(root, {})).toBeUndefined()
  })

  it('builds when an untracked file appeared after the build', () => {
    writeFileSync(join(root, 'src/new.ts'), 'x')
    expect(reusableOutput(root, {})).toBeUndefined()
  })

  it('builds when a tracked file was deleted after the build', () => {
    rmSync(join(root, 'src/b.ts'))
    expect(reusableOutput(root, {})).toBeUndefined()
  })

  it('builds when there is no output', () => {
    rmSync(join(root, '.output'), { recursive: true })
    expect(reusableOutput(root, {})).toBeUndefined()
  })

  it('builds when E2E_FRESH_BUILD is set', () => {
    expect(reusableOutput(root, { E2E_FRESH_BUILD: '1' })).toBeUndefined()
  })

  it('builds outside a git repository', () => {
    const bare = mkdtempSync(join(tmpdir(), 'fresh-output-nogit-'))
    try {
      mkdirSync(join(bare, '.output/server'), { recursive: true })
      writeFileSync(join(bare, '.output/server/index.mjs'), '')
      expect(reusableOutput(bare, {})).toBeUndefined()
    } finally {
      rmSync(bare, { recursive: true, force: true })
    }
  })
})
