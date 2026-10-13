# ADR-0002 rewrite: report

Rewrite: `docs/adr-rewrite/rewrites/0002.md`. Sources: the ADR, its rule,
`decisions.md`, ADR-0030 and the template, every ADR citing it (0007, 0012,
0013, 0018, 0025), `expectations/0002.md`, the session-log usage notes,
`git log --follow` on the ADR (3 commits; the 07-05 amendment's commit
19456ce3 read), and the live code: `shared/manifest.ts`, `shared/expand.ts`,
`content.config.ts`, `nuxt.config.ts`, the layer manifests and layer configs,
`docs/agents/tenant-layers.md`, `package.json`. No rewrite yet exists for any
ADR this one cites or is cited by.

## 1. Parts

| Part of the old ADR | Outcome | Reason | Where it went |
| --- | --- | --- | --- |
| Date, Status | leftover | ADR-0030: no history in the text | dropped |
| ADR-0018 banner (`tenants/` → `layers/`, 07-05 amendment moot) | leftover | history; its live fact (no root config edit) is ADR-0018's | Scope "Adding a Tenant", pointing to ADR-0018 |
| 07-05 amendment: new Tenant also needs a `nuxt.config.ts` `extends` edit | leftover | ADR-0018 removed the `extends` list; checked `nuxt.config.ts` has none | dropped |
| Context: agents work best on a small, local, declarative file | live | still the reason; manifests are the agent edit surface (`nuxt.config.ts:45`, `shared/manifest.ts:1`) | Why |
| Context: hand-written `content.config.ts` is a cross-product explosion and global coupling point | live | still the reason, and still plausible to propose | Why; Rejected alternatives |
| Decision: each Tenant layer has a manifest declaring Spaces, Collections, schemas, routing | live, corrected | `TenantManifest` has `name`, `spaces`, `collections` only; routes are derived from page Collections, not declared | Summary; Scope first bullet |
| Decision: a build step (Nuxt module / prebuild script) generates `content.config.ts` and the routing table | split: live / leftover / mechanics | "code expands, nobody hand-writes" is live; the generator and committed file are gone (ADR-0013/0014; no `gen` script in `package.json`, no `scripts/generate.ts`); the mechanism is `shared/expand.ts` | Scope "Code does the expansion"; See; generator as Rejected alternative |
| Decision: agents author only the manifest, never the keyed list | live | `shared/manifest.ts:1-5` | Summary; Scope |
| Consequence: spawn a Tenant = drop a folder; config regenerates | split: live / mechanics | additive Tenant still true (ADR-0018, `loadManifests()` enumerates `layers/`); the `nuxt prepare`/`pnpm install` step and the layer's own `nuxt.config.ts` are mechanics in `docs/agents/tenant-layers.md` §3 (checked) | Scope "Adding a Tenant"; See |
| Consequence: colocates a Tenant's declaration with its layer | live | true by layout | Why (sits next to the Tenant's code) |
| Consequence: manifests are schema-validated, checkable before build | live + mechanics | `validateManifest` (strict zod, labelled messages, kind and data-schema checks) runs before `expand()`; manifests type-checked via the `nuxt.config.ts` include | Scope "checked before it is expanded"; See |
| Consequence: cost of building and maintaining a generator | leftover | no generator exists | dropped |
| Consequence: indirection; generation must be legible and traceable | split: live / leftover | the indirection is live (no expanded file in the repo); the "legible generated file" is gone, and ADR-0013's `pnpm gen --print` hatch no longer exists | Consequences |
| Consequence: the manifest, not `content.config.ts`, is the source of truth | live | same as "edit only the manifest" | Summary |
| Summary rule: `name` matches folder | mechanics | enforced by `loadManifests()` in `shared/expand.ts` (throws on mismatch); also the `name` doc comment in `shared/manifest.ts` | Scope (one clause); See |
| Summary rule: run `pnpm install` after adding a Tenant | mechanics | `docs/agents/tenant-layers.md` §3 and the ADR-0014 rule | See |

## 2. Callers

