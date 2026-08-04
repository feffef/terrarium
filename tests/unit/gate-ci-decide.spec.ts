// Tests for gate:scoped's `--decide` mode (#445) — the entry point CI guards
// its heavy steps on. Every failure mode here must land on `null`, because
// `decideScope(null)` is what makes an unclassifiable change run the FULL gate
// rather than a silently reduced one.
import { execFileSync } from 'node:child_process'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { changedPathsBetween, decideScope, githubOutputBlock } from '../../scripts/gate.ts'

const realGit = execFileSync('which', ['git'], { encoding: 'utf8' }).trim()
const isShallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { encoding: 'utf8' }).trim() === 'true'

/** Puts a `git` stub ahead of the real one on PATH; every subcommand it does
 *  not intercept falls through to real git, so the repo still answers normally. */
function withGitStub(script: string, run: () => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'gate-ci-decide-test-'))
  const originalPath = process.env.PATH
  try {
    const stub = join(dir, 'git')
    writeFileSync(stub, `#!/bin/sh\n${script}\nexec ${realGit} "$@"\n`)
    chmodSync(stub, 0o755)
    process.env.PATH = `${dir}${originalPath ? `:${originalPath}` : ''}`
    run()
  } finally {
    process.env.PATH = originalPath
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('changedPathsBetween()', () => {
  it('is unclassifiable without a base ref', () => {
    expect(changedPathsBetween('')).toBeNull()
    expect(decideScope(changedPathsBetween('')).skipHeavy).toBe(false)
  })

  it('is unclassifiable when the base ref does not resolve', () => {
    expect(changedPathsBetween('no-such-ref-for-445')).toBeNull()
  })

  it('is unclassifiable when the head ref does not resolve', () => {
    expect(changedPathsBetween('HEAD', 'no-such-ref-for-445')).toBeNull()
  })

  it.skipIf(isShallow)('lists the paths between two resolvable refs', () => {
    expect(Array.isArray(changedPathsBetween('HEAD~1', 'HEAD'))).toBe(true)
  })

  it('refuses to classify a shallow checkout, even when the refs resolve', () => {
    withGitStub(
      'if [ "$1" = "rev-parse" ] && [ "$2" = "--is-shallow-repository" ]; then echo true; exit 0; fi',
      () => {
        expect(changedPathsBetween('HEAD~1', 'HEAD')).toBeNull()
      },
    )
  })

  it('is unclassifiable when git itself fails', () => {
    withGitStub('exit 1', () => {
      expect(changedPathsBetween('HEAD~1', 'HEAD')).toBeNull()
    })
  })
})

describe('githubOutputBlock()', () => {
  it('emits the skip decision as a plain boolean the workflow can compare against', () => {
    expect(githubOutputBlock({ skipHeavy: true, reason: 'all inert' })).toContain('skip_heavy=true')
    expect(githubOutputBlock({ skipHeavy: false, reason: 'all inert' })).toContain('skip_heavy=false')
  })

  it('survives a reason containing a newline', () => {
    const block = githubOutputBlock({ skipHeavy: false, reason: 'line one\nline two' })
    expect(block).toContain('reason<<GATE_SCOPE_EOF\nline one\nline two\nGATE_SCOPE_EOF\n')
  })
})
