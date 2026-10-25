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

describe('clear-backlog-build final gate (#2523)', () => {
  const source = readFileSync(join(DIR, 'clear-backlog-build.js'), 'utf8').replace(/^export const meta/m, 'const meta')
  const work = (gatePassed: boolean, commits: string[]) => ({ status: 'done', worktree: '/wt', commits, gatePassed, decisions: [] })

  /** Runs the script on one branch: its build reports a failed gate, its review is clean, and the final gate returns `gate`. */
  async function run(gate: unknown) {
    const globals: Record<string, unknown> = {
      agent: async (_p: string, o: { label: string }) =>
        o.label.startsWith('build') ? work(false, ['a']) : o.label.startsWith('gate') ? gate : { findings: [], summary: '' },
      pipeline: (items: unknown[], ...stages: ((x: unknown, i: unknown) => unknown)[]) =>
        Promise.all(items.map(async (i) => { let x = i; for (const s of stages) x = await s(x, i); return x })),
      parallel: (fns: (() => unknown)[]) => Promise.all(fns.map((f) => f())),
      log: () => {},
      args: { session: 'session_x', branches: [{ name: 'fix/1-x', issues: [1], brief: 'b' }] },
    }
    const [r] = await new AsyncFunction(...GLOBALS, source)(...GLOBALS.map((g) => globals[g])) as unknown[]
    return r
  }

  it('gates a clean branch even after its build reported a failed gate, and takes the gate agent\'s commits', async () => {
    expect(await run(work(true, ['a', 'b']))).toMatchObject({ status: 'ready-to-push', commits: ['a', 'b'] })
  })

  it.each([[null], [work(false, ['a'])]])('fails the branch, naming the final gate, when the gate agent returns %j', async (gate) => {
    expect(await run(gate)).toMatchObject({ status: 'failed', reason: expect.stringMatching(/final gate/) })
  })
})
