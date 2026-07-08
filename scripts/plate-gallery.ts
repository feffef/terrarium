// Atlas specimen plate gallery (issue #230): renders a set of specimen plates
// (`/t/atlas/<biome>/<slug>`, `.atlas-plate`) into a single side-by-side
// comparison sheet, so plate-authoring sessions stop writing a throwaway
// gallery harness to eyeball new art against the existing quality bar (two
// sessions had to build one from scratch — PR #218, PR #225).
//
// Same pattern as `scripts/screenshot.ts`: drives the pre-installed Chromium
// via `resolveChromiumPath()` (`scripts/chromium-path.ts`), no new dependency,
// no browser download. Unlike `screenshot.ts`, this needs element-level
// capture (just the plate, not the whole page) and multiple navigations, so
// it drives Chromium through `playwright-core` (already a devDependency, see
// CLAUDE.md's "Verifying UI changes" ad-hoc-script pattern) rather than the
// bare CLI screenshot flag.
//
// How it builds ONE comparison image without an image-compositing dependency:
// it screenshots each plate element individually, then embeds those PNGs as
// base64 `<img>` tags in a small CSS-grid HTML page and screenshots THAT page
// full-page. The compositing happens in the browser's own layout engine.
//
// Usage:
//   pnpm exec tsx scripts/plate-gallery.ts <base-url> <out.png> [biome/slug ...]
//
// Requires a running server at <base-url> — this script only navigates to it,
// it doesn't start one. Bring one up with `pnpm exec tsx scripts/preview.ts
// start` (it prints the `URL=` to pass here) and tear it down with `preview.ts
// stop <pid>` when done. With no `biome/slug` args, it renders every specimen
// plate in every
// Atlas biome (discovered from `layers/atlas/content/*/pages/*.md`). Pass
// specific refs to compare a subset, e.g.:
//   pnpm exec tsx scripts/plate-gallery.ts http://localhost:3000 /tmp/gallery.png \
//     canopy/lumina-fabulae canopy/aranea-patiens
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'
import { resolveChromiumPath } from './chromium-path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ATLAS_CONTENT_DIR = join(root, 'layers/atlas/content')

const USAGE =
  'Usage: pnpm exec tsx scripts/plate-gallery.ts <base-url> <out.png> [biome/slug ...]\n' +
  '  <base-url>    a running pnpm dev/preview server, e.g. http://localhost:3000\n' +
  '  [biome/slug]  zero or more specimen refs, e.g. canopy/lumina-fabulae; with\n' +
  '                none given, every specimen plate in every Atlas biome is rendered.'

interface PlateRef {
  space: string
  slug: string
}

/** Every specimen ref in `layers/atlas/content/<space>/pages/*.md`, excluding
 *  each biome's `index.md` landing page (not a specimen). */
function discoverAllPlates(): PlateRef[] {
  const refs: PlateRef[] = []
  for (const space of readdirSync(ATLAS_CONTENT_DIR).sort()) {
    const pagesDir = join(ATLAS_CONTENT_DIR, space, 'pages')
    if (!existsSync(pagesDir)) continue
    for (const file of readdirSync(pagesDir).sort()) {
      if (!file.endsWith('.md') || file === 'index.md') continue
      refs.push({ space, slug: file.slice(0, -'.md'.length) })
    }
  }
  return refs
}

