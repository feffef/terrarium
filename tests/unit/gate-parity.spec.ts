// The Gate's step list lives in three places that must agree: `package.json`'s
// `gate` script (the full sequence), `scripts/gate.ts`'s FLOOR/HEAVY (the split
// of it), and the composite action CI runs. Historically the third drifted and
// nothing noticed — `validate:content` (ADR-0004's amendment) and
// `verify:mermaid` (#630) each ran locally for a while before CI ran them, so
// CI was silently gating on a stale subset. That drift was only possible while
// the workflow was human-only to *push*; now that the steps live in an
// agent-pushable composite (ADR-0026), it is checkable, so this fails instead.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'
import { root } from '../../shared/expand.ts'
import { FLOOR, HEAVY } from '../../scripts/gate.ts'

const ACTION = join(root, '.github/actions/gate/action.yml')

interface CompositeStep {
  name?: string
  if?: string
  run?: string
}

function readAction(): { runs: { using: string, steps: CompositeStep[] } } {
  return parseYaml(readFileSync(ACTION, 'utf8'))
}

/** The `pnpm <script>` steps, in order — `pnpm install --frozen-lockfile`,
 *  `pnpm exec …` and the doorbell's `gh` call all carry extra words, so the
 *  anchored pattern picks out exactly the gate layers and nothing else. */
function gateSteps(steps: CompositeStep[]): { script: string, step: CompositeStep }[] {
  return steps.flatMap((step) => {
    const script = step.run?.trim().match(/^pnpm ([a-z0-9:-]+)$/)?.[1]
    return script === undefined ? [] : [{ script, step }]
  })
}

function isGuarded(step: CompositeStep): boolean {
  return (step.if ?? '').includes("skip_heavy != 'true'")
}

/** `pnpm gate` is the single home of the full sequence (CLAUDE.md); re-derive it
 *  rather than hand-copying, so this can't drift the way the thing it guards did. */
function packageGateSteps(): string[] {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  return String(pkg.scripts.gate)
    .split('&&')
    .map((s: string) => s.trim().replace(/^pnpm /, ''))
}

describe('Gate parity — the composite action matches scripts/gate.ts (ADR-0026, #879)', () => {
  it('the composite action exists and is a composite', () => {
    expect(existsSync(ACTION), `${ACTION} must exist — the Gate's steps live there (ADR-0026)`).toBe(true)
    expect(readAction().runs.using).toBe('composite')
  })

  it('runs exactly FLOOR then HEAVY, in order', () => {
    const scripts = gateSteps(readAction().runs.steps).map((s) => s.script)
    expect(scripts).toEqual([...FLOOR, ...HEAVY])
  })

  it('guards every HEAVY step on the scope decision, and no FLOOR step', () => {
    for (const { script, step } of gateSteps(readAction().runs.steps)) {
      const shouldGuard = (HEAVY as readonly string[]).includes(script)
      expect(isGuarded(step), `pnpm ${script} should${shouldGuard ? '' : ' not'} be guarded on skip_heavy`).toBe(
        shouldGuard,
      )
    }
  })

  it('guards the Chromium install too — it exists only to serve the HEAVY e2e step', () => {
    const chromium = readAction().runs.steps.find((s) => s.run?.includes('playwright-core install'))
    expect(chromium, 'the composite must install Chromium for the L2 smoke gate').toBeDefined()
    expect(isGuarded(chromium!)).toBe(true)
  })

  it('matches `pnpm gate`, so the local full sequence and CI cannot diverge', () => {
    expect(packageGateSteps()).toEqual([...FLOOR, ...HEAVY])
  })
})

describe('Gate doorbell (#278, fork fix #659)', () => {
  it('skips fork PRs, whose read-only token cannot comment, and can never red the gate', () => {
    const doorbell = readAction().runs.steps.find((s) => s.run?.includes('gh pr comment'))
    expect(doorbell, 'the composite must carry the doorbell comment').toBeDefined()
    expect(doorbell!.if).toContain('github.event.pull_request.head.repo.full_name == github.repository')
    expect((doorbell as { 'continue-on-error'?: boolean })['continue-on-error']).toBe(true)
  })
})
