# ADR-0001 rewrite report

## 1. Parts

History: two commits. `2cb2aa57` (initial design) wrote the ADR; `4eb67c96`
added the ADR-0011 amendment banner because the ADR said "nothing is created at
runtime" with no pointer to ADR-0011. No PR or issue shaped it otherwise.

| Part | Outcome | Reason | Where it went |
|---|---|---|---|
| Amendment banner (ADR-0011 relaxes "nothing at runtime" for `deploy/`) | leftover, split | History, which ADR-0030 forbids. Its live core: ADR-0011 owns where the build runs; content is still built before serving. | *Scope* "Content changes only with a new build" names ADR-0011 as the owner of where the build runs. |
| Context: Nuxt Content v3 is build-time and static, no runtime collection API | live (reason) | Still true; `content.config.ts` builds collections at config time. | *Why* ¶1, *Rejected alternatives* bullet 3. |
| Context: owner wants one repo and one container | live (reason) | Owner's call, still the shape (`nuxt.config.ts:1`). | *Why* ¶2. |
| Context: "feature branch → review → merge → tag release → redeploy the image" | leftover | The live site rebuilds from `main` on the server (ADR-0011); no release tags. How a change ships is ADR-0004/ADR-0011's. | Dropped. See policy question 1. |
| Context: example Spaces `prod`, `it`, `uat`, `dev` | leftover | Examples; real Spaces are Tenant-specific (CONTEXT.md). | Dropped. |
| Decision: one Nuxt app, one repo, one container | live | Still true. | Summary, *Scope* bullet 1. |
| Decision: many collections in one `content.config.ts`, keyed Tenant × Space × type, one SQLite DB | live + mechanics | Live: one collection per Tenant × Space × Collection in one DB. Mechanics: key format in `collectionKey` (`shared/manifest.ts:156`), built by `content.config.ts` via `shared/expand.ts` (checked). | *Scope* bullet 2, *See*. |
| Decision: runtime routing "subdomain / path prefix / header" selects among baked content | live, split | Choosing among built content is live; the menu of mechanisms is ADR-0006's (path prefix chosen). | *Scope* bullet 5, pointing to ADR-0006. |
| Decision: nothing is created at runtime | live | No server write path exists (no `server/` dir); Tenants, Spaces, Collections come from manifests. | *Scope* bullet 3. |
| Decision: isolation physical per table, logical per container | live | `collectionKey` is the table and unit of isolation; ADR-0004's L3 check tests it. | *Scope* bullet 6. |
| Consequence: uses Nuxt Content as designed, no dynamic DB switching | live (reason) | Same as Context. | *Why* ¶1, *Rejected alternatives*. |
| Consequence: every Space ships in every image; not air-gapped; revisit if that changes | live | Still true and the one revisit trigger the sources give. | *Scope* bullet 6, *Rejected alternatives* bullet 2, *When to revisit*. |
| Consequence: "spawn a microsite" is a source-code operation, fits agents editing files | live (reason) | Still how Tenants are added (ADR-0002). "Spawn" is a retired term (CONTEXT.md). | *Why* ¶3, *Scope* bullet 3. |

## 2. Callers

| # | Checklist item | Outcome |
|---|---|---|
| 1 | Site serves only committed, built content; nothing fetched live | answered: *Scope* bullet 2. |
| 2 | One app/repo/container; a cross-Tenant view is an ordinary layer | answered: *Scope* bullet 1. |
| 3 | May a build run on the live server? (conflict with ADR-0011) | answered + fix the callers: ADR-0001 now says content is built before it is served and leaves where the build runs to ADR-0011. ADR-0011 and its rule stop citing ADR-0001 as forbidding it. Edits below. Policy question 1. |
| 4 | Content changes only with a new deploy, so per-deploy caching is safe | answered: *Scope* bullet 4. |
| 5 | What isolation means and how strong | answered: *Scope* bullet 6. |
| 6 | `<tenant>_<space>_<collection>` table is the unit of isolation | mechanics: `collectionKey`, `shared/manifest.ts:156`; named in *See*. |
| 7 | How a request picks a Tenant and Space | answered (points to ADR-0006); fix the caller: ADR-0006:17 quotes the old menu. |
| 8 | Tenants, Spaces, collections declared in files; nothing creates them at runtime | answered: *Scope* bullet 3. |
| 9 | Visitors cannot save data other visitors see | added: true in code (no server routes, no write store); stated in *Scope* bullet 2. guest-intake relies on it. Fix the caller to point instead of restating ADR-0011. |
| 10 | A Tenant is a Nuxt layer | fix the caller: the home is CONTEXT.md and ADR-0018; ADR-0001 never said it. |

Other refs need no edit: `app/composables/catalog.ts:13`,
`app/pages/t/[tenant]/[space]/[...slug].vue:2`, the three Commons files,
`layers/commons/CONTEXT.md:36`, `nuxt.config.ts:1`, `deploy/README.md:5`,
ADR-0025:132/166, ADR-0028 (rewrite agrees), `docs/research/*` (dated notes),
the diagram row. The midden content and test fixture are noise.

## 3. Follow-ups

### Summary rule

