// L2 e2e assertions specific to the **midden** Tenant. Serves the gate's build
// via `setupL2()` and never builds (tests/README.md).
//
// Content covers the real `trench` Space (15 catalogued Sites, 42 Artifacts), the
// `stores` Space (10 Artifacts held off display, no Sites — GLOSSARY.md's "The
// Stores"), plus the Tenant-root `/t/midden` foreword page (issue #515). Assertions
// here target ROUTES, not files on disk — mirroring
// `layers/atlas/tests/e2e/atlas.spec.ts`'s shape: every assertion below is
// self-contained via `$fetch` or its own page.
import { describe, expect, it } from 'vitest'
import { $fetch, createPage, fetch, url } from '@nuxt/test-utils/e2e'
import { setupL2 } from '../../../../tests/support/e2e.ts'

describe('midden Tenant', async () => {
  await setupL2()

  // The Midden front door (`/t/midden`) is a Tenant root page, so the platform
  // sweep in `tests/e2e/smoke.spec.ts` never reaches it and the Tenant tests it
  // here (ADR-0016), in the same style as `atlas.spec.ts`'s front-door check.
  it('renders the Midden front door', async () => {
    const html = await $fetch('/t/midden')
    expect(html).toMatch(/<h1[ >]/)
    expect(html).not.toMatch(/No document at <code[\s>]/)
    expect(html.toLowerCase()).toContain('midden')
  })

  // `/t/midden` is the front door (foreword + a doorway per Space) and
  // `/t/midden/trench` the trench landing (its own intro + the dig reports) —
  // distinct pages, like the Atlas front door and its wings. Neither carries
  // the condition legend: that lives only in the dig-report condition key.
  it('keeps the front door and the trench landing distinct', async () => {
    const front = await $fetch('/t/midden')
    expect(front).toContain('The Midden')
    expect(front).toContain('/t/midden/trench')
    expect(front).toContain('/t/midden/stores')
    expect(front).not.toContain('The Generated Map')
    expect(front).toContain('New here? Start with these')
    expect(front).toContain('/t/midden/trench/tried-and-left-alone')
    const trench = await $fetch('/t/midden/trench')
    expect(trench).toContain('The Trench')
    expect(trench).toContain('The Generated Map')
    expect(trench).toContain('/t/midden/stores')
    for (const html of [front, trench]) {
      expect(html).not.toContain('Condition key')
      // A definition string from utils/condition.ts's single-homed table.
      expect(html).not.toContain('Discarded so recently the edges are still sharp')
    }
  })

  // The front door's count must match the trench's actual list (the Space
  // index document is not a dig report).
  it('counts the dig reports on the front door correctly', async () => {
    const listed = ((await $fetch('/t/midden/trench')) as string).match(/class="midden-sites__item"/g)?.length ?? 0
    expect(listed).toBeGreaterThan(0)
    expect(await $fetch('/t/midden')).toContain(`the open excavation — ${listed} dig report${listed === 1 ? '' : 's'}`)
  })

  it('shows three latest finds, each deep-linked to its card', async () => {
    const html = (await $fetch('/t/midden')) as string
    expect(html.match(/class="[^"]*midden-latest__link/g)?.length).toBe(3)
    expect(html).toMatch(/href="\/t\/midden\/trench\/[a-z0-9-]+#artifact-[a-z0-9-]+"/)
  })

  it('names the report each latest find sits in', async () => {
    const html = (await $fetch('/t/midden')) as string
    expect(html).toMatch(/midden-latest__meta[^>]*>[^<]*· in [^<]+ · assessed/)
  })

  it('lists a report\'s finds in the order its prose embeds them, each linking to its card', async () => {
    const html = (await $fetch('/t/midden/trench/stood-down')) as string
    const list = html.match(/<details[^>]*midden-report__finds[\s\S]*?<\/details>/)?.[0] ?? ''
    const listed = [...list.matchAll(/href="#(artifact-[a-z0-9-]+)"/g)].map((m) => m[1])
    const cards = [...html.matchAll(/<article id="(artifact-[a-z0-9-]+)"/g)].map((m) => m[1])
    expect(listed.length).toBeGreaterThanOrEqual(2)
    expect(listed).toEqual(cards)
  })

  it('404s an unknown Midden Space', async () => {
    expect((await fetch('/t/midden/no-such-space')).status).toBe(404)
  })

  // The dig-report page carries the condition key (owner-directed final
  // design): a sticky sidebar defining ONLY the grades present in this
  // report's finds. `the-generated-map`'s three finds grade intact/dissolved —
  // so those definitions render and an absent grade's (fresh, lost) must not.
  it('renders the condition key on a dig report, scoped to present grades', async () => {
    const html = await $fetch('/t/midden/trench/the-generated-map')
    expect(html).toContain('Condition key')
    expect(html).toContain('Whole and legible, but settled')
    expect(html).toContain('Nearly gone')
    expect(html).not.toContain('Discarded so recently the edges are still sharp')
    expect(html).not.toContain('Gone without trace')
  })

  // The stores register (GLOSSARY.md's "The Stores"): the Midden's second Space,
  // reached from the trench landing. It renders every stored find WHOLE — a
  // demotion is not an abridgement — grouped by Dig season, with no Sites of
  // its own. Pins the two properties that distinguish it from a dig report:
  // real catalogNote prose is present, and no `::midden-artifact` embed is used
  // (the register has its own quieter entry markup, so no specimen-slip stamp).
  it('renders the stores register, grouped by season, with whole records', async () => {
    const html = await $fetch('/t/midden/stores')
    expect(html).toContain('The Stores')
    // A season heading from the single-homed DIG_SEASONS table (strata.ts).
    expect(html).toContain('the Routing Excavation')
    // A verbatim fragment of a stored find's authored catalogNote — proof the
    // whole record travels, not a truncated stub.
    expect(html).toContain('pnpm gen')
    expect(html).toContain('Condition key')
    expect(html).not.toContain('midden-find__stamp')
  })

  // Jargon glosses (issue #1463): first use only, shared across the prose and
  // the finds' notes, opened by a real click in the rendered DOM.
  it('glosses first uses of Platform jargon on a dig report', async () => {
    const page = await createPage()
    try {
      await page.goto(url('/t/midden/trench/the-buried'), { waitUntil: 'hydration' })
      const terms = page.locator('.midden-gloss__term')
      expect(await terms.allTextContents()).toEqual(expect.arrayContaining(['Tenant', 'Space', 'isolation', 'sync', 'ADR-0008']))
      expect(await page.locator('.midden-gloss__term', { hasText: /^Tenant$/ }).count()).toBe(1)
      const tenant = page.locator('.midden-gloss', { hasText: /^Tenant/ })
      await expect.poll(() => tenant.locator('.midden-gloss__def').isVisible()).toBe(false)
      await tenant.locator('button').click()
      await expect.poll(() => tenant.locator('.midden-gloss__def').isVisible()).toBe(true)
    } finally {
      await page.close()
    }
  })
})
