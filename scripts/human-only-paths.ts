// Prints the Human-only paths (ADR-0004) a worktree's branch touches, for
// clear-backlog to put in a PR body; a workflow script can't run git (#1942).
//
// Usage: pnpm exec tsx scripts/human-only-paths.ts <worktree>
import { execFileSync } from 'node:child_process'
import { matchesGlob } from 'node:path'
import { pathToFileURL } from 'node:url'
import { HUMAN_MERGE_RULE } from './merge-pr.ts'
import { rulePaths } from './validate-adr-rules.ts'

const git = (cwd: string, args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' })

function mainGlobs(cwd: string): string[] {
  try {
    return rulePaths(git(cwd, ['show', `origin/main:${HUMAN_MERGE_RULE}`]))
  } catch {
    return []
  }
}

/** Throws when main's rule yields no globs: fail closed, like `humanMergeRefusal`. */
export function humanOnlyPaths(cwd: string): string[] {
  const globs = mainGlobs(cwd)
  if (globs.length === 0) throw new Error(`no Human-only paths read from origin/main:${HUMAN_MERGE_RULE}`)
  const files = git(cwd, ['diff', '--name-only', '--no-renames', 'origin/main...HEAD']).split('\n').filter(Boolean)
  return files.filter((f) => globs.some((g) => matchesGlob(f, g)))
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    console.log(humanOnlyPaths(process.argv[2] ?? process.cwd()).join('\n'))
  } catch (err) {
    console.error(`human-only-paths: ${(err as Error).message}`)
    process.exit(1)
  }
}
