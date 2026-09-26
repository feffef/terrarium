// Usage (from the repo root):
//   node .agents/skills/tinkerfund-campaign/tools/preview.mjs <figures.mjs> <out-dir>
// <figures.mjs> exports `figures` ([{ style, caption, svg }]) and optionally
// `before` (same shape, the drawings being replaced, shown side by side).
// Writes <out-dir>/sheet.html and sheet.png: every figure in the light and dark
// theme at 400px and at the 120/84/52px sizes cards, the index table and the
// gallery thumbnails use, framed like the Campaign page. Prints bytes and
// schema problems per figure. Look at the PNG with the Read tool.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { check } from './lib.mjs'

const [modulePath, outDir] = process.argv.slice(2)
if (!modulePath || !outDir) throw new Error('usage: preview.mjs <figures.mjs> <out-dir>')
const { figures, before = [] } = await import(pathToFileURL(resolve(modulePath)).href)
const ROOT = process.cwd()
const FONTS = `${ROOT}/layers/tinkerfund/app/assets/fonts`
const tokens = readFileSync(`${ROOT}/layers/tinkerfund/app/assets/theme.css`, 'utf8')
  .split('\n').filter((l) => /^\s+--tf-(bg|surface|ink|muted|line|accent|link|good|warn|bad|grid|mark)[a-z-]*: /.test(l)).join('\n')

const S = (svg) => `<svg viewBox="0 0 400 300">${svg}</svg>`
const cell = (fig, label) => `<div class="col"><div class="frame big"><span class="cap">${label} · ${fig.style}</span>${S(fig.svg)}</div>
<div class="row"><div class="frame sm">${S(fig.svg)}</div><div class="frame xs">${S(fig.svg)}</div><div class="frame ic">${S(fig.svg)}</div><p class="capt">${fig.caption}</p></div></div>`
const cards = () => figures.map((fig, i) => `<div class="pair">${before[i] ? cell(before[i], `FIG. ${i + 1} · BEFORE`) : ''}${cell(fig, `FIG. ${i + 1}`)}</div>`).join('')

const html = `<!doctype html><meta charset="utf-8">
<style>
@font-face{font-family:'IBM Plex Mono';font-weight:500;src:url('file://${FONTS}/ibm-plex-mono-latin-500-normal.woff2') format('woff2')}
.tf-page{
${tokens}
--tf-mono:'IBM Plex Mono',ui-monospace,monospace;
--tf-paper:linear-gradient(var(--tf-grid) 1px,transparent 1px) 0 0/16px 16px,linear-gradient(90deg,var(--tf-grid) 1px,transparent 1px) 0 0/16px 16px;
background:var(--tf-bg);color:var(--tf-ink);padding:10px;font:12px system-ui}
.light{color-scheme:light}.dark{color-scheme:dark}
body{margin:0;display:grid;grid-template-columns:1fr 1fr}
.pair{display:flex;gap:10px;margin-bottom:12px}.col{display:grid;gap:6px}
.frame{position:relative;border:1px solid var(--tf-line);border-radius:10px;background:var(--tf-paper),var(--tf-surface);padding:24px 12px 8px}
.frame svg{display:block;width:100%;height:auto}
.cap{position:absolute;left:10px;top:7px;font:500 10px var(--tf-mono);color:var(--tf-muted);letter-spacing:.08em;text-transform:uppercase}
.big{width:400px;box-sizing:border-box}.sm{width:120px;padding:4px}.xs{width:84px;padding:4px}.ic{width:52px;padding:2px;border-radius:4px}
.row{display:flex;gap:6px;align-items:center}.capt{color:var(--tf-muted);max-width:120px;margin:0;font-size:10px}
</style>
<div class="tf-page light">${cards()}</div><div class="tf-page dark">${cards()}</div>`

mkdirSync(outDir, { recursive: true })
const sheet = resolve(outDir, 'sheet.html')
writeFileSync(sheet, html)
const width = before.length ? 1760 : 940
const height = 60 + figures.length * 330
execFileSync('pnpm', ['exec', 'tsx', 'scripts/screenshot.ts', pathToFileURL(sheet).href, resolve(outDir, 'sheet.png'), `${width}x${height}`], { stdio: 'inherit' })
for (const [i, fig] of figures.entries()) {
  const { bytes, problems } = check(fig.svg)
  console.log(`FIG. ${i + 1} ${fig.style.padEnd(9)} ${String(bytes).padStart(4)} B  ${problems.length ? 'PROBLEMS: ' + problems.join('; ') : 'ok'}`)
}