| Checklist item | Outcome | Note |
| --- | --- | --- |
| 1. Collections are defined in one place; layers define none | added + answered | Was implied by the old ADR, stated only by callers. Checked: no `defineCollection` outside `content.config.ts`. Scope "Only manifests define collections". |
| 2. One small file per Tenant, which agents edit | answered | Summary; Scope first bullet. |
| 3. Manifest checked against a schema before any build | answered + mechanics | Scope bullet states the decision; values and checks live in `shared/manifest.ts`, type-check include in `nuxt.config.ts`. |
| 4. CONFLICT: does a generator write config into the repo? | answered | No. Side B is right. The rewrite owns only the manifest-and-expansion decision and lists a committed generator as a rejected alternative, pointing to ADR-0013. Side A callers fixed below. |
| 5. Code, not people, expands Tenant × Space × Collection | answered + mechanics | Scope; `shared/expand.ts`. |
| 6. One expansion feeds collections and routing map | answered + mechanics | Scope names the three consumers by ADR; mechanism in `shared/expand.ts`, `modules/routing.ts`, `modules/catalog.ts`. |
| 7. Adding a Tenant only adds a folder | answered | Scope; steps in `docs/agents/tenant-layers.md` §3. |
| Repoint: `shared/manifest.ts:89`, `:105`, `:164` | fix the caller | they quote old wording; edits below. |
| Repoint: ADR-0018:17, :65 | fix the caller | quote "drop a folder + `pnpm install`"; edits below. |
| Repoint: ADR-0007:19, ADR-0012:26 | fix the caller | describe the removed generator as ADR-0002's; edits below. |
| Repoint: ADR-0013:20 | answered | "manifest; cross-product expanded by code (`expand()`)" is accurate. |
| Repoint: `nuxt.config.ts:45` | answered | "the primary agent-edit surface, ADR-0002" is accurate. |
| Repoint: `CONTEXT.md:51` | fix the caller | says "generated"; edit below. |
| Fix: five layer manifests | fix the caller | each restates ADR-0013/0014's mechanism; shrink to a pointer. |
| Fix: `nuxt.config.ts:3` | answered | "built dynamically in content.config.ts … (ADR-0002/0013)" is accurate; no edit worth a Human-only PR line. |
| Layer `nuxt.config.ts` comments (six) | answered | "defines no collections (ADR-0002/0013)" is the added Scope bullet. |
| ADR-0025:84, `docs/agents/mdc-when-to-use.md:128` | answered | accurate pointers. |
| Midden artifacts (`the-committed-config.yml`, `the-generator.yml`) | no edit | in-world Tenant content quoting history; not a caller. |

## 3. Follow-ups

### Summary rule: `.claude/rules/adr-0002.md`

```markdown
---
adr: <restamp with scripts/validate-adr-rules.ts>
paths:
  - "layers/*/tenant.config.ts"
  - "shared/manifest.ts"
  - "shared/expand.ts"
---
# ADR-0002: Each Tenant is declared in one manifest, and code expands it

To change what a Tenant holds, edit only its manifest,
`layers/<tenant>/tenant.config.ts`. `shared/expand.ts` turns all manifests into
the keyed collections and routes: never write those by hand or define a
collection in a layer. To add a Space, Collection or Tenant, follow
`docs/agents/tenant-layers.md` §3.

Before you change how manifests are checked or expanded, read the full ADR:
docs/adr/0002-manifest-driven-config-generation.md
```

### Caller edits

- `shared/manifest.ts:89` `(ADR-0002's "an agent's output can be checked before build" promise).` → `(ADR-0002).`
- `shared/manifest.ts:105` `not later inside \`expand()\` (the ADR-0002 promise).` → `not later inside \`expand()\` (ADR-0002).`
- `shared/manifest.ts:164-165` `schema-validated") — the same tool` lines: `Backed by a zod schema (ADR-0002: "manifests are\n * schema-validated") — the same tool …` → `Backed by a zod schema (ADR-0002), the same tool …`
  (`shared/manifest.ts` is Human-only: this PR waits for a human merge anyway, as it touches `docs/adr/**` and `.claude/rules/**`.)
