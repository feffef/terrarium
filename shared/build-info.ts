import { execSync } from 'node:child_process'

export interface BuildInfo { sha: string; time: string }

// Baked into the footer at build time. The SHA is empty when git is missing
// (e.g. a container build without .git), so a build never fails over it.
export function resolveBuildInfo(
  gitShortSha: () => string = () => execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString(),
  now: Date = new Date(),
): BuildInfo {
  let sha = ''
  try {
    const out = gitShortSha().trim()
    if (/^[0-9a-f]{4,40}$/.test(out)) sha = out
  } catch {
    // no git: leave the SHA empty
  }
  return { sha, time: now.toISOString().slice(0, 16) + 'Z' }
}
