// The maintainer view: a per-browser convenience that reveals maintainer-only
// affordances (today the Claude Code session link). It is not access control —
// every session id is already public in the logs, and claude.ai gates the page.
//
// `?maintainer` turns it on and `?maintainer=0` off; the flag is then kept in
// sessionStorage so later pages need no URL. Pure over `search`/`storage` so a
// unit test can drive it outside the browser.
const PARAM = 'maintainer'
const KEY = 'terrarium:maintainer'

// `storage` is a getter because merely reading `sessionStorage` can throw when it
// is blocked, and that read must sit inside the try below. The interface is
// structural so `Storage` fits without pulling the DOM lib into the node typecheck.
interface MaintainerStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function resolveMaintainerView(search: string, storage: () => MaintainerStorage): boolean {
  const flag = new URLSearchParams(search).get(PARAM)
  try {
    const store = storage()
    if (flag === null) return store.getItem(KEY) === '1'
    if (flag === '0') store.removeItem(KEY)
    else store.setItem(KEY, '1')
  } catch {
    // Storage blocked (private mode, embedded frame): the URL flag still holds for this load.
  }
  return flag !== null && flag !== '0'
}
