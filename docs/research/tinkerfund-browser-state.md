# Tinkerfund: layering tab-lifetime browser state over baked content

Grounding note for issue #1359. Question: Tinkerfund (a planned Tenant, not
built yet) shows baked crowd data (Campaign totals, stock, backer counts) and
then applies the visitor's own tab-lifetime state (Pledges, cart, saved
Campaigns, in `sessionStorage`). In *this* repo, what goes wrong, and what
pattern keeps "server renders the baseline, client applies the overlay" correct
across reloads and a "Reset demo"?

**Researched 2026-09-26.** Installed versions (from `node_modules`; re-check if
they have moved): `nuxt` 4.5.2, `@nuxt/content` 3.15.0, `@vue/runtime-core`
3.5.42, `@sqlite.org/sqlite-wasm` 3.50.4. `nuxt.com`, `content.nuxt.com` and
`developer.mozilla.org` are blocked by the egress proxy, so doc quotes come from
the docs source in the official repos (`nuxt/nuxt` `main` `docs/`,
`vuejs/docs` `main`, `mdn/content` `main`, `vueuse/vueuse` `main`). The
installed source is cited where it settles the question.

**A correction to the brief:** ADR-0019's patch to client DB loading is gone.
The ADR is **Superseded** (2026-07-16): stock `@nuxt/content@3.15.0` runs,
and a failed client load is handled in the app instead
(`ContentLoadErrorDialog`, plus an automatic `reloadNuxtApp` for chunk-load
errors only, per the 2026-08-04 amendment).

---

## 1. How the Platform is actually deployed: an SSR Node server, not static files

- `deploy/entrypoint.sh` runs `pnpm build` and then serves the output with
  `node "$SERVE_DIR/server/index.mjs"`, the Nitro Node server (ADR-0011).
  `package.json` has a `generate` script, but nothing in the deploy path uses it.
- Neither the root `nuxt.config.ts` nor any Tenant layer config sets
  `routeRules`, `prerender` or `ssr: false`. That means **every page is rendered
  by the server on each request.** The site has no build-time HTML and no
  SWR/ISR cache. `app/pages/index.vue:58-60` relies on this for its
  "pick of the day".
- The only things prerendered are Nuxt Content's per-collection dumps. The
  module sets `routeRules['/__nuxt_content/<collection>/sql_dump.txt'] =
  { prerender: true }` for every non-private collection
  (`@nuxt/content/dist/module.mjs:3179-3183`).
- The content is still frozen at build time (ADR-0001). The crowd baseline only
  changes when a new commit is rebuilt and swapped in (ADR-0011, polled). A tab
  that stays open across a swap may therefore reload onto a *different*
  baseline than the one it first saw.

**What this means for Tinkerfund:** the server can compute a real "now" for each
request, so `prod`'s real-time clock is honest when the page is served. The
server can never see `sessionStorage`, so **SSR always renders the pure
baseline.**

## 2. How Nuxt Content is queried in the browser

- `queryCollection` in `@nuxt/content/dist/runtime/client.js:67-73`: on the
  server it calls the in-process `/__nuxt_content/<c>/query` endpoint. In the
  browser it **always** uses WASM SQLite (`import.meta.client &&
  window.WebAssembly`).
- The first browser query lazily `import()`s `@sqlite.org/sqlite-wasm` (its
  `sqlite3.wasm` is 856 KB on disk). It then fetches that collection's
  `sql_dump.txt` and caches the dump in **`localStorage`** under
  `content_checksum_<c>` / `content_collection_<c>` (production only). If
  `sessionStorage.previewToken` is set, it skips loading altogether
  (`internal/database.client.js`).
- During hydration, `useAsyncData` reads the SSR payload and runs no query. The
  browser DB is only touched on **client-side navigation**, or when code
  queries from the browser directly (for example in `onMounted`). Every failure
  path described in ADR-0019 lives on that route. The app only catches those
  failures where a page passes `useAsyncData`'s `status`/`error` into
  `ContentLoadErrorDialog`.

## 3. Pitfalls

