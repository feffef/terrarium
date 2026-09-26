// What the Campaign page derives from its content (story #1380). Crowd data is
// baked; these read it at the page's "now" (issue #1364).
import { derivePromotionState } from './status'

export function tinkerfundStock({ stock, claimed }: { stock?: number; claimed: number }) {
  if (stock === undefined) return { left: undefined, soldOut: false, label: undefined }
  const left = Math.max(0, stock - claimed)
  return { left, soldOut: left === 0, label: left === 0 ? 'Sold out' : `${left} of ${stock} left` }
}

const HOUR = 3_600_000
const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`

export function formatTinkerfundAgo(now: number, at: number): string {
  const hours = Math.floor((now - at) / HOUR)
  if (hours < 1) return 'just now'
  return `${hours < 24 ? plural(hours, 'hour') : plural(Math.floor(hours / 24), 'day')} ago`
}

interface Promotion {
  code?: string
  campaign?: string
  start: string
  end?: string
}

/** A code is entered at checkout; the rest apply by themselves (issue #1365). */
export function tinkerfundAutomaticDeals<P extends Promotion>(promotions: P[], campaign: string, now: number): P[] {
  return promotions.filter(
    (p) => !p.code && (!p.campaign || p.campaign === campaign) && derivePromotionState(p, now) === 'active',
  )
}

export function formatTinkerfundMoney(amount: number, locale: string): string {
  const cents = Number.isInteger(amount) ? 0 : 2
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', minimumFractionDigits: cents, maximumFractionDigits: cents }).format(amount)
}

export function formatTinkerfundMonth(at: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(at)
}

/** The first tag of an Accept-Language header or `navigator.language`. */
export function tinkerfundLocale(preferred: string | undefined): string {
  const tag = preferred?.split(',')[0]?.split(';')[0]?.trim()
  try {
    return (tag && Intl.NumberFormat.supportedLocalesOf(tag)[0]) || 'en'
  } catch {
    return 'en'
  }
}

/** The section being read: the last to reach `line`, the earlier on a tie. */
export function currentTinkerfundSection(sections: { id: string; top: number }[], line: number): string | undefined {
  const reached = sections.filter((s) => s.top <= line)
  if (!reached.length) return sections[0]?.id
  return reached.reduce((a, b) => (b.top > a.top ? b : a)).id
}

export function formatTinkerfundDiscount(discount: { percent: number } | { amount: number }, locale: string): string {
  return 'percent' in discount ? `${discount.percent}% off` : `${formatTinkerfundMoney(discount.amount, locale)} off`
}
