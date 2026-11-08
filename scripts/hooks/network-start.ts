// SessionStart hook: tell the session which hosts its proxy lets through, so it
// doesn't discover blocked docs hosts by failing (issue #2959). Best-effort:
// every probe is bounded by PROBE_TIMEOUT_S and any failure prints nothing.
import { execFile } from 'node:child_process'
import { isMain } from '../lib/cli.ts'

// What blocked hosts mean and what to do instead: docs/agents/environment-caveats.md.
export const PROBED_HOSTS = [
  'docs.github.com',
  'git-scm.com',
  'developer.mozilla.org',
  'vuejs.org',
  'nuxt.com',
  'zod.dev',
  'vitest.dev',
  'raw.githubusercontent.com',
]
const PROBE_TIMEOUT_S = 3

export type Reach = 'readable' | 'blocked' | 'unknown'

// A 403 on CONNECT is the proxy's policy block; any completed connection, whatever
// the HTTP status, means the host is reachable.
export function probeHost(host: string): Promise<Reach> {
  return new Promise((resolve) => {
    execFile(
      'curl',
      ['-sS', '-I', '-m', String(PROBE_TIMEOUT_S), '-o', '/dev/null', '-w', '%{http_code}', `https://${host}`],
      { timeout: (PROBE_TIMEOUT_S + 1) * 1000 },
      (err, stdout, stderr) => {
        if (/CONNECT tunnel failed, response 403/.test(stderr)) resolve('blocked')
        else if (!err && /^[1-5]\d\d$/.test(stdout.trim())) resolve('readable')
        else resolve('unknown')
      },
    )
  })
}

export async function networkStartMessage(
  env: Record<string, string | undefined>,
  probe: (host: string) => Promise<Reach> = probeHost,
): Promise<string | null> {
  if (!env.HTTPS_PROXY) return null
  const results = await Promise.all(PROBED_HOSTS.map((h) => probe(h).catch((): Reach => 'unknown')))
  const by = (r: Reach) => PROBED_HOSTS.filter((_, i) => results[i] === r)
  const readable = by('readable')
  if (readable.length === PROBED_HOSTS.length) return 'Network reach (probed): all probed hosts readable.'
  const parts = (['readable', 'blocked', 'unknown'] as const)
    .filter((r) => by(r).length > 0)
    .map((r) => `${r}: ${by(r).join(', ')}`)
  const note = by('blocked').length > 0 ? ' Blocked hosts are not only docs hosts.' : ''
  return `Network reach (probed): ${parts.join('; ')}.${note} Fallbacks and the Unrestricted-environment option: docs/agents/environment-caveats.md.`
}

if (isMain(import.meta.url)) {
  try {
    const msg = await networkStartMessage(process.env)
    if (msg) console.log(msg)
  } catch {
    // Best-effort: a probe failure must never block session start.
  }
}
