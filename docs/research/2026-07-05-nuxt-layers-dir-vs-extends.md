# Nuxt 4: `layers/` auto-registration vs manual `extends` — what actually differs

**Date:** 2026-07-05 · **Nuxt version examined:** 4.4.8 (installed source), @nuxt/kit 4.4.8, @nuxt/cli 3.36.1, c12 3.3.4, @nuxt/eslint 1.16.0.
**Method:** read the installed dist source in `node_modules`, ran the installed `loadNuxtConfig` against a fixture, and checked the v4.4.8 docs (sparse-cloned from the `nuxt/nuxt` repo at the tag) plus nuxt/nuxt issues.

## TL;DR

Beyond the tsconfig-include gap, the differences are real but small: (1) **priority** — auto-scanned `layers/*` dirs are inserted into `_layers` *ahead of* `extends` entries, so on any conflict a `layers/` layer beats an extends layer, and `layers/` dirs are ordered reverse-alphabetically among themselves; (2) **automatic `#layers/<name>` aliases** — `layers/*` dirs get one for free (name = dir basename), extends layers only if they declare `$meta.name`; (3) the same hardcoded-`layers/*` glob gap that hits tsconfig also hits the **`nuxt.schema.*` node-tsconfig include**; (4) extends-registered local layers get their `node_modules` appended to `modulesDir` (module resolution + tsconfig excludes), `layers/*` dirs don't. Everything runtime-facing — source watching/HMR, config-change dev restarts, per-layer `~`/`@` aliasing, component/pages/plugins/server scanning, eslint config generation, `app.config`/`nuxt.schema` *loading* — iterates `nuxt.options._layers` uniformly and is **identical** for both registration styles. A `nuxt.config` file is **required** either way (a bare dir in `layers/` produces a c12 warning and is skipped). For this repo the tsconfig gap remains essentially the only difference with teeth; the rest is ordering semantics (moot with disjoint route prefixes) and ergonomics.

---

## How the two paths converge (mechanism)

**VERIFIED.** `loadNuxtConfig()` in `node_modules/.pnpm/@nuxt+kit@4.4.8_magicast@0.5.3/node_modules/@nuxt/kit/dist/index.mjs` globs `layers/*` (`onlyDirectories: true`) under the project cwd, sorts the result **descending** (`.sort((a, b) => b.localeCompare(a))`), and injects it as a config override: `opts.overrides = defu(opts.overrides, { _extends: localLayers })`. It then calls c12's `loadConfig` with `extend: { extendKey: ["theme", "_extends", "extends"] }`. From that point on, auto-scanned dirs and `extends` entries go through **the exact same c12 `extendConfig`/`resolveConfig` machinery** and end up as ordinary entries in `nuxt.options._layers`. There is no separate "auto-registered layer" code path after config load — every downstream difference must come from (a) position in `_layers`, (b) the few places that hardcode the literal string `layers/`, or (c) the post-processing loop in `loadNuxtConfig` itself.

The places that hardcode `layers/` in nuxt 4.4.8 (`grep -n "layers/"` over the dists) are exactly: the tsconfig include globs, the `nuxt.schema.*` node-tsconfig include, the `#layers` auto-naming check, the `builder:watch` hard-restart hook for the `layers/` dir, and the `modulesDir` suppression. Each is a finding below.

## Findings

### 1. Layer priority: `layers/*` dirs outrank `extends` entries (and Z beats A within `layers/`)

**VERIFIED (source + empirical + docs).** Because c12 processes `extendKey` in array order (`["theme", "_extends", "extends"]` — `extendConfig` in `c12/dist/index.mjs`), the auto-scanned dirs are pushed into `config._layers` *before* the manual `extends` entries. Empirical run of the installed `loadNuxtConfig` against a fixture with `layers/{alpha,zeta}` + `extends: ['./ext-one', './ext-two']` produced:

```
_layers = [ <project root>, layers/zeta, layers/alpha, ext-one, ext-two ]
```

