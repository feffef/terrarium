// Author-time mermaid pre-renderer (issue #379, ADR-0024). Renders each fenced
// ```mermaid block in the content tree to a committed, theme-adaptive inline SVG
// so the browser ships ZERO mermaid JS. This is the ONLY step that drives a
// browser — CI and prod only read the committed `.svg` files (the prod container
// has no browser, the hard constraint). Re-run it whenever a diagram changes;
// `verify:mermaid` (in the gate floor) fails if you forget.
//
//   pnpm render:mermaid          # render any diagram whose SVG is missing/stale
//   pnpm render:mermaid --force  # re-render every diagram
//   pnpm render:mermaid --check  # render to memory, report drift, write nothing
//
// How theming survives as a static SVG: render with `theme: 'base'` and each
// colour token (DIAGRAM_TOKENS) set to a unique sentinel hex, then rewrite each
// sentinel → `var(<css-var>, <fallback>)`. The result re-resolves against the
// host Tenant's `--diagram-*` palette and `prefers-color-scheme: dark` with no
// JS. Font family/size are baked (they drive getBBox layout geometry) — see
// app/utils/mermaid.ts.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'
import { resolveChromiumPath } from './chromium-path.ts'
import {
  DIAGRAM_TOKENS,
  DIAGRAM_TOKEN_FALLBACKS,
  MERMAID_RENDER_FONT,
} from '../app/utils/mermaid.ts'
import { type Diagram, discoverDiagrams, root, svgPathFor, SVG_DIR } from './mermaid-lib.ts'

// A unique, deliberately-unusual sentinel hex per colour token — far from any
// palette or author `classDef` colour so the rewrite can't hit a real value.
const TOKEN_NAMES = Object.keys(DIAGRAM_TOKENS)
export const SENTINELS: Record<string, string> = Object.fromEntries(
  TOKEN_NAMES.map((name, i) => [name, `#f0${(0xa0 + i).toString(16).padStart(2, '0')}01`]),
)

const themeVariables: Record<string, string> = {
  ...Object.fromEntries(TOKEN_NAMES.map((name) => [name, SENTINELS[name]])),
  fontFamily: MERMAID_RENDER_FONT.fontFamily,
  fontSize: MERMAID_RENDER_FONT.fontSize,
}

/** Rewrite each sentinel hex in a rendered SVG to its live `var(--diagram-*, fallback)`. */
export function themeSvg(svg: string): string {
  let out = svg
  for (const name of TOKEN_NAMES) {
    const sentinel = SENTINELS[name]!
    const cssVar = DIAGRAM_TOKENS[name]!
    const fallback = DIAGRAM_TOKEN_FALLBACKS[name]!
    // Case-insensitive: d3/mermaid emit the hex in both attributes and the
    // embedded <style>, sometimes upper-cased.
    out = out.replaceAll(new RegExp(escapeRegExp(sentinel), 'gi'), `var(${cssVar}, ${fallback})`)
  }
  return out
}

// A node label's `<foreignObject>` (fixed to the build-font text width) followed
// by its `display: table-cell` wrapper div — guarded by the trailing
// `<span class="nodeLabel ` so it never matches an edge label (those carry a
// `class="labelBkg"` div and a `nodeLabel`-free span).
const NODE_LABEL_FO =
  /<foreignObject width="([\d.]+)" height="([\d.]+)">(<div xmlns="http:\/\/www\.w3\.org\/1999\/xhtml" style=")display: table-cell(;[^"]*"><span class="nodeLabel )/g

/**
 * Make node labels tolerant of display-font width variance (issue #379 follow-up).
 * Mermaid sizes each label's `<foreignObject>` to the EXACT width the build font
 * measured, and the browser clips content at that boundary — so when a reader's
 * serif resolves wider than the build container's (the baked geometry is for a
 * specific font, ADR-0024), the label truncates ("Human prompt" → "Human pron")
 * even though the node shape has 13-30px of padding around it. We let the label
 * use that padding: `overflow: visible` on the foreignObject stops the clip, and
 * a centered flex wrapper (replacing mermaid's left-anchored `table-cell`) makes
 * any overflow spill SYMMETRICALLY, keeping the text centred on the node.
 */
export function relaxNodeLabelOverflow(svg: string): string {
  return svg.replace(
    NODE_LABEL_FO,
    '<foreignObject width="$1" height="$2" style="overflow: visible;">$3display: flex; align-items: center; justify-content: center$4',
  )
}

/** Any of this run's actual theme sentinels (SENTINELS) still present in the
 *  rendered SVG — a signal a token leaked into a derived shade the rewrite missed.
 *  Derived from SENTINELS itself, not a fixed `#f0aX01` pattern, so it can't
 *  silently stop matching once a 17th token pushes a sentinel past `#f0af01`, and
 *  it never false-flags a non-sentinel hex in that family (issue #346 review). */
