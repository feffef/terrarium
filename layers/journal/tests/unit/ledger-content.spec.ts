// The Friction Ledger's real data: each occurrence's copied friction text must be
// a friction of that session, with the occurrence's severity.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { ledgerSeverityExceeds } from '../../app/utils/ledger'

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

  it('sets acceptedSeverity exactly on an accepted cluster, and no occurrence is above it', () => {
    const wrong: string[] = []
    for (const c of read(join(content, 'current/frictions'))) {
      if ((c.status === 'accepted') !== (c.acceptedSeverity !== undefined)) wrong.push(`${c.name}: acceptedSeverity vs status ${c.status}`)
      else if (c.status === 'accepted') for (const o of c.occurrences) if (ledgerSeverityExceeds(o.severity, c.acceptedSeverity)) wrong.push(`${c.name} ${o.session}: ${o.severity} above ${c.acceptedSeverity}`)
    }
    expect(wrong).toEqual([])
  })

  it('lists related clusters that exist, are not itself, and list it back', () => {
    const clusters = new Map(read(join(content, 'current/frictions')).map((c) => [c.name, c]))
    const wrong: string[] = []
    for (const [name, c] of clusters) {
      const seen = new Set<string>()
      for (const r of c.related ?? []) {
        if (r.entry === name || !clusters.has(r.entry)) wrong.push(`${name} -> ${r.entry}: not another existing cluster`)
        else if (!(clusters.get(r.entry).related ?? []).some((b: { entry: string }) => b.entry === name)) wrong.push(`${name} -> ${r.entry}: not listed back`)
        if (seen.size === seen.add(r.entry).size) wrong.push(`${name} -> ${r.entry}: listed twice`)
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