Earlier index = higher priority everywhere: config merging is `defu(rootConfig, ...layers)` (leftmost wins — with root's value removed, the merged test key came back `who: 'zeta'`), and component scanning assigns `priority = layerCount - i` (`nuxt/dist/index.mjs`, `app:resolve` hook in the components module). Plugins/pages/app-file resolution iterate the same array (reversed where "apply lowest priority first" is needed, e.g. `const reversedLayers = nuxt.options._layers.slice().reverse()`), so the direction is consistent.

The v4.4.8 docs state this exactly (`docs/1.getting-started/14.layers.md`, "Layer Priority"): *"1. Your project files — always have the highest priority. 2. Auto-scanned layers from `~~/layers` directory — sorted alphabetically (Z has higher priority than A). 3. Layers in `extends` config — first entry has higher priority than second."* (The reverse-alphabetical sort in kit is what produces "Z > A": descending sort puts `zeta` earlier in `_layers` than `alpha`.)

Practical upshot: with manual `extends` you control relative order explicitly per entry; with `layers/` you control it only by directory naming (`1.base/`, `2.admin/` — the docs' own suggested workaround). And if a project uses *both*, every `layers/` dir silently outranks every `extends` entry.

Related but **not** a difference between the two styles: the Nuxt 4 "Corrected Module Loading Order in Layers" change (upgrade guide, `docs/1.getting-started/18.upgrade.md`; PR [nuxt/nuxt#31507](https://github.com/nuxt/nuxt/pull/31507), issue [nuxt/nuxt#25719](https://github.com/nuxt/nuxt/issues/25719)) reordered *layer modules before project modules* for all layers regardless of how they were registered.

### 2. Automatic `#layers/<name>` alias only for `layers/*` dirs

**VERIFIED (source + empirical).** In `loadNuxtConfig` (kit dist), after c12 returns, each layer whose cwd matches one of the auto-scanned relative paths gets a default name: `layer.meta.name ||= basename(layer.cwd)`, and then any *named* layer gets `nuxtConfig.alias["#layers/" + name] = <layer rootDir>`. In the fixture, `#layers/zeta` and `#layers/alpha` appeared automatically; the extends layers got **no** alias until one declared `$meta: { name: 'named-ext' }` in its `nuxt.config.ts` (or `meta.name` in the extends tuple options), after which `#layers/named-ext` appeared. Docs agree (`docs/1.getting-started/14.layers.md`: *"named layer aliases to the `srcDir` of each of these layers will automatically be created… via `#layers/test`"*, introduced in v3.16.0; overriding via `meta.name` in the extends entry options is documented on the same page).

So: extends-registered layers *can* have `#layers/*` aliases, but only opt-in; `layers/` dirs get them by convention. (Note the repo's tenants declare no `$meta.name`, so no `#layers/journal` alias exists today — consistent with `docs/agents/tenant-layers.md` advising layer-local relative imports.)

### 3. The tsconfig gap, precisely — and the same gap for `nuxt.schema.*`

**VERIFIED (source; corroborates the already-established empirical finding).** In kit's `_generateTypes` (`@nuxt/kit/dist/index.mjs`), per-layer include globs are only emitted for layers passing this filter:

```js
for (const dirs of layerDirs) if (!dirs.app.startsWith(rootDirWithSlash) || dirs.root === rootDirWithSlash || dirs.app.includes("node_modules")) {
```

i.e. a layer gets its own include entries only if it is **outside the project root**, **is the root itself**, or **lives in node_modules**. A local layer *inside* the root registered via `extends` (this repo's `./tenants/*`) matches none of these and is skipped entirely; the assumption baked into `resolveLayerPaths` is that in-root layers live under `layers/` and are covered by the root layer's hardcoded `layers/*/app/**/*`, `layers/*/shared/**/*(.d.ts)`, `layers/*/modules/…`, `layers/*/nuxt.config.*`, `layers/*/.config/nuxt.*`, `layers/*/*.d.ts` globs. Two nuances worth recording:

- An extends layer **outside** the root (`extends: ['../base']`) or from npm/git *does* get proper per-layer includes — the gap is specific to local-in-root, non-`layers/` paths.
- The only trace of such layers in the generated tsconfigs is their `node_modules` in `exclude`, which comes from the `modulesDir` loop (see Finding 6), not from layer includes — confirmed in this repo's `.nuxt/tsconfig.app.json` (`"../tenants/journal/node_modules"`, `"../tenants/blog/node_modules"`).
- The **same hardcoding** exists for config schemas: the `nuxt:nuxt-config-schema` module (`nuxt/dist/index.mjs`, `prepare:types` hook) pushes only `<rootDir>/nuxt.schema.*` and `<rootDir>/layers/*/nuxt.schema.*` into the node tsconfig include — yet `resolveSchema` *loads* `nuxt.schema.ts` from every layer root and the dev watcher watches every layer root for it. So an extends layer's `nuxt.schema.ts` works at runtime but is not type-covered.

**REPORTED (issues):** [nuxt/nuxt#30905](https://github.com/nuxt/nuxt/issues/30905) reports exactly this shape (*"This file is missing the include item…to include extending layer files such as it's own `nuxt.config.ts`! When `compatibilityVersion: 4` is removed it works fine."*) — closed by bot with "needs reproduction", i.e. known-reported, not fixed. Adjacent layer/tsconfig bugs show the same hardcoded-glob root cause: [#35310](https://github.com/nuxt/nuxt/issues/35310) (`../layers/*/modules/**/*` landing in `exclude` breaks type-checking of layer modules) and [#33477](https://github.com/nuxt/nuxt/issues/33477) (layer `server/` files missing from `tsconfig.server.json` in 4.1.3; closed, fixed by PR [#33510](https://github.com/nuxt/nuxt/pull/33510) — that fix added the `layers/*/server/**/*` glob we see in 4.4.8, again `layers/`-only). No PR was found that emits includes for in-root extends layers; the documented workaround is the layer (or project) adding `typescript.tsConfig.include` manually.

### 4. Dev-server behavior: config watching is identical; only "add/remove a layer directory" differs

**VERIFIED.** Two separate watchers matter:

- **Config-file watching (reload on layer nuxt.config change):** @nuxt/cli's dev loader calls `getLocalLayerDirs(nuxt.options._layers, cwd)` (`@nuxt/cli/dist/dev-CQg8KtEQ.mjs`), which collects *every* layer cwd inside the project root (excluding node_modules) — registration style irrelevant — and watches each for `RESTART_RE = /^(?:nuxt\.config\.[a-z0-9]+|\.nuxtignore|\.nuxtrc|\.config\/nuxt(?:\.config)?\.[a-z0-9]+)$/`. Editing `tenants/journal/nuxt.config.ts` reloads dev exactly like editing `layers/x/nuxt.config.ts`. **Non-difference.**
- **Source watching / HMR:** the builder watchers (`createWatcher` / `createGranularWatcher` / parcel, `nuxt/dist/index.mjs` ~8608–8830) watch each layer's `app` and `server` dirs via `getLayerDirectories(nuxt)`, which maps plain `_layers`. Pages-module restart paths (`router.options.ts`, per-layer `pages/` dir) likewise iterate `_layers`. **Non-difference.**
- **The one `layers/`-only hook:** `initNuxt` (`nuxt/dist/index.mjs` ~6980) registers a `builder:watch` handler that issues a **hard restart** on `addDir`/`unlinkDir` under `<rootDir>/layers/` — i.e. dropping a new layer directory in (or deleting one) restarts and re-registers automatically, no config edit needed. With `extends` the equivalent trigger is editing the root `nuxt.config.ts` (caught by the CLI watcher above), so the ergonomic gap is small. Caveat (inference, not tested): whether the `addDir` event actually fires depends on the builder watcher covering `<rootDir>/layers/`, which is not watched when `srcDir` is `<rootDir>/app/` and no layer dirs exist yet — so cold-start "first layer added" detection is not guaranteed either way.

### 5. `~` / `@` / `~~` / `@@` per-layer alias rewriting: identical

**VERIFIED non-difference.** `LayerAliasingPlugin` (`nuxt/dist/index.mjs` ~5552) is fed `layers: nuxt.options._layers.slice(1)` — every non-root layer, both styles — and rewrites `~`/`@`(`~~`/`@@`) relative to each layer's own `srcDir`/`rootDir` for files under that layer. Gated on `experimental.localLayerAliases`, default `true` (`@nuxt/schema/dist/index.mjs`). `srcDir` resolution itself happens in kit's `loadNuxtConfig` via `applyDefaults(layerSchema, layer.config)` uniformly per layer.

### 6. `modulesDir`: extends layers get their `node_modules` registered; `layers/*` dirs don't

**VERIFIED.** In `initNuxt` (`nuxt/dist/index.mjs` ~7214): every non-root layer's `<root>/node_modules` is pushed onto `nuxt.options.modulesDir` **unless** the layer sits inside some layer's `layers/` dir (`locallyScannedLayersDirs.every((dir) => !dirs.root.startsWith(dir))`). Consequences: extends layers can resolve their own dependencies from their own `node_modules` (relevant for published/monorepo layers, irrelevant for pnpm-single-lockfile local dirs), and those paths land in the generated tsconfig `exclude` lists — which is precisely why this repo's tenants appear in `tsconfig.app.json` only as `node_modules` excludes. `layers/*` dirs are assumed to share the root's `node_modules`.

### 7. eslint config generation: identical (unlike tsconfig)

**VERIFIED non-difference.** @nuxt/eslint 1.16.0 (`dist/chunks/index.mjs`, `getDirs`) builds its glob sets by iterating `nuxt.options._layers` and deriving `pages/layouts/plugins/middleware/modules/composables/components` dirs from each layer's `srcDir` — no hardcoded `layers/` strings anywhere in the package. Extends-registered tenants are fully covered by the generated flat config.

### 8. A `nuxt.config` file is required in both cases; bare dirs in `layers/` warn and are skipped

**VERIFIED (empirical + source + docs).** c12's `resolveConfig` returns `config: undefined` when no config file resolves, and `extendConfig` then warns and skips — the fixture's `layers/bare/` (no config) printed `Cannot extend config from `layers/bare/` in <cwd>` and did not appear in `_layers`. Same for an extends entry pointing at a bare dir. Docs (`docs/2.directory-structure/1.layers.md`): *"Every layer **must have** a `nuxt.config.ts` file to be recognized as a valid layer, even if it's empty."* The only asymmetry is operational: auto-scan turns *any* stray directory under `layers/` (scratch dirs, editor droppings) into a registration attempt and a startup warning, whereas `extends` only touches what is listed.

### 9. Nesting: neither style is recursive

**VERIFIED (empirical).** The auto-scan glob is exactly `layers/*` at the project cwd, once, before config load. A `layers/` dir *inside* an extends layer (`ext-one/layers/nested/`) and a `layers/` dir inside an auto-scanned layer (`layers/alpha/layers/deep/`) both failed to register in the fixture. (A layer can still pull in its own sub-layers explicitly via its own `extends`, which c12 flattens depth-first.) The `locallyScannedLayersDirs` logic in `initNuxt` is defensive; nothing populates nested scans in 4.4.8.

### 10. `.nuxtignore` / `.nuxtrc`: root-only for both

**VERIFIED non-difference.** `isIgnored`/`resolveIgnorePatterns` (kit dist ~232–270) read a single `.nuxtignore` at `nuxt.options.rootDir` (patterns are then applied *relative to each layer root* via the `layerRootsCache` cwd matching — same for all layers). `.nuxtrc` is read by c12 only for the project cwd, the workspace dir, and the user home (`globalRc: true`); `resolveConfig` for extended sources reads no rc, and kit even filters rc pseudo-layers out of `_layers` (`layer.configFile.endsWith(".nuxtrc") → continue`). No per-layer `.nuxtignore`/`.nuxtrc` exists under either registration style.

### 11. Everything else checked: uniform `_layers` iteration

**VERIFIED non-difference.** Hooks from layer configs (`initNuxt` applies `config.hooks` for all layers, reversed), `app.config.ts` collection, composables/utils import dirs, server scanning, middleware/plugins/layouts resolution, `build.transpile` for node_modules layers, and `nuxt.schema.ts` *loading and watching* (Finding 3 caveat aside) all iterate `nuxt.options._layers` or `getLayerDirectories(nuxt)` with no registration-style branch.

## Docs guidance (for the record)

The v4.4.8 docs' own recommendation (`docs/3.guide/6.going-further/7.layers.md`, "When to Use Each"): *"**`extends`** — Use for external dependencies (npm packages, remote repositories) or layers outside your project directory. **`~~/layers` directory** — Use for local layers that are part of your project."* The tsconfig source (Finding 3) shows this recommendation is load-bearing, not stylistic: the generated type coverage assumes it.

## Implications for this repo

The two tenants own disjoint route prefixes (`/t/journal/*`, `/t/blog/*`), define no overlapping components/composables, and share the root lockfile. Given that:

- **Priority/ordering (Finding 1) is moot here** — nothing conflicts between the tenants, and the root project always wins over both regardless of style. It would only start to matter if a shared "base tenant fit-out" layer ever overlapped with tenant layers.
- **`#layers/*` aliases (Finding 2) are not used** — tenant code deliberately uses layer-local relative/URL-resolved imports (see `tenants/journal/nuxt.config.ts` and `docs/agents/tenant-layers.md`). Adding `$meta: { name: 'journal' }` would buy the alias without moving directories, if ever wanted.
- **Dev/HMR, eslint, aliasing, ignore handling: no difference at all** for this layout (Findings 4, 5, 7, 10).
- **`modulesDir` (Finding 6) is cosmetic here** — pnpm hoists to the root; the tenant `node_modules` entries in `modulesDir`/tsconfig-excludes reference directories that don't exist.
- That leaves **type coverage (Finding 3) as the only functional cost of the current `extends` setup**: `nuxt typecheck` silently skips `tenants/*/app/**` (and would skip a tenant `nuxt.schema.ts`). The honest summary the research question asked for: **yes — tsconfig include is essentially the only difference with teeth for this repo; the remaining differences are conflict-ordering semantics this layout never exercises, plus ergonomics (no `extends` array to maintain, free `#layers` aliases, auto-pickup of new layer dirs).** Mitigations, in increasing invasiveness: (a) add explicit `typescript.tsConfig.include` globs for the tenants at the root config; (b) set `$meta.name` + includes per tenant layer; (c) move `tenants/` to `layers/` — which would also *rename nothing else for free*: note it would flip tenants ahead of any future extends entries in priority and subject the dir to auto-scan warnings for non-layer folders.

## Sources

- `node_modules/.pnpm/@nuxt+kit@4.4.8_magicast@0.5.3/node_modules/@nuxt/kit/dist/index.mjs` — `loadNuxtConfig`, `getLayerDirectories`, `isIgnored`/`resolveIgnorePatterns`, `resolveLayerPaths`, `_generateTypes`.
- `node_modules/.pnpm/nuxt@4.4.8_*/node_modules/nuxt/dist/index.mjs` — `initNuxt` (layers-dir restart hook, `modulesDir`, transpile), `LayerAliasingPlugin`, components `app:resolve` priority, plugins/middleware resolution, `schemaModule`, `watch`/`createGranularWatcher`/`resolvePathsToWatch`.
- `node_modules/.pnpm/c12@3.3.4_magicast@0.5.3/node_modules/c12/dist/index.mjs` — `loadConfig`, `extendConfig`, `resolveConfig`, `watchConfig`.
- `node_modules/.pnpm/@nuxt+cli@3.36.1_*/node_modules/@nuxt/cli/dist/dev-CQg8KtEQ.mjs` — `getLocalLayerDirs`, `createConfigWatcher`, `RESTART_RE`.
- `node_modules/.pnpm/@nuxt+eslint@1.16.0_*/node_modules/@nuxt/eslint/dist/chunks/index.mjs` — `getDirs`.
- nuxt/nuxt docs at tag `v4.4.8`: `docs/1.getting-started/14.layers.md`, `docs/2.directory-structure/1.layers.md`, `docs/3.guide/6.going-further/7.layers.md`, `docs/1.getting-started/18.upgrade.md` (rendered at https://nuxt.com/docs/4.x/getting-started/layers , https://nuxt.com/docs/4.x/guide/going-further/layers , https://nuxt.com/docs/4.x/getting-started/upgrade).
- Issues/PRs: [nuxt/nuxt#30905](https://github.com/nuxt/nuxt/issues/30905), [nuxt/nuxt#33477](https://github.com/nuxt/nuxt/issues/33477) (fixed by [#33510](https://github.com/nuxt/nuxt/pull/33510)), [nuxt/nuxt#35310](https://github.com/nuxt/nuxt/issues/35310), [nuxt/nuxt#31507](https://github.com/nuxt/nuxt/pull/31507) / [#25719](https://github.com/nuxt/nuxt/issues/25719) (module order, both styles).
- Empirical fixture: installed `loadNuxtConfig` run against a scratch project with `layers/{alpha,zeta,bare}` + `extends: ['./ext-one','./ext-two']`, verifying `_layers` order, defu merge winner, `#layers` aliases, `$meta.name` opt-in, bare-dir warning, and non-recursive scanning.