1. **Reading `sessionStorage` during setup or render breaks hydration.** The
   server renders with an empty overlay. A client that reads storage in setup
   renders something different. Nuxt's hydration guide lists `localStorage` in
   render as the classic cause
   (`nuxt/nuxt` `docs/3.guide/2.best-practices/hydration.md`). Vue says it
   "will attempt to automatically recover" (`vuejs/docs`
   `src/guide/scaling-up/ssr.md`), but in production that repair is partial.
   Per `runtime-core.esm-bundler.js:2182-2212`, a text mismatch is patched
   (`el.textContent = …`), while `:class` and `:style` are **not** re-applied.
   They are not in `dynamicProps`, and the mismatch check is dev-only. So a
   "saved ★" class or a progress-bar width computed from storage during
   hydration **stays wrong in production, with no warning**. This matches
   `docs/agents/verifying-ui-changes.md`: check mismatch fixes on `--dev`,
   because a clean production run proves nothing.
2. **Applying the overlay too early still mismatches.** `app:mounted` fires
   right after `vueApp.mount`, before async pages under `<Suspense>` have
   finished hydrating. Hydration only ends when `isHydrating` goes false and
   `app:suspense:resolve` fires (`nuxt/dist/app/nuxt.js:41-53`). Safe points:
   - a component's own `onMounted`, as the journal's
     `accordionDeepLink.ts` does;
   - `onNuxtReady`, which waits for `app:suspense:resolve` and then
     `requestIdleCallback` (`composables/ready.js`);
   - `nuxtApp.hooks.hookOnce('app:suspense:resolve', …)`, which avoids the
     idle delay.
3. **Time handling in `prod` versus `qa`.** `new Date()` in render gives
   different values on server and client, and time zones can differ too (both
   docs above). The repo already has an answer to reuse: compute "now" once on
   the server and carry it in the payload with `useState`
   (`layers/atlas/app/composables/almanac.ts:46-54,171`, `useGlassToday`).
   For `qa`, the pinned "now" comes from content or the manifest, so both
   sides agree by construction. Live countdowns tick only after mount.
4. **A module-level `ref` leaks between visitors on the server.** Nuxt:
   "`export myState = ref({})` would result in state shared across requests on
   the server" (`docs/1.getting-started/11.state-management.md`). Use
   `useState` (payload-serialized, JSON only; `docs/4.api/2.composables/use-state.md`)
   or make the store client-only.
5. **`sessionStorage` is per origin and per tab, and every Tenant shares the
   origin.** All Tenants and Spaces are served from one host (ADR-0001/0006),
   and other code already keeps keys in the same store: Nuxt's `nuxt:reload`
   guard (read by `contentLoadRecovery.ts`, ADR-0019), `nuxt:reload:state`,
   and Content's `previewToken`. Consequences:
   - Put the Space in the key (`tinkerfund:<space>:…`) so `prod` and `qa`
     overlays never mix. This follows the Platform's Space-isolation intent.
   - **Reset demo must never call `sessionStorage.clear()`.** It would wipe
     the reload-loop guard, which could allow a second automatic reload.
   - Never call `localStorage.clear()` either. It throws away Content's
     cached dumps.
   - Storage calls can throw, for example `SecurityError` when persistence is
     blocked (MDN `window/sessionstorage`). Wrap every call in `try/catch`, as
     `contentLoadRecovery.ts` already does.
6. **What survives a reload.** Per MDN, `sessionStorage` "survives over page
   reloads and restores". "Opening a page in a new tab or window creates a new
   session", and closing the tab clears it.
   - That makes `sessionStorage` the right source of truth. It survives the
     ADR-0019 chunk auto-reload (`reloadNuxtApp`).
   - An overlay kept only in `useState` does **not** survive that reload.
     `reloadNuxtApp({ persistState: true })` writes `nuxt:reload:state`, but
     the plugin that restores it only runs with `experimental.restoreState`,
     which defaults to `false` (`@nuxt/schema` `index.mjs:663`,
     `nuxt/dist/index.mjs:7827`). This repo does not enable it.
   - Links opened in a new tab start with an empty overlay. Decide whether
     that is acceptable for this demo.