- `CONTEXT.md:50-52` `each is generated per\nTenant × Space at build time (ADR-0002/0013) — see those ADRs for the\nmechanism.` → `each is built per Tenant × Space from the Tenant's manifest (ADR-0002).` (Glossary edit: read `docs/agents/domain.md` first.)
- `layers/atlas/tenant.config.ts:4-7` → `// PRD #64). Declarative intent only (ADR-0002).`
- `layers/marquee/tenant.config.ts:4-7` → `// Chapter; guest-submitted, issue #551). Declarative intent only (ADR-0002).`
- `layers/midden/tenant.config.ts:7-9` → `// Declarative intent only (ADR-0002).`
- `layers/journal/tenant.config.ts:2-4` → `// Declarative intent only (ADR-0002).`
- `layers/commons/tenant.config.ts:9-10` → `// Declarative intent only (ADR-0002).`
- `docs/adr/0018-…:17-19` `which quietly contradicted ADR-0002's\n   "spawn a Tenant = drop a folder + \`pnpm install\`" story: a Tenant with a\n   layer also needed a root-config edit.` → `which contradicted ADR-0002: adding a\n   Tenant should add only its folder, but a Tenant with a layer also needed a\n   root-config edit.`
- `docs/adr/0018-…:65-67` → `- **Adding a Tenant only adds a \`layers/<name>/\` folder** (ADR-0002). No\n  \`nuxt.config.ts\` edit, even for a Tenant with a full layer fit-out.`
- `docs/adr/0007-…:19-20` `ADR-0002 has a generator expand the Tenant manifests into the global\n\`content.config.ts\` (and, in the implementation, \`shared/routing.generated.ts\`).` → `ADR-0002 has code expand the Tenant manifests into the keyed collections;\nat the time a generator wrote \`content.config.ts\` and \`shared/routing.generated.ts\`.` (Or leave it for ADR-0007's own rewrite: it is a superseded ADR describing its own context.)
- `docs/adr/0012-…:26` `(à la\n  \`routing.generated.ts\`, ADR-0002/0007)` → `(like\n  \`#routing\`, ADR-0014)`

### New homes

None needed. The two mechanics that leave the ADR and its rule already have
homes: the add-a-Tenant steps (`docs/agents/tenant-layers.md` §3, which holds
the `nuxt prepare`/`pnpm install` step and the layer's own `nuxt.config.ts`),
and the name-equals-folder check (`loadManifests()` in `shared/expand.ts`).

### Other ADRs

- **ADR-0001** owns "each Tenant × Space × Collection is its own collection" and
  isolation by key. Agrees.
- **ADR-0013** owns building collections when the config loads. Agrees on the
  decision, but its text is stale: `scripts/generate.ts`, `pnpm gen`,
  `pnpm gen --print`, `pnpm gate:drift` and `shared/routing.generated.ts` no
  longer exist (`package.json`, `scripts/`). Its rewrite should drop them;
  the rewrite here states the indirection consequence without the hatch.
- **ADR-0014** owns the routing map from the same expansion. Agrees.
- **ADR-0018** owns "no `nuxt.config.ts` edit for a new Tenant" and the
  manifest type-check glob. Agrees.
- **ADR-0025** owns kinds and the catalog; its "fails at the manifest-authoring
  surface (ADR-0002)" matches the Scope bullet. Agrees.
- **ADR-0004** owns which files a human merges (`shared/manifest.ts`,
  `shared/expand.ts`, `content.config.ts` are listed; `layers/*/tenant.config.ts`
  is not). Agrees.

## 4. Policy questions

None. Every change is a correction to today's code or a dropped leftover. The
one addition ("only manifests define collections") is already true in code and
stated by six layer configs.

## 5. Split

Not needed: 62 lines.

## 6. Prompt friction

- The prompt says to read rewrites of linked ADRs; none exist yet for 0001,
  0007, 0012, 0013, 0014, 0018 or 0025, so facts were checked against code.
- "Trace each part to its reason" assumes amendments with PRs; here the old
  ADR's main drift (the generator) was overtaken by other ADRs (0007 → 0013 →
  0014) with no amendment on ADR-0002 itself. The prompt could say: also check
  every mechanism the ADR names against the code.
- The template says the title is "the same heading its summary rule uses", so
  a changed title forces the rule heading to change too. Fine, but the file
  name (`…-manifest-driven-config-generation.md`) now names a generator that
  is gone; the first-pass "1:1" rule says nothing about renames.
- The callers' checklist mixes "Repoint" and "Fix" tables with the numbered
  claims; the four outcomes fit claims well but a quote is both "answered" and
  "fix the caller". I gave both where they apply.

## 7. Lines

Old: 53. New: 62.
