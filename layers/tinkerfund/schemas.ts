// Tinkerfund's content schemas (issue #1366), apart from the manifest so the app
// can import them at runtime without pulling in shared/manifest.ts.
import { z } from 'zod'
import { TINKERFUND_OFFSET, resolveTinkerfundOffset } from './app/utils/clock'
import { flagSvgHazard } from '../../app/utils/svg'

export const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase slug')
const offset = z.string().regex(TINKERFUND_OFFSET, 'must be an offset like "-12d" or "+36h"')
const money = z.number().positive()
const count = z.number().int().nonnegative()
const positiveCount = z.number().int().positive()
export const zone = z.enum(['domestic', 'europe', 'world'])
const TOKEN = String.raw`var\(--tf-[a-z-]+\)`
const THEME_COLOUR = new RegExp(String.raw`^(?:none|currentColor|${TOKEN}|color-mix\(in srgb, *${TOKEN}(?: \d+%)?, *${TOKEN}(?: \d+%)?\))$`)
const COLOUR_VALUE = /\b(?:fill|stroke|color)\s*(?:=\s*["']?|:)\s*([^"';]+)/g

/** Inner SVG markup, coloured only by theme tokens so it reads in both themes
 *  (issue #1363). No ids: the same figure can appear twice on one page. The
 *  byte budget is story #1378's. */
function svg(maxBytes: number) {
  return z
    .string()
    .min(1)
    .superRefine((markup, ctx) => {
      flagSvgHazard(markup, ctx)
      for (const [, value] of markup.matchAll(COLOUR_VALUE)) {
        const colour = value!.trim()
        if (!THEME_COLOUR.test(colour)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `colour "${colour}" is not a theme token` })
      }
      if (/\sid\s*=/.test(markup)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'must not set an id' })
      const bytes = new TextEncoder().encode(markup).length
      if (bytes > maxBytes) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `is ${bytes} bytes, over its ${maxBytes} bytes budget` })
    })
}

// Stored browser actions point at these ids, so each must name one thing (#1366):
// Rewards, Add-ons and Stretch goals within their Campaign, option groups within
// their Reward, choices within their group. Narrower than #1366's Campaign-wide
// option ids on purpose: a Pledge line names its options by Reward.
function flagDuplicateIds(ctx: z.RefinementCtx, lists: Record<string, { id: string }[] | undefined>): void {
  const seen = new Set<string>()
  for (const [key, items] of Object.entries(lists)) {
    items?.forEach((item, i) => {
      if (seen.has(item.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key, i, 'id'], message: `id "${item.id}" is used more than once` })
      }
      seen.add(item.id)
    })
  }
}

function isAfter(later: string, earlier: string): boolean {
  if (!TINKERFUND_OFFSET.test(later) || !TINKERFUND_OFFSET.test(earlier)) return true // the field's own check reports it
  return resolveTinkerfundOffset(later, 0) > resolveTinkerfundOffset(earlier, 0)
}

// Offsets resolve against 0, so "now" is 0 and the checks hold at any real now.
function flagRecentBackers(ctx: z.RefinementCtx, c: { launch: string; end: string; backers: number; recent?: { at: string }[] }): void {
  if (!c.recent) return
  const at = (o: string) => (TINKERFUND_OFFSET.test(o) ? resolveTinkerfundOffset(o, 0) : Number.NaN)
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message })
  if (at(c.launch) > 0) return issue(['recent'], 'an Upcoming Campaign has no Backers to name')
  if (c.recent.length > c.backers) issue(['recent'], `names ${c.recent.length} Backers but the Campaign has ${c.backers}`)
  c.recent.forEach((r, i) => {
    if (at(r.at) < at(c.launch)) issue(['recent', i, 'at'], 'is before launch')
    if (at(r.at) > Math.min(at(c.end), 0)) issue(['recent', i, 'at'], 'is after the Campaign ended, or in the future')
  })
}

const optionGroup = z
  .object({
    id: slug,
    name: z.string(),
    choices: z.array(z.object({ id: slug, label: z.string() }).strict()).min(2),
  })
  .strict()
  .superRefine((group, ctx) => flagDuplicateIds(ctx, { choices: group.choices }))

const addon = z
  .object({
    id: slug,
    title: z.string(),
    description: z.string().optional(),
    price: money,
    claimed: count,
    stock: positiveCount.optional(),
  })
  .strict()

const reward = addon
  .extend({
    limit: positiveCount.optional(),
    options: z.array(optionGroup).max(2).optional(),
    digital: z.literal(true).optional(),
    shipsTo: z.array(zone).nonempty().optional(),
    delivery: offset,
  })
  .superRefine((r, ctx) => {
    if (!r.digital === !r.shipsTo) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'a Reward is either digital: true or has shipsTo, never both or neither' })
    }
    flagDuplicateIds(ctx, { options: r.options })
  })

