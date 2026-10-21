// The Friction Ledger's real data: each occurrence's copied friction text must be
// a friction of that session, with the occurrence's severity.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const content = join(import.meta.dirname, '../../content')
const read = (dir: string) => readdirSync(dir).filter((f) => f.endsWith('.yml')).map((f) => parse(readFileSync(join(dir, f), 'utf8')))

describe('Friction Ledger content', () => {
  const sessions = new Map<string, { frictions: { severity: string; description: string; solution: string }[] }>()
  const flat = (text: string) => text.split(/\s+/).filter(Boolean).join(' ')
  for (const space of readdirSync(content)) {
    for (const s of read(join(content, space, 'sessions'))) sessions.set(s.session, s)
  }

  it("copies each occurrence's friction text from a friction of that severity in its session log", () => {
    const wrong: string[] = []
    for (const cluster of read(join(content, 'current/frictions'))) {
      for (const o of cluster.occurrences) {
        const logged = sessions.get(o.session)?.frictions.some((f) => f.severity === o.severity && flat(f.description) === o.description && flat(f.solution) === o.solution)
        if (!logged) wrong.push(`${cluster.name} ${o.session}`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('counts a session once per cluster', () => {
    const wrong: string[] = []
    for (const cluster of read(join(content, 'current/frictions'))) {
      const seen = new Set<string>()
      for (const o of cluster.occurrences) if (seen.size === seen.add(o.session).size) wrong.push(`${cluster.name} ${o.session}`)
    }
    expect(wrong).toEqual([])
  })
})
