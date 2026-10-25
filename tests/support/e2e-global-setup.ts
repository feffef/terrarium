// The e2e project's globalSetup (vitest.config.ts): the one place L2 may build.
// Specs only serve `.output` and never build (ADR-0004), so every e2e spec file
// costs a server spawn, not a build.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { reusableOutput } from './fresh-output.ts'

const root = fileURLToPath(new URL('../..', import.meta.url))

export default function setup(): void {
  const reusable = reusableOutput(root)
  // stdout, not console.log: vitest 5 drops console output from a passing run.
  process.stdout.write(reusable
    ? `L2: reusing .output built ${reusable.builtAt.toISOString()} (newer than the latest source edit at ${reusable.latestEditAt.toISOString()}; set E2E_FRESH_BUILD=1 to force a build)\n`
    : 'L2: no fresh .output — building\n')
  if (reusable) return

  const build = spawnSync('pnpm', ['build'], { cwd: root, stdio: 'inherit' })
  if (build.status !== 0) throw new Error(`pnpm build failed (${build.error?.message ?? `exit ${build.status}`})`)
  // E2E_FRESH_BUILD makes reusableOutput() decline by design, so only the
  // default path can prove the build is the one we serve.
  if (!process.env.E2E_FRESH_BUILD && !reusableOutput(root)) throw new Error('pnpm build left no fresh .output')
}
