// A view transition freezes the page until its DOM update is done, and the
// browser aborts one that takes 4 s with a timeout error. Nuxt's own plugin also
// loses an update when a transition starts while the last is still finishing
// (a quick Back), so that one always hits the timeout (PR #1406, D23). This
// ends a transition once its page has rendered, or after UPDATE_BUDGET_MS, and
// keeps an aborted one quiet.
const UPDATE_BUDGET_MS = 1000

export default defineNuxtPlugin((nuxtApp) => {
  let pending: ViewTransition | undefined
  const end = (transition: ViewTransition | undefined) => {
    if (!transition || pending !== transition) return
    pending = undefined
    transition.skipTransition()
  }
  nuxtApp.hook('page:view-transition:start', (transition) => {
    pending = transition
    transition.ready.catch(() => {})
    transition.updateCallbackDone.then(() => {
      if (pending === transition) pending = undefined
    }, () => {})
    setTimeout(() => end(transition), UPDATE_BUDGET_MS)
  })
  // Nuxt resolves the update on this same hook; a task later, one still pending was lost.
  nuxtApp.hook('page:finish', () => {
    const transition = pending
    setTimeout(() => end(transition))
  })
})
