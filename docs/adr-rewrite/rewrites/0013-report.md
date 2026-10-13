# ADR-0013 rewrite: report

Rewrite: `docs/adr-rewrite/rewrites/0013.md`. Sources: the ADR, its rule,
`decisions.md`, ADR-0030 and the template, ADR-0002/0004/0007/0014, the
ADR-0004 rewrite, `expectations/0013.md`, the session-log usage notes (ADR-0013
was shown 6 times, never read in full), `git log --follow` on the ADR (3
commits; #59's message read), and the live code named below. No rewrite of
ADR-0002, 0007 or 0014 exists yet.

## 1. Parts

| Part of the old ADR | Outcome | Reason | Where it went |
| --- | --- | --- | --- |
| Date / Status line | leftover | history (ADR-0030) | dropped |
| ADR-0018 banner (`tenants/` → `layers/`) | leftover | history; paths are `layers/` | dropped |
| "Amends ADR-0007 … further superseded by ADR-0014" banner | leftover | history; ADR-0007 survives only as a rejected alternative | Rejected alternatives (first bullet) |
| Context: ADR-0002 manifests, ADR-0007 committed both outputs | leftover | history | dropped |
| Context: config is TS that Nuxt Content evaluates; cost list (banner, drift gate, lint ignores, `pnpm gen &&` prefixes, "manifest edited, regen not committed") | live | still the reason | Why |
| Context: routing map is a genuine committed artifact (client needs it) | leftover | ADR-0014 replaced the committed map with `#routing`; `shared/routing.generated.ts` gone (checked) | dropped |
| Context: jiti spike, byte-identical tables | split: leftover / live | the spike story is history; its risk (config-time import) is the revisit condition | When to revisit |
| Decision headline: config ordinary and hand-editable | live | `content.config.ts:1` | Summary; Scope |
| Decision headline: routing map stays committed and drift-checked | leftover | ADR-0014 | dropped |
| Bullet: `expand()` + key uniqueness + loading in `shared/expand.ts`, shared by config, generator and L3 test | split: live / mechanics / leftover | one shared expansion live (also feeds `modules/routing.ts`); key check is mechanics in `shared/expand.ts:152-157`, tested by `tests/unit/expand.spec.ts`; "generator" leftover | Scope "One source", "same expansion"; See |
| Bullet: `ExpandedCollection` carries `schema` | mechanics | `shared/expand.ts` type (checked) | See (`shared/expand.ts`) |
| Bullet: config enumerates layers, builds in a loop, no banner, linted | live | checked: no banner; `eslint.config.mjs` ignores only `.claude/workflows/**` | Scope "ordinary code" |
| Bullet: manifests load synchronously via jiti | mechanics | `loadManifests()` doc comment in `shared/expand.ts` | See |
| Bullet: `scripts/generate.ts` emits only routing map; `pnpm gen`, `gate:drift`, `pnpm gen --print` | leftover | ADR-0014 deleted all of them (checked: no file, no script) | dropped; `--print` replaced by "run `expand(loadManifests())`" in Consequences |
| "Why the routing map stays committed" (reviewable one-line diff) | split: leftover / rejected alternative | the committed map is gone; the review-signal argument could be raised again | Rejected alternatives (second bullet) |
| Consequence: no regenerate step; failure mode impossible (prevention over detection) | live | still true | Summary; Scope "When it runs"; Why |
| Consequence: list of deleted files and doc passages | leftover | history | dropped |
| Consequence: debugging more indirect, `pnpm gen --print` | split: live / leftover | indirection is real; `gen --print` gone | Consequences |
| Consequence: config-time file IO via jiti; revisit if it breaks; fallback Nuxt-module variant or ADR-0007 | live | only revisit condition the sources give | When to revisit |
| Consequence: still Human-only (config, expand, generator, routing map) | mechanics | `.claude/rules/adr-0004-human-merge.md` lists `content.config.ts`, `shared/expand.ts`, `modules/routing.ts` (checked); generator and map gone | See |
| Consequence: `routing.generated.ts` the one committed GENERATED file | leftover | ADR-0014 | dropped |

## 2. Callers

| Item | Outcome | Note |
| --- | --- | --- |
| C1 config builds collections from manifests on load | answered | Summary, Scope. Wording conflict settled: the exact moment is "when Nuxt Content loads the config", which is every `prepare`, build and dev start. "Generated" is wrong; "build time" is loose but not false. CONTEXT.md:51 → fix the caller |
| C2 no generator or codegen step remains | answered | Summary ("no generated copy … committed or needs regenerating"); Scope "When it runs". The ADR no longer tells which ADR removed what; callers crediting "ADR-0013/0014" jointly are right for today's state |
| C3 what it replaced in ADR-0007, what it kept, what replaced that | fix the caller | history; the rewrite names ADR-0007 only as a rejected alternative. ADR-0007's and ADR-0014's banners get repointed (§3) |
| C4 only the root config defines collections; layers define none | added | ADR-0002 says Nuxt Content needs one config but not that layers must not add one. Checked: no `layers/*/content.config.*`; research §12 shows Nuxt Content would load a layer's config and bypass `expand()`'s key check. Scope "Only the root config" |
| C5 one shared pure function feeds collections and routes | answered + mechanics | Scope "same expansion"; home `shared/expand.ts`, test `tests/unit/expand.spec.ts` |
| C6 when rebuilt; dev-server watch gap | answered + mechanics | Scope "When it runs"; Consequences (watch gap); homes `modules/routing.ts:68-78`, research §12 |
| C7 the failure removed, the review signal given up | answered | Why; Rejected alternatives |
| Repoint: ADR-0004:81, ADR-0007:4/6/11/15, ADR-0014:26/31/96 | fix the caller | see §3 |
| Fix: `docs/agents/mdc-when-to-use.md:128` miscites | fix the caller | see §3 |
| Fix: CONTEXT.md:51 | fix the caller | see §3 |
| Fix: six layer `nuxt.config.ts` headers | fix the caller | see §3 |
| Fix: six `tenant.config.ts` headers | fix the caller | see §3 |
| Leave: Midden `strata.ts:38`, `the-committed-config.yml`, `the-generator.yml` | none | historical Tenant content; the file name is unchanged so links hold |

## 3. Follow-ups

### Summary rule: `.claude/rules/adr-0013.md`

Keep the frontmatter `paths` (`content.config.ts`, `shared/expand.ts`); restamp `adr:`.

```markdown
# ADR-0013: content.config.ts builds collections from the manifests

`content.config.ts` is an ordinary module. Each time Nuxt Content loads it
(every prepare, build or dev start), it builds every collection from
`expand(loadManifests())` in `shared/expand.ts`. Add or change a collection in
the Tenant's manifest, never in `content.config.ts`, and give a Tenant layer
no collections of its own. Nothing needs regenerating after a manifest edit.

If you change how the config loads the manifests, read the full ADR first:
docs/adr/0013-dynamic-content-config-committed-routing-map.md
```

### Caller edits

- `CONTEXT.md:50-52` → "Several Collections live inside one Space; each Tenant
  × Space × Collection becomes its own collection (ADR-0002, ADR-0013)."
- `docs/agents/mdc-when-to-use.md:128` → "(ADR-0002/0013)" becomes "(ADR-0002)".
- `.claude/rules/adr-0002.md:12-13` → "… expands all manifests into the keyed
  collections and routes (ADR-0013, ADR-0014)." (drop "at build time"; this is
  ADR-0002's rule, so its own rewrite may own the wording).
- Layer `nuxt.config.ts` headers (atlas:6-9, blog:5-8, journal:6-9,
  marquee:6-9, midden:7-10): replace the "defines NO content collections …
  (ADR-0002/0013)" clause with "defines no collections of its own (ADR-0013)",
  keeping the rest of each sentence. `tinkerfund:2` already says this; change
  "(ADR-0002/0013)" to "(ADR-0013)".
- Manifest headers (atlas:4-7, blog:3-6, commons:9-10, journal:2-4,
  marquee:4-7, midden:7-9): replace the mechanism sentence with "Declarative
  intent only (ADR-0002, ADR-0013)."
- `nuxt.config.ts:2-3` → "Content collections are built in content.config.ts
  (ADR-0013)."
- `shared/manifest.ts:150` and `:163`: drop "— there is no separate generator
  or codegen step" / "— no separate generator … to 'fail fast before'"; keep
  "(ADR-0013/0014)".
- `docs/adr/0004-objective-safety-gate.md:80-86`: the ADR-0004 rewrite already
  drops this amendment; nothing more.
- `docs/adr/0007-…md:4-15`: replace Status and banner with one line: "Status:
  Superseded by ADR-0013 and ADR-0014." (old-shape ADR; a small fix per
  ADR-0030).
