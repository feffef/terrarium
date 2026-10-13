# ADR-0016 rewrite report

No ADR in `docs/adr/` cites ADR-0016. It cites ADR-0004, ADR-0006, ADR-0014 and
ADR-0018 (its amendment banner). Of those, only ADR-0004 has a rewrite; the rest
were read in their old form.

## 1. Parts

| Part of the old ADR | Outcome | Reason | Where it went |
|---|---|---|---|
| Amendment banner (ADR-0018: `tenants/` → `layers/`) | leftover | The path move is done; the rewrite simply uses `layers/`. | Dropped |
| Date / Status | leftover | ADR-0030 forbids them. | Dropped |
| Context: ADR-0006 routes every request by `/t/<tenant>/<space>/<slug>`; before this, every route was Space-scoped | leftover (history) | Background, not a rule. ADR-0006 owns path routing. | *See* points to the resolver (ADR-0006) |
| Context: the Atlas needs a front door; a sham Biome would lie in the domain model and pollute every Space list | live (the Why) | Still the reason a root page is not a Space. Atlas-specific wording dropped. | *Why* 1, *Rejected alternatives* 1 |
| Decision: a Tenant's layer may register a page at `/t/<tenant>` | live | All 7 Tenants have one today. | Summary, *Scope* "Where it lives" |
| Decision: the Atlas does so with `tenants/atlas/.../index.vue` | leftover | Names the first case; the path is stale. Callers that cite "the Atlas precedent" get repointed. | Dropped |
| Decision: not produced by the manifest, not in the routing map, not in `entryRoutes` | live; `entryRoutes` part is mechanics | Still true: `entryRoutesFrom` in `shared/expand.ts` emits only `/t/<tenant>/<space>`. | *Scope* "What stays the same"; *See* `shared/expand.ts` |
| Decision: never resolves a `(tenant, space)` request; reads Space data via `resolveSpaceRoute` once per Space | live | Atlas and Blog root pages do exactly this. Commit 3d41843b removed a Platform `/t/[tenant]` page that read `#routing` directly, citing this ADR. | *Scope* "How it reads content" |
| Decision: therefore outside the ADR-0004 Human-only routing core; it is presentation | live, restated against today's ADR-0004 | Layer pages are not on the Human-only list, and a page that only calls the resolver for its own Tenant adds no logic about which Tenant's data a request reaches. | *Scope* "Who merges"; *Why* 2 |
| Decision: no collision with the catch-all (one segment vs two) | mechanics, split | Collision detail is Nuxt routing, held by the page tree. The non-obvious effect (no root page means a 404) is kept. | *Consequences* 1; *See* the catch-all |
| Consequence: a Tenant can have a landing without a sham Space | live | Same as the Why. | *Why* 1 |
| Consequence: narrow precedent; resolver, routing map, isolation untouched; a Tenant with no layer has no root page | live | The basis for rejecting the Platform-wide `/t/[tenant]` page. | *Scope* "Where it lives", "What stays the same"; *Rejected alternatives* 2 |
| Consequence: smoke gate does not cover roots; a Tenant relying on one should test it | live | Every Tenant's root page has a test in `layers/<tenant>/tests/e2e/`; nothing enforces it. | *Scope* "Testing"; *Consequences* 2 |
| Consequence: Atlas front door exercised via per-Biome routes and the build | leftover | Atlas now has its own front-door test (`atlas.spec.ts`). | Dropped (build backstop kept in *Consequences* 2) |
| Consequence: revisit a manifest place if root routes proliferate | policy question | The condition has arguably been met: 7 of 7 Tenants have one, 4 only redirect. | *When to revisit*, *Rejected alternatives* 3; see section 4 |

## 2. Callers

| # | Checklist item | Outcome |
|---|---|---|
| 1 | A Tenant may add its own page at `/t/<tenant>` in its layer | answered (Summary, *Scope*) |
| 2 | It sits outside the manifest and routing map on purpose | answered (*Scope* "What stays the same", *Why* 2) |
| 3 | So `entryRoutes` never includes it and the smoke test never visits it | mechanics: `shared/expand.ts` `entryRoutesFrom`, looped in `tests/e2e/smoke.spec.ts`; checked |
| 4 | A Tenant relying on a root page tests it in its own tests | answered (*Scope* "Testing") |
| 5 | What `/t/<tenant>` does when the Tenant has no front door (redirect pattern) | added: the page may redirect to a Space of the Tenant's choosing (*Scope* "What it may do"); with no page, a 404 (*Consequences*). The redirect itself is a shared pattern, not prescribed. |
| 6 | The Atlas front door is the first case; later ones follow it | fix the caller (`layers/blog/app/pages/t/blog/index.vue:3`); the rewrite no longer names the Atlas |
| 7 | Does the ADR forbid a catch-all route? | answered: the caller's "catch-all" was a Platform `/t/[tenant]` page (commit 3d41843b); *Scope* "Where it lives" and *Rejected alternatives* 2 rule it out. Caller wording fixed below. |
| 8 | May a root page show content from several of its Spaces? | answered: yes, its own Tenant's Spaces, each through `resolveSpaceRoute`, no cross-Space query (*Scope* "How it reads content") |

Not in the checklist but found: `layers/midden/app/pages/t/midden/index.vue:3`
cites ADR-0006 for a Tenant-root route. Fix the caller (below).

