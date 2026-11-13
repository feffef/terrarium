// The PR labeler and `auto-triage` each name every Tenant (#3243): the labeler
// can't use `layers/*`, since adding a label that doesn't exist fails its run.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadManifests, root } from '../../shared/expand.ts'

const tenants = loadManifests().map(m => m.dir).sort()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('area labels name every Tenant', () => {
  it('in .github/workflows/pr-area-label.yml', () => {
    const named = [...read('.github/workflows/pr-area-label.yml').matchAll(/layers\/([a-z-]+)\/\*/g)].map(m => m[1])
    expect(named.sort()).toEqual(tenants)
  })

  it('in auto-triage\'s "Area labels"', () => {
    const list = read('.agents/skills/auto-triage/SKILL.md').match(/`area:<tenant>` \(([^)]*)\)/)?.[1] ?? ''
    expect([...list.matchAll(/`([a-z-]+)`/g)].map(m => m[1]).sort()).toEqual(tenants)
  })
})
