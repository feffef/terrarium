// Drift gate for pre-rendered mermaid SVGs (issue #379, ADR-0024). Part of the
// always-run gate FLOOR (package.json `gate`; scripts/gate.ts FLOOR), alongside
// `verify:skills-lock`. Mirrors that drift-check pattern: it re-derives each
// diagram's content-hash key from the source and fails if the committed SVG is
// missing (a diagram changed or was added but `pnpm render:mermaid` wasn't run),
// empty, or orphaned (an SVG with no live source). It reads files ONLY — it
// never launches a browser, so it is safe in CI and the prod container, neither
// of which has Chromium (the hard constraint of #379).
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { committedSvgKeys, discoverDiagrams, root, svgPathFor } from './mermaid-lib.ts'

export interface MermaidDrift {
  /** Source diagrams whose committed SVG is absent — render is stale/missing. */
  missing: { file: string; key: string }[]
  /** Committed SVGs with no matching live source — delete them. */
  orphaned: string[]
}

/** Pure reconciliation (no fs, so unit-testable): given the live diagram keys
 *  (+ their source files) and the on-disk SVG keys, report missing + orphaned. */
export function diffMermaid(
  live: { file: string; key: string }[],
  onDiskKeys: string[],
): MermaidDrift {
  const onDisk = new Set(onDiskKeys)
  const liveKeys = new Set(live.map((d) => d.key))
  return {
    missing: live.filter((d) => !onDisk.has(d.key)).map((d) => ({ file: d.file, key: d.key })),
    orphaned: onDiskKeys.filter((k) => !liveKeys.has(k)).sort(),
  }
}

function main(): void {
  const diagrams = discoverDiagrams()
  const drift = diffMermaid(diagrams, committedSvgKeys())

  // A `missing` entry means no SVG for that key; separately guard a present-but-
  // zero-byte file (a botched write) that `missing` wouldn't catch.
  const empty = diagrams
    .map((d) => svgPathFor(d.key))
    .filter((rel) => existsSync(join(root, rel)) && statSync(join(root, rel)).size === 0)

  if (drift.missing.length === 0 && drift.orphaned.length === 0 && empty.length === 0) {
    console.log(`verify-mermaid: PASS — ${diagrams.length} diagram(s) match their committed SVGs`)
    return
  }

  console.error('\nverify-mermaid: FAIL — committed mermaid SVGs are out of sync (ADR-0024).')
  for (const m of drift.missing) console.error(`  MISSING   ${svgPathFor(m.key)} — for ${m.file}`)
  for (const f of empty) console.error(`  EMPTY     ${f} — committed SVG is zero bytes`)
  for (const k of drift.orphaned) {
    console.error(`  ORPHANED  ${svgPathFor(k)} — no live \`\`\`mermaid source hashes to this SVG`)
  }
  console.error('\nRegenerate with `pnpm render:mermaid` (author-time; drives Chromium), then commit the SVGs.\n')
  process.exit(1)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
