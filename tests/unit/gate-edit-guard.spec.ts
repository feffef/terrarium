// Coverage for the gate-edit guard (issue #3046; contract in scripts/hooks/gate-edit-guard.ts).
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { checkGateEdit } from '../../scripts/hooks/gate-edit-guard.ts'

let repo: string
let outside: string
const lock = () => join(repo, '.git', 'terrarium-gate.pid')

beforeAll(() => {
  repo = mkdtempSync(join(tmpdir(), 'gate-edit-repo-'))
  outside = mkdtempSync(join(tmpdir(), 'gate-edit-out-'))
  execFileSync('git', ['init', '-q', repo])
  writeFileSync(join(repo, '.gitignore'), 'ignored/\n')
  mkdirSync(join(repo, 'ignored'))
})
afterAll(() => {
  rmSync(repo, { recursive: true, force: true })
  rmSync(outside, { recursive: true, force: true })
})

const edit = (p: string) => checkGateEdit('Edit', { file_path: p }, repo)

describe('checkGateEdit()', () => {
  it('allows everything when no gate run is live', () => {
    expect(edit(join(repo, 'a.ts'))).toBeNull()
    writeFileSync(lock(), '999999999') // dead pid: a killed run
    expect(edit(join(repo, 'a.ts'))).toBeNull()
    writeFileSync(lock(), '0') // kill(0, 0) probes a process group, not a run
    expect(edit(join(repo, 'a.ts'))).toBeNull()
  })

  describe('with a live run', () => {
    beforeAll(() => writeFileSync(lock(), String(process.pid)))

    it.each([
      ['Edit', 'file_path', 'new/dir/a.ts'],
      ['Write', 'file_path', 'new/dir/a.ts'],
      ['NotebookEdit', 'notebook_path', 'new/dir/n.ipynb'],
    ])('denies %s of a tree path, even in a new directory', (tool, key, rel) => {
      expect(checkGateEdit(tool, { [key]: join(repo, rel) }, repo)).toContain('gate:scoped')
    })
    it.each(['commit -m x', 'add -A', 'stash push -u', 'checkout other', 'reset --hard'])(
      'denies git %s, including via -C',
      (args) => {
        expect(checkGateEdit('Bash', { command: `git ${args}` }, repo)).toContain('gate:scoped')
        expect(checkGateEdit('Bash', { command: `git -C ${repo} ${args}` }, outside)).toContain('gate:scoped')
      },
    )
    it('allows git-ignored files, paths outside the checkout, read-only git and other Bash', () => {
      expect(edit(join(repo, 'ignored/x.log'))).toBeNull()
      expect(edit(join(outside, 'scratch.md'))).toBeNull()
      expect(checkGateEdit('Bash', { command: 'git status' }, repo)).toBeNull()
      expect(checkGateEdit('Bash', { command: 'git diff --stat' }, repo)).toBeNull()
      expect(checkGateEdit('Bash', { command: `git -C ${outside} add -A` }, repo)).toBeNull()
      expect(checkGateEdit('Read', { file_path: join(repo, 'a.ts') }, repo)).toBeNull()
    })
  })
})
