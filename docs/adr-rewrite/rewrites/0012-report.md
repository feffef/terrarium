# ADR-0012 rewrite report

## 1. Parts

| Part of the old ADR | Outcome | Reason | Where it went |
| --- | --- | --- | --- |
| Context: Persona = Space, posts isolated per Space | live (background) | Needed to read the decision | Summary, *Scope* (folded in) |
| Context: a runtime pingback would be a cross-Space read and force a change to the Human-only resolver | live, split | The post page still reads one Space via `resolveSpaceRoute` (`[...slug].vue:6-11`). The "forces a resolver change" half is weaker today: ADR-0016 root pages read several Spaces by calling the resolver once per Space, with no resolver change. Kept as "no new query of sibling Spaces, no change to routing or isolation code" | *Why* ¶1 |
| Alternative: runtime cross-Space read | live | Could be proposed again, especially since ADR-0016 shows how | *Rejected alternatives* 1 |
| Alternative: build-time generated reverse index (committed file, like `routing.generated.ts`) | live, reworded | The committed generated file is gone (ADR-0014), but a build-time index is still plausible | *Rejected alternatives* 2 |
| Decision: Pingback authored into the reacted-to Persona's Space, `pingbacks` strict `data` collection | live | `layers/blog/tenant.config.ts:83-100` | Summary, *Scope* |
| Decision 1: reaction is a post in A's `pages`, optional `reactsTo { persona, path }` | live; fields are mechanics | `reactsTo` now also copies the target's title (`tenant.config.ts:71-75`) | *Scope* "What is copied"; fields in *See* |
| Decision 2: stub in B's `pingbacks` with target path and A's persona/path/title/blurb inlined | live; field names mechanics | Manifest holds `target`, `fromPersona`, `fromPath`, `fromTitle`, `blurb`, `reactedAt` | *Scope*; *See* |
| "In one gated PR" | split | "Same PR" is live (Skill step 7; commits 31601c0f, 036c8145 change post and stub together). "Gated" restates ADR-0003/0004 | *Scope* "same PR" |
| Render: same-Space read, filter by target path, backlink to `/t/blog/A/<path>` | live (read) / mechanics (filter, URL) | Home: `layers/blog/app/pages/t/blog/[space]/[...slug].vue:22-26` | *Why*; *See* |
| `resolveSpaceRoute` reused verbatim, `pages` name kept, `pingbacks` rides in `dataCollections`; no routing/generator/isolation change | leftover | True at landing; a description of the first PR, and ADR-0006 now owns "only `pages` gets routes, other Collections are data" | dropped (ADR-0006) |
| Only crossing is an author-time write, reviewed in the diff, validated by the strict schema at L1 | live | Still how it works; `scripts/validate-content.ts` checks the strict schema | *Why* ¶2 |
| Consequence: runtime isolation untouched, human-only resolver unmodified | live | Same as *Why* ¶1 | *Why* ¶1 |
| Consequence: denormalized; staleness accepted for v1, caught by review; future drift check or reverse index | split | Staleness and "no machinery" live. Practice and the summary rule moved on: renaming or deleting a reaction updates its Pingback in the same change (commits 31601c0f, 036c8145). "v1" framing is history | *Scope* "kept in step by hand"; *Consequences*; *When to revisit* |
| Consequence: Skill run writes into two Spaces, bounded to target's `pingbacks`, never another's `pages`; reviewers check that shape | live | `blog-post` Skill step 7 and step 11 scope | *Scope* "The one write…" |
| Consequence: lands as a normal gated PR, never the direct-to-main `log-session` path | leftover | Every change is a gated PR (ADR-0003); only session logs go to `main` (ADR-0009). Nothing here adds to that | dropped |
| Consequence: append-only and strict, schema evolution per ADR-0009, no `schemaVersion` until first breaking change | live (pointer) / mechanics (version detail) | ADR-0009 owns the policy and points back; the manifest comment holds the version detail | *Scope* pointer; *See*; see policy question 2 |
| Header date/status | leftover | ADR-0030 | dropped |

## 2. Callers (expectations checklist)

1. **Page reads only its own Space at render** — answered (Summary, *Why*).
2. **Reaction stored in the reacted-to Space at authoring time, persona/path/title/blurb copied** — answered (*Scope* "What is copied").
3. **Only cross-Persona write is the target's `pingbacks`, never `pages`** — answered (*Scope*).
4. **How may the schema change** — answered: pointer to ADR-0009's policy (ADR-0009:111 "ADR-0012 points back to it" stays true). The "no version field until the first breaking change" detail is mechanics, homed in ADR-0009 and the manifest comment (`tenant.config.ts:86-87`).
5. **General rule or Blog-only?** — answered: scoped to facts that cross Spaces; a link inside one Space derives its reverse (*Scope* last bullet, pointing to `CONTEXT-MAP.md`). The three Atlas "mirrors ADR-0012" citations become miscites: fix the caller (below).
6. **Copy-at-write chosen because the fact crosses a Space; one-Space relations derive** — answered (*Scope* last bullet).
7. **Pingback fields and file path** — mechanics: fields in `layers/blog/tenant.config.ts`, path in `.agents/skills/blog-post/SKILL.md` (step 7 and "Reference: the pingback stub"). Both checked.
8. **`reactsTo` with target title copied** — answered in *Scope*; field shape is mechanics in `layers/blog/tenant.config.ts:71-75` (checked).

