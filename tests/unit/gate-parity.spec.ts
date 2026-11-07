// The Gate's step list lives in three places that must agree: `package.json`'s
// `gate` script, `scripts/gate/gate.ts`'s FLOOR/HEAVY, and the composite action CI
// runs. Keeping them in sync used to be unenforceable, because the third sat
// behind a push barrier; ADR-0026 removed it and owns the rationale.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'
import { root } from '../../shared/expand.ts'
import { BUILT, FLOOR, HEAVY } from '../../scripts/gate/gate.ts'

const ACTION = join(root, '.github/actions/gate/action.yml')

interface CompositeStep {
  name?: string
  if?: string
  run?: string
  'continue-on-error'?: boolean
}

interface CompositeAction {
  runs: { using: string, steps: CompositeStep[] }
}

/** Parsed lazily and once — eagerly at module scope, a missing file would error
 *  the whole suite instead of failing the one test that says it must exist. */
let parsed: CompositeAction | undefined
function readAction(): CompositeAction {
  return (parsed ??= parseYaml(readFileSync(ACTION, 'utf8')))
}

function steps(): CompositeStep[] {
  return readAction().runs.steps
}

/** The `pnpm <script>` steps, in order — `pnpm install --frozen-lockfile`,
 *  `pnpm exec …` and the doorbell's `gh` call all carry extra words, so the
 *  anchored pattern picks out exactly the gate layers and nothing else. */
function layerSteps(): { script: string, step: CompositeStep }[] {
  return steps().flatMap((step) => {
    const script = step.run?.trim().match(/^pnpm ([a-z0-9:-]+)$/)?.[1]
    return script === undefined ? [] : [{ script, step }]
  })
}

/** `BUILT` steps (and their caches) skip on `skip_build`; the rest of HEAVY on `skip_heavy`. */
function guard(step: CompositeStep): 'skip_heavy' | 'skip_build' | undefined {
  const cond = step.if ?? ''
  if (cond.includes("skip_heavy != 'true'")) return 'skip_heavy'
  if (cond.includes("skip_build != 'true'")) return 'skip_build'
  return undefined
}

function expectedGuard(script: string): 'skip_heavy' | 'skip_build' | undefined {
  if ((BUILT as readonly string[]).includes(script)) return 'skip_build'
  return (HEAVY as readonly string[]).includes(script) ? 'skip_heavy' : undefined
}

/** `pnpm gate` is the single home of the full sequence (package.json); re-derive it
 *  rather than hand-copying, so this can't drift the way the thing it guards did. */
function packageGateScripts(): string[] {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  return String(pkg.scripts.gate)
    .split('&&')
    .map((s: string) => s.trim().replace(/^pnpm /, ''))
}

describe('Gate parity — the composite action matches scripts/gate/gate.ts (ADR-0026, #879)', () => {
  it('the composite action exists and is a composite', () => {
    expect(existsSync(ACTION), `${ACTION} must exist — the Gate's steps live there (ADR-0026)`).toBe(true)
    expect(readAction().runs.using).toBe('composite')
  })

  it('runs exactly FLOOR then HEAVY, in order', () => {
    const scripts = layerSteps().map((s) => s.script)
    expect(scripts).toEqual([...FLOOR, ...HEAVY])
  })

  it('guards every HEAVY step on its scope output, and no FLOOR step', () => {
    for (const { script, step } of layerSteps()) {
      expect(guard(step), `pnpm ${script}'s guard`).toBe(expectedGuard(script))
    }
  })

  it('guards the Chromium install too — it exists only to serve the e2e step', () => {
    const chromium = steps().find((s) => s.run?.includes('playwright-core install'))
    expect(chromium, 'the composite must install Chromium for the L2 smoke gate').toBeDefined()
    expect(guard(chromium!)).toBe('skip_build')
  })

  it('matches `pnpm gate`, so the local full sequence and CI cannot diverge', () => {
    expect(packageGateScripts()).toEqual([...FLOOR, ...HEAVY])
  })
})

describe('Gate doorbell (#278, fork fix #659)', () => {
  it('skips fork PRs, whose read-only token cannot comment, and can never red the gate', () => {
    const doorbell = steps().find((s) => s.run?.includes('gh pr comment'))
    expect(doorbell, 'the composite must carry the doorbell comment').toBeDefined()
    expect(doorbell!.if).toContain('github.event.pull_request.head.repo.full_name == github.repository')
    expect(doorbell!['continue-on-error']).toBe(true)
  })
})
