// The visitor's own actions, layered over the baked catalog (issue #1359): a
// Space-keyed sessionStorage entry, validated on read.
import { z } from 'zod'
import { tinkerfundStock } from './campaign'
import { deriveCampaignStatus } from './status'

/** A change to the Cart: a positive amount adds, a negative one takes away. */
export type TinkerfundCartRequest =
  | { campaign: string; reward: string; options: Record<string, string>; quantity: number }
  | { campaign: string; addon: string; quantity: number }
  | { campaign: string; bonus: number }

const id = z.string().min(1)
const quantity = z.number().int().positive()

// One draft Pledge per Campaign, shaped like a Pledge in `backer` (issue #1365).
const draft = z.object({
  campaign: id,
  lines: z.array(z.object({ reward: id, options: z.record(id, id), quantity })),
  addons: z.array(z.object({ id, quantity })),
  bonus: z.number().positive().optional(),
})

const overlay = z.object({ cart: z.array(draft) })

export type TinkerfundDraft = z.infer<typeof draft>
export type TinkerfundOverlay = z.infer<typeof overlay>

const overlayKey = (space: string) => `tinkerfund:${space}:overlay`

export function emptyTinkerfundOverlay(): TinkerfundOverlay {
  return { cart: [] }
}

export function readTinkerfundOverlay(storage: Storage, space: string): TinkerfundOverlay {
  try {
    const parsed = overlay.safeParse(JSON.parse(storage.getItem(overlayKey(space)) ?? 'null'))
    return parsed.success ? parsed.data : emptyTinkerfundOverlay()
  } catch {
    return emptyTinkerfundOverlay()
  }
}

export function writeTinkerfundOverlay(storage: Storage, space: string, state: TinkerfundOverlay): void {
  storage.setItem(overlayKey(space), JSON.stringify(state))
}

export type TinkerfundZone = 'domestic' | 'europe' | 'world'

interface Item {
  id: string
  title: string
  price: number
  claimed: number
  stock?: number
}

interface CartReward extends Item {
  limit?: number
  options?: { id: string; name: string; choices: { id: string; label: string }[] }[]
  shipsTo?: TinkerfundZone[]
}

/** What the Cart needs of a Campaign: its baked content, figures left out. */
export interface TinkerfundCartCampaign {
  launch: string
  end: string
  rewards: CartReward[]
  addons?: Item[]
  shipping: Partial<Record<TinkerfundZone, number>>
}

export type TinkerfundCartCatalog = Record<string, { title: string; campaign: TinkerfundCartCampaign }>

const GONE = 'No longer available'
const NEEDS_REWARD = 'Add-ons need a Reward from this Campaign'

type Limited = { stock?: number; claimed: number; limit?: number }

export function tinkerfundMaxQuantity(item: Limited): number {
  return Math.min(item.limit ?? Infinity, tinkerfundStock(item).left ?? Infinity)
}

/** Why `wanted` of an item can't be had, if it can't. Stock is only taken at checkout (issue #1365). */
function shortfall(item: Limited, wanted: number): string | undefined {
  const { left } = tinkerfundStock(item)
  if (left === 0) return 'Sold out'
  if (item.limit !== undefined && wanted > item.limit) return `Max ${item.limit} per Backer`
  if (left !== undefined && wanted > left) return `Only ${left} left`
}

export function formatTinkerfundItems(count: number): string {
  return `${count} ${count === 1 ? 'item' : 'items'}`
}

/** Every option group answered with one of its own choices, and nothing else. */
function validOptions(reward: CartReward, options: Record<string, string>): boolean {
  const groups = reward.options ?? []
  return (
    Object.keys(options).length === groups.length &&
    groups.every((g) => g.choices.some((c) => c.id === options[g.id]))
  )
}

const cents = (amount: number) => Math.round(amount * 100) / 100

function closed(campaign: TinkerfundCartCampaign, now: number): string | undefined {
  const { state } = deriveCampaignStatus({ ...campaign, goal: 1 }, 0, now)
  if (state === 'upcoming') return 'Opens at launch'
  if (state === 'ended') return 'Pledging has closed'
}

export function addToTinkerfundCart(
  cart: TinkerfundDraft[],
  request: TinkerfundCartRequest,
  catalog: TinkerfundCartCatalog,
  now: number,
): { cart: TinkerfundDraft[]; error?: string } {
  const refuse = (error: string) => ({ cart, error })
  const campaign = catalog[request.campaign]?.campaign
  if (!campaign) return refuse(GONE)
  const grows = ('bonus' in request ? request.bonus : request.quantity) > 0
  const shut = grows ? closed(campaign, now) : undefined
  if (shut) return refuse(shut)

  const old = cart.find((d) => d.campaign === request.campaign)
  const draft: TinkerfundDraft = old
    ? { ...old, lines: old.lines.map((l) => ({ ...l })), addons: old.addons.map((a) => ({ ...a })) }
    : { campaign: request.campaign, lines: [], addons: [] }

  if ('bonus' in request) {
    const bonus = cents((draft.bonus ?? 0) + request.bonus)
    if (bonus > 0) draft.bonus = bonus
    else delete draft.bonus
  } else if ('reward' in request) {
    const reward = campaign.rewards.find((r) => r.id === request.reward)
    if (!reward || !validOptions(reward, request.options)) return refuse(GONE)
    const key = tinkerfundCartLineKey(request)
    let line = draft.lines.find((l) => tinkerfundCartLineKey({ ...l, campaign: draft.campaign }) === key)
    if (!line) draft.lines.push((line = { reward: reward.id, options: { ...request.options }, quantity: 0 }))
    line.quantity += request.quantity
    draft.lines = draft.lines.filter((l) => l.quantity > 0)
    const held = draft.lines.filter((l) => l.reward === reward.id).reduce((n, l) => n + l.quantity, 0)
    const short = grows ? shortfall(reward, held) : undefined
    if (short) return refuse(short)
  } else {
    const addon = campaign.addons?.find((a) => a.id === request.addon)
    if (!addon) return refuse(GONE)
    if (grows && !draft.lines.length) return refuse(NEEDS_REWARD)
    let line = draft.addons.find((a) => a.id === addon.id)
    if (!line) draft.addons.push((line = { id: addon.id, quantity: 0 }))
    line.quantity += request.quantity
    draft.addons = draft.addons.filter((a) => a.quantity > 0)
    const short = grows ? shortfall(addon, line.quantity) : undefined
    if (short) return refuse(short)
  }

  const empty = !draft.lines.length && !draft.addons.length && !draft.bonus
  if (!old) return { cart: empty ? cart : [...cart, draft] }
  return { cart: empty ? cart.filter((d) => d !== old) : cart.map((d) => (d === old ? draft : d)) }
}

