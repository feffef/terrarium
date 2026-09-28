// The Midden's reader glosses for Platform jargon (issue #1463): presentation
// only, applied at render time so authored Sites and Artifacts stay untouched.
// Nuxt-free so the first-use matching is unit-testable.

const GLOSSARY = [
  { key: 'platform', pattern: /\bPlatform\b/, gloss: 'the site itself, and the machinery every wing of it stands on' },
  { key: 'tenant', pattern: /\bTenants?\b/, gloss: 'one of the site’s self-contained wings — the Midden is one' },
  { key: 'space', pattern: /\bSpaces?\b/, gloss: 'a walled room inside a wing; nothing crosses from one room to another' },
  { key: 'collection', pattern: /\bCollections?\b/, gloss: 'a shelf of like documents within a room' },
  { key: 'manifest', pattern: /\bmanifests?\b/, gloss: 'the short declaration a wing’s rooms and shelves are built from' },
  { key: 'isolation', pattern: /\bisolation\b/, gloss: 'the rule that one room’s contents never reach another’s' },
  { key: 'adr', pattern: /\bADR-\d{4}\b/, gloss: 'a numbered decision record — the site’s dated ruling on how it is built' },
  { key: 'skill', pattern: /\bSkills?\b/, gloss: 'a written procedure the site’s agent builders follow for one kind of task' },
  { key: 'job', pattern: /\b(?:sync|consolidate|codify)\b/, gloss: 'the name of a self-improvement job — work the site was to run on itself' },
] as const satisfies readonly { key: string; pattern: RegExp; gloss: string }[]

export type MiddenGlossKey = (typeof GLOSSARY)[number]['key']

export type MiddenGlossPart = string | { key: MiddenGlossKey; text: string }

export const MIDDEN_GLOSSED_NOTES = 'midden-glossed-notes'

export function middenGlossFor(key: MiddenGlossKey): string {
  return GLOSSARY.find((g) => g.key === key)!.gloss
}

export function middenGlossParts(text: string, seen: Set<MiddenGlossKey>): MiddenGlossPart[] {
  const parts: MiddenGlossPart[] = []
  let rest = text
  for (;;) {
    let hit: { key: MiddenGlossKey; index: number; text: string } | undefined
    for (const { key, pattern } of GLOSSARY) {
      if (seen.has(key)) continue
      const m = pattern.exec(rest)
      if (m && (!hit || m.index < hit.index)) hit = { key, index: m.index, text: m[0] }
    }
    if (!hit) break
    seen.add(hit.key)
    if (hit.index) parts.push(rest.slice(0, hit.index))
    parts.push({ key: hit.key, text: hit.text })
    rest = rest.slice(hit.index + hit.text.length)
  }
  if (rest) parts.push(rest)
  return parts
}

type MinimarkNode = string | [string, Record<string, unknown>, ...MinimarkNode[]]

// Links are left whole: a button can't nest inside one.
export function middenGlossBody(nodes: MinimarkNode[], notes: Record<string, string>) {
  const seen = new Set<MiddenGlossKey>()
  const glossedNotes: Record<string, MiddenGlossPart[]> = {}
  const walk = (node: MinimarkNode): MinimarkNode[] => {
    if (typeof node === 'string') {
      return middenGlossParts(node, seen).map((p) => (typeof p === 'string' ? p : ['midden-gloss', { term: p.key }, p.text]))
    }
    const [tag, props, ...children] = node
    if (tag === 'midden-artifact') {
      const note = notes[String(props.slug)]
      if (note !== undefined) glossedNotes[String(props.slug)] = middenGlossParts(note, seen)
      return [node]
    }
    if (tag === 'a' || tag === 'pre') return [node]
    return [[tag, props, ...children.flatMap(walk)]]
  }
  return { nodes: nodes.flatMap(walk), notes: glossedNotes }
}
