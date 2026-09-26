// Tinkerfund's clock (issue #1364): content dates are offsets from "now".
export const TINKERFUND_OFFSET = /^[+-]\d+[dh]$/

const HOUR = 3_600_000

export function resolveTinkerfundOffset(offset: string, now: number): number {
  if (!TINKERFUND_OFFSET.test(offset)) throw new Error(`"${offset}" is not an offset like "-12d" or "+36h"`)
  const hours = Number.parseInt(offset.slice(0, -1), 10) * (offset.endsWith('d') ? 24 : 1)
  return now + hours * HOUR
}

/** `qa` pins "now" in `shop.now`; `prod` pins nothing and follows real time. */
export function tinkerfundNow(pinned: string | undefined, realNow: number): number {
  return pinned ? Date.parse(pinned) : realNow
}

export function tinkerfundCountdown(now: number, until: number): { days: number; hours: number } {
  const hours = Math.max(0, Math.floor((until - now) / HOUR))
  return { days: Math.floor(hours / 24), hours: hours % 24 }
}

export function formatTinkerfundCountdown({ days, hours }: { days: number; hours: number }): string {
  return `${days} ${days === 1 ? 'day' : 'days'} ${hours} ${hours === 1 ? 'hour' : 'hours'}`
}
