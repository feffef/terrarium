// What the Campaign page derives from its content (story #1380). Crowd data is
// baked; these read it at the page's "now" (issue #1364).
import type { z } from 'zod'
import type { promotion, updateLog } from '../../schemas'
import { TINKERFUND_HOUR, resolveTinkerfundOffset } from './clock'
import { tinkerfundCount } from './shop'
import { derivePromotionState } from './status'

export const TINKERFUND_SOLD_OUT = 'Sold out'

export function tinkerfundStock({ stock, claimed }: { stock?: number; claimed: number }) {
  if (stock === undefined) return { left: undefined, soldOut: false, label: undefined }
  const left = Math.max(0, stock - claimed)
  return { left, soldOut: left === 0, label: left === 0 ? TINKERFUND_SOLD_OUT : `${left} of ${stock} left` }
}

export function formatTinkerfundAgo(now: number, at: number): string {
  const hours = Math.floor((now - at) / TINKERFUND_HOUR)
  if (hours < 1) return 'just now'
  return `${hours < 24 ? tinkerfundCount(hours, 'hour') : tinkerfundCount(Math.floor(hours / 24), 'day')} ago`
}

type TinkerfundUpdateTerms = z.infer<typeof updateLog>['updates'][number]

/** Newest first; `n` counts from the oldest, so an Update keeps its number and anchor. */
export function tinkerfundUpdates(updates: TinkerfundUpdateTerms[], now: number) {
  return updates
    .map((u) => ({ ...u, at: resolveTinkerfundOffset(u.published, now), paragraphs: u.body.split(/\n\s*\n/) }))
    .sort((a, b) => a.at - b.at)
    .map((u, i) => ({ ...u, n: i + 1 }))
    .reverse()
}

/** A Promotion as the shop reads it: its content, named by its content stem. */
export type TinkerfundPromotionTerms = z.infer<typeof promotion> & { stem: string }

type Targeted = Pick<TinkerfundPromotionTerms, 'campaign'>

/** A Promotion targets one Campaign or the whole shop (issue #1365). */
export function tinkerfundPromotionTargets(promotion: Targeted, campaign: string): boolean {
  return !promotion.campaign || promotion.campaign === campaign
}

/** A code is entered at checkout; the rest apply by themselves (issue #1365). */
export function tinkerfundAutomaticDeals<P extends Targeted & Pick<TinkerfundPromotionTerms, 'code' | 'start' | 'end'>>(
  promotions: P[],
  campaign: string,
  now: number,
): P[] {
  return promotions.filter((p) => !p.code && tinkerfundPromotionTargets(p, campaign) && derivePromotionState(p, now) === 'active')
}

export function formatTinkerfundMoney(amount: number, locale: string): string {
  const cents = Number.isInteger(amount) ? 0 : 2
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', minimumFractionDigits: cents, maximumFractionDigits: cents }).format(amount)
}

export function formatTinkerfundMonth(at: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(at)
}

export function tinkerfundLocale(preferred: string | undefined): string {
  const tag = preferred?.split(',')[0]?.split(';')[0]?.trim()
  try {
    return (tag && Intl.NumberFormat.supportedLocalesOf(tag)[0]) || 'en'
  } catch {
    return 'en'
  }
}

/** The section being read. A sticky one is always in view, so it wins only when nothing else is. */
export function currentTinkerfundSection(sections: { id: string; inView: boolean; sticky: boolean }[]): string | undefined {
  const seen = sections.filter((s) => s.inView)
  return (seen.find((s) => !s.sticky) ?? seen[0])?.id
}

export function formatTinkerfundDiscount(discount: { percent: number } | { amount: number }, locale: string): string {
  return 'percent' in discount ? `${discount.percent}% off` : `${formatTinkerfundMoney(discount.amount, locale)} off`
}
