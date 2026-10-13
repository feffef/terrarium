# ADR-0019 rewrite report

## 1. Inventory (current rules → rewrite section)

| # | Rule today | Source | Rewrite section |
|---|---|---|---|
| 1 | `@nuxt/content` runs unpatched (no `patches/`, no `patchedDependencies`) | Amendment 07-16 (reverses Decision) | Summary; Rejected alternatives |
| 2 | A failed client load stays failed for the page's life; app code can't clear it | Context; Amendment 07-16 | Summary; Why |
| 3 | Pages read `useAsyncData` `status`/`error` and raise `ContentLoadErrorDialog` (message, technical details, Reload page) | Amendment 07-16 ("three Space pages" → now every page that queries Content: 16 mounts across app/ and layers) | Scope: The dialog |
| 4 | Recovery is a full reload; fresh page renders from server DB; in-page retry can't | Amendment 07-16 | Scope; Why; Rejected (in-page retry) |
| 5 | Chunk-load errors auto-reload via `reloadNuxtApp` | Amendment 08-04 | Scope; Summary |
| 6 | Classification: `app:chunkError` identity through `cause` chain, or any engine's failed-dynamic-import message | Amendment 08-04 | Scope (one sentence; details in See) |
| 7 | Loop safety: `reloadNuxtApp`'s guard is the only counter; read before calling; fall back to dialog | Amendment 08-04 | Scope: Once per path; Rejected (second counter) |
| 8 | All other funnels keep the dialog (rejected dump fetch, decompression/`db.exec` throw on 200, absent Document) | Amendment 08-04 | Scope |
| 9 | Why chunk-only: Nuxt's `nuxt:chunk-reload` acts only via `router.onError`; this import fails inside `useAsyncData` | Amendment 08-04 (re-verified against nuxt 4.6.0 `chunk-reload.client.js`) | Why |
| 10 | Since ADR-0028 the client DB loads only for Tinkerfund search, re-queries after mount, failed payload fetch | Amendment 09-27 | Scope: Where it applies |
| 11 | Blog e2e must fail the payload first | Amendment 09-27 | Consequences |
| 12 | Trade-off: transient blip now needs manual reload | Amendment 07-16 | Consequences |
| 13 | Trade-off: auto-reload loses in-page state, shows a flash | Amendment 08-04 | Consequences |
| 14 | Self-heal, if wanted, goes upstream or in a fresh re-validated patch | Amendment 07-16 | When to revisit |
| 15 | Patch rejected: version-pinned dist fork; covered only rejecting funnels; empties recurred | Consequences; Amendment 07-16 | Rejected alternatives |
| 16 | Telemetry ring buffer gone; dialog's details disclosure replaces it | Amendment 07-16 | Folded into Why ("shows the error that occurred") and Rejected (patch logged to localStorage) |
| 17 | Original exit path "upstream fixes the evict" | Consequences | When to revisit (first bullet, reframed: an upstream fix would make in-page retry viable) |

Verified this turn: `@nuxt/content` is now 3.16.1 and still deletes `dbPromises` entries only after a successful await (`node_modules/@nuxt/content/dist/runtime/internal/database.client.js`), so the poison claim holds. `nuxt` 4.6.0's `chunk-reload.client.js` still reloads only from `router.onError`.

## 2. Dropped

- **History (git holds it):** Date/Status/"Superseded" banner; retroactive-record note; bug report narrative; diagnosis session id; commit `12a9564`, PRs #235/#251; two repro methods; "4/4 RED"; 3-part ADR test justification; production capture date and `/t/blog/david` chunk name; amendment headers and "Narrowed, not reversed" framing.
- **No longer true:** the whole original Decision (patch, `retry: 4, retryDelay: 300`, `finally`-evict, `__content_db_errors` ring buffer of 25); Consequences about patch maintenance, `patch -R` dance, gate coverage of the patch, "no upstream issue filed yet", "root cause unconfirmed" (the 07-19 capture identified the chunk funnel); "three Space pages" (now every page that queries Content); version `3.15.0`.
- **Human-merge statements** ("this amendment ... stays human-only to merge", patch = dependency-shaped risk): they described those PRs. ADR-0004 owns merge rules; the governed files (`app/composables/contentLoadRecovery.ts` etc.) are not on the human-merge list. Reintroducing a patch would touch `package.json`, which is.
- **Mechanics moved to See (already live there, no move needed):** classification regexes and `MAX_CAUSE_DEPTH` → `app/utils/chunkRecovery.ts`; guard key `nuxt:reload` and TTL read → same file; reload call → `app/composables/contentLoadRecovery.ts`; `app:chunkError` feed → `app/plugins/chunk-errors.client.ts`; dbPromises archaeology → issue #236 and `scripts/repro-236.ts` header.
- **Code comments to repoint (ADR-0030 Consequence):** `app/components/ContentLoadErrorDialog.vue` line 15 cites "ADR-0019's 2026-08-04 amendment" → "ADR-0019". `scripts/repro-236.ts` header cites "ADR-0019 amendment" and still documents the patch A/B build steps; it needs a refresh (see Open questions).

## 3. Rule check (`.claude/rules/adr-0019.md`)

| Rule fact | Rewrite |
|---|---|
| `@nuxt/content` runs unpatched | Summary |
| Failed client-side load shows `ContentLoadErrorDialog` with Reload | Summary; Scope: The dialog |
| Only a fresh page recovers the client DB | Summary; Scope; Why |
| Failed chunk import reloads itself, once per path | Summary; Scope |
| Pointer to `app/composables/contentLoadRecovery.ts` | See |
| Most navigation skips the client DB (ADR-0028) | Scope: Where it applies |
| Title "Recovering from failed content loads" | Rewrite title now matches |

No drift. The rule will need a fresh `adr:` hash; if the file is renamed, its path line too.

## 4. Format friction

- **Reversed decision, wrong filename.** The template fixes the title, but the file is still `0019-patched-nuxt-content-client-db-loading.md`, the opposite of the decision. ADR-0030 says nothing about renaming files; renaming breaks the rule's path line and any links. Needs a ruling.
- **Rejected alternatives vs Why overlap.** "Reload, not in-page retry" and "why a patch was dropped" are each both a reason and a rejected option. I put the mechanism in Why and the one-line verdict in Rejected; it reads a little repetitive. The template gives no tie-breaker for "the reason *is* the rejection".
- **Scope vs Why for the chunk rationale.** The router-only behaviour of Nuxt's plugin is reasoning, but an agent editing the plugin needs it as a limit. Put it in Why; it also lives in the plugin's comment.
- **The ADR's *original* decision is now a Rejected alternative.** Works well, but the template doesn't say so; worth a line in ADR-0030 since every reversed ADR hits this.
- **"Rejected alternatives: only options actually considered."** "A second attempt counter" is implied by the amendment ("the only attempt counter") and stated in the code comment, not argued as an option. Borderline; kept because it guards a plausible "cleanup". Drop if too generous.
- **Consequences vs Scope.** "Fail the payload first in e2e" is a test-writing limit, arguably Scope or a doc instruction; put in Consequences as non-obvious effect.
- **Summary as 3 sentences** fitted fine.

## 5. Open questions

1. Rename the file to e.g. `0019-recovering-from-failed-content-loads.md` (and update the rule's path line and the two code citations)?
2. `scripts/repro-236.ts`: its header still describes patched/unpatched builds, and since ADR-0028 a client navigation may read the payload rather than the dump, so the harness may no longer reproduce. Keep it in See, refresh it, or retire it? I kept the pointer.

## 6. Lines

Old: 203. New: 87.
