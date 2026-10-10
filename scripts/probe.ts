// Ad-hoc computed-value probe (issue #953): evaluates a JS expression in the
// context of an already-serving page and prints the result. Fills the gap
// `scripts/screenshot.ts` leaves for a computed style, a bounding rect, or any
// other in-page value a session needs to check without eyeballing a render —
// and without the scratchpad's `playwright-core` resolution problem, since
// this lives in `scripts/` alongside the resolvable devDependency.
//
// `--wait-ms` (issue #966): a bare `page.goto` resolves before Nuxt hydrates,
// so evaluating immediately can silently no-op against a not-yet-interactive
// page. Defaults to a small nonzero wait; override for a slower page.
//
// `--viewport WxH`: sets the page viewport directly (as `screenshot.ts` does),
// so layout can be measured at a narrow width without an iframe workaround.
//
// Usage:
//   pnpm exec tsx scripts/probe.ts <url> "<js-expression>" [--wait-ms <ms>] [--viewport WxH]
//
// Example:
//   pnpm exec tsx scripts/probe.ts http://localhost:3000/t/journal/current \
//     "getComputedStyle(document.querySelector('.foo')).color"
import { chromium } from 'playwright-core'
import { resolveChromiumPath } from './chromium-path'
import { extractFlag, parseSize } from './screenshot'

const DEFAULT_WAIT_MS = 300

const USAGE =
  'Usage: pnpm exec tsx scripts/probe.ts <url> "<js-expression>" [--wait-ms <ms>] [--viewport WxH]\n' +
  `  --wait-ms <ms>   post-navigation wait before evaluating, so Nuxt can\n` +
  `                   hydrate first; defaults to ${DEFAULT_WAIT_MS}\n` +
  `  --viewport WxH   page viewport size, e.g. 390x844; defaults to Playwright's 1280x720`

async function evaluate(url: string, expression: string, waitMs: number, viewport?: { width: number; height: number }): Promise<unknown> {
  const browser = await chromium.launch({
    executablePath: resolveChromiumPath(),
    args: ['--no-sandbox', '--disable-gpu'],
  })
  try {
    const page = await browser.newPage({ viewport })
    await page.goto(url)
    await page.waitForTimeout(waitMs)
    return await page.evaluate(expression)
  } finally {
    await browser.close()
  }
}

async function main(): Promise<void> {
  const { value: waitMsArg, rest: afterWait } = extractFlag(process.argv.slice(2), '--wait-ms')
  const { value: viewportArg, rest } = extractFlag(afterWait, '--viewport')
  const [url, expression] = rest

  let waitMs = DEFAULT_WAIT_MS
  if (waitMsArg !== undefined) {
    const parsed = Number(waitMsArg)
    if (!Number.isInteger(parsed) || parsed < 0) {
      console.error(`Invalid --wait-ms "${waitMsArg}" — expected a non-negative integer (ms).`)
      process.exit(1)
    }
    waitMs = parsed
  }

  let viewport: { width: number; height: number } | undefined
  if (viewportArg !== undefined) {
    const size = parseSize(viewportArg)
    if (!size) {
      console.error(`Invalid --viewport "${viewportArg}" — expected <width>x<height>, e.g. 390x844.`)
      process.exit(1)
    }
    const [width, height] = size.split(',').map(Number) as [number, number]
    viewport = { width, height }
  }

  if (!url || !expression) {
    console.error(USAGE)
    process.exit(1)
  }

  try {
    const result = await evaluate(url, expression, waitMs, viewport)
    console.log(result === undefined ? 'undefined' : typeof result === 'object' && result !== null ? JSON.stringify(result, null, 2) : String(result))
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

main()
