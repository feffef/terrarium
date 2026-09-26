// Tinkerfund's clock (issue #1364): content dates are offsets from "now".
import { tinkerfundCount } from './shop'

export const TINKERFUND_OFFSET = /^[+-]\d+[dh]$/

export const TINKERFUND_HOUR = 3_600_000

export function resolveTinkerfundOffset(offset: string, now: number): number {
  if (!TINKERFUND_OFFSET.test(offset)) throw new Error(`"${offset}" is not an offset like "-12d" or "+36h"`)
  const hours = Number.parseInt(offset.slice(0, -1), 10) * (offset.endsWith('d') ? 24 : 1)
  return now + hours * TINKERFUND_HOUR
}

export function tinkerfundNow(pinned: string | undefined, realNow: number): number {
  return pinned ? Date.parse(pinned) : realNow
}

export function tinkerfundCountdown(now: number, until: number): { days: number; hours: number } {
  const hours = Math.max(0, Math.floor((until - now) / TINKERFUND_HOUR))
  return { days: Math.floor(hours / 24), hours: hours % 24 }
}

export function formatTinkerfundCountdown({ days, hours }: { days: number; hours: number }): string {
  return `${tinkerfundCount(days, 'day')} ${tinkerfundCount(hours, 'hour')}`
}
