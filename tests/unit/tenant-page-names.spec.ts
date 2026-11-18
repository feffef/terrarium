// A hand-built page directly under a Tenant's root (`/t/<tenant>/<name>`,
// ADR-0016) outranks the `[space]` route, so a Space with that slug would
// become unreachable. Nothing else notices, so this does.
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadManifests, root } from '../../shared/expand.ts'

describe('Tenant root pages', () => {
  it('never share a name with a Space of the same Tenant', () => {
    for (const { manifest } of loadManifests()) {
      const dir = join(root, 'layers', manifest.name, 'app/pages/t', manifest.name)
      const files = existsSync(dir) ? readdirSync(dir) : []
      const names = files.filter((f) => f.endsWith('.vue') && f !== 'index.vue' && !f.startsWith('['))
        .map((f) => f.slice(0, -'.vue'.length))
      for (const name of names) expect(manifest.spaces, `${manifest.name}/${name}`).not.toContain(name)
    }
  })
})