Other references: `layers/blog/app/pages/t/blog/[space]/[...slug].vue:10`, `layers/blog/app/assets/theme.css:478`, `layers/blog/tenant.config.ts:12,83`, `CONTEXT-MAP.md:48` explain correctly; no change. The 20 test-fixture hits are noise.

## 3. Follow-ups (drafts, none applied)

### Summary rule: `.claude/rules/adr-0012.md`

```markdown
---
adr: <new hash>
paths:
  - "layers/blog/content/**"
  - "layers/blog/app/pages/**"
  - ".agents/skills/blog-post/**"
---
# ADR-0012: A Blog reaction is recorded in the target Persona's Space when it is written

When a Blog post reacts to another Persona's post, add its Pingback to the
target Persona's `pingbacks` in the same PR, with what the backlink shows
copied in, so a post page reads only its own Space. Write nothing else in
another Persona's Space. Renaming or deleting a reaction post updates or
deletes its Pingback in the same change. Read the full ADR before you make a
Blog page read another Space or change how Pingbacks work.
```

### Caller edits

- `.agents/skills/blog-post/SKILL.md:176-181` →
  ```
  If it is a reaction, also write the pingback stub into the **target**
  Persona's Space at
  `layers/blog/content/<target>/pingbacks/<today-UTC>-<persona>-<target-slug>.yml`
  (format in the reference below). Nothing else goes outside your own Space
  (ADR-0012).
  ```
- `layers/blog/CONTEXT.md:59-64` (Pingback entry) →
  ```
  ### Pingback
  A record that one Persona's blog post reacted to another Persona's post. It is
  a Document in a `pingbacks` **data** collection in the *reacted-to* Persona's
  Space, written with the reaction and holding a copy of the reacting post's
  persona, path, title and blurb (why: ADR-0012). The reacting post is itself a
  first-class post in its own Space, optionally headed by a `reactsTo` reference
  to the post it answers.
  ```
  (Keep the following "Contrast the Atlas's Interaction…" sentence.)
- `layers/atlas/tenant.config.ts:21` → `//                   is always a same-Space read (CONTEXT-MAP.md: Relationships).`
- `layers/atlas/app/utils/atlas.ts:91` → ` *  caller passes this biome's edges), so no cross-Space read (CONTEXT-MAP.md: Relationships). */`
- `layers/atlas/app/pages/t/atlas/[space]/[...slug].vue:11` → `// in-biome (CONTEXT-MAP.md: Relationships), so nothing queries a sibling. \`biomeMeta\`, the`
- `docs/adr/0009-session-logs-commit-directly-to-main.md:108-111, 150` — no edit needed now; revisit with policy question 2 when ADR-0009 is rewritten.

### New homes

None needed. Everything dropped is either history or already homed: routing
convention in ADR-0006, gated PRs in ADR-0003/0004, fields in the manifest,
file path and format in the `blog-post` Skill.

### Other ADRs

- **ADR-0006** owns "a Space page resolves one Space through `resolveSpaceRoute`". Agrees.
- **ADR-0004** (rewrite) owns the Human-only list incl. "the isolation and routing code". Agrees.
- **ADR-0009** owns the schema evolution policy and points back here. Agrees on the pointer; see policy question 2 on its "append-only" premise.
- **ADR-0016** lets a Tenant root page read several Spaces, one resolver call each. Consistent: this ADR covers post pages, and the rewrite no longer claims a cross-Space read would need a resolver change.
- **ADR-0021** says demo Tenants get no ADR. Conflicts; see policy question 1.

## 4. Policy questions

1. **Should ADR-0012 stay an ADR?** ADR-0021 says ADRs record Platform
   architecture only and the Blog is a demo Tenant. The live content is either
   Blog-specific (Pingbacks) or a Platform stance ("a fact that crosses Spaces
   is copied in at write time; a Space page reads one Space"), which the Atlas
   already cites. Recommendation: keep it 1:1 now (first pass). At the
   reorganisation, widen it into that Platform stance and move the Pingback
   specifics to `layers/blog/CONTEXT.md`.
2. **Are Pingbacks "append-only history" under ADR-0009?** They are deleted
   and edited with their reaction posts (commits 31601c0f, 036c8145), and all
   of them could be rewritten in one PR, unlike landed session logs. ADR-0009's
   policy forbids migrating them; that is stricter than needed. Recommendation:
   keep the pointer here (cheap, no behaviour change); when ADR-0009 is
   rewritten, decide whether Pingbacks may be migrated on a breaking schema
   change. The answer changes what an agent may do to existing stubs.

## 5. Split

Not over 70 lines. No split.

## 6. Prompt friction

- Step 1's grep (`ADR-0012\|0012-`) finds only ADR-0009, but the target cites
  ADR-0002, 0003, 0004, 0006, 0007 and 0009, and ADR-0016 and 0021 bear on it
  without citing it. "Every ADR it cites" needed reading the target, not the
  grep.
- `session-log-usage.md` has one table row on ADR-0012 and nothing about why
  agents opened it; low value for this ADR.
- The template has no slot for a scope limit like "only for facts that cross
  Spaces"; it fit as a *Scope* bullet.
- ADR-0021's "no ADR for a demo Tenant" collides with the 1:1 rule; the prompt
  gives no place for that besides a policy question.

## 7. Lines

Old: 74. New: 68.
