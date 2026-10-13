# ADR-0019 rewrite report

The old ADR records a decision that was reversed (a `pnpm patch` of
`@nuxt/content`), and then two amendments that hold the live decision: an
error dialog with a reload, and an automatic reload only for a failed code
chunk. The rewrite states those two amendments as the decision. Its status
line says "Superseded", but nothing replaced it: the live code cites it as the
rule. The rewrite settles that it is live (callers item 5).

Checked against code today: `patches/` and `pnpm-workspace.yaml` are gone;
`@nuxt/content` is `^3.16.1` (pin dropped in 417ea24f). Its
`dist/runtime/internal/database.client.js` still drops a cached load from
`dbPromises` only after a successful await, so the kept failure (the Why)
still holds in the installed version.

## 1. Parts

| Part of old ADR | Outcome | Reason | Where it went |
|---|---|---|---|
| Header: date, "Superseded" status, retroactive note | leftover | ADR-0030 forbids status/dates; "superseded" is wrong, the amendments are live | dropped |
| Context: the bug (rejected load cached forever, only a reload recovers) | live | still true in 3.16.1 (checked) | *Why* ¶1 |
| Context: ~21 small collections make us unusually exposed | leftover | ADR-0028 now keeps most navigation off the browser DB | dropped |
| Context: two repros (#235 aborts, `repro-236.ts` server restart), upstream `main` check, no upstream issue filed | mechanics / leftover | `scripts/repro-236.ts` holds the repro; the rest is history | *See* (`repro-236.ts`) |
| Context: ADR 3-part test | leftover | meta-justification for writing the ADR | dropped |
| Decision: `pnpm patch`, `finally`-evict, `retry: 4`, `__content_db_errors` ring buffer | leftover | reversed by amendment 1; all removed | rejected alternative "Patch `@nuxt/content`" |
| Decision: red-capable e2e for the patch | mechanics | tests now check the dialog and auto-reload | *See* (`blog.spec.ts`) |
| Consequence: patch maintenance cost per upgrade | live (as reason) | why a patch is rejected | *Rejected alternatives* |
| Consequence: exit path is upstream | live (as revisit) | an upstream fix would allow an in-page retry | *When to revisit* |
| Consequence: root cause still a hypothesis | leftover | resolved by the 2026-07-19 production capture (chunk 500) | dropped; the capture's lesson is in *Why* ¶2 |
| Consequence: gate covers the patch automatically | leftover | no patch | dropped |
| Consequence: dependency-patch risk stays human-merge | live, owned by ADR-0004 | ADR-0004 rewrite: "adds a dependency, or changes how one behaves" | *Scope* last bullet, pointer to ADR-0004 |
| Amendment 1: patch removed, stock Content restored | live | still the state; owner's call to shed the version-pinned fork | Summary, *Scope* "No dependency patch", *Rejected alternatives* |
| Amendment 1: why the patch failed (missed "resolves broken" and cached-corrupt funnels; empties recurred) | live (as reason) | reason a patch stays rejected | *Rejected alternatives* |
| Amendment 1: `ContentLoadErrorDialog` on Space pages, technical detail, Reload button | live | code: dialog mounted by 16 pages and components | *Scope* "No silent blank" |
| Amendment 1: reload is the only reliable recovery (fresh page renders from the server DB; app code can't clear Content's state; no in-page retry) | live | still true | *Why* ¶1, *Scope* "No in-page retry" |
| Amendment 1: trade-off (brief blips now need a manual click); telemetry gone | leftover | comparison with the removed patch | dropped |
| Amendment 1: "fresh patch or upstream" for silent self-heal | live (as revisit) | | *When to revisit* |
| Amendment 1 and 2: "stays human-only to merge (ADR-0004)" | leftover | ADR-0004 decides per PR; the recovery code is tested, the ADR file is Human-only anyway | dropped |
| Amendment 2: production capture: chunk 500 inside `useAsyncData`, Nuxt's `nuxt:chunk-reload` never fires | live (as reason) | explains why the app does its own reload; `chunk-errors.client.ts` comment repeats it | *Why* ¶2 |
| Amendment 2: chunk failures reload themselves via `reloadNuxtApp` | live | `contentLoadRecovery.ts` | Summary, *Scope* "The one automatic reload" |
| Amendment 2: classification (`app:chunkError` identity through `cause` chain, message fallback for three engines) | mechanics | `app/utils/chunkRecovery.ts`, `app/plugins/chunk-errors.client.ts` (checked) | *See* |
| Amendment 2: loop safety via `reloadNuxtApp`'s `sessionStorage` guard, read before calling | live (once, then dialog) + mechanics (how) | `contentLoadRecovery.ts:16-27`, `chunkRecovery.ts:39-57` (checked) | *Scope*; *See* |
| Amendment 2: every other funnel keeps the dialog | live | `blog.spec.ts:180-210` | *Scope* "Every other failure" |
| Amendment 2: trade-off (flash, lost unsaved state) | live (as reason) | | *Why* ¶2 |
| Amendment 3: navigation mostly skips the browser DB | live, owned by ADR-0028 | ADR-0028 rewrite *Scope* bullet 7 lists where it still loads | *Scope* "Covers", pointer |
| Amendment 3: blog e2e fail the payload first | mechanics | `blog.spec.ts` (`failDavidPayload`) | *See* |

## 2. Callers

From `docs/adr-rewrite/expectations/0019.md`:

1. Dialog with reload, because only a full reload fixes it: **answered** (*Scope* "No silent blank", *Why* ¶1).
2. Chunk failure reloads itself once, then the dialog; every other failure gets the dialog: **answered** (*Scope*).
3. We do not patch `@nuxt/content`: **answered** (*Scope*, *Rejected alternatives*). The research note's wider "no dependency patch" stays its own recommendation; the rewrite rejects only a patch for this failure.
4. Why it fails (lazy per-collection dump, kept failure): **mechanics**, home `scripts/repro-236.ts`; the one-sentence reason is in *Why*.
5. Live or superseded? **answered**: live. **fix the caller** for `strata.ts:70` and `the-nuxt-content-patch.yml:36` (below).
6. Once per path within Nuxt's reload guard, browser only: **mechanics**, home `app/composables/contentLoadRecovery.ts`, `app/utils/chunkRecovery.ts`; *Scope* names "once per path" without the value.
7. Recovery wired once in the dialog, not per page: **added**. True in code (`ContentLoadErrorDialog.vue:34` calls `recoverFromContentLoadError`), and a reader adding a page needs it.

Repoint/fix list from the expectations: all covered in section 3.

## 3. Follow-ups

### Summary rule: `.claude/rules/adr-0019.md`

Keep the frontmatter `paths`; add the unit test. Re-stamp `adr:` with the new hash.

```markdown
---
adr: <new hash>
paths:
  - "app/composables/contentLoadRecovery.ts"
  - "app/components/ContentLoadErrorDialog.vue"
  - "app/plugins/chunk-errors.client.ts"
  - "app/utils/chunkRecovery.ts"
  - "tests/unit/chunk-recovery.spec.ts"
---
# ADR-0019: A failed browser content load shows a reload dialog; only a failed code chunk reloads itself

`@nuxt/content` runs unpatched. A page or component that queries Content in
the browser mounts `ContentLoadErrorDialog` with its `useAsyncData` status and
error; the dialog's fix is a full page reload. Only a failed code chunk
reloads by itself, once per path; every other failure keeps the dialog.

Before you widen the automatic reload, add an in-page retry or patch
`@nuxt/content`, read the full ADR:
docs/adr/0019-patched-nuxt-content-client-db-loading.md
```

### Caller edits

- `app/components/ContentLoadErrorDialog.vue:15` "(ADR-0019's 2026-08-04 amendment)" → "(ADR-0019)".
- `layers/blog/tests/e2e/blog.spec.ts:8-9` "We do NOT patch the dependency (ADR-0019 amendment,\n// 2026-07-16)" → "We do NOT patch the dependency (ADR-0019)".
- `layers/blog/tests/e2e/blog.spec.ts:16` "(ADR-0019 amendment, 2026-08-04)" → "(ADR-0019)".
- `scripts/repro-236.ts:4-5` "NOTE (2026-07-16): the @nuxt/content patch this harness A/B-tested was removed\n// (ADR-0019 amendment)" → "NOTE: the @nuxt/content patch this harness A/B-tested was removed\n// (ADR-0019)".
- `layers/midden/app/utils/strata.ts:70` "(ADR-0019, superseded)" → "(ADR-0019)". The Midden describes the past, so the drop itself stays.
- `layers/midden/content/trench/artifacts/the-nuxt-content-patch.yml:36` label "ADR-0019 before it was marked superseded" → "ADR-0019 while the patch was live". The URL (:37) is pinned to a commit and stays. :40 quotes a commit subject: leave.
- `docs/research/content-client-queries-without-wasm.md:253` "ADR-0019's blog failure tests" → "The blog failure tests (`layers/blog/tests/e2e/blog.spec.ts`)". Low priority; dated note.
- `docs/research/content-client-queries-without-wasm.md:8` "ADR-0019 (the history of client-DB failures)" → "ADR-0019 (recovery from client-DB failures)". Optional.
- `docs/adr/0028-navigation-reads-server-payloads.md:18,58`: superseded by the ADR-0028 rewrite, whose pointers to ADR-0019 already match.
- `docs/diagrams/interactive-map/terrarium-overview.md:873`: plain pointer; keep.

### New homes

None needed. Every mechanic that left the ADR (classification, reload guard,
test approach, repro) already lives in the files under *See*, and their
comments already explain it. The old ADR's description of the removed patch is
in git and in the Midden artifact.

### Other ADRs

- **ADR-0028:** owns where the browser database still loads. Its rewrite
  (*Scope* bullet 7, *Why*, *Rejected alternatives* "Patch Content") agrees:
  "ADR-0019 covers recovery when that load fails"; "ADR-0019 already removed
  one patch".
- **ADR-0004:** owns "a dependency change needs a human merge". Its rewrite
  says "adds a dependency, or changes how one behaves", which covers a
  `@nuxt/content` patch. Note: a new patch would add `patchedDependencies` to
  `package.json` (Human-only) or create `pnpm-workspace.yaml` (not on the
  list); the ADR-0004 exception covers it either way.

## 4. Policy questions

1. **Should a failed database download (a rejected fetch) also reload once
   automatically?** The sources disagree. The 2026-08-04 amendment says a
   reload "cannot fix" the other funnels, but the dialog text says "Reloading
   the page usually fixes it" and `blog.spec.ts:152-178` shows a manual reload
   recovering a dump-fetch blip. Only the corrupt-body case (`blog.spec.ts:203`)
   truly repeats. The rewrite states today's behaviour (only chunk failures
   auto-reload) and words the reason as "some of them repeat on reload", which
   is true. **Recommendation:** keep the behaviour as is (the owner chose to
   narrow it to the failure seen in production; nobody has reported a dump
   failure since), and accept the rewrite's wording. If the owner wants it,
   extending the auto-reload to a rejected dump fetch is a small code change
   with existing tests.

2. **Rename the file?** `0019-patched-nuxt-content-client-db-loading.md` names
   the reversed decision. First pass is 1:1, so the rewrite keeps the path.
   **Recommendation:** rename in a later reorganisation pass, not now.

## 5. Split

Not needed: 69 lines.

## 6. Prompt friction

- The target's status line said "Superseded" while its amendments held the
  live rule. The prompt has no outcome for "the whole ADR's status is wrong";
  I treated the status as a leftover and the amendments as the decision.
- Step 2 asks to check reasons against ADR-0003/0004/CLAUDE.md "allow now";
  for a technical ADR the more useful check was the installed dependency
  version (`node_modules/@nuxt/content`), which the read-only command list
  doesn't mention but reading files allows.
- The expectations checklist item 4 labels the failure cause "mechanic", but
  its one-sentence form is the core *Why*. I split it: reason in the ADR,
  reproduction in `repro-236.ts`.

## 7. Lines

Old: 203. New: 69. Summary rule: 18 → 20.
