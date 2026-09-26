# Tinkerfund: UI library shortlist vs. native browser features

Grounding note for issue #1361. Question: what should the planned Tinkerfund
Tenant use to get a smooth, accessible UI (mobile-first, dark mode, WCAG AA,
motion that respects `prefers-reduced-motion`) without adding many
dependencies? Every new dependency makes a PR human-merge-only (ADR-0004,
2026-07-06 amendment). A second question: can a dependency, or a Nuxt module,
be scoped to one Tenant layer?

**Verified 2026-09-26.** `nuxt.com`, `developer.mozilla.org` and `reka-ui.com`
return a proxy 403 here, so the docs were read from their canonical source
repos on `raw.githubusercontent.com`. Each claim cites the page that renders
it. Browser support comes from the **`web-features@3.40.0`** npm package. That
package is the W3C WebDX data behind the Baseline badges on web.dev and MDN.
Bundle sizes were **measured by me**, not taken from bundlephobia (see §3 for
the method). The scoping behaviour in §1 was **tested empirically** in a
scratch Nuxt 4.5.2 + pnpm 10.33.0 project, the same versions this repo uses.

---

## 1. Per-layer dependencies and per-layer Nuxt modules

**Short answer: no.** A dependency can sit in a layer-local `package.json`,
but that is only bookkeeping. The package and any Nuxt module it brings still
land in the one Platform app, and every Tenant can reach them.