## 3. Follow-ups

### Summary rule: `.claude/rules/adr-0016.md`

```markdown
---
adr: <new hash>
paths:
  - "app/pages/t/**"
  - "layers/*/app/pages/t/**"
---
# ADR-0016: A Tenant's own layer may hold a page at its root, `/t/<tenant>`

Put a Tenant's root page in its own layer, at
`layers/<tenant>/app/pages/t/<tenant>/index.vue`, never in a Platform page
that serves every Tenant. It may show a front door or redirect to one Space.
Read Space data only through `resolveSpaceRoute`, for that Tenant's own
Spaces. The smoke test never visits a root page, so test it in the Tenant's
own e2e tests. Read the full ADR before adding a route outside a Space.
```

### Caller edits

- `layers/atlas/tests/e2e/atlas.spec.ts:22-27` →
  ```
  // The Atlas front door (`/t/atlas`) is a Tenant root page, so the platform
  // sweep above never reaches it and the Tenant tests it here (ADR-0016), in
  // the same `$fetch`-SSR-string style the other Tenant-specific checks use.
  ```
- `layers/midden/tests/e2e/midden.spec.ts:18-23` →
  ```
  // The Midden front door (`/t/midden`) is a Tenant root page, so the platform
  // sweep in `tests/e2e/smoke.spec.ts` never reaches it and the Tenant tests it
  // here (ADR-0016), in the same style as `atlas.spec.ts`'s front-door check.
  ```
- `layers/blog/app/pages/t/blog/index.vue:2-4` →
  ```
  // The Blog Tenant's front door (`/t/blog`), a Tenant root page (ADR-0016).
  // Combines every Persona's posts
  ```
  (keep the rest of the comment; its lines 9-13 may keep citing ADR-0004 or
  switch to ADR-0016, which now states the resolver-only read.)
- `layers/blog/tests/e2e/blog.spec.ts:115-117` →
  ```
  // The front door (`/t/blog`) is a Tenant root page, outside the `entryRoutes`
  // sweep (ADR-0016), so it's asserted here, plus its `?tag=` filtered view.
  ```
- `layers/midden/app/pages/t/midden/index.vue:3` → `// Space, like the Atlas front door. A Tenant root page (ADR-0016).`
- `.agents/skills/dispatch-subagents/SKILL.md:89` → `(an agent once added a Platform \`/t/<tenant>\` page against ADR-0016).`
  The Skill has a prune trial noted in `.agents/prune-trials.yml`; the edit
  only corrects a fact.
- No change: the four redirect pages (`commons`, `journal`, `marquee`,
  `tinkerfund`), `tests/e2e/smoke.spec.ts:44`, `docs/agents/tenant-layers.md:139`.

### New homes

None. Nothing a Skill or doc relied on left the ADR; the only dropped facts
are history (Atlas as first case, the `tenants/` path).

### Other ADRs

- **ADR-0006** owns the resolver and `/t/<tenant>/<space>/<slug>`; its summary
  rule says every Space page resolves through `resolveSpaceRoute`. Agrees.
- **ADR-0004 (rewrite)**: a human merges a PR that "adds logic that decides
  which Tenant's data a request can reach", and the Human-only list holds the
  routing code, not layer pages. The rewrite's "merges like any other Tenant
  layer page" agrees.
- **ADR-0014** owns `entryRoutesFrom` in `shared/expand.ts`. Agrees; the
  rewrite only points to it.
- **ADR-0018**: the `layers/` path. Agrees; no restatement needed.

## 4. Policy questions

1. **The revisit condition has been met. Should root pages move into the
   manifest?** All 7 Tenants have a root page; 4 (`commons`, `journal`,
   `marquee`, `tinkerfund`) only redirect to one Space. A manifest field such
   as a default Space would replace those four files, but it changes
   `shared/manifest.ts` and `shared/expand.ts` (Human-only) and adds a route
   source outside the layer. **Recommendation:** keep layer pages. The
   redirects are three lines each and already tested. Keep the *When to
   revisit* line as written, so a later owner sees the count.
2. **Should a Platform default redirect come back?** The rejected Platform
   `/t/[tenant]` page would save each new Tenant a file. **Recommendation:**
   no. It read the routing map outside the resolver and picked a Space by
   declaration order; a Tenant without a root page getting a 404 is fine.

## 5. Split

Not needed: 65 lines.

## 6. Prompt friction

- Step 1's `grep -l "ADR-0016\|0016-" docs/adr/*` finds nothing (only the
  target itself, which the listing omits). The cited ADRs had to come from the
  ADR's own text. Worth saying "and every ADR it cites" is found by reading it.
- The expectations file's checklist item 7 ("catch-all route") needed git
  archaeology (session log 689f8e79, commit 3d41843b) to resolve. The refs
  file alone could not answer it.
- The template's *Rejected alternatives* vs *When to revisit* overlap when an
  old Consequence says "revisit X": X is both a rejected alternative and the
  revisit condition. I put it in both, briefly.
- A caller that miscites a different ADR (`midden/index.vue` citing ADR-0006)
  is invisible to the refs scan, which only matches this ADR's number.

## 7. Lines

Old: 55 (50 before the ADR-0018 banner). New: 65.