Policy question 2 recommends `paths`. Without them, drop the frontmatter
`paths` block and keep it global.

```markdown
---
adr: <re-stamp>
paths:
  - "content.config.ts"
  - "nuxt.config.ts"
  - "shared/manifest.ts"
  - "shared/expand.ts"
  - "deploy/**"
  - ".agents/skills/guest-intake/**"
  - ".agents/skills/guest-build/**"
---
# ADR-0001: One app serves every Tenant from content built ahead of time

The Platform is one Nuxt app, one repo and one container. Every Tenant ×
Space × Collection is built from committed files into its own table in one
SQLite database before the site serves it. Add a Tenant, Space or content by
editing files. The running site fetches no outside data and stores nothing
visitors write; a feature that needs that needs a new decision. Every image
holds every Space: Spaces are separate tables, not sealed off.

Before you propose a runtime data store, a per-Space build, or another
container, read the full ADR:
docs/adr/0001-single-container-baked-multitenancy.md
```

### Caller edits

- `docs/adr/0006-runtime-routing-path-prefix.md:17-19` → "ADR-0001 serves
  every Tenant and Space from one app, choosing among already-built content per
  request. The initial implementation has to pick how a request names them."
- `docs/adr/0011-poc-self-updating-deploy-container.md:12-17` → "ADR-0001
  builds all content before it is served. A CI-built image would need a build
  and a redeploy on every content edit: heavy machinery for a site whose point
  right now is to show the thing working and stay current."
- `docs/adr/0011-...:48-52` → "Here the build runs on the server, inside the
  serving container. Content is still built from committed files before it is
  served; nothing creates Tenants or collections while the site runs
  (ADR-0001)."
- `docs/adr/0011-...:60-63` → "Its running state depends on runtime git and
  build success, not only on a pinned image digest. Accepted as a PoC
  trade-off, not a precedent for how Terrarium ships at scale."
- `docs/adr/0011-...:71-73` → drop "— the original ADR-0001 model —".
  (ADR-0011's own rewrite may supersede these.)
- `.claude/rules/adr-0011.md:12` → "this is the one place a build runs on the
  live server." (drops "(ADR-0001)", which wrongly cited ADR-0001 for it.)
- `.agents/skills/guest-intake/SKILL.md:86-88` → "Some ideas are a good story
  but a bad fit for a platform that serves only content built from committed
  files, with no store visitors write to (ADR-0001). The tell:" (rest
  unchanged).
- `docs/adr/0018-tenant-layers-under-layers-directory.md:8` → "A Tenant is
  implemented as a Nuxt layer (CONTEXT.md). Nuxt 4"
- `docs/agents/tenant-layers.md:5` → "`layers/*`, so there is no `extends`
  list (ADR-0018). It extends the main app (CONTEXT.md). Read this before"
- `docs/adr/0023-guest-driven-demo-pipeline.md:19`: superseded by the 0023
  rewrite, which no longer cites ADR-0001.

### New homes

- Nothing a Skill or doc relied on leaves the ADR. The release-tag flow and
  the "immutable image" target were only quoted by ADR-0011, whose own
  migration path already holds them.

### Other ADRs

- **ADR-0002** (adding a Tenant is a manifest/folder edit): agrees.
- **ADR-0006** (path-prefix routing, one Space's keys per request): agrees.
- **ADR-0011** (build runs on the server): agrees with the rewrite; its text
  says ADR-0001 forbids this, fixed by the edits above.
- **ADR-0025** (cross-Tenant reads opt-in, aggregators are ordinary layers,
  build-time data only): agrees.
- **ADR-0028 rewrite** (cache safe because content changes only with a
  deploy): agrees.
- **ADR-0004 rewrite** (L3 check: one Space's query never returns another's
  Documents): agrees.

## 4. Policy questions

1. **Is a CI-built, immutable image still ADR-0001's target for production?**
   The old ADR implied it; the banner called it "the long-term target". The
   live site rebuilds on the server. Recommendation: ADR-0001 stays neutral and
   ADR-0011 owns where the build runs and its migration path. What ADR-0001
   protects (content built from files, nothing created while running) holds
   either way. Agents may then change `deploy/` without touching ADR-0001.
2. **Scope the summary rule with `paths`.** It is loaded globally and was rated
   useful in 0 of 51 sessions. Recommendation: load it on the content build
   files, `deploy/**` and the guest Skills (draft above), where a proposal for a
   runtime store or a new container is likely.
3. **Is "no store that visitors write to" this ADR's to decide?** Only
   guest-intake states it. Recommendation: yes, since a runtime write store
   breaks "content comes only from committed files". The rewrite asks for a new
   decision rather than forbidding it.

## 5. Split

Not needed: 63 lines.

## 6. Prompt friction

- The checklist's item 3 is a conflict between two ADRs; the prompt's outcomes
  fit only after deciding which ADR owns the fact. I treated it as "answered"
  here plus "fix the caller" in ADR-0011.
- Step 1 asks to read ADRs that cite this one, but only two have rewrites;
  ADR-0011, the main dependent, has none, so its edits may conflict with its
  own later rewrite.
- `git log --follow` takes one path; the rule file needs a second call.

## 7. Lines

Old: 52. New: 63.
