// Pure-core tests for gate:scoped (#350) — the inert predicate and scope
// decision, where a misclassification would skip a heavy layer it shouldn't.
import { execFileSync } from 'node:child_process'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { changedPaths, decideScope, isInert, planSteps, FLOOR, HEAVY } from '../../scripts/gate.ts'

describe('isInert()', () => {
  it('treats a Markdown file outside layers/ as inert', () => {
    expect(isInert('docs/adr/0004-objective-safety-gate.md')).toBe(true)
    expect(isInert('README.md')).toBe(true)
    expect(isInert('CLAUDE.md')).toBe(true)
    expect(isInert('.agents/skills/wayfinder/SKILL.md')).toBe(true)
  })

  it('treats any .md UNDER layers/ as non-inert (content + per-Tenant CONTEXT)', () => {
    expect(isInert('layers/blog/content/karen/pages/index.md')).toBe(false)
    expect(isInert('layers/atlas/CONTEXT.md')).toBe(false)
  })

  it('treats any non-.md path as non-inert', () => {
    expect(isInert('scripts/gate.ts')).toBe(false)
    expect(isInert('package.json')).toBe(false)
    expect(isInert('.github/workflows/gate.yml')).toBe(false)
    expect(isInert('docs/research/diagram.png')).toBe(false)
  })
})

describe('decideScope()', () => {
  it('skips heavy layers when EVERY changed path is inert', () => {
    const scope = decideScope(['docs/adr/0004.md', 'README.md', '.agents/skills/x/SKILL.md'])
    expect(scope.skipHeavy).toBe(true)
    expect(planSteps(scope)).toEqual([...FLOOR])
  })

  it('runs the full gate when ANY changed path is non-inert', () => {
    const scope = decideScope(['docs/adr/0004.md', 'scripts/gate.ts'])
    expect(scope.skipHeavy).toBe(false)
    expect(scope.reason).toContain('scripts/gate.ts')
    expect(planSteps(scope)).toEqual([...FLOOR, ...HEAVY])
  })

  it('a single content .md under layers/ forces the full gate', () => {
    expect(decideScope(['layers/blog/content/karen/pages/index.md']).skipHeavy).toBe(false)
  })

  it('fails safe to the full gate when the changed set is unknown (null)', () => {
    const scope = decideScope(null)
    expect(scope.skipHeavy).toBe(false)
    expect(scope.reason).toMatch(/could not determine/i)
    expect(planSteps(scope)).toEqual([...FLOOR, ...HEAVY])
  })

  it('fails safe to the full gate when nothing changed (empty)', () => {
    const scope = decideScope([])
    expect(scope.skipHeavy).toBe(false)
    expect(planSteps(scope)).toEqual([...FLOOR, ...HEAVY])
  })
})

describe('changedPaths() — fetch-degrade path (#451)', () => {
  let dir: string | undefined
  let originalPath: string | undefined

  afterEach(() => {
    if (originalPath !== undefined) process.env.PATH = originalPath
    if (dir) rmSync(dir, { recursive: true, force: true })
    dir = undefined
    originalPath = undefined
  })

  // A stub `git` that fails fast on `fetch` only (real git handles every
  // other subcommand, so `merge-base`/`diff`/`ls-files` still see the real
  // repo). `changedPaths()`'s fetch is wrapped in a bare `catch {}` — any
  // thrown error, including the "timed out" one `fetchOriginMain` raises on
  // a real timeout (unit-tested directly in git-helpers.spec.ts), takes the
  // same degrade path, so a fast failure exercises the same catch branch a
  // slow 10s timeout would, without paying for the wait.
  it('degrades to a usable result instead of throwing when the fetch fails', () => {
    const realGit = execFileSync('which', ['git'], { encoding: 'utf8' }).trim()
    dir = mkdtempSync(join(tmpdir(), 'gate-scope-test-'))
    const gitStub = join(dir, 'git')
    writeFileSync(
      gitStub,
      `#!/bin/sh\nif [ "$1" = "fetch" ]; then\n  exit 1\nelse\n  exec ${realGit} "$@"\nfi\n`,
    )
    chmodSync(gitStub, 0o755)
    originalPath = process.env.PATH
    process.env.PATH = `${dir}${originalPath ? `:${originalPath}` : ''}`

    expect(() => changedPaths()).not.toThrow()
    const result = changedPaths()
    expect(result === null || Array.isArray(result)).toBe(true)
  })
})