- `docs/adr/0014-…md:24-27`: replace the banner with "Supersedes ADR-0007."
  `:31-35` (Context restating ADR-0013's kept half) and `:96-101` (the
  "ADR-0007/0013 valued…" trade-off): leave for ADR-0014's own rewrite, which
  should state its trade-off without crediting ADR-0013.

### New homes

None needed. Every mechanic that left the ADR already lives in
`shared/expand.ts`, `modules/routing.ts`, `eslint.config.mjs`,
`.claude/rules/adr-0004-human-merge.md` or research §12.

### Other ADRs

- **ADR-0002** owns "edit only the manifest". The rewrite points to it. ADR-0002
  still says a generator *generates* `content.config.ts`; its rewrite should
  say the config builds the list on load (ADR-0013).
- **ADR-0004** owns the key-uniqueness check (L3) and the Human-only list. The
  rewrite cites both and agrees with the ADR-0004 rewrite.
- **ADR-0014** owns the routing map and the dev watch fix. The rewrite agrees
  with its code (`modules/routing.ts:68-78`); ADR-0014's text still has the
  stale no-watch caveat in Consequences, which its rewrite should drop.
- **ADR-0007** is superseded; the rewrite cites it as the rejected option.

## 4. Policy questions

None that change what agents may do. One housekeeping question:

- **File name.** The slug still says `committed-routing-map`, which is false.
  Renaming breaks every link (ADR-0004, 0007, 0014, the rule, Midden content).
  Recommendation: keep the name in this 1:1 pass and rename when the ADRs are
  reorganised.

## 5. Split

Not needed (69 lines).

## 6. Prompt friction

- The template asks the title to match the summary rule's heading, and the
  prompt asks for a title that states the decision. Here they agreed, so I
  kept the existing rule heading.
- "Only conditions the sources give" for *When to revisit* fits; but the
  sources' fallback (a Nuxt module registering collections) is neither
  rejected nor chosen, so it went under When to revisit rather than Rejected
  alternatives.
- C4 sits between ADR-0002 and ADR-0013; the prompt has no rule for which ADR
  owns a decision that callers jointly cite. I put it here because it is about
  where collections are defined.

## 7. Lines

Old: 91. New: 69.
