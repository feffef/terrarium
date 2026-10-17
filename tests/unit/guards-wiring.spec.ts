// A guard that lands unwired is silently unenforced (docs/agents/guards.md).
import { globSync, readFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const FAIL_OPEN = ['deferred-tool-guard']

const settings = JSON.parse(readFileSync(join(root, '.claude', 'settings.json'), 'utf8'))
type Hook = { command: string; onFailure?: string }
const entries: Hook[] = settings.hooks.PreToolUse.flatMap((h: { hooks: Hook[] }) => h.hooks)
const guards = globSync('scripts/hooks/*-guard.ts', { cwd: root }).map((f) => basename(f, '.ts'))

describe('every scripts/hooks/*-guard.ts is wired', () => {
  it.each(guards)('%s runs from a PreToolUse hook', (guard) => {
    const wired = entries.filter((h) => h.command.includes(`scripts/hooks/${guard}.`))
    expect(wired, `no PreToolUse hook runs ${guard}`).not.toHaveLength(0)
    if (FAIL_OPEN.includes(guard)) return
    for (const h of wired) {
      expect(h.onFailure, h.command).toBe('block')
      expect(h.command, 'a `|| true` exits 0, so onFailure never fires').not.toContain('|| true')
    }
  })

  it('finds the guards at all', () => {
    expect(guards.length).toBeGreaterThan(5)
  })
})

describe('every hook runs tsx directly (docs/agents/guards.md)', () => {
  const all: string[] = Object.values(settings.hooks).flatMap((groups) =>
    (groups as { hooks: { command: string }[] }[]).flatMap((g) => g.hooks.map((c) => c.command)),
  )
  const prefilters = globSync('scripts/hooks/*.sh', { cwd: root }).map((f) => [f, readFileSync(join(root, f), 'utf8')])

  it.each(all.map((c) => [c]))('%s', (command) => {
    expect(command).not.toContain('pnpm exec')
  })

  it.each(prefilters)('%s', (_file, text) => {
    expect(text).not.toContain('pnpm exec')
  })
})
