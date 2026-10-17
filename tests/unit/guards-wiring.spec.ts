// A guard that lands unwired is silently unenforced (docs/agents/guards.md).
import { globSync, readFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const FAIL_OPEN = ['deferred-tool-guard']

const settings = JSON.parse(readFileSync(join(root, '.claude', 'settings.json'), 'utf8'))
const commands: string[] = settings.hooks.PreToolUse.flatMap((h: { hooks: { command: string }[] }) =>
  h.hooks.map((c) => c.command),
)
const guards = globSync('scripts/hooks/*-guard.ts', { cwd: root }).map((f) => basename(f, '.ts'))

describe('every scripts/hooks/*-guard.ts is wired', () => {
  it.each(guards)('%s runs from a PreToolUse hook', (guard) => {
    const wired = commands.filter((c) => c.includes(`scripts/hooks/${guard}.`))
    expect(wired, `no PreToolUse hook runs ${guard}`).not.toHaveLength(0)
    if (!FAIL_OPEN.includes(guard)) for (const c of wired) expect(c).toContain(`guard-wrap.sh ${guard} --`)
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