7. **Storing derived totals goes stale.** If the tab stores "total = 12 340",
   a rebuild that changes the baseline leaves the stored number wrong. Store
   the visitor's **actions**: `{campaign, reward, amount, at}` Pledges, cart
   lines and saved slugs. Recompute on every render as display = baseline + Σ
   overlay. Drop actions that name a slug that no longer exists, and clamp
   stock at 0.
8. **Browser-only content queries.** A cart page's items are known only in the
   browser, so the server cannot fetch them. If the page queries Content from
   the browser to resolve them, it pays for the WASM and dump download on first
   view. It also inherits ADR-0019's failure paths outside the pages wired to
   `ContentLoadErrorDialog`. A Space's Campaign list is small, so it is better to
   fetch it on the server (in `useAsyncData`, which puts it in the payload) and
   resolve cart lines against it in the browser.
9. **Auto-imports and plugins are Platform-wide.** A layer's auto-imports
   share one global namespace (`docs/agents/tenant-layers.md` §1), and a
   layer's `plugins/` apply to every Tenant. Name the composable after the
   Tenant (e.g. `useTinkerfundOverlay`). Start it lazily from Tinkerfund pages
   rather than from a global plugin.

## 4. Recommended pattern (no new dependency)

One small composable, local to the Tinkerfund layer, for each Space:

- **Baseline:** fetched on the server in `useAsyncData` from the Space's own
  collections, as today. It is pure content and does not depend on the overlay,
  so the payload replays it during hydration and no browser query runs.
- **Overlay state:** `useState('tinkerfund:<space>:overlay', () => EMPTY)`. The
  server always serializes `EMPTY`, so the first client render equals the SSR
  render.
- **Load after hydration:** in the component's `onMounted`, or once through
  `app:suspense:resolve`, parse
  `sessionStorage['tinkerfund:<space>:v1']` inside `try/catch` and validate it
  with Zod (already a dependency). On failure, fall back to `EMPTY`. Set
  `loaded = true`, and keep overlay-only UI (cart badge, "you backed this")
  behind `v-if="loaded"` or `<ClientOnly>` with a fallback of the same size, so
  the change after hydration does not shift the layout.
- **Write through:** a deep `watch` on the state writes it back to storage (in
  `try/catch`). Every component reads the same `useState` ref, so there is no
  need for `storage` events. Those do not fire within the same document anyway.
- **Derive, never store:** totals, backer counts, stock and "funded" status
  are `computed` from baseline + overlay + the Space clock (server "now" via
  `useState` in `prod`, the pinned value in `qa`).
- **Reset demo:** `removeItem` on this Space's own keys (or a
  `tinkerfund:`-prefix sweep), then set the state back to `EMPTY`. The
  baseline is still in the payload, so everything reverts at once, with no
  reload or new fetch. A reload afterwards also shows the baseline, because
  the server only ever renders the baseline and storage is empty.
- **Test it:** in Playwright, seed the overlay with `addInitScript`, wait for
  hydration before asserting, and check hydration warnings on a `--dev`
  server (`verifying-ui-changes.md`).

**Where `@vueuse/core` would help:** `useSessionStorage(key, default,
{ initOnMounted: true, mergeDefaults: true })` would replace the hand-written
`try/catch` load/save and serializer code. It returns the default when storage
is missing (SSR), reads only after mount, removes the entry when the value is
set to `null`, and keeps same-document instances in sync
(`vueuse` `packages/core/useStorage/index.{md,ts}`). Two caveats:
- Nuxt does **not** auto-import it, "in favor of Nitro's built-in
  `useStorage()`" (same doc).
- Without `initOnMounted` it reads storage during setup, which causes pitfall 1.

`@vueuse/*` is not in the install tree at all, even as a transitive
dependency. Adding it is therefore a new dependency, and the PR that adds it
must be merged by a human (ADR-0004 escalation axes). The code it saves is about
20 lines, so **start without it.** Reach for it if Tinkerfund ends up with
several independent stored keys, or needs the same key synced across
components.

**Rejected alternative, `useCookie`:** the server could read it, so the page
would not update after load. But cookies are not scoped to a tab (they are
shared by every tab until the browser closes). They are also sent to every
Tenant on each request, and are limited to roughly 4 KB. That contradicts
"until the tab closes".
