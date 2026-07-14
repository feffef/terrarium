// Pure + thin-shell helpers for discovering content pages that embed a fenced
// ```mermaid block (issue #469) — reused by the platform smoke sweep
// (`tests/e2e/smoke.spec.ts`) so a new mermaid diagram on ANY page, in ANY
// Tenant, gets render coverage for free. Data-driven off the SAME expanded
// manifests `entryRoutesFrom` uses (shared/expand.ts) — never hard-coded.
import { globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { root, type ExpandedCollection } from '../../shared/expand.ts'

const MERMAID_FENCE = /^```mermaid\s*$/m

/** True when `body` (a Markdown Document's raw source) contains a fenced ```mermaid block. */
export function hasMermaidFence(body: string): boolean {
  return MERMAID_FENCE.test(body)
}

/**
 * The route for a `page`-collection Document at `relPath` (posix, relative to its
 * collection's content dir — e.g. `'index.md'`, `'how-it-works.md'`,
 * `'digests/2026-07-04.md'`) within `(tenant, space)`. Mirrors the file → route
 * convention `app/pages/t/[tenant]/[space]/[...slug].vue` resolves at runtime: an
 * `index.md` (at any depth) is its own directory's route; every other file's
 * extension-stripped path is its slug.
 */
export function mermaidPageRoute(tenant: string, space: string, relPath: string): string {
  const slug = relPath.replace(/\.md$/, '').replace(/(^|\/)index$/, '')
  return slug ? `/t/${tenant}/${space}/${slug}` : `/t/${tenant}/${space}`
}

/**
 * Discover every `page`-collection Document, across every Tenant, whose body
 * contains a fenced ```mermaid block, and return its route — sorted, deduped.
 */
export function mermaidRoutes(cols: ExpandedCollection[]): string[] {
  const routes = new Set<string>()
  for (const c of cols) {
    if (c.type !== 'page') continue
    const dir = join(root, c.cwdRel)
    for (const relPath of globSync(c.include, { cwd: dir })) {
      if (hasMermaidFence(readFileSync(join(dir, relPath), 'utf-8'))) {
        routes.add(mermaidPageRoute(c.tenant, c.space, relPath))
      }
    }
  }
  return [...routes].sort()
}