type LineRef = { campaign: string; reward: string; options: Record<string, string> } | { campaign: string; addon: string }

export function tinkerfundCartLineKey(ref: LineRef): string {
  if ('addon' in ref) return `${ref.campaign}/addon:${ref.addon}`
  return `${ref.campaign}/reward:${ref.reward}:${Object.entries(ref.options).sort().join(';')}`
}

export interface TinkerfundCartLine {
  key: string
  /** Spread with a `quantity` into a request that changes this line. */
  ref: LineRef
  title: string
  detail?: string
  price: number
  quantity: number
  max: number
  amount: number
  unavailable?: string
  /** False for a Reward that doesn't ship to the chosen zone. */
  ships: boolean
}

export interface TinkerfundCartGroup {
  campaign: string
  title: string
  lines: TinkerfundCartLine[]
  bonus?: number
  closed?: string
  subtotal: number
  shipping: number
}

export interface TinkerfundCartView {
  groups: TinkerfundCartGroup[]
  count: number
  subtotal: number
  shipping: number
  total: number
}

const sum = (xs: number[]) => cents(xs.reduce((a, b) => a + b, 0))

/** Unknown ids are dropped quietly; what is known but can't be had stays, flagged and unpriced (issue #1366). */
export function resolveTinkerfundCart(
  cart: TinkerfundDraft[],
  catalog: TinkerfundCartCatalog,
  now: number,
  zone: TinkerfundZone,
): TinkerfundCartView {
  const groups = cart.flatMap((draft): TinkerfundCartGroup[] => {
    const entry = catalog[draft.campaign]
    if (!entry) return []
    const { campaign } = entry
    const shut = closed(campaign, now)
    const priced = (item: Item & { limit?: number }, quantity: number, unavailable = shut) => {
      const max = tinkerfundMaxQuantity(item)
      const why = unavailable ?? (max === 0 ? 'Sold out' : undefined)
      const q = why ? quantity : Math.min(quantity, max)
      return { title: item.title, price: item.price, quantity: q, max, amount: why ? 0 : cents(item.price * q), unavailable: why }
    }

    let shipped = false
    const rewards = draft.lines.flatMap((line): TinkerfundCartLine[] => {
      const reward = campaign.rewards.find((r) => r.id === line.reward)
      if (!reward || !validOptions(reward, line.options)) return []
      const ref = { campaign: draft.campaign, reward: reward.id, options: line.options }
      const detail = reward.options?.map((g) => `${g.name}: ${g.choices.find((c) => c.id === line.options[g.id])!.label}`).join(' · ')
      const ships = !reward.shipsTo || reward.shipsTo.includes(zone)
      const price = priced(reward, line.quantity)
      if (reward.shipsTo && ships && !price.unavailable) shipped = true
      return [{ key: tinkerfundCartLineKey(ref), ref, detail: detail || undefined, ships, ...price }]
    })
    const rewarded = rewards.some((l) => !l.unavailable)
    const addons = draft.addons.flatMap((line): TinkerfundCartLine[] => {
      const addon = campaign.addons?.find((a) => a.id === line.id)
      if (!addon) return []
      const ref = { campaign: draft.campaign, addon: addon.id }
      return [{ key: tinkerfundCartLineKey(ref), ref, ships: true, ...priced(addon, line.quantity, shut ?? (rewarded ? undefined : NEEDS_REWARD)) }]
    })
    const lines = [...rewards, ...addons]
    if (!lines.length && !draft.bonus) return []
    return [{
      campaign: draft.campaign,
      title: entry.title,
      lines,
      bonus: draft.bonus,
      closed: shut,
      subtotal: sum([...lines.map((l) => l.amount), shut ? 0 : draft.bonus ?? 0]),
      shipping: shipped ? campaign.shipping[zone] ?? 0 : 0,
    }]
  })
  const subtotal = sum(groups.map((g) => g.subtotal))
  const shipping = sum(groups.map((g) => g.shipping))
  const count = groups.reduce((n, g) => n + (g.lines.length ? g.lines.reduce((m, l) => m + l.quantity, 0) : 1), 0)
  return { groups, count, subtotal, shipping, total: cents(subtotal + shipping) }
}
