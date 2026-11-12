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

describe('clear-backlog-build (#3110)', () => {
  const source = readFileSync(join(DIR, 'clear-backlog-build.js'), 'utf8').replace(/^export const meta/m, 'const meta')
  const built = { status: 'done', worktree: '/wt', commits: ['a'] }
  const review = (kind: string) => ({ findings: [{ kind, title: 't', detail: 'x' }], summary: '' })

  /** Runs the script on one branch; the build returns `build`, and each reviewer its axis's entry of `reviews`. */
  async function run(branch: object, build: unknown = built, reviews: Record<string, unknown> = { Standards: review('nit'), Spec: review('defect') }) {
    const calls: { label: string; prompt: string }[] = []
    const globals: Record<string, unknown> = {
      agent: async (prompt: string, o: { label: string }) => {
        calls.push({ label: o.label, prompt })
        return o.label.startsWith('build') ? build : reviews[o.label.split(' ')[0]!]
      },
      pipeline: (items: unknown[], ...stages: ((x: unknown, i: unknown) => unknown)[]) =>
        Promise.all(items.map(async (i) => { let x = i; for (const s of stages) x = await s(x, i); return x })),
      parallel: (fns: (() => unknown)[]) => Promise.all(fns.map((f) => f())),
      log: () => {},
      args: { session: 'session_x', dir: '/d', branches: [{ name: 'fix/1-x', issues: [1], brief: 'b', ...branch }] },
    }
    const [r] = await new AsyncFunction(...GLOBALS, source)(...GLOBALS.map((g) => globals[g])) as unknown[]
    return { r, calls }
  }

  it('builds, then returns one fresh review round per axis, labelled so the orchestrator can resume each agent', async () => {
    const { r, calls } = await run({})
    expect(calls.map((c) => c.label)).toEqual(['build fix/1-x', 'Standards fix/1-x r1', 'Spec fix/1-x r1'])
    expect(r).toMatchObject({ status: 'reviewed', round: 1, dir: '/d/fix-1-x', worktree: '/wt', commits: ['a'], reviews: { Standards: review('nit'), Spec: review('defect') } })
  })

  it('tells the build agent to skip gate:scoped until asked, and gives the gate its log and timeout', async () => {
    const { calls } = await run({})
    expect(calls[0]!.prompt).toMatch(/Do not run `pnpm gate:scoped` now/)
    expect(calls[0]!.prompt).toContain('pnpm gate:scoped > /d/fix-1-x/gate.log 2>&1; echo EXIT=$? >> /d/fix-1-x/gate.log` with Bash timeout 600000')
  })

  it('points the builder and the reviewers at one decisions file in the branch folder', async () => {
    const { calls } = await run({})
    for (const c of calls) expect(c.prompt, c.label).toContain('/d/fix-1-x/decisions.md')
  })

  it('gives the builder the triage rule and its triage file, since the builder decides what to fix', async () => {
    const { calls } = await run({})
    expect(calls[0]!.prompt).toMatch(/fix every defect, spec-mismatch and missing-test; fix a nit only when it is cheap/)
    expect(calls[0]!.prompt).toContain('/d/fix-1-x/triage.md')
    expect(calls[0]!.prompt).toContain('`FIXED <sha before> <sha after> recheck <axes>`')
  })

  it('in review-only mode skips the build and reviews the given worktree as the given round', async () => {
    const { r, calls } = await run({ review: true, round: 2, worktree: '/wt/b' })
    expect(calls.map((c) => c.label)).toEqual(['Standards fix/1-x r2', 'Spec fix/1-x r2'])
    expect(calls[0]!.prompt).toContain('/wt/b')
    expect(r).toMatchObject({ status: 'reviewed', round: 2, worktree: '/wt/b' })
  })

  it('fails a review-only branch given no round, without running a reviewer', async () => {
    const { r, calls } = await run({ review: true, worktree: '/wt/b' })
    expect(calls).toHaveLength(0)
    expect(r).toMatchObject({ status: 'failed', reason: 'review: true needs round' })
  })

  it('keeps a re-built branch\'s round, so its findings files and the round count carry on', async () => {
    const { r, calls } = await run({ round: 2, worktree: '/wt' })
    expect(calls.map((c) => c.label)).toEqual(['build fix/1-x', 'Standards fix/1-x r2', 'Spec fix/1-x r2'])
    expect(r).toMatchObject({ status: 'reviewed', round: 2 })
  })

  it('passes a needs-owner build through without review', async () => {
    const { r, calls } = await run({}, { status: 'needs-owner', commits: [], question: 'q?' })
    expect(calls).toHaveLength(1)
    expect(r).toMatchObject({ status: 'needs-owner', question: 'q?' })
  })

  it('fails the branch when a reviewer returns nothing', async () => {
    const { r } = await run({}, built, { Standards: review('nit'), Spec: null })
    expect(r).toMatchObject({ status: 'failed', reason: 'round 1: a reviewer returned nothing' })
  })
})

