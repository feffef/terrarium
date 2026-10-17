import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { git } from '../../scripts/lib/git.ts'

describe('git()', () => {
  const dir = mkdtempSync(join(tmpdir(), 'git-run-'))
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('runs in the given cwd and returns stdout untrimmed', () => {
    git(['init', '-q'], dir)
    expect(git(['rev-parse', '--is-inside-work-tree'], dir)).toBe('true\n')
  })

  it('throws on a non-zero exit', () => {
    expect(() => git(['rev-parse', '--verify', 'no-such-ref'], dir, { stdio: 'pipe' })).toThrow()
  })
})
