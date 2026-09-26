// The demo Backer's own actions, stored per Space and replayed over the baked
// shop to give the Cart, the Pledges and every total (issue #1359).
import { z } from 'zod'
import { cancelTinkerfundPledge, reviseTinkerfundPledge } from './account'
import { pledge, slug, zone } from '../../tenant.config'
import {
  addToTinkerfundCart,
  resolveTinkerfundCart,
  tinkerfundCartRequest,
  settleTinkerfundPledge,
  tinkerfundPledgeContents,
} from './cart'
import type { TinkerfundBackerState, TinkerfundBakedPledge, TinkerfundPledge, TinkerfundShop, TinkerfundStep } from './cart'
import { placeTinkerfundPledges, quoteTinkerfundCheckout } from './checkout'
import { resolveTinkerfundOffset } from './clock'
import { TINKERFUND_KEY_PREFIX } from './demo'

const ref = pledge.shape.ref
/** When the action was taken: it replays at that "now". */
const at = z.number()

const action = z.discriminatedUnion('type', [
  z.object({ type: z.literal('cart'), at, request: tinkerfundCartRequest }),
  z.object({ type: z.literal('place'), at, zone, payment: slug, code: z.string().optional() }),
  z.object({ type: z.literal('change'), at, ref, change: tinkerfundPledgeContents }),
  z.object({ type: z.literal('cancel'), at, ref }),
])
const actions = z.array(action)

export type TinkerfundAction = z.infer<typeof action>
/** An action about to be taken: it gets its `at` when it is. */
export type TinkerfundUntimedAction = TinkerfundAction extends infer A ? (A extends TinkerfundAction ? Omit<A, 'at'> : never) : never

const actionsKey = (space: string) => `${TINKERFUND_KEY_PREFIX}${space}:actions`

export function readTinkerfundActions(storage: Storage, space: string): TinkerfundAction[] {
  try {
    const parsed = actions.safeParse(JSON.parse(storage.getItem(actionsKey(space)) ?? '[]'))
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}

export function writeTinkerfundActions(storage: Storage, space: string, list: TinkerfundAction[]): void {
  storage.setItem(actionsKey(space), JSON.stringify(list))
}

function fromBaked(b: TinkerfundBakedPledge, shop: TinkerfundShop): TinkerfundPledge[] {
  if (!shop.catalog[b.campaign]) return []
  return [settleTinkerfundPledge({
    ref: b.ref,
    campaign: b.campaign,
    placed: resolveTinkerfundOffset(b.placed, shop.now),
    zone: b.zone,
    payment: shop.payment,
    lines: b.lines.map((l) => ({ reward: l.reward, options: l.options ?? {}, quantity: l.quantity })),
    addons: b.addons ?? [],
    ...(b.bonus ? { bonus: b.bonus } : {}),
    promotions: [],
  }, shop)]
}

export function applyTinkerfundAction(state: TinkerfundBackerState, act: TinkerfundAction, shop: TinkerfundShop): TinkerfundStep {
  const then = { ...shop, now: act.at }
  switch (act.type) {
    case 'cart':
      return addToTinkerfundCart(state, act.request, then)
    case 'place': {
      const quote = quoteTinkerfundCheckout(resolveTinkerfundCart(state, then, act.zone), then, act.code)
      return placeTinkerfundPledges({ state, quote, zone: act.zone, payment: act.payment, shop: then })
    }
    case 'change':
      return reviseTinkerfundPledge(state, act.ref, act.change, then)
    case 'cancel':
      return cancelTinkerfundPledge(state, act.ref, then)
  }
}

/** The baked Pledges, then every action in turn; one that no longer applies (an id the content dropped) is skipped quietly (issue #1366). */
export function reduceTinkerfundActions(list: TinkerfundAction[], shop: TinkerfundShop): TinkerfundBackerState {
  const baked: TinkerfundBackerState = { cart: [], pledges: shop.baked.flatMap((b) => fromBaked(b, shop)) }
  return list.reduce((state, act) => applyTinkerfundAction(state, act, shop).state, baked)
}
