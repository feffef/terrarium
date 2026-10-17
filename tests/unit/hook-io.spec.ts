import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'
import { runTsx } from '../support/run-script.ts'

const hookIo = join(resolve(dirname(fileURLToPath(import.meta.url)), '../..'), 'scripts/hooks/hook-io.ts')
const dir = mkdtempSync(join(tmpdir(), 'hook-io-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

/** A direct-run hook whose `main` fails the way `mode` says. */
function run(mode: 'throw' | 'reject', failOpen: boolean): string {
  const script = join(dir, `${mode}-${failOpen}.ts`)
  writeFileSync(
    script,
    `import { runGuard } from ${JSON.stringify(hookIo)}\n` +
      `runGuard(import.meta.url, { main: ${mode === 'throw' ? `() => { throw new Error('boom') }` : `async () => { throw new Error('boom') }`}, label: 'test guard', ref: 'issue #0', failOpen: ${failOpen} })\n`,
  )
  return runTsx(script, { input: '{}' }).trim()
}

describe('runGuard() crash handling', () => {
  it.each(['throw', 'reject'] as const)('a guard whose main %ss prints a deny', (mode) => {
    const out = JSON.parse(run(mode, false))
    expect(out.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(out.hookSpecificOutput.permissionDecisionReason).toContain('boom')
  })

  it.each(['throw', 'reject'] as const)('a failOpen hint whose main %ss stays silent', (mode) => {
    expect(run(mode, true)).toBe('')
  })
})