export function leftoverSentinels(svg: string): string[] {
  const haystack = svg.toLowerCase()
  const found = new Set<string>()
  for (const sentinel of Object.values(SENTINELS)) {
    const lower = sentinel.toLowerCase()
    if (haystack.includes(lower)) found.add(lower)
  }
  return [...found]
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function renderOne(page: import('playwright-core').Page, diagram: Diagram): Promise<string> {
  const raw = await page.evaluate(
    async ({ code, id, themeVariables }) => {
      // `mermaid` is set on the global by the UMD bundle addScriptTag injected
      // below; this callback runs in-browser, where globalThis === window.
      const mermaid = (globalThis as unknown as { mermaid: typeof import('mermaid').default }).mermaid
      // `handDrawnSeed` pins rough.js's shape jitter to a fixed value: without it
      // mermaid re-randomises every node's outline path per render, so two renders
      // of the same source diverge and the `verify`/`--check` drift gate can never
      // settle (issue #379). `look: 'classic'` keeps the straight-edged style.
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables,
        securityLevel: 'loose',
        look: 'classic',
        handDrawnSeed: 1,
      })
      const { svg } = await mermaid.render(id, code)
      return svg
    },
    { code: diagram.source, id: `d-${diagram.key}`, themeVariables },
  )
  return `${relaxNodeLabelOverflow(themeSvg(raw)).trim()}\n`
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const force = argv.includes('--force')
  const check = argv.includes('--check')

  const diagrams = discoverDiagrams()
  if (diagrams.length === 0) {
    console.log('render-mermaid: no ```mermaid blocks found in content — nothing to render')
    return
  }

  const mermaidUmd = join(root, 'node_modules/mermaid/dist/mermaid.min.js')
  if (!existsSync(mermaidUmd)) {
    throw new Error(`render-mermaid: mermaid dist not found at ${mermaidUmd} (run \`pnpm install\`)`)
  }

  // Measure against the SAME pinned webfont the browser will display
  // (`MERMAID_RENDER_FONT`, shipped via MermaidDiagram.vue's @font-face) — the
  // build container has no matching serif installed, so without this mermaid's
  // getBBox measures a fallback and the baked geometry is wrong for real readers
  // (issue #379). Inline as a data: URI so the render never touches the network.
  const fontWoff2 = join(root, 'app/assets/fonts/gelasio-latin-400-normal.woff2')
  if (!existsSync(fontWoff2)) {
    throw new Error(`render-mermaid: pinned diagram font not found at ${fontWoff2}`)
  }
  const fontCss =
    `@font-face{font-family:'Gelasio';font-style:normal;font-weight:400;` +
    `src:url(data:font/woff2;base64,${readFileSync(fontWoff2).toString('base64')}) format('woff2');}`

  const browser = await chromium.launch({
    executablePath: resolveChromiumPath(),
    args: ['--no-sandbox', '--disable-gpu'],
  })
  const drift: string[] = []
  try {
    const page = await browser.newPage()
    await page.setContent('<!doctype html><html><body></body></html>')
    await page.addStyleTag({ content: fontCss })
    // Block until the face is actually parsed and loadable, or mermaid's first
    // getBBox races the font swap and measures the fallback anyway. `document`
    // is reached via globalThis (this callback runs in-browser, but is typed in
    // the Node context, which has no DOM lib — same cast the render callback uses).
    await page.evaluate(async () => {
      const fonts = (
        globalThis as unknown as {
          document: { fonts: { load(f: string): Promise<unknown>; ready: Promise<unknown> } }
        }
      ).document.fonts
      await fonts.load("20px 'Gelasio'")
      await fonts.ready
    })
    await page.addScriptTag({ content: readFileSync(mermaidUmd, 'utf-8') })

    mkdirSync(join(root, SVG_DIR), { recursive: true })
    for (const diagram of diagrams) {
      const outAbs = join(root, svgPathFor(diagram.key))
      const svg = await renderOne(page, diagram)
      const leftover = leftoverSentinels(svg)
      if (leftover.length) {
        throw new Error(
          `render-mermaid: unrewritten theme sentinels ${leftover.join(', ')} in ${diagram.file} — ` +
            'a colour token leaked into a mermaid-derived shade; extend DIAGRAM_TOKENS handling.',
        )
      }
      const current = existsSync(outAbs) ? readFileSync(outAbs, 'utf-8') : null
      if (current === svg && !force) {
        console.log(`render-mermaid: up to date  ${svgPathFor(diagram.key)}  (${diagram.file})`)
        continue
      }
      if (check) {
        drift.push(svgPathFor(diagram.key))
        console.log(`render-mermaid: WOULD WRITE ${svgPathFor(diagram.key)}  (${diagram.file})`)
        continue
      }
      writeFileSync(outAbs, svg)
      console.log(`render-mermaid: wrote        ${svgPathFor(diagram.key)}  (${diagram.file})`)
    }
  } finally {
    await browser.close()
  }

  if (check && drift.length) {
    console.error(`\nrender-mermaid --check: ${drift.length} SVG(s) out of date — run \`pnpm render:mermaid\``)
    process.exit(1)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.stack ?? err.message : String(err))
    process.exit(1)
  })
}