export const campaign = z
  .object({
    registry: z.string().regex(/^TF-\d{4}$/, 'must be a registry number like "TF-0001"'),
    inventor: slug,
    category: slug,
    goal: money,
    launch: offset,
    end: offset,
    backers: count,
    pledged: z.number().nonnegative(),
    /** A few named Backers, shown as social proof (issue #1386). */
    recent: z.array(z.object({ name: z.string(), city: z.string(), at: offset }).strict()).min(3).max(5).optional(),
    /** Hand-picked, one-way "Backers also backed" (issue #1387); validate-content-refs resolves them. */
    alsoBacked: z.array(slug).min(2).max(4).optional(),
    specifications: z.array(z.object({ label: z.string(), value: z.string() }).strict()).min(1),
    figures: z
      .array(z.object({ style: z.enum(['isometric', 'patent']), caption: z.string(), svg: svg(4096) }).strict())
      .min(2),
    rewards: z.array(reward),
    addons: z.array(addon).optional(),
    stretchGoals: z.array(z.object({ id: slug, amount: money, title: z.string() }).strict()).optional(),
    shipping: z.object({ domestic: money, europe: money, world: money }).partial().strict(),
  })
  .strict()
  .superRefine((c, ctx) => {
    if (!isAfter(c.end, c.launch)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end'], message: 'must be after launch' })
    }
    // Isometric is the Campaign's face everywhere; patent drawings add detail (#1363).
    if (c.figures[0]?.style !== 'isometric') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['figures', 0, 'style'], message: 'the first figure must be isometric' })
    }
    if (!c.figures.some((f) => f.style === 'patent')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['figures'], message: 'at least one figure must be patent' })
    }
    flagDuplicateIds(ctx, { rewards: c.rewards, addons: c.addons, stretchGoals: c.stretchGoals })
    flagRecentBackers(ctx, c)
    for (const where of new Set(c.rewards.flatMap((r) => r.shipsTo ?? []))) {
      if (c.shipping[where] === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['shipping', where], message: 'a Reward ships here, so it needs a rate' })
      }
    }
  })

const comment = z.object({ author: z.string(), posted: offset, text: z.string(), inventor: z.boolean().optional() }).strict()

export const promotion = z
  .object({
    title: z.string(),
    description: z.string().optional(),
    code: z.string().regex(/^[A-Z0-9]+$/, 'must be upper-case letters and digits').optional(),
    campaign: slug.optional(),
    discount: z.union([
      z.object({ percent: z.number().int().min(1).max(100) }).strict(),
      z.object({ amount: money }).strict(),
    ]),
    start: offset,
    /** Left out, the Promotion never expires. */
    end: offset.optional(),
    /** Off each Campaign backed together in one checkout, once `min` of them are (issue #1389).
     *  A collection schema must stay a plain object, so validate-content-refs checks a bundle's rules. */
    bundle: z.object({ min: z.number().int().min(2), campaigns: z.array(slug).min(2).optional() }).strict().optional(),
  })
  .strict()

export const pledge = z
  .object({
    ref: z.string().min(1),
    campaign: slug,
    placed: offset,
    zone,
    lines: z.array(z.object({ reward: slug, options: z.record(slug, slug).optional(), quantity: positiveCount }).strict()),
    addons: z.array(z.object({ id: slug, quantity: positiveCount }).strict()).optional(),
    bonus: money.optional(),
  })
  .strict()

// Campaigns live at campaigns/<slug>.md; other pages carry no campaign.
export const page = z.object({ campaign: campaign.optional() })

export const inventor = z.object({ name: z.string(), bio: z.string(), portrait: svg(4096) }).strict()

export const category = z.object({ name: z.string(), blurb: z.string(), icon: svg(1024), order: count }).strict()

export const commentThread = z
  .object({
    campaign: slug,
    comments: z.array(comment.extend({ replies: z.array(comment).optional() })),
  })
  .strict()

export const updateLog = z
  .object({
    campaign: slug,
    /** `body` is plain text; a blank line separates paragraphs. */
    updates: z.array(z.object({ title: z.string(), published: offset, body: z.string().min(1) }).strict()),
  })
  .strict()

export const backer = z
  .object({
    name: z.string(),
    email: z.string().email(),
    address: z
      .object({ street: z.string(), city: z.string(), postcode: z.string(), country: z.string(), zone })
      .strict(),
    pledges: z.array(pledge),
  })
  .strict()

export const shop = z
  .object({
    /** `qa` pins "now" here; `prod` leaves it out and follows real time (#1364). */
    now: z.string().datetime().optional(),
    currency: z.literal('EUR'),
    zones: z.array(z.object({ id: zone, name: z.string() }).strict()),
    payments: z.array(z.object({ id: slug, label: z.string() }).strict()),
  })
  .strict()
