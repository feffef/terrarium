import type { Ref } from 'vue'

/** Money follows the visitor's locale (issue #1365). */
export function useTinkerfundMoney(): (amount: number) => string {
  const locale = useTinkerfundLocale()
  return (amount) => formatTinkerfundMoney(amount, locale.value)
}

/** Money and dates follow the visitor's locale (issue #1365); the server reads
 *  it from the request and hands it to the client, so hydration agrees. */
export function useTinkerfundLocale(): Ref<string> {
  const header = import.meta.server ? useRequestHeaders(['accept-language'])['accept-language'] : undefined
  return useState('tinkerfund-locale', () => tinkerfundLocale(import.meta.server ? header : navigator.language))
}
