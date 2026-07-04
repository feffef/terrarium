// The generator (ADR-0002): reads every tenant manifest and produces the two
// GENERATED artifacts — `content.config.ts` (the keyed Nuxt Content collections)
// and `shared/routing.generated.ts` (the runtime routing map + L2 entry routes).
//
// The cross-product expansion is the mechanical, error-prone part, so it is code.
// `expand()` is a pure function exported for the L3 isolation test (ADR-0004).
import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  collectionKey,
  validateManifest,
  type CollectionType,
  type TenantManifest,
} from '../shared/manifest.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tenantsDir = join(root, 'tenants')

const BANNER = `// ⚠️  GENERATED FILE — DO NOT EDIT.
// Produced by scripts/generate.ts from tenants/*/tenant.config.ts (ADR-0002).
// Edit a Tenant's manifest and run \`pnpm gen\`. CI drift-checks this file.
`

export interface LoadedManifest {
  dir: string
  manifest: TenantManifest
}

export interface ExpandedCollection {
  key: string
  tenant: string
  space: string
  collection: string
  type: CollectionType
  include: string
  /** Content dir for this (tenant, space, collection), relative to project root (posix). */
  cwdRel: string
}

async function loadManifests(): Promise<LoadedManifest[]> {
  const dirs = readdirSync(tenantsDir)
    .filter((d) => {
      try {
        return statSync(join(tenantsDir, d)).isDirectory()
      } catch {
        return false
      }
    })
    .sort()

  const loaded: LoadedManifest[] = []
  for (const dir of dirs) {
    const file = join(tenantsDir, dir, 'tenant.config.ts')
    const mod = (await import(pathToFileURL(file).href)) as { default: TenantManifest }
    const manifest = mod.default
    if (manifest?.name !== dir) {
      throw new Error(`tenant folder "${dir}" does not match manifest name "${manifest?.name}"`)
    }
    loaded.push({ dir, manifest })
  }
  return loaded
}

/** Pure Tenant × Space × Collection expansion. Enforces the L3 key-uniqueness invariant. */
export function expand(manifests: LoadedManifest[]): ExpandedCollection[] {
  const out: ExpandedCollection[] = []
  for (const { manifest } of manifests) {
    const errs = validateManifest(manifest)
    if (errs.length) {
      throw new Error(`invalid manifest "${manifest.name}":\n- ${errs.join('\n- ')}`)
    }
    for (const space of manifest.spaces) {
      for (const [collection, def] of Object.entries(manifest.collections)) {
        out.push({
          key: collectionKey(manifest.name, space, collection),
          tenant: manifest.name,
          space,
          collection,
          type: def.type,
          include: def.source ?? '**',
          cwdRel: `tenants/${manifest.name}/content/${space}/${collection}`,
        })
      }
    }
  }

  // ADR-0004 L3: collection keys must be globally unique and correctly scoped.
  const seen = new Set<string>()
  for (const c of out) {
    if (seen.has(c.key)) throw new Error(`duplicate collection key "${c.key}" — isolation violated`)
    seen.add(c.key)
  }
  return out
}

function renderContentConfig(cols: ExpandedCollection[], tenantDirs: string[]): string {
  const imports = tenantDirs
    .map((t) => `import ${t}Manifest from './tenants/${t}/tenant.config'`)
    .join('\n')

  const entries = cols
    .map((c) => {
      const source =
        c.type === 'page'
          ? `{ cwd: dir('${c.cwdRel}'), include: '${c.include}', prefix: '/' }`
          : `{ cwd: dir('${c.cwdRel}'), include: '${c.include}' }`
      return `    ${c.key}: defineCollection({
      type: '${c.type}',
      source: ${source},
      schema: ${c.tenant}Manifest.collections.${c.collection}.schema,
    }),`
    })
    .join('\n')

  return `${BANNER}
import { defineCollection, defineContentConfig } from '@nuxt/content'
import { fileURLToPath } from 'node:url'
${imports}

// Absolute path to a (Tenant, Space, Collection) content dir, resolved from this file.
const dir = (p: string) => fileURLToPath(new URL('./' + p, import.meta.url))

export default defineContentConfig({
  collections: {
${entries}
  },
})
`
}

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

async function main() {
  const manifests = await loadManifests()
  const cols = expand(manifests)

  writeFileSync(
    join(root, 'content.config.ts'),
    renderContentConfig(cols, manifests.map((m) => m.dir)),
  )
  writeFileSync(join(root, 'shared', 'routing.generated.ts'), renderRouting(cols))

  console.log(
    `generated ${cols.length} collection(s) across ${manifests.length} tenant(s): ` +
      cols.map((c) => c.key).join(', '),
  )
}

// Only run when executed directly (not when imported by the L3 test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
