// A workflow script is no ES module (top-level `return`), so ESLint skips it
// and this spec checks it instead (#1870).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { root } from '../../shared/expand.ts'

const DIR = join(root, '.claude/workflows')
const GLOBALS = ['agent', 'pipeline', 'parallel', 'phase', 'log', 'args', 'budget', 'workflow']
const AsyncFunction = (async () => {}).constructor as new (...args: string[]) => (...a: unknown[]) => Promise<unknown>

/** Compiles the whole body, then runs only up to `meta`, which becomes a `return`. */
async function workflowMeta(source: string): Promise<{ name?: unknown }> {
  const body = source.replace(/^export const meta\s*=/m, 'return ')
  if (body === source) throw new Error('no `export const meta =` line')
  const stub = () => { throw new Error('a workflow global ran before meta') }
  return new AsyncFunction(...GLOBALS, body)(...GLOBALS.map(() => stub)) as Promise<{ name?: unknown }>
}

describe('workflowMeta()', () => {
  const ok = "export const meta = { name: 'x', description: 'y' }\nconst r = await agent('hi')\nreturn r\n"

  it('reads meta from a valid script without running its body', async () => {
    expect(await workflowMeta(ok)).toEqual({ name: 'x', description: 'y' })
  })

  it('rejects a script that does not compile', async () => {
    await expect(workflowMeta(ok.replace("agent('hi')", "agent('hi'"))).rejects.toThrow(SyntaxError)
  })

  it('rejects a script without meta', async () => {
    await expect(workflowMeta("return await agent('hi')\n")).rejects.toThrow(/meta/)
  })
})

it('every .claude/workflows/*.js compiles, and its meta.name is its basename', async () => {
  const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.js')) : []
  for (const file of files) {
    expect((await workflowMeta(readFileSync(join(DIR, file), 'utf8'))).name, file).toBe(basename(file, '.js'))
  }
})
