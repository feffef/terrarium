// Shared fs-side helpers for the mermaid author-time renderer
// (`scripts/render-mermaid.ts`) and the drift gate (`scripts/verify-mermaid.ts`),
// issue #379. The PURE bits (key, extractor, token contract) live in
// `app/utils/mermaid.ts` and are imported here — this module owns only the
// filesystem walk and path conventions so the two scripts can't drift on where
// SVGs live or which content they scan.
import { globSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractMermaidBlocks, mermaidKey, normalizeMermaidSource } from '../app/utils/mermaid.ts'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Where committed, theme-adaptive SVGs live — bundled into the client by the
 *  component's `import.meta.glob` (app/components/MermaidDiagram.vue). */
export const SVG_DIR = 'app/assets/mermaid'

/** Every Markdown file under a Tenant layer's content tree. */
const CONTENT_GLOB = 'layers/*/content/**/*.md'

export interface Diagram {
  /** Repo-relative path of the source Document (for diagnostics). */
  file: string
  /** The raw mermaid source (normalised). */
  source: string
  /** Its committed SVG's basename key (mermaidKey of the source). */
  key: string
}

/** Repo-relative path of the committed SVG for a given key. */
export function svgPathFor(key: string): string {
  return join(SVG_DIR, `${key}.svg`)
}

/**
 * Scan every Tenant's content for fenced ```mermaid blocks and return one
 * `Diagram` per DISTINCT source (deduped by key — the same diagram authored on
 * two pages renders once). Reads files only; never launches a browser, so both
 * the renderer and the drift gate can call it.
 */
export function discoverDiagrams(cwd = root): Diagram[] {
  const byKey = new Map<string, Diagram>()
  for (const rel of globSync(CONTENT_GLOB, { cwd }).sort()) {
    const md = readFileSync(join(cwd, rel), 'utf-8')
    for (const block of extractMermaidBlocks(md)) {
      const source = normalizeMermaidSource(block)
      const key = mermaidKey(source)
      if (!byKey.has(key)) byKey.set(key, { file: rel, source, key })
    }
  }
  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key))
}

/** Repo-relative names (`<key>.svg`) of every committed SVG on disk. */
export function committedSvgKeys(cwd = root): string[] {
  return globSync('*.svg', { cwd: join(cwd, SVG_DIR) })
    .map((name) => relative('', name).replace(/\.svg$/, ''))
    .sort()
}
