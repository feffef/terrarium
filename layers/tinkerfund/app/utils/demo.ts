// Tinkerfund's tab-lifetime browser state. sessionStorage is shared by every
// Tenant on this origin (issue #1358), so every demo key carries this prefix and
// Reset removes only those — never clear() (issue #1359). The theme is a
// preference, not demo state (#1367), so Reset leaves it.
export const TINKERFUND_KEY_PREFIX = 'tinkerfund:'
const THEME_KEY = 'tinkerfund-theme'

export type TinkerfundTheme = 'system' | 'light' | 'dark'

export function readTinkerfundTheme(storage: Storage): TinkerfundTheme {
  const value = storage.getItem(THEME_KEY)
  return value === 'light' || value === 'dark' ? value : 'system'
}

export function writeTinkerfundTheme(storage: Storage, theme: TinkerfundTheme): void {
  if (theme === 'system') storage.removeItem(THEME_KEY)
  else storage.setItem(THEME_KEY, theme)
}

export function resetTinkerfundDemo(storage: Storage): void {
  const keys = [...Array(storage.length).keys()].map((i) => storage.key(i))
  for (const key of keys) if (key?.startsWith(TINKERFUND_KEY_PREFIX)) storage.removeItem(key)
}

/** Runs in <head> before first paint, so a pinned theme never flashes. */
export const tinkerfundThemeBootScript = `try{var t=sessionStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==='light'||t==='dark')document.documentElement.dataset.tfTheme=t}catch(e){}`
