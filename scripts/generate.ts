// The generator (ADR-0002/0013): reads every Tenant manifest and emits the one
// remaining GENERATED artifact — `shared/routing.generated.ts` (the runtime routing
// map + L2 entry routes). It is committed and drift-checked because the client needs
// it at runtime, and deriving it in the browser would drag every manifest (and zod)
// into the client bundle (ADR-0013).
//
// The keyed Nuxt Content collections are NO LONGER generated here: `content.config.ts`
// is an ordinary module that builds them dynamically from `shared/expand` at
// config-evaluation time (ADR-0013, superseding the content.config.ts half of ADR-0007).
//
// The pure expansion (`expand()` + the key-uniqueness invariant) lives in
// `shared/expand.ts`, shared with `content.config.ts` and the L3 isolation test.
import { writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { expand, loadManifests, type ExpandedCollection } from '../shared/expand.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const BANNER = `// ⚠️  GENERATED FILE — DO NOT EDIT.
// Produced by scripts/generate.ts from tenants/*/tenant.config.ts (ADR-0002/0013).
// Edit a Tenant's manifest and run \`pnpm gen\`. CI drift-checks this file.
`

function renderRouting(cols: ExpandedCollection[]): string {
  const map: Record<string, Record<string, Record<string, string>>> = {}
  for (const c of cols) {
    const spaces = (map[c.tenant] ??= {})
    const collections = (spaces[c.space] ??= {})
    collections[c.collection] = c.key
  }

  const entryRoutes = [
    ...new Set(cols.filter((c) => c.type === 'page').map((c) => `/t/${c.tenant}/${c.space}`)),
  ].sort()

  return `${BANNER}
// Runtime routing map: Tenant → Space → Collection → generated collection key.
export const routingMap = ${JSON.stringify(map, null, 2)} as const

export type TenantName = keyof typeof routingMap

// Every (Tenant, Space) that owns a page collection — the L2 smoke-render targets (ADR-0004).
export const entryRoutes: string[] = ${JSON.stringify(entryRoutes, null, 2)}
`
}

function main() {
  const cols = expand(loadManifests())

  // Debug escape hatch: `pnpm gen --print` dumps the expanded collections (the same
  // set content.config.ts builds live) without writing anything — the legible view
  // that used to be the committed content.config.ts file.
  if (process.argv.includes('--print')) {
    console.log(JSON.stringify(cols.map(({ schema: _schema, ...c }) => c), null, 2))
    return
  }

  writeFileSync(join(root, 'shared', 'routing.generated.ts'), renderRouting(cols))

  console.log(
    `generated routing map for ${cols.length} collection(s) across ` +
      `${new Set(cols.map((c) => c.tenant)).size} tenant(s): ` +
      cols.map((c) => c.key).join(', '),
  )
}

// Only run when executed directly (not when imported).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }
}
