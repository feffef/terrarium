// Guards issue #93's finding 5: a tsconfig `include` glob that matches nothing
// is NOT an error, so if `tenants/` is ever restructured (renamed, moved, a
// Tenant's config file relocated) the tenant/content-config typecheck coverage
// added for #93 would silently evaporate while `pnpm typecheck` — and the L0
// gate — stayed green. This test fails loudly instead: it re-derives the
// actual configured globs from the real config files (not a hand-copied
// duplicate of them — that would itself drift, CLAUDE.md's single-home rule)
// and asserts each still matches a real, known file on disk.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** Minimal glob matcher for the `*`-only patterns used in these tsconfigs (no `**`). */
function globToRegExp(glob: string): RegExp {
  const pattern = glob
    .split('*')
    .map((s) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&'))
    .join('[^/]*')
  return new RegExp(`^${pattern}$`)
}

/** Extracts the string literals inside `typescript.tsConfig.include: [...]` from
 *  `nuxt.config.ts`'s source, without importing it — `defineNuxtConfig` is only a
 *  global inside Nuxt's own config-loading step, not a plain module export. */
function readNuxtConfigTsIncludes(): string[] {
  const src = readFileSync(resolve(root, 'nuxt.config.ts'), 'utf8')
  const body = src.match(/tsConfig:\s*{\s*include:\s*\[([\s\S]*?)\]/)?.[1]
  if (!body) throw new Error('could not find typescript.tsConfig.include in nuxt.config.ts')
  return [...body.matchAll(/'([^']+)'/g)]
    .map((m) => m[1])
    .filter((s): s is string => s !== undefined)
}

/** Strips the full-line `//` comments tsconfig.node.json uses (JSONC), then parses it. */
function readTsconfigNode(): { include: string[] } {
  const src = readFileSync(resolve(root, 'tsconfig.node.json'), 'utf8')
  const stripped = src.replace(/^\s*\/\/.*$/gm, '')
  return JSON.parse(stripped)
}

describe('L0 typecheck coverage canary (issue #93)', () => {
  it('the Nuxt program has an include glob that actually matches a real Tenant nuxt.config.ts', () => {
    const includes = readNuxtConfigTsIncludes()
    // These globs are buildDir-relative (`.nuxt/../…` = repo-root-relative); strip the leading `../`.
    const repoRelative = includes.map((g) => g.replace(/^\.\.\//, ''))

    const knownFile = 'tenants/blog/nuxt.config.ts'
    expect(existsSync(resolve(root, knownFile)), `${knownFile} must exist for this canary to mean anything`).toBe(
      true,
    )
    const matched = repoRelative.some((glob) => globToRegExp(glob).test(knownFile))
    expect(matched, `no include glob (${JSON.stringify(includes)}) matches ${knownFile}`).toBe(true)
  })

  it('the Nuxt program has an include glob that actually matches a real Tenant tenant.config.ts (the manifest)', () => {
    const includes = readNuxtConfigTsIncludes()
    const repoRelative = includes.map((g) => g.replace(/^\.\.\//, ''))

    const knownFile = 'tenants/blog/tenant.config.ts'
    expect(existsSync(resolve(root, knownFile)), `${knownFile} must exist for this canary to mean anything`).toBe(
      true,
    )
    const matched = repoRelative.some((glob) => globToRegExp(glob).test(knownFile))
    expect(matched, `no include glob (${JSON.stringify(includes)}) matches ${knownFile}`).toBe(true)
  })

  it('the node program (tsconfig.node.json) actually includes content.config.ts', () => {
    const { include } = readTsconfigNode()
    const knownFile = 'content.config.ts'
    expect(existsSync(resolve(root, knownFile)), `${knownFile} must exist for this canary to mean anything`).toBe(
      true,
    )
    expect(include, `tsconfig.node.json's include (${JSON.stringify(include)}) is missing ${knownFile}`).toContain(
      knownFile,
    )
  })
})
