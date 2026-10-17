// Prints the Human-only paths (ADR-0004) a worktree's branch touches, for
// clear-backlog to put in a PR body; a workflow script can't run git (#1942).
//
// Usage: pnpm exec tsx .agents/skills/clear-backlog/scripts/list-human-only-paths.ts <worktree>
import { matchesGlob } from 'node:path'
import { git } from '../../../../scripts/git-helpers.ts'
import { HUMAN_MERGE_RULE } from '../../../../scripts/merge-pr.ts'
import { rulePaths } from '../../../../scripts/lib/adr-rules.ts'
import { runIfMain } from '../../../../scripts/lib/cli.ts'

/** Throws when main's rule is missing or yields no globs: fail closed, like `humanMergeRefusal`. */
export function humanOnlyPaths(cwd: string): string[] {
  const globs = rulePaths(git(['show', `origin/main:${HUMAN_MERGE_RULE}`], cwd, { stdio: 'pipe' }))
  if (globs.length === 0) throw new Error(`no Human-only paths read from origin/main:${HUMAN_MERGE_RULE}`)
  const files = git(['diff', '--name-only', '--no-renames', 'origin/main...HEAD'], cwd, { stdio: 'pipe' }).split('\n').filter(Boolean)
  return files.filter((f) => globs.some((g) => matchesGlob(f, g)))
}

runIfMain(import.meta.url, () => {
  console.log(humanOnlyPaths(process.argv[2] ?? process.cwd()).join('\n'))
})