- **Today a `layers/tinkerfund/package.json` would be ignored.** The repo has no
  `pnpm-workspace.yaml`. pnpm: "A workspace must have a `pnpm-workspace.yaml`
  file in its root", and without a `packages` field "only the root package is
  included" ([pnpm Workspace](https://pnpm.io/workspaces);
  [pnpm settings § packages](https://pnpm.io/settings#packages)). To make it
  count, you would add a new root `pnpm-workspace.yaml` listing
  `layers/tinkerfund`. Even then there is still one root `pnpm-lock.yaml`
  (`sharedWorkspaceLockfile` defaults to `true`,
  [pnpm § sharedWorkspaceLockfile](https://pnpm.io/workspaces#sharedworkspacelockfile)),
  so the PR still touches root install files.
- **Every layer's Nuxt modules install into the single app.** Nuxt merges each
  layer's `nuxt.config` with the main config
  ([layers/ directory](https://nuxt.com/docs/4.x/directory-structure/layers)).
  In the source, `resolveModules()` loops over every
  `nuxt.options._layers[].config.modules` and puts them all in one module map
  (`packages/nuxt/src/core/nuxt.ts` @ v4.5.2, `resolveModules`). There is no
  way to turn a module on for one layer only. The only per-module switch is
  disabling it through its config key (`image: false`), and that is also
  app-wide ([Authoring Nuxt Layers § Disabling Modules from Layers](https://nuxt.com/docs/4.x/guide/going-further/layers#disabling-modules-from-layers-v43)).
- **Tested.** In a scratch workspace, `layers/tf/package.json` declared
  `@vueuse/nuxt`, and `layers/tf/nuxt.config.ts` enabled it. A sibling layer,
  `layers/other`, declared nothing. Results:
  - `nuxt prepare` installed the module for the whole app.
  - All of VueUse was added to the global `.nuxt/imports.d.ts`.
  - `nuxt build` succeeded for an `other` page that used `useSessionStorage`
    as an auto-import.
  - It also succeeded when that page used an explicit
    `import { useLocalStorage } from '@vueuse/core'`, a package the `other`
    layer never declared.

  So pnpm's strictness did not keep the sibling layer out.
- **Bundle scoping does work at the route level.** In the same build, VueUse's
  code went into a shared chunk that only the two page chunks importing it
  loaded. It was not in the app entry chunk. So a library that only Tinkerfund
  pages import costs other Tenants no JS. That comes from Vite's route
  code-splitting, not from where the dependency is declared.
- **Auto-imports are global.** A module that registers components or
  composables puts plain names like `Motion`, `useScroll`, `DialogRoot` and
  `Label` into the namespace every Tenant shares. This is the collision risk
  in `docs/agents/tenant-layers.md` §1. `motion-v/nuxt` adds `Motion`,
  `AnimatePresence`, `M`, `useScroll`, `useSpring` and `useInView`, and more
  (`motion-v@2.4.4` `dist/nuxt/index.mjs`). `reka-ui/nuxt` adds every Reka
  component with no prefix by default (`reka-ui@2.10.5` `dist/nuxt/index.mjs`).

**What this means for the Isolation stance** (root `CONTEXT.md` → Tenant):

- A root dependency is not "shared code between Tenants" in the sense the
  stance forbids. No Tenant imports another Tenant's code.
- But it is a Platform-wide capability. Nothing mechanical stops a second
  Tenant from importing it.
- Keep it Tinkerfund-only by convention:
  - Import the library explicitly in Tinkerfund files only.
  - Do **not** enable its Nuxt module. That keeps the global auto-import
    namespace clean and keeps the code out of other Tenants' routes.
  - A layer `package.json` plus `pnpm-workspace.yaml` adds files without adding
    isolation. Declare any dependency in the root `package.json`.
- Nuxt config the layer sets is also app-wide. That includes `experimental.*`
  (see §2).

## 2. What native covers (Baseline status from `web-features@3.40.0`)

| Need | Native feature | Baseline |
|---|---|---|
| Route/page transitions, shared-element morphs | View Transitions (same-document) | **Newly available** 2025-10-14 (Chrome 111, Firefox 144, Safari 18) |
| Named transition groups / types | `view-transition-class`; `:active-view-transition` types | Newly available 2025-10-14 / 2026-01-13 |
| Modal (pledge, confirm) | `<dialog>` + `showModal()` | **Widely available** (low 2022-03-14) |
| Open a dialog or popover without JS | Invoker commands (`commandfor`/`command`) | Newly available 2025-12-12 |
| Menus, tooltips, disclosure panels | Popover API | Newly available 2025-01-27 |
| Enter/exit animation of top-layer elements | `@starting-style` + `transition-behavior: allow-discrete` | Newly available 2024-08-06 (both) |
| Scroll-linked reveals / progress | Scroll-driven animations (`animation-timeline`) | **Not Baseline**: Chrome 115, Safari 26, no Firefox |
| Scroll reveals (fallback) | `IntersectionObserver` | Widely available |
| Pledge-amount slider | `<input type="range">` | Widely available |
| Dark mode | `prefers-color-scheme`, `color-scheme` / `light-dark()` | Widely / newly available (2024-05-13) |
| Reduced motion | `prefers-reduced-motion` | Widely available |
| Not yet usable | `interpolate-size`, `dialog closedby`, customizable `<select>`, cross-document view transitions, anchor positioning | Not Baseline |

**Accessibility you get for free.** The HTML Standard's `showModal()` does
several things for you
([HTML § the dialog element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element)):

- It puts the dialog in the top layer.
- It runs the *dialog focusing steps* to choose the first focused element.
- It closes on a close request, such as Esc.
- On close, it moves focus back to the dialog's *previously focused element*.

Popovers add light dismiss. The Platform already uses a native `<dialog>`
(`app/components/ContentLoadErrorDialog.vue`).

**What native does not give you.** No native element provides the full keyboard
model that the WAI-ARIA APG
[combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) and
[menu button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)
patterns require: arrow-key roving and `aria-activedescendant`. `<datalist>` is
not Baseline. That gap is the one real reason to add a library.

**Nuxt's View Transitions integration can be scoped to Tinkerfund.** In the
Nuxt source (v4.5.2):

- The client plugin is registered when `experimental.viewTransition` is
  truthy (`core/nuxt.ts`).
- Per navigation, it reads `to.meta.viewTransition` and falls back to the
  app default (`app/plugins/view-transitions.client.ts`).
- It **skips the transition** when `prefers-reduced-motion: reduce` is set
  (unless the mode is `'always'`) and when `document.startViewTransition` is
  missing.

So the pattern is:

1. Put `experimental: { viewTransition: { enabled: false } }` in the
   Tinkerfund layer's `nuxt.config.ts`.
2. Add `definePageMeta({ viewTransition: true })` on Tinkerfund pages. The
   `PageMeta` type includes it.

Other Tenants keep the default of off. The one side effect is that navigating
*into* a Tinkerfund page animates, because the target page's meta decides.
The flag is still marked experimental
([Experimental Features § viewTransition](https://nuxt.com/docs/4.x/guide/going-further/experimental-features#viewtransition)),
and a human reviewer should know that this layer config changes an app-wide
setting.

## 3. npm candidates

The sizes below are **min+gzip, with Vue external**. Each case bundles only the
named imports, using esbuild with tree-shaking (script: bundle each import
set, then gzip). All candidate packages are MIT-licensed and accept this
repo's Vue 3.5.42 as a peer dependency. Versions and metadata come from
`npm view` on 2026-09-26.

| Package | Measured cost | SSR / Nuxt 4 | a11y value | Notes |
|---|---|---|---|---|
| **`reka-ui` 2.10.5** | Dialog 11.4 KB · Slider 7.9 KB · DropdownMenu 25.9 KB · Combobox 31.4 KB · all four 43.0 KB | SSR supported. The Vue < 3.5 `useId` hydration caveat does not apply here ([SSR guide](https://reka-ui.com/docs/guides/server-side-rendering)) | **High**: WAI-ARIA APG patterns, focus management, keyboard support ([Accessibility](https://reka-ui.com/docs/overview/accessibility)) | Unpacked size 8.5 MB. Depends on `@floating-ui/*`, `@tanstack/vue-virtual`, `@internationalized/*` and **`@vueuse/core@^14`** |
| `motion-v` 2.4.4 | `motion` + `AnimatePresence` 42.0 KB; `animate()` alone 19.9 KB | SSR is in the README feature list ([README](https://github.com/motiondivision/motion-vue)) | None directly. **`MotionConfig` defaults to `reducedMotion: "never"`** (`dist/es/components/motion-config/context.mjs`), so you must opt in with `reduced-motion="user"` | Pulls in `framer-motion`, `motion-dom` and `motion-utils`. Reka's recommended animation partner ([Animation guide](https://reka-ui.com/docs/guides/animation)) |
| `@vueuse/core` 15.0.0 | `useSessionStorage` + `useIntersectionObserver` + `usePreferredReducedMotion` = 3.4 KB | SSR-safe | Low | **Version skew**: installing 15 next to `reka-ui` (which wants `^14`) left two copies on disk (observed). The Platform already uses raw `sessionStorage` (`app/composables/contentLoadRecovery.ts`) and `matchMedia` (`layers/journal/app/utils/expandTransition.ts`) |
| `@nuxt/fonts` 0.14.0 | 0 KB JS; downloads fonts at build time | Nuxt module, **app-wide** | None | It finds fonts by scanning `font-family` in CSS ([Installation](https://fonts.nuxt.com/get-started/installation)). `throwOnError` defaults to `true` for builds, so a provider outage fails the build ([Configuration § throwOnError](https://fonts.nuxt.com/get-started/configuration#throwonerror)). Adds network to the build. Every Tenant uses system stacks today (`layers/midden/app/assets/theme.css` explains why) |

A zero-dependency font path already exists. The Platform commits
`app/assets/fonts/gelasio-latin-400-normal.woff2` and declares it with
`@font-face` (`app/components/MermaidDiagram.vue`). Tinkerfund can do the same
from its own `app/assets/` if it wants one display face. Google Fonts is
reachable at authoring time for downloading the file.

## Recommendation: minimal set

1. **Start with zero new dependencies.** Build the first pass entirely from §2:
   - View Transitions through the per-page Nuxt opt-in.
   - `<dialog>` and popover, animated with `@starting-style` and
     `allow-discrete`.
   - `<input type="range">` for the pledge slider.
   - `IntersectionObserver` for scroll reveals, with scroll-driven animations
     added only under `@supports (animation-timeline: view())`.
   - Raw `sessionStorage`.
   - A system font stack or a committed woff2.

   Wrap every animation in a `prefers-reduced-motion` guard.
2. **The only candidate worth adding is `reka-ui`, and only if a component
   needs an APG combobox or menu.** Import the parts you use explicitly in
   Tinkerfund files; do not register `reka-ui/nuxt`. It costs roughly
   8–31 KB gzip per primitive, loaded only on Tinkerfund routes. Declare it in
   the root `package.json`, because a layer `package.json` buys no isolation
   (§1).
3. **Do not add `motion-v`, `@vueuse/core` or `@nuxt/fonts`.**
   - `motion-v` costs about 42 KB, ignores reduced motion by default, and
     overlaps with View Transitions and CSS for a deadpan UI.
   - `@vueuse/core` saves only a few lines and would clash with reka's
     VueUse version.
   - `@nuxt/fonts` is app-wide, adds network to the build, and can fail it.
