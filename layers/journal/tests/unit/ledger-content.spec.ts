// The Friction Ledger's real data: each occurrence's `friction` must point at a
// friction of that session whose severity is the occurrence's.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const content = join(import.meta.dirname, '../../content')
const read = (dir: string) => readdirSync(dir).filter((f) => f.endsWith('.yml')).map((f) => parse(readFileSync(join(dir, f), 'utf8')))

describe('Friction Ledger content', () => {
  const sessions = new Map<string, { frictions: { severity: string }[] }>()
  for (const space of readdirSync(content)) {
    for (const s of read(join(content, space, 'sessions'))) sessions.set(s.session, s)
  }

  it("points each occurrence's friction at a friction of its severity in that session", () => {
    const wrong: string[] = []
    for (const cluster of read(join(content, 'current/frictions'))) {
      for (const o of cluster.occurrences) {
        if (o.friction === undefined) continue
        if (sessions.get(o.session)?.frictions[o.friction]?.severity !== o.severity) wrong.push(`${cluster.name} ${o.session} #${o.friction}`)
      }
    }
    expect(wrong).toEqual([])
  })
})