describe('clear-backlog-explore', () => {
  const source = readFileSync(join(DIR, 'clear-backlog-explore.js'), 'utf8').replace(/^export const meta/m, 'const meta')
  const background = 'b'.repeat(100)
  const found = (outcome: string, title: string, over: object = {}) => ({
    outcome, title, summary: 's', publicAuthor: false, readyForHuman: false, files: [], relatedTo: [], staleClaims: [], sideFindings: [], writes: [],
    sourcesRead: [{ source: 'f', learned: 'l' }], background, ...over,
  })

  /** Runs the script on issue 1; its agent returns each of `results` in turn, the last one repeating. */
  async function run(...results: object[]) {
    const logs: string[] = []
    let calls = 0
    const globals: Record<string, unknown> = {
      agent: async () => results[Math.min(calls++, results.length - 1)],
      pipeline: (items: unknown[], ...stages: ((x: unknown) => unknown)[]) => Promise.all(items.map(async (i) => { let x = i; for (const s of stages) x = await s(x); return x })),
      parallel: (fns: (() => unknown)[]) => Promise.all(fns.map((f) => f())),
      phase: () => {},
      log: (l: string) => logs.push(l),
      args: { session: 'session_x', issues: [{ number: 1, mode: 'full' }] },
    }
    const out = await new AsyncFunction(...GLOBALS, source)(...GLOBALS.map((g) => globals[g])) as { results: Record<string, unknown>; missing: number[] }
    return { r: out.results[1] as { outcome: string; question?: { pick: string } }, missing: out.missing, calls, logs }
  }

  it.each(['build', 'blocked', 'close-done', 'close-duplicate'])('turns a seedling\'s %s result into a grill with a question', async (outcome) => {
    const { r } = await run(found(outcome, 'Seedling: do a thing'))
    expect(r).toMatchObject({ outcome: 'grill', question: { pick: 'yes' } })
  })

  it('keeps a seedling\'s own question, and leaves another issue\'s build alone', async () => {
    const question = { choice: 'c', options: ['x', 'y'], pick: 'x', why: 'w', wouldChange: 'v' }
    expect((await run(found('build', 'seedling: lower case', { question }))).r).toMatchObject({ outcome: 'grill', question })
    expect((await run(found('build', 'Fix the typo'))).r.outcome).toBe('build')
  })

  it('logs a pick that is not one of its options', async () => {
    const question = { choice: 'c', options: ['a) x', 'b) y'], pick: 'b', why: 'w', wouldChange: 'v' }
    expect((await run(found('grill', 'Seedling: x', { question }))).logs).toEqual(['#1: pick is not one of its options'])
  })

  const stub = (over: object = {}) => found('grill', 'Fix x', { sourcesRead: [], background: 'x', ...over })

  it.each([
    ['no sources', { background, sourcesRead: [] }],
    ['a placeholder background', { sourcesRead: [{ source: 'f', learned: 'l' }], background: 'x' }],
    ['a grill without a question', {}],
  ])('re-runs a result with %s once, and keeps the retry (#3084)', async (_name, over) => {
    const good = found('grill', 'Fix x', { question: { choice: 'c', options: ['a'], pick: 'a', why: 'w', wouldChange: 'v' } })
    const { r, missing, calls } = await run(found('grill', 'Fix x', over), good)
    expect({ calls, missing, outcome: r.outcome }).toEqual({ calls: 2, missing: [], outcome: 'grill' })
  })

  it('reports an issue whose retry is thin again as missing (#3084)', async () => {
    const { r, missing, calls, logs } = await run(stub())
    expect({ r, calls, missing }).toEqual({ r: undefined, calls: 2, missing: [1] })
    expect(logs).toContain('#1: thin result again')
  })

  it('does not re-run a good result', async () => {
    expect((await run(found('blocked', 'Wait for a date'))).calls).toBe(1)
  })
})
