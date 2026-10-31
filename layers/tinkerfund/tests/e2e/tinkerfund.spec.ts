// L2 e2e for the Tinkerfund Tenant: server-rendered HTML. Serves the gate's
// build via `setupL2()` and never builds (tests/README.md). The browser flows
// are in tinkerfund-flows.spec.ts, so the two run in parallel. prod is checked
// only through server-rendered HTML whose shape doesn't depend on the minute
// (its clock: `shop.now` in schemas.ts).
import { describe, expect, it } from 'vitest'
import { $fetch, fetch } from '@nuxt/test-utils/e2e'
import { setupL2 } from '../../../../tests/support/e2e.ts'
import { TINKERFUND_GALLERY } from '../../app/utils/gallery'

// The rendered page only: the Nuxt payload after it carries the whole catalog.
const main = (html: string) => html.slice(html.indexOf('<main'), html.indexOf('</main>'))

// A Campaign page without its recommendation shelves, whose cards carry their own lines (story #1387).
function campaignOnly(html: string) {
  const end = html.indexOf('data-recommendations')
  if (end < 0) throw new Error('no data-recommendations marker on the Campaign page')
  return html.slice(0, end)
}

describe('tinkerfund Tenant', async () => {
  await setupL2()

  describe('server-rendered', () => {
    it('redirects the Tenant root to prod', async () => {
      const res = await fetch('/t/tinkerfund', { redirect: 'manual' })
      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe('/t/tinkerfund/prod')
    })

    // The page cache (ADR-0028) must not hand one visitor's locale to the next (#1365).
    it('renders each visitor in their own locale', async () => {
      const as = (locale: string) => $fetch<string>('/t/tinkerfund/prod/discover', { headers: { 'accept-language': locale } })
      expect(await as('de-DE')).toContain('"de-DE"')
      const english = await as('en-US')
      expect(english).toContain('"en-US"')
      expect(english).not.toContain('"de-DE"')
    })

    for (const space of ['prod', 'qa']) {
      it(`renders the shell in ${space}`, async () => {
        const html = await $fetch(`/t/tinkerfund/${space}`)
        expect(html).toContain('Demo shop — nothing here is real')
        expect(html).not.toContain('Reset demo')
        expect(html).toMatch(/<header[^>]*>[\s\S]*Tinkerfund[\s\S]*Discover[\s\S]*Categories[\s\S]*Deals/)
        expect(html).toContain(`href="/t/tinkerfund/${space}/cart"`)
        expect(html).toMatch(/<footer[\s\S]*How it works[\s\S]*Theme/)
        expect(html).toContain('class="tf-page"')
      })
    }

    it('renders How it works with its title, social meta and the categories in the header, and keeps qa out of search results', async () => {
      const html = await $fetch('/t/tinkerfund/prod/how-it-works')
      expect(html).toContain('<title>How Tinkerfund works · Tinkerfund</title>')
      expect(html).toContain('<meta property="og:site_name" content="Tinkerfund">')
      expect(html).toContain('<meta name="robots" content="index, follow">')
      expect(html).toMatch(/category\/kitchen[\s\S]*category\/desk[\s\S]*category\/outdoors/)
      expect(await $fetch('/t/tinkerfund/qa/how-it-works')).toContain('<meta name="robots" content="noindex, nofollow">')
    })

    it('answers an unknown Space, page or category with a 404, the last two branded inside the shell', async () => {
      expect((await fetch('/t/tinkerfund/staging')).status).toBe(404)
      const page = await fetch('/t/tinkerfund/qa/no-such-page', { headers: { accept: 'text/html' } })
      expect(page.status).toBe(404)
      const html = await page.text()
      expect(html).toContain('This page isn’t in the catalog')
      expect(html).toContain('Demo shop — nothing here is real')
      const category = await fetch('/t/tinkerfund/qa/category/no-such-category', { headers: { accept: 'text/html' } })
      expect(category.status).toBe(404)
      expect(await category.text()).toContain('This page isn’t in the catalog')
    })

    // qa pins now 36h before this Campaign ends (issue #1364).
    it('derives a Campaign’s state and countdown from qa’s pinned now', async () => {
      const html = await $fetch('/t/tinkerfund/qa/campaigns/last-minute-lamp')
      expect(html).toContain('TF-9001')
      expect(html).toMatch(/data-state="live"[^>]*>Live</)
      expect(html).toContain('Ending soon')
      expect(html).toContain('Goal reached')
      expect(html).toContain('125% funded')
      expect(html).toMatch(/<time [^>]*datetime="2026-06-03T00:00:00.000Z"[^>]*>1 day 12 hours to go<\/time>/)
    })

    // Worked out by hand from each fixture's offsets against qa's pinned now.
    it('shows every qa Campaign’s status in the gallery', async () => {
      const html = await $fetch('/t/tinkerfund/qa/gallery/status')
      expect(html).toMatch(/<time datetime="2026-06-01T12:00:00.000Z"[^>]*>2026-06-01 12:00 UTC<\/time>/)
      const status = (registry: string) => html.match(new RegExp(`${registry}</span>([\\s\\S]*?)</div>`))?.[1] ?? ''
      expect(status('TF-9001')).toMatch(/Live<[\s\S]*Ending soon[\s\S]*Goal reached[\s\S]*125% funded[\s\S]*1 day 12 hours to go/)
      expect(status('TF-9002')).toMatch(/Live<[\s\S]*Goal reached[\s\S]*100% funded[\s\S]*21 days to go/)
      expect(status('TF-9003')).toMatch(/Upcoming<[\s\S]*Launches in 3 days/)
      expect(status('TF-9004')).toMatch(/Live<[\s\S]*0% funded[\s\S]*28 days to go/)
      expect(status('TF-9005')).toMatch(/Ended<[\s\S]*>Funded<[\s\S]*12480% funded/)
      expect(status('TF-9006')).toMatch(/Ended<[\s\S]*>Unfunded<[\s\S]*23% funded/)
    })

    it('indexes the gallery’s sections on qa’s front page, each its own page', async () => {
      const home = await $fetch('/t/tinkerfund/qa')
      expect(home).toMatch(/<h1[^>]*>Component gallery<\/h1>/)
      for (const [i, section] of TINKERFUND_GALLERY.entries()) {
        const path = `/t/tinkerfund/qa/gallery/${section.id}`
        expect(home).toContain(`href="${path}"`)
        const html = main(await $fetch(path))
        expect(html, path).toMatch(new RegExp(`<h1[^>]*>${section.title}</h1>`))
        expect(html, path).toMatch(/aria-label="Breadcrumb"[\s\S]*href="\/t\/tinkerfund\/qa"/)
        for (const name of section.components) expect(html, path).toMatch(new RegExp(`<code[^>]*>${name}</code>`))
        // A section with no branch in Section.vue renders only a v-if comment.
        expect(html, path).toMatch(/<div data-specimens[^>]*>\s*<(?!!--)/)
        const prev = TINKERFUND_GALLERY[i - 1]
        const next = TINKERFUND_GALLERY[i + 1]
        if (prev) expect(html, path).toContain(`href="/t/tinkerfund/qa/gallery/${prev.id}"`)
        if (next) expect(html, path).toContain(`href="/t/tinkerfund/qa/gallery/${next.id}"`)
      }
      expect(await $fetch('/t/tinkerfund/prod')).not.toContain('Component gallery')
      for (const path of ['/t/tinkerfund/prod/gallery/status', '/t/tinkerfund/qa/gallery/no-such-section']) {
        expect((await fetch(path, { headers: { accept: 'text/html' } })).status, path).toBe(404)
      }
    })

    // Visitors asked for the people behind the Campaigns (visitor-loop, 2026-10-03).
    it('links a Campaign’s Inventor to a page listing their Campaigns', async () => {
      expect(await $fetch('/t/tinkerfund/prod/campaigns/counterclockwise-mug')).toContain('href="/t/tinkerfund/prod/inventors/henrik-aalto"')
      const html = await $fetch('/t/tinkerfund/prod/inventors/henrik-aalto')
      expect(html).toMatch(/Inventor · 3 Campaigns · .+ raised · [\d,.]+ Backers</)
      for (const title of ['Counterclockwise Mug', 'Solo Pea Rest']) expect(html).toContain(title)
      expect((await fetch('/t/tinkerfund/prod/inventors/nobody', { headers: { accept: 'text/html' } })).status).toBe(404)
      const idle = main(await $fetch('/t/tinkerfund/qa/inventors/new-inventor'))
      expect(idle).toContain('Inventor · 0 Campaigns<')
      expect(idle).toContain('No Campaigns yet.')
      expect(idle).not.toContain('class="grid"')
    })

    for (const [slug, action] of [
      ['counterclockwise-mug', 'Back this Campaign'],
      ['solo-pea-rest', 'Pledging has closed'],
      ['one-key-keyboard', 'Back this Campaign'],
      ['emotional-support-rock', 'Notify me'],
      ['pocket-sundial-with-snooze', 'Pledging has closed'],
      ['rain-aware-umbrella', 'Back this Campaign'],
      ['fridge-light-verification-camera', 'Back this Campaign'],
      ['meal-invites-for-cats', 'Back this Campaign'],
      ['strand-count-pasta-measure', 'Pledging has closed'],
      ['automatic-sheep-counter', 'Back this Campaign'],
      ['delayed-mirror', 'Back this Campaign'],
      ['goldfish-quarterly-review', 'Back this Campaign'],
      ['motorised-sticky-note-stand', 'Notify me'],
      ['soap-bar-odometer', 'Pledging has closed'],
      ['snail-speedometer', 'Back this Campaign'],
      ['moisture-sensor-for-artificial-plants', 'Notify me'],
      ['snore-certificate-printer', 'Pledging has closed'],
      ['cat-flap-decision-timer', 'Back this Campaign'],
      ['cat-acknowledgement-button', 'Pledging has closed'],
      ['occupied-sign-for-litter-boxes', 'Pledging has closed'],
      ['sleep-confirmation-clock', 'Back this Campaign'],
      ['grass-growth-notifier', 'Pledging has closed'],
      ['backup-suitcase', 'Back this Campaign'],
      ['passport-presence-monitor', 'Back this Campaign'],
      ['jet-lag-rehearsal-lamp', 'Back this Campaign'],
      ['pigeon-arrival-board', 'Back this Campaign'],
      ['snowflake-comparison-kit', 'Notify me'],
      ['pausable-hourglass', 'Pledging has closed'],
      ['canned-silence', 'Back this Campaign'],
    ] as const) {
      it(`renders the prod Campaign page for ${slug}`, async () => {
        const html = await $fetch(`/t/tinkerfund/prod/campaigns/${slug}`)
        expect(html).toMatch(/<nav[^>]*aria-label="Breadcrumb"[\s\S]*>Home<[\s\S]*category\/[\s\S]*aria-current="page"/)
        expect(html).toMatch(/FIG\. 1 · TF-00\d\d/)
        expect(html).toMatch(/<h1[^>]*>/)
        expect(html).toMatch(/aria-label="Sections"[\s\S]*href="#story"[\s\S]*href="#rewards"[\s\S]*href="#updates"[\s\S]*href="#comments"/)
        expect(html).toMatch(/<caption[^>]*>Specifications<\/caption>/)
        expect(html).toContain(action)
        expect(html).toContain('<meta property="og:type" content="website">')
        // Story #1386: names on Live and Ended, the list on Live only.
        expect(campaignOnly(html).includes('Backed by ')).toBe(action !== 'Notify me')
        expect(campaignOnly(html).includes('Recently backed')).toBe(action === 'Back this Campaign')
        expect(html).toMatch(/Backers also backed[\s\S]*More from this category[\s\S]*class="tf-backbar/)
      })
    }

    it('shows each qa edge case on its Campaign page', async () => {
      const page = (slug: string) => $fetch(`/t/tinkerfund/qa/campaigns/${slug}`)
      const lamp = await page('last-minute-lamp')
      expect(lamp).toContain('2 of 40 left')
      expect(lamp).toContain('Max 1 per Backer')
      expect(lamp).toContain('Digital, nothing ships')
      expect(lamp).toContain('Est. delivery Jul 2026')
      expect(lamp).toMatch(/href="\/t\/tinkerfund\/qa\/inventors\/test-inventor"[^>]*><b[^>]*>Test Inventor<\/b><\/a><span[^>]*>Inventor</)
      expect(lamp).toMatch(/Spare bulb[\s\S]*Sold out/)
      expect(lamp).toMatch(/<li class="yes"[^>]*>[\s\S]*A dimmer/)

      const stapler = await page('goal-exact-stapler')
      expect(stapler).toContain('10% off, applied automatically')
      expect(stapler).toMatch(/Early-bird stapler[\s\S]*?<fieldset disabled[\s\S]*?Sold out/)

      expect(await page('unhurried-kettle')).toMatch(/Notify me[\s\S]*Opens at launch/)
      expect(await page('indoor-hammock')).toMatch(/Unfunded[\s\S]*Ended 1 hour ago[\s\S]*Pledging has closed[\s\S]*Closed/)
      expect(await page('self-assembling-workbench')).toContain('3 of 3 left')

      expect(lamp).toMatch(/Backed by Ada E\., Maximiliane-Theodora von Hohenzollern-Sigmaringen and 38 others[\s\S]*Recently backed[\s\S]*Ada E\.<\/b> · Hamburg · <time[^>]*>1 hour ago/)
      const hammock = await page('indoor-hammock')
      expect(hammock).toContain('Backed by Hugo M., Ida N. and 90 others')
      expect(hammock).not.toContain('Recently backed')
      expect(campaignOnly(await page('one-button-keypad'))).not.toMatch(/Backed by |Recently backed/)

      // Story #1387: hand-picked row first, then the category's rest, Live and Upcoming before Ended.
      const row = (html: string, title: string) => html.match(new RegExp(`>${title}</h2>[\\s\\S]*?</ul>`))?.[0].match(/<h3[^>]*><a[^>]*>[^<]+/g)?.map((h) => h.replace(/.*>/, ''))
      expect(row(lamp, 'Backers also backed')).toEqual(['Unhurried Kettle', 'Indoor Hammock'])
      expect(row(lamp, 'More from this category')).toEqual(['One-Button Keypad', 'Goal-Exact Stapler', 'Retired Ruler'])
      expect(row(stapler, 'Backers also backed')).toBeUndefined()
      expect(row(stapler, 'More from this category')).toContain('Last-Minute Lamp')
      expect(row(hammock, 'Backers also backed')).toEqual(['The Self-Assembling Workbench That Has Been Assembling Itself Since the Previous Financial Year', 'Unhurried Kettle'])
      expect(hammock).not.toContain('More from this category')
      const discover = await $fetch('/t/tinkerfund/qa/discover')
      expect(discover).toContain('Backed by Ada E. and 39 others')
      expect(discover).not.toContain('Backed by Hugo M.')
    })

    it('lists a Campaign’s Updates inline, newest first and only it open', async () => {
      const html = main(await $fetch('/t/tinkerfund/qa/campaigns/last-minute-lamp'))
      expect(html).toMatch(/<details id="update-2" open[^>]*><summary[^>]*>[\s\S]*?Funded, with a day to spare[\s\S]*?Update #2[\s\S]*?<p[^>]*>The lamp passed its goal overnight.<\/p><p[^>]*>A second paragraph/)
      expect(html).toMatch(/<details id="update-1"(?! open)[^>]*><summary[^>]*>[\s\S]*?Tooling is done[\s\S]*?Update #1/)
      expect(html.indexOf('id="update-2"')).toBeLessThan(html.indexOf('id="update-1"'))
    })

    // On any day, the Mug is the Live Campaign furthest past its goal, the
    // Keyboard and the Lamp end within 48h, and the Umbrella's Promotion ends soonest (story #1381).
    it('renders Home’s sections in order, the featured Campaign first', async () => {
      const html = main(await $fetch('/t/tinkerfund/prod'))
      expect(html).toMatch(/id="tf-featured"[^>]*>Counterclockwise Mug</)
      expect(html).toMatch(/340<small[^>]*>% funded/)
      const order = ['tf-featured', 'tf-ending', '15% off the Rain-Aware Umbrella', 'tf-categories-h', 'tf-popular', 'tf-launched', 'tf-ended']
      const at = order.map((marker) => html.indexOf(marker))
      expect(at.every((i) => i > 0), `missing: ${order.filter((_, i) => at[i]! < 0).join(', ')}`).toBe(true)
      expect(at).toEqual([...at].sort((a, b) => a - b))
      const ending = html.slice(at[1], at[2])
      expect(ending).toContain('One-Key Keyboard')
      expect(ending).toContain('Jet Lag Rehearsal Lamp')
      expect(ending).not.toContain('Counterclockwise Mug')
      const popular = html.slice(at[4], at[5])
      expect(popular.match(/class="wide"[^>]*>TF-\d+/g)).toHaveLength(10)
      expect(popular).toMatch(/TF-0001/)
      expect(popular).toMatch(/Show all \d+ Campaigns/)
      expect(popular).not.toContain('TF-0005')
    })

    it('renders Discover straight from its URL query', async () => {
      const html = main(await $fetch('/t/tinkerfund/qa/discover?category=workshop&state=live'))
      expect(html).toContain('1 Campaign<')
      expect(html).toContain('The Self-Assembling Workbench')
      expect(html).not.toContain('Unhurried Kettle')
    })

    it('shows the empty state when nothing matches', async () => {
      const html = await $fetch('/t/tinkerfund/qa/category/empty-shelf')
      expect(html).toMatch(/<h1[^>]*>Empty Shelf<\/h1>/)
      expect(html).toContain('No Campaign is filed here.')
      expect(html).toContain('No Campaigns match these filters')
    })

    it('lists Active Deals with their Campaign and Scheduled ones as starting soon', async () => {
      const html = main(await $fetch('/t/tinkerfund/qa/deals'))
      expect(html).toMatch(/A tenth off the stapler \(active, automatic\)[\s\S]*Applied automatically\.[\s\S]*Goal-Exact Stapler/)
      expect(html).toMatch(/Starting soon[\s\S]*Lamp week \(scheduled\)[\s\S]*Starts in 2 days/)
      expect(html).not.toContain('EXPIRED5')
      // Bundles (issue #1389): a listed one shows its Campaigns; a Scheduled one waits with the rest.
      expect(html).toMatch(/Deal · Back 2 listed Campaigns together · 5% off each[\s\S]*Stapler and lamp together[\s\S]*Goal-Exact Stapler[\s\S]*Last-Minute Lamp[\s\S]*Starting soon/)
      expect(html).toMatch(/Starting soon[\s\S]*Starting soon · Back any 3 Campaigns together · 15% off each[\s\S]*Any three Campaigns \(scheduled bundle\)/)
    })

    const search = async (space: string, q: string) => main(await $fetch(`/t/tinkerfund/${space}/search?q=${encodeURIComponent(q)}`))

    it('finds Campaigns by title and by their Inventor’s name', async () => {
      const lamp = await search('qa', 'lamp')
      expect(lamp).toContain('1 Campaign<')
      expect(lamp).toMatch(/<h3[^>]*><a[^>]*href="\/t\/tinkerfund\/qa\/campaigns\/last-minute-lamp"/)
      const byInventor = await search('qa', 'Test Inventor')
      expect(byInventor).toContain('5 Campaigns<')
      expect(byInventor).not.toContain('Unhurried Kettle')
    })

    // Story #1382's bar: a qa search can never return prod content.
    it('keeps a qa search inside qa', async () => {
      expect(await search('prod', 'mug')).toContain('Counterclockwise Mug')
      for (const q of ['mug', 'Henrik', 'Lucía']) expect(await search('qa', q)).toContain(`No Campaign matches “${q}”`)
      const everything = await search('qa', 'e')
      expect(everything).toContain('5 Campaigns<')
      expect(everything).not.toMatch(/TF-0\d{3}|\/t\/tinkerfund\/prod\//)
    })

    it('shows an empty state and survives LIKE wildcards and SQL comment markers', async () => {
      expect(main(await $fetch('/t/tinkerfund/qa/search'))).toContain('Search the catalog')
      expect(await search('qa', '%_%')).toContain('No Campaign matches')
      // A refused query would also read as no results, so these must find something.
      expect(await search('qa', 'goal--exact')).toContain('Goal-Exact Stapler')
      expect(await search('qa', '%lamp_*')).toContain('Last-Minute Lamp')
    })
  })
})