/** Parse `biome/slug` CLI args into refs; throws on a malformed ref. */
function parseRefs(args: string[]): PlateRef[] {
  return args.map((arg) => {
    const [space, ...rest] = arg.split('/')
    const slug = rest.join('/')
    if (!space || !slug) {
      throw new Error(`Invalid ref "${arg}" — expected "biome/slug", e.g. "canopy/lumina-fabulae".`)
    }
    return { space, slug }
  })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

interface CapturedPlate {
  ref: PlateRef
  caption: string
  pngBase64: string
}

/** Capture one specimen's plate element (`.atlas-plate`) as a PNG, plus its
 *  caption text — both read straight off the rendered page, not re-derived
 *  from content frontmatter, so the gallery matches what the site actually
 *  shows. Returns `undefined` (with a stderr warning) for a ref that doesn't
 *  resolve to a specimen (typo, wrong biome, …) rather than failing the run. */
async function capturePlate(
  page: import('playwright-core').Page,
  baseUrl: string,
  ref: PlateRef,
): Promise<CapturedPlate | undefined> {
  const url = `${baseUrl.replace(/\/+$/, '')}/t/atlas/${ref.space}/${ref.slug}`
  await page.goto(url, { waitUntil: 'load' })

  const notFound = await page.locator('.not-found').count()
  if (notFound > 0) {
    console.error(`Skipping ${ref.space}/${ref.slug}: not catalogued at ${url}`)
    return undefined
  }

  const plate = page.locator('.atlas-plate')
  await plate.waitFor({ state: 'visible', timeout: 15_000 })
  const png = await plate.screenshot()
  const caption = (await page.locator('.plate-caption').innerText().catch(() => '')) || `${ref.space}/${ref.slug}`

  return { ref, caption: caption.trim(), pngBase64: png.toString('base64') }
}

/** Compose captured plates into one CSS-grid HTML page — the compositing step
 *  happens in the browser's layout engine, so no image library is needed. */
function buildGalleryHtml(plates: CapturedPlate[], baseUrl: string): string {
  const cells = plates
    .map(
      (p) => `
      <figure class="cell">
        <img src="data:image/png;base64,${p.pngBase64}" alt="${escapeHtml(p.caption)}" />
        <figcaption>${escapeHtml(p.caption)}<br /><span class="ref">${escapeHtml(`${p.ref.space}/${p.ref.slug}`)}</span></figcaption>
      </figure>`,
    )
    .join('\n')

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Atlas plate gallery</title>
<style>
  body { margin: 0; padding: 24px; background: #f4f1ea; font-family: Georgia, serif; color: #2a2419; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #6b6250; margin: 0 0 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }
  .cell { margin: 0; background: #fff; border: 1px solid #d8d2c2; border-radius: 4px; padding: 10px; }
  .cell img { display: block; width: 100%; height: auto; }
  figcaption { margin-top: 8px; font-size: 13px; text-align: center; }
  figcaption .ref { font-size: 11px; color: #8a8168; font-style: normal; }
</style>
</head>
<body>
  <h1>Atlas plate gallery</h1>
  <p class="meta">${plates.length} plate(s) · ${escapeHtml(baseUrl)} · generated ${new Date().toISOString()}</p>
  <div class="grid">${cells}
  </div>
</body>
</html>`
}

async function main(): Promise<void> {
  const [baseUrl, out, ...refArgs] = process.argv.slice(2)
  if (!baseUrl || !out) {
    console.error(USAGE)
    process.exit(1)
  }

  let refs: PlateRef[]
  try {
    refs = refArgs.length > 0 ? parseRefs(refArgs) : discoverAllPlates()
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    console.error(USAGE)
    process.exit(1)
  }
  if (refs.length === 0) {
    console.error('No specimen plates found to render.')
    process.exit(1)
  }

  let chromiumPath: string
  try {
    chromiumPath = resolveChromiumPath()
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }

  const browser = await chromium.launch({ executablePath: chromiumPath, args: ['--no-sandbox'] })
  const tmpDir = mkdtempSync(join(tmpdir(), 'plate-gallery-'))
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 800 } })
    const plates: CapturedPlate[] = []
    for (const ref of refs) {
      const captured = await capturePlate(page, baseUrl, ref)
      if (captured) plates.push(captured)
    }
    await page.close()

    if (plates.length === 0) {
      console.error('No plates could be captured (all refs failed to resolve) — nothing written.')
      process.exit(1)
    }

    const galleryHtmlPath = join(tmpDir, 'gallery.html')
    writeFileSync(galleryHtmlPath, buildGalleryHtml(plates, baseUrl))

    const galleryPage = await browser.newPage({ viewport: { width: 1600, height: 900 } })
    await galleryPage.goto(pathToFileURL(galleryHtmlPath).href, { waitUntil: 'load' })
    await galleryPage.screenshot({ path: out, fullPage: true })
    await galleryPage.close()

    console.log(`plate-gallery: wrote ${plates.length}/${refs.length} plate(s) to ${out}`)
  } finally {
    await browser.close()
    rmSync(tmpDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : String(err))
  process.exit(1)
})
