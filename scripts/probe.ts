// Ad-hoc computed-value probe (issue #953): evaluates a JS expression in the
// context of an already-serving page and prints the result. Fills the gap
// `scripts/screenshot.ts` leaves for a computed style, a bounding rect, or any
// other in-page value a session needs to check without eyeballing a render —
// and without the scratchpad's `playwright-core` resolution problem, since
// this lives in `scripts/` alongside the resolvable devDependency.
//
// Usage:
//   pnpm exec tsx scripts/probe.ts <url> "<js-expression>"
//
// Example:
//   pnpm exec tsx scripts/probe.ts http://localhost:3000/t/journal/current \
//     "getComputedStyle(document.querySelector('.foo')).color"
import { chromium } from 'playwright-core'
import { resolveChromiumPath } from './chromium-path'

const USAGE = 'Usage: pnpm exec tsx scripts/probe.ts <url> "<js-expression>"'

async function evaluate(url: string, expression: string): Promise<unknown> {
  const browser = await chromium.launch({
    executablePath: resolveChromiumPath(),
    args: ['--no-sandbox', '--disable-gpu'],
  })
  try {
    const page = await browser.newPage()
    await page.goto(url)
    return await page.evaluate(expression)
  } finally {
    await browser.close()
  }
}

async function main(): Promise<void> {
  const [url, expression] = process.argv.slice(2)
  if (!url || !expression) {
    console.error(USAGE)
    process.exit(1)
  }

  try {
    const result = await evaluate(url, expression)
    console.log(result === undefined ? 'undefined' : typeof result === 'object' && result !== null ? JSON.stringify(result, null, 2) : String(result))
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

main()
