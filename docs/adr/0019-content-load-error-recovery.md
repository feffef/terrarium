# ADR-0019: A failed content load shows a reload dialog; a failed download reloads

`@nuxt/content` runs unpatched. When a page's content fails to load in the
browser, the page shows an error dialog whose fix is a full page reload. A
failed download, of a piece of the app's own code or of the Content database,
reloads the page by itself, once.

## Scope

- **Covers** a Content query that runs in the browser and fails. Most in-app
  navigation reads a server payload instead; ADR-0028 lists where the browser
  database still loads.
- **No silent blank.** Every page or component that queries Content in the
  browser mounts `ContentLoadErrorDialog` and passes it its `useAsyncData`
  status and error. On failure the dialog says the content could not load,
  shows the technical detail, and offers a reload.
- **One mechanism.** The automatic reload is wired into the dialog, not into
  each page, so a new page gets it by mounting the dialog.
- **The automatic reload.** A failed download of a code chunk, or a network
  or HTTP error fetching the browser's Content database, reloads the page
  without a click, at most once per path within Nuxt's own reload guard. If
  it fails again, the dialog shows.
- **Every other failure keeps the dialog,** such as a corrupt database
  download or a query error. They repeat on reload, and a reload loop is
  worse than a dialog.
- **No in-page retry.** Recovery is always a full page load.
- **No dependency patch** for this. A patch of `@nuxt/content` is a dependency
  change, so a human merges it (ADR-0004).

## Why

When `@nuxt/content` fails to load its browser database, it keeps that failure
for the rest of the page's life. App code cannot reach in and clear it. A
fresh page renders from the server database, so a full reload recovers every
case. Without the dialog, the failure shows as a section that stays empty.

A failed download is usually brief: a code chunk or the database file that
returned an error for a moment. Both happen inside the page's `useAsyncData`,
so the error never reaches the router, and Nuxt's own chunk-reload handling
never acts. A reload reliably fixes them, so the app does it for the user. The cost is a
flash and the loss of unsaved in-page state, which beats a dialog the user
must click.

## Rejected alternatives

- **Patch `@nuxt/content`** to forget a failed load and retry the download.
  It is tied to one version's compiled code and must be redone on every
  upgrade. It also misses failures where the load succeeds but leaves the
  data empty or corrupt.
- **Reload automatically on every failure.** A failure that repeats on
  reload, such as a corrupt download, would loop the page. The once-per-path
  guard would stop the loop, but only after a reload that cannot help.
- **Retry inside the page.** The library's kept failure makes it fail again.

## When to revisit

- `@nuxt/content` ships a release that forgets a failed browser load. Then an
  in-page retry could replace the reload.
- A silent self-heal is wanted. It belongs upstream first.

## See

- `app/components/ContentLoadErrorDialog.vue`: the dialog and where recovery
  is wired.
- `app/composables/contentLoadRecovery.ts`, `app/utils/chunkRecovery.ts`,
  `app/plugins/chunk-errors.client.ts`: which errors reload by themselves,
  and the once-per-path guard.
- `layers/blog/tests/e2e/blog.spec.ts`, `tests/unit/chunk-recovery.spec.ts`:
  the checks.
- `scripts/repro-236.ts`: reproduces the library's kept failure on a real
  server restart.
