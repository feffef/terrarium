// Nuxt turns Vite's `vite:preloadError` event into the `app:chunkError` hook,
// but its own `nuxt:chunk-reload` plugin only acts on the ones that reach the
// *router*. A content chunk imported inside a page's `useAsyncData` handler
// never does — it surfaces as that block's `error` instead (issue #236) — so
// this records the error objects the framework itself classified as chunk
// failures, and app/composables/contentLoadRecovery.ts decides from there.
import { recordChunkLoadError } from '../utils/chunkRecovery'

export default defineNuxtPlugin({
  name: 'terrarium:chunk-errors',
  setup(nuxtApp) {
    nuxtApp.hook('app:chunkError', ({ error }) => recordChunkLoadError(error))
  },
})
