// Shared fs-side helpers for the mermaid author-time renderer
// (`scripts/render-mermaid.ts`) and the drift gate (`scripts/verify-mermaid.ts`),
// issue #379. The PURE bits (key, extractor, token contract) live in
// `app/utils/mermaid.ts` and are imported here — this module owns only the
// filesystem walk and path conventions so the two scripts can't drift on where
// SVGs live or which content they scan.
import { existsSync, globSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  extractMermaidBlocks,
  MERMAID_RENDER_FONT,
  type MermaidFont,
  mermaidKey,
  normalizeMermaidSource,
} from '../app/utils/mermaid.ts'
import { root } from './lib/cli.ts'

export { root }

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
  /** Its committed SVG's basename key (mermaidKey of the source and font). */
  key: string
  /** Its Tenant's render font. */
  font: MermaidFont
}

async function tenantFont(cwd: string, tenant: string): Promise<MermaidFont> {
  const file = join(cwd, 'layers', tenant, 'mermaid-font.ts')
  if (!existsSync(file)) return MERMAID_RENDER_FONT
  return ((await import(pathToFileURL(file).href)) as { default: MermaidFont }).default
}

/** Repo-relative path of the committed SVG for a given key. */
export function svgPathFor(key: string): string {
  return join(SVG_DIR, `${key}.svg`)
}

/**
 * Scan every Tenant's content for fenced ```mermaid blocks and return one
 * `Diagram` per DISTINCT key (the same source in the same font renders once;
 * in two Tenants with different fonts, twice). Reads files only; never launches
 * a browser, so both the renderer and the drift gate can call it.
 */
export async function discoverDiagrams(cwd = root): Promise<Diagram[]> {
  const byKey = new Map<string, Diagram>()
  for (const rel of globSync(CONTENT_GLOB, { cwd }).sort()) {
    const font = await tenantFont(cwd, rel.split('/')[1]!)
    const md = readFileSync(join(cwd, rel), 'utf-8')
    for (const block of extractMermaidBlocks(md)) {
      const source = normalizeMermaidSource(block)
      const key = mermaidKey(source, font)
      if (!byKey.has(key)) byKey.set(key, { file: rel, source, key, font })
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
