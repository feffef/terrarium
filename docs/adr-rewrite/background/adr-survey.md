> Written before ADR-0030 landed; ADR-0018's editing section is gone and ADR-0030 governs ADR format. Some options below were since decided (see ADR-0030).

# Report 1: ADR survey

## ADR rewrite survey: all 29 ADRs in /home/user/terrarium/docs/adr/

This was read-only: nothing was edited, committed or pushed. I read CONTEXT-MAP.md, CONTEXT.md, every ADR in full and every rule file, plus issue #1745's body (not its 4 comments). Line counts come from `wc -l`. Amendment counts are banners or "Amendment" sections I counted while reading.

### Two things to settle before rewriting anything
1. **ADR-0018 forbids this rewrite.** Its section "Editing an ADR" (lines 91–132) and its rule `.claude/rules/adr-0018.md` say: "To change a decision, append a dated amendment and keep the original Decision and Consequences." The only exemption today is ADR-0027: a Prune Trial may fold amendments into the text if it "never changes what the ADR decided". So a project-wide rewrite needs one of two things first:
   - a decision (a new ADR, or a rewrite of 0018's section), or
   - running each rewrite as a Prune Trial.

   Issue #1745 (open, `ready-for-human`) says the same: "ADR-0018's editing rule … needs its own decision". #1745 goes further: put `paths` frontmatter in each ADR, symlink the rules to them, drop the summaries, and let git hold the history. ADR-0029's last bullet keeps #1745 open as the alternative.
2. **Mechanics.**
   - `docs/adr/**` and `.claude/rules/**` are both in the human-merge `paths`. Only `merge-pr.ts --prune-trial` bypasses that.
   - Every ADR edit changes its `adr:` hash, so `scripts/validate-adr-rules.ts` fails the gate until the rule is re-stamped. That makes every rewrite PR touch a Human-only rule file too.
   - `NO_RULE = {'0007'}` in that script would need updating if ADRs are retired or merged.
   - ADR-0017 is already a rewritten example ("rewritten whole under ADR-0027 with the decision unchanged"). Use it as the template.

### Per-ADR findings

**0001 – One container, content baked at build time** (52 lines, 1 amendment)
- **Gist:** One Nuxt app, one repo, one container. Every Tenant × Space × Collection is its own table in one SQLite DB, baked at build time. Requests only choose among baked content. Spaces are separated, not air-gapped.
- **Importance:** High. It is the foundation, though agents rarely act on it directly.
- **Effort:** Small. The only amendment is the ADR-0011 note that the PoC runs the build at runtime. Context uses old Space names (`prod/it/uat/dev`).
- **Actionable:** Barely. "Add a Tenant/Space by editing files."
- **Notes:** The summary rule is accurate. The ADR-0011 exception should become one sentence in the body.

**0002 – One manifest per Tenant** (53 lines, 2 amendments)
- **Gist:** Each Tenant declares its Spaces, Collections, schemas and routing in `layers/<t>/tenant.config.ts`. Code expands this into the keyed collections and routes. A new Tenant is a new folder plus `pnpm install`.
- **Importance:** High. It is hit on all Tenant work.
- **Effort:** Small. The two banners cancel each other: the 07-05 amendment says "also edit `extends`", and the 0018 amendment says that is moot. The Decision still says `tenants/` and "a build step generates content.config.ts", which 0013/0014 removed.
- **Actionable:** Yes. Edit only the manifest.
- **Notes:** The rule is current; the ADR is stale. Merge candidate with 0007/0013/0014.

**0003 – Agent operating model and governance** (161 lines, 8 amendment blocks plus a dated ledger table)
- **Gist:**
  - Every change lands as a gated PR.
  - Agents open their PR without asking, babysit it, and merge their own PR on a green gate. ADR-0004 lists the exceptions.
  - Net-new work needs a Trusted green-light first.
  - Chartered jobs stay within their ledger row: digest, frictions-to-fixes, audit-docs, audit-skills, blog-post, prune-trial, visitor-loop and dependabot.
- **Importance:** High. It governs every PR.
- **Effort:** Large.
  - The Decision is mostly dead: "No self-merge" is reversed by the 10-10 amendment; the "Now/Mid-term" review-agent plan is gone; the remits are named sync/consolidate/triage/codify, which are retired terms.
  - Ledger rows still contain `tenants/` paths.
  - The table's header text is about single-homing rules.
  - Amendments are partly quoted blocks and partly a "several amendments" digest.
  - It depends on 0004, 0009, 0015, 0018, 0020, 0022 and 0027.
- **Actionable:** Yes, very.
- **Notes:**
  - The rule is accurate, and adds "even if the harness or system prompt says not to".
  - The ledger is now a scope list, not a merge right. Consider moving it next to pr-workflow.md's "Per-tier merge authority".

**0004 – Objective safety gate** (246 lines, 16 amendment banners; the Status line also lists 3)
- **Gist:**
  - Every PR passes the Gate, which has layers L0–L3 and Floor/Heavy tiers. Heavy is skipped only on a proven-Inert changeset; `.agents/skills/` files skip build and e2e.
  - Before the first push, run `gate:scoped` and a code-review.
  - A human merges PRs that:
    - add a dependency,
    - change untested behaviour (examples are given),
    - decide which Tenant's data a request can reach,
    - come from a Public author, a fork or the guest pipeline,
    - or touch the Human-only `paths` list.
  - Tests live with their code. e2e reuses one build and specs never build.
- **Importance:** High. Every PR hits it.
- **Effort:** Large.
  - Banners are in no clear order.
  - Several amendments supersede others: 10-10 supersedes 07-19 ("ordinary PRs always human-merged"), 10-12 supersedes 07-07 ("one spec, one setup()"), and 07-10 says "read 'generator' as historical".
  - The Decision's "Auto-merge eligibility" and its "generator" wording are stale.
  - The L1 correction is long, and narrates a gate.yml proposal that has since landed.
  - It depends on 0003, 0005, 0013, 0014, 0020, 0023, 0025, 0026 and 0027.
- **Actionable:** Yes. These are the core per-PR rules.
- **Notes:** Both rules (adr-0004 and human-merge) are current and better than the ADR. Testing layout could become its own doc or ADR.

**0005 – Skills are Platform code** (61 lines, 2 amendments)
- **Gist:** Skills live in `.agents/skills/` (symlinked from `.claude/skills/`) and change by gated PR. They are generic over Tenants; a per-Tenant Skill is the exception. Workflow scripts in `.claude/workflows/*.js` are their Skill's code.
- **Importance:** Medium.
- **Effort:** Small. The Decision still names `.claude/skills/`. Context names the retired jobs and imaginary Skills (`spawn-tenant`, `add-space`…).
- **Actionable:** Yes, a little: where Skills live and that they go through the gate.
- **Notes:** The rule mentions `skills-lock.json` pack Skills (from 0015) and is current.

**0006 – Routing by path prefix** (52 lines, 1 amendment)
- **Gist:** Routes are `/t/<tenant>/<space>/<slug>` and resolve via `#routing` to one Space's `pages` key. An unknown Tenant or Space returns 404. Isolation follows from resolving exactly one key.
- **Importance:** Medium, and isolation-critical.
- **Effort:** Small. The Decision names `routing.generated.ts` and "the generator", which the 0014 banner says to read as historical.
- **Actionable:** Little.
- **Notes:** The rule (useSpace, resolveSpaceRoute, "only pages gets routes", layer pages) states facts the ADR doesn't hold. The rule is ahead of its ADR.

**0007 – Generated config committed, drift-checked** (52 lines, 1 banner; Status: Superseded)
- **Gist:** Nothing is current. Both halves are superseded by 0013 and 0014.
- **Importance:** Low.
- **Effort:** Small: retire, or fold into a merged "manifest expansion" ADR.
- **Actionable:** No.
- **Notes:** It has no rule (`NO_RULE`). It is the clearest retire or merge candidate.

**0008 – The Journal documents the Platform** (53 lines, 0 amendments)
- **Gist:** The `journal` Tenant is Platform infrastructure. It holds derived Inventories, append-only session logs and Digests. Session logs are ground truth.
- **Importance:** Medium-low.
- **Effort:** Small, but stale with no amendment marking it: it uses the retired "Journal entries", sync/consolidate/codify and "deferred log-session".
- **Actionable:** Little.
- **Notes:** The rule is more current than the ADR (it mentions the Friction Ledger and Digests).

**0009 – Session logs go straight to main** (592 lines, 2 top banners plus 12 dated amendment sections; the 10-11 section itself replaces 3 earlier ones)
- **Gist:**
  - `close-session` → `log-session` writes an authored scratch file.
  - Stop, SessionEnd and SessionStart-resume hooks run `log-session.ts --land`. It stitches the authored part with the derived transcript trace and commits one file straight to `main`, through the admin bypass.
  - There is a schema evolution policy: only optional fields can be added; anything else needs a schemaVersion union.
  - External sessions are flagged and kept out of mining.
  - Landed logs are fixed, apart from two bounded one-off repairs.
  - docsRead is derived by matching command output, and the agent corrects it.
- **Importance:** High. Every session hits it.
- **Effort:** Large, the biggest of all.
  - The Decision still says: `tenants/` path, schema in the Journal manifest, "the agent asks the user", "Stop hook dropped".
  - The Consequences cite "the 2026-07-25 amendment above", which does not exist (dead reference).
  - The close-session section names `scripts/session-end.ts`, which no longer exists.
  - Two one-time repair exceptions are kept as history.
  - Heavy implementation detail (sentinel, MIN_LINES_SHOWN…).
  - `.agents/prune-trials.yml` already has a trial on this ADR (lines 94/107).
- **Actionable:** Yes. Close-session timing, honesty, and keeping the log out of the branch.
- **Notes:**
  - Should split: (a) the direct-to-main exception, (b) the schema evolution policy (0012 also uses it), (c) derivation mechanics, which belong in the log-session docs rather than an ADR.
  - The rule is good.

**0010 – Digests** (91 lines, 3 amendments)
- **Gist:** One immutable page per closed UTC day with activity, in Journal `pages/digests/`. It is written by the `digest` Skill with `scripts/digest.ts` and lands by gated PR. The archive sweep keeps the newest 7 dates in `current`.
- **Importance:** Low-medium (one routine Skill).
- **Effort:** Small. Banners correct a "deferred sync" and the aging bullet.
- **Actionable:** Only for digest runs.
- **Notes:** The rule is fine.

**0011 – Self-updating deploy container** (74 lines, 0 amendments)
- **Gist:** The PoC VPS runs a thin container. It clones and polls `main`, rebuilds, and swaps atomically only on a successful build. This is the one place a build runs at runtime.
- **Importance:** Low-medium (agents rarely touch `deploy/`).
- **Effort:** Small, almost nothing to do.
- **Actionable:** No.
- **Notes:** None.

**0012 – Pingbacks written at authoring time** (74 lines, 0 amendments)
- **Gist:** A Persona's reaction writes a stub into the target Persona's `pingbacks` collection in the same PR. Reads stay inside one Space, and stubs are denormalized.
- **Importance:** Low (Blog only).
- **Effort:** Small. Minor staleness: it mentions `routing.generated.ts`, and lists only 3 Personas (Eyra is now a fourth).
- **Actionable:** Yes, for blog-post: update the Pingback when renaming a reaction.
- **Notes:** It points to 0009's schema policy.

**0013 – content.config.ts builds collections dynamically** (91 lines, 2 banners; the Status line notes partial supersession)
- **Gist:** `content.config.ts` is ordinary code that calls `expand(loadManifests())` at config time. No regenerate step is needed.
- **Importance:** Medium.
- **Effort:** Small-medium. Half the ADR (keep the routing map committed, `pnpm gen`, drift gate) is superseded by 0014.
- **Actionable:** Little.
- **Notes:** Merge with 0002, 0007 and 0014.

**0014 – #routing build-time module** (106 lines, 4 banners plus an inline "(Resolved by #97)")
- **Gist:** `modules/routing.ts` derives the routing map and entry routes at build time into `.nuxt/routing.mjs` as `#routing`. Three alias wirings are needed. Existing manifests are dev-watched; a brand-new layer needs a restart.
- **Importance:** Medium.
- **Effort:** Medium. The no-watch caveat is half stale (the #325 banner says so). The CI drift-step consequence is resolved. Its "Deleted:" lists are a changelog.
- **Actionable:** Yes. Mirror `#` aliases, and run `pnpm install` after adding a layer.
- **Notes:** The rule's "after rebasing run pnpm install" is not in the ADR.

**0015 – Skill Inventory and audit-skills** (218 lines, 9 amendments; banners out of date order, with 09-25 between 07-11 and 07-13)
- **Gist:**
  - `importance` means conditional essentialness, with 5 grades including `routine`. A grade changes only on cited evidence.
  - `audit-skills` runs on a schedule over the last 7 days. It checks that our own Skills fire and deliver, keeps `role` free of references, and keeps 40 days of `observations`.
  - Pack Skills are hash-pinned by `verify:skills-lock`.
- **Importance:** Low-medium. It is specialist territory.
- **Effort:** Large.
  - The Decision is largely wrong today: 40 newest logs vs 7 days, a four-grade enum, the "referral to frictions-to-fixes", "on-demand v1", append-only observations, and the regression watch that was added and then removed.
- **Actionable:** Only for audit-skills runs.
- **Notes:** The rule's "repo advice for one goes in its Inventory entry" has no home in the ADR. Much of the detail belongs in audit-skills/SKILL.md.

**0016 – Tenant root pages** (55 lines, 1 amendment)
- **Gist:** A layer may own `/t/<tenant>` as a presentation page. It sits outside the manifest, routing and smoke routes, and reads data via `resolveSpaceRoute`.
- **Importance:** Low.
- **Effort:** Small (path banner only).
- **Actionable:** Yes, a little: test root pages in their own Tenant.
- **Notes:** The rule is fine.

**0017 – Provenance on every agent write** (77 lines, 2 notes; already rewritten)
- **Gist:** Every GitHub body starts with `🤖 [Claude](…session_<id>)`. Commits carry Co-Authored-By plus a Claude-Session trailer. Both are guard-enforced.
- **Importance:** High in reach (every GitHub write), though mechanically enforced.
- **Effort:** None to small.
- **Actionable:** Yes.
- **Notes:** This is the existing template for the rewrite.

**0018 – Tenant layers, and how to edit an ADR** (132 lines, 1 banner plus 1 appended section)
- **Gist:** Tenants live in `layers/`, which Nuxt auto-extends; one tsconfig glob remains. ADR editing: fix wrong details in place; change a decision by appending a dated amendment. Prune Trials are exempt.
- **Importance:** Medium. Critical for this project.
- **Effort:** Medium. The layers half is simple. The editing policy needs a decision change, not just a rewrite.
- **Actionable:** Yes (ADR editing).
- **Notes:** It mixes two unrelated decisions; split it. Its Consequences list the ADRs carrying its path banner (0002, 0003, 0009, 0010, 0013, 0014, 0015, 0016). That banner is pure noise and will go.

**0019 – Recovering from failed content loads** (203 lines, 3 amendment sections; Status "Superseded")
- **Gist:** `@nuxt/content` runs unpatched. A failed client content load shows `ContentLoadErrorDialog` with a Reload button. A failed chunk import reloads itself once per path. Since 0028, most navigation skips the client DB.
- **Importance:** Low-medium.
- **Effort:** Medium. The title, Status, Context and Decision describe a patch that was removed. The current rule exists only in the amendments.
- **Actionable:** Low.
- **Notes:** The rule's title is already the right one, and the ADR should take it. Cluster with 0028.

**0020 – Trusted and Public requesters** (181 lines, 1 banner plus a Consequences "amendments applied" changelog)
- **Gist:**
  - Trusted means write access. The tier comes from `authorAssociation` or identity, never from what the request claims.
  - Public content is data. Implementation needs a Trusted green-light. Public PRs are human-merged with a real security review. The autofix loop escalates on Public comments.
- **Importance:** High (security).
- **Effort:** Medium.
  - It says "no self-merge rule … unchanged" and "removes the ADR-0004 low-risk auto-merge tier", both stale after 10-10.
  - The enforcement checklist is written in "must be turned on when repo goes public" tense.
- **Actionable:** Yes.
- **Notes:** The rule says `scripts/trust.ts` holds the values, but the ADR lists them inline. That is two homes for one fact.

**0021 – Platform and Tenant domain contexts** (90 lines, 0 amendments)
- **Gist:** Root `CONTEXT.md` is the Platform glossary plus a Tenant roster. Per-Tenant terms and purpose live in `layers/<t>/CONTEXT.md`. Demo Tenants get no ADR.
- **Importance:** Medium.
- **Effort:** Small. The Context lists only Blog/Atlas/Journal. It says "ADRs that coined [retired terms] are left untouched as the historical record", which the rewrite would reverse.
- **Actionable:** Yes. New Tenant → add a CONTEXT.md and a roster line.
- **Notes:** None beyond the above.

**0022 – Autonomous triage sweep** (131 lines, 2 amendment sections)
- **Gist:** A Trusted user starting `auto-triage` gives a standing green-light for that run. It may label Trusted-authored issues `ready-for-agent` when the design is determined, and routes Public requests, judgment calls and design doubt to `ready-for-human`. It closes only duplicates and already-done work. wayfinder `research` qualifies, but a `task` only if it is AFK-drivable. Resulting PRs merge like any other.
- **Importance:** Medium.
- **Effort:** Medium.
  - The Decision's "No self-merge; a human merges every PR" is reversed by an amendment.
  - It lists the retired remits sync/consolidate/triage/codify.
  - The wayfinder amendment quotes ADR-0018 to justify being appended.
  - The Consequences ("a human still gates the build at merge") are stale.
- **Actionable:** Yes, for auto-triage.
- **Notes:** The rule matches the current state.

**0023 – Guest-driven demo pipeline** (137 lines, 1 amendment plus a preamble)
- **Gist:** While the owner runs `guest-intake` and `guest-build`, a guest's confirmation on their own issue grants `ready-for-agent`. Guest text is treated as an idea. Harmful, security, dependency or Human-only requests are escalated. The owner merges every guest PR.
- **Importance:** Medium-low (demo-scoped).
- **Effort:** Small. The "major security concern" examples just need folding in.
- **Actionable:** Yes, for the guest Skills.
- **Notes:** None.

**0024 – Mermaid diagrams pre-rendered to SVG** (130 lines, 0 amendments)
- **Gist:** `pnpm render:mermaid` (needs Chromium) bakes theme-adaptive SVGs into `app/assets/mermaid/`. `verify:mermaid` gates them. Colours stay live CSS variables; fonts are pinned and baked; no mermaid JS ships.
- **Importance:** Low.
- **Effort:** Small-medium. The font-clipping fix is narrated as history inside a Consequence sub-bullet.
- **Actionable:** Yes. Re-render and commit after editing a diagram.
- **Notes:** None.

**0025 – Cross-Tenant reads through collection kinds** (242 lines, 1 amendment plus a preamble)
- **Gist:** Collections opt into a `kind` (`shared/kinds.ts`), whose contract merges with their own schema. `#catalog` is derived at build time. Aggregators (Commons) read only via `queryAcrossTenants`, and adapters live in their layer. The kind files are Human-only.
- **Importance:** Medium (isolation boundary).
- **Effort:** Medium-large.
  - The length comes from implementation and Commons-specific detail, not amendments.
  - A "Deferred follow-ups" list of 5 items may be stale.
  - "Never auto-merges" wording.
- **Actionable:** Yes, a little: opt-in and where adapters go.
- **Notes:** The Commons first-consumer section arguably belongs in `layers/commons/CONTEXT.md` (the ADR-0021 boundary).

**0026 – Gate workflow is a thin shell** (131 lines, 0 formal amendments; the Status line records the hand-applied swap)
- **Gist:** The Gate's steps live in the composite `.github/actions/gate/action.yml`: agents push it and a human merges it. `gate.yml` holds only triggers and permissions. `gate-parity.spec.ts` keeps package.json, `gate.ts` and the composite in step.
- **Importance:** Medium-low.
- **Effort:** Small-medium. The "composite ships unexercised" consequence is stale (applied 10-03), and so is "never auto-merged by any chartered-Skill tier".
- **Actionable:** Yes. Keep the three in sync; workflow changes go to `docs/proposals/`.
- **Notes:** The Context leans on ADR-0004's 07-11 amendment.

**0027 – Prune trials** (106 lines, 1 amendment section)
- **Gist:** `prune-trial` cuts one problem's instructions per run (ADRs included, decision kept), self-merges on a green gate, and leaves the cut standing at least 72h minus 1h. A `major` or `blocker` Friction restores one line. Other sessions log Frictions and don't restore. Retiring a capability is not trialable.
- **Importance:** Medium. It is the current legal path for ADR rewrites.
- **Effort:** Small.
- **Actionable:** Yes. Log Frictions inside a trial's territory.
- **Notes:** It references ADR-0018's record-integrity rule and the 0003 ledger row.

**0028 – Navigation reads server payloads** (83 lines, 3 amendments, written as indented blockquotes inside bullets)
- **Gist:** `payloadExtraction: 'client'`. `/` and `/t/**` are cached for 60s with no stale serving, in an LRU-bounded production cache. Pages that read headers need `varies`. Prefetch happens on interaction. Server "now" can be about 2 minutes old.
- **Importance:** Medium-low.
- **Effort:** Small. Classic contradiction: the bullet "The cache has no size bound" sits directly above the amendment that bounds it.
- **Actionable:** Yes. `varies` for header or cookie reads.
- **Notes:** None.

**0029 – Instructions load with the files they govern** (94 lines, 0 amendments)
- **Gist:**
  - File-bound instructions live in path-scoped `.claude/rules/`; action-bound ones stay in CLAUDE.md.
  - Every ADR has a hash-stamped summary rule. Non-ADR rules always have `paths` and point to a doc.
  - Hints cover Skills and Bash reads.
- **Importance:** Medium-high (meta).
- **Effort:** Small. It is clean.
- **Actionable:** Yes, for rule authors.
- **Notes:** #1745 would change its ADR-rules bullet.

### Summary table

| ADR | Title | Importance | Effort | Amendments | Lines | Actionable |
|---|---|---|---|---|---|---|
| 0001 | Single container, baked | High | S | 1 | 52 | N |
| 0002 | Manifest per Tenant | High | S (merge) | 2 | 53 | Y |
| 0003 | Operating model/governance | High | L | 8 + dated ledger | 161 | Y |
| 0004 | Objective safety gate | High | L | 16 | 246 | Y |
| 0005 | Skill model | Med | S | 2 | 61 | Y |
| 0006 | Path-prefix routing | Med | S | 1 | 52 | N |
| 0007 | Committed generated config | Low | S (retire) | 1, superseded | 52 | N |
| 0008 | Journal Tenant | Med-low | S | 0 (silently stale) | 53 | N |
| 0009 | Session logs to main | High | L (largest) | 14 | 592 | Y |
| 0010 | Digests | Low-med | S | 3 | 91 | Y (digest) |
| 0011 | Self-updating deploy | Low-med | S | 0 | 74 | N |
| 0012 | Pingbacks | Low | S | 0 | 74 | Y (blog) |
| 0013 | Dynamic content.config | Med | S-M (merge) | 2 | 91 | N |
| 0014 | #routing module | Med | M | 4 | 106 | Y |
| 0015 | Skill Inventory/audit-skills | Low-med | L | 9 | 218 | Y (audit) |
| 0016 | Tenant root pages | Low | S | 1 | 55 | Y |
| 0017 | Provenance | High | none/S | 2 notes (already rewritten) | 77 | Y |
| 0018 | layers/ dir + ADR editing | Med | M (needs a decision) | 2 | 132 | Y |
| 0019 | Content-load recovery | Low-med | M | 3, title inverted | 203 | N |
| 0020 | Trust tiers | High | M | 1 + changelog | 181 | Y |
| 0021 | Multi-context docs | Med | S | 0 | 90 | Y |
| 0022 | Auto-triage sweep | Med | M | 2 | 131 | Y |
| 0023 | Guest pipeline | Med-low | S | 1 | 137 | Y |
| 0024 | Mermaid prerender | Low | S-M | 0 | 130 | Y |
| 0025 | Collection kinds/catalog | Med | M-L | 1 | 242 | Y |
| 0026 | Gate thin shell | Med-low | S-M | 0 (stale parts) | 131 | Y |
| 0027 | Prune trials | Med | S | 1 | 106 | Y |
| 0028 | Server payload navigation | Med-low | S | 3 (inline) | 83 | Y |
| 0029 | Rules load with files | Med-high | S | 0 | 94 | Y |

The heavy cases are 0009, 0004, 0015, 0003 and 0019. Together that is about 1,420 of the corpus's ~3,600 lines.

### Patterns across the corpus
- **Five amendment styles, no standard:**
  - stacked top banners in no fixed order (0004, 0015),
  - appended `## Amendment` sections (0009, 0019, 0022, 0027),
  - blockquotes inside a bullet (0028),
  - Status-line summaries (0004, 0007, 0013, 0014, 0019, 0026),
  - a "Consequences: amendments applied" changelog (0020).
- **"Read the text below as historical" banners** tell the reader to mentally rewrite the Decision: 0004, 0005, 0006, 0007, 0013, 0014, 0015. They are the strongest sign the body is stale.
- **The ADR-0018 path banner (`tenants/` → `layers/`) appears in 8 ADRs.** It is pure noise; a rewrite just fixes the paths.
- **Retired vocabulary** (sync/consolidate/codify, the triage "charter", "Journal entry") persists in 0003, 0005, 0008, 0009, 0010, 0015, 0021 and 0022. That is deliberate under ADR-0021's "left untouched" stance, which the rewrite would reverse.
- **The 10-10 self-merge reversal left stale merge wording** ("no self-merge", "never auto-merged", "chartered-Skill tier") in 0003, 0004, 0020, 0022, 0025 and 0026. These should be fixed in one pass.
- **Process narration** fills Context and Consequences: spikes, session IDs, issue-by-issue history, "Deleted:" lists, and "ships unexercised" notes that are long resolved.
- **Rules are often more current than their ADRs** (0002, 0006, 0008, 0014, 0015, 0020). The summaries hold facts the ADR doesn't (0006 useSpace, 0014 rebase/install, 0015 pack-Skill advice, 0020 trust.ts).
- **Two dead references:**
  - 0009's Consequences cite "the 2026-07-25 amendment above", which doesn't exist.
  - 0009's close-session section names `scripts/session-end.ts`, which no longer exists (merged into `log-session.ts`).

**Clusters to rewrite together:**
- A. Manifest expansion: 0002, 0007, 0013, 0014, plus the mechanism refs in 0006. Merge into one ADR and retire 0007 (possibly 0013).
- B. Merge governance: 0003, 0004, 0020, 0022, 0023, 0026, 0027.
- C. Journal and session logs: 0008, 0009, 0010, 0012 (schema policy), 0015, plus 0025's session kind.
- D. ADR and rule meta: 0018's editing section, 0027, 0029, #1745. Decide this first.
- E. Content loading: 0019 and 0028.
- F. Deploy: 0001 and 0011.

### Recommended pilots
1. **ADR-0022 (131 lines, 2 amendments).** It has every typical problem at a manageable size: an amendment reverses part of the Decision (self-merge), another narrows it (wayfinder task), it uses retired terms, and an amendment cites ADR-0018 to justify being appended. It is actionable for a real Skill, and its rule is already current, so you can check that "the rewritten ADR matches its rule".
2. **ADR-0019 (203 lines, 3 amendment sections).** This tests the hardest rewrite shape: the original decision (the patch) was fully reversed, so the title, Status and Decision all have to change while the "why" (reload is the only reliable recovery) is kept. It is low-risk territory, and the target title already exists in its rule.
3. **Contrast: ADR-0028 (83 lines).** A small, recent, clean ADR with inline amendments, one of which directly contradicts the bullet above it. It shows how little a rewrite needs when the ADR is well written, and sets the length and style target for the "actionable" section.
   - If you would rather have the contrast be high-stakes: use ADR-0004 as the second wave instead. It is the most important, but at 16 amendments it is a slog as a first attempt.

Before any pilot, decide whether these rewrites go through as Prune Trials (`merge-pr.ts --prune-trial`, with the "decision unchanged" constraint) or under a new decision replacing ADR-0018's editing rule. Every pilot PR will also need its `.claude/rules/adr-NNNN.md` hash re-stamped.

### Relevant files
- /home/user/terrarium/docs/adr/ (all 29 ADRs)
- /home/user/terrarium/.claude/rules/adr-*.md
- /home/user/terrarium/.claude/rules/adr-0004-human-merge.md
- /home/user/terrarium/scripts/validate-adr-rules.ts (`adr:` hash check, `NO_RULE = {'0007'}`)
- /home/user/terrarium/.agents/prune-trials.yml (already has a trial on 0009)
- /home/user/terrarium/docs/adr/0017-provenance-footer-on-agent-authored-content.md (template for the rewrite)

# Report 2: Restructuring options

## Restructuring options for the ADR set

Read-only: nothing was edited, committed or pushed. This follows the user's new ground rules:
- no amendments or history notes; git holds history;
- merging, retiring and refocusing are all allowed;
- each ADR states the rule, why it exists, and the alternatives rejected;
- `.claude/rules` summaries are out of scope.

Options are listed without picking a winner.

Sources read in full:
- `.agents/skills/domain-modeling/ADR-FORMAT.md`
- `.agents/skills/writing-for-agents/SKILL.md`

Read in part: `audit-docs/SKILL.md` lines 10–119 and `prune-trial/SKILL.md` lines 85–168, plus a grep of both for "ADR". Reference counts below come from grep.

### 1. Options per cluster

**A. Manifest expansion (0002, 0006, 0007, 0013, 0014)**
- **A1. Merge 0002, 0007, 0013 and 0014 into one ADR: "Manifests are the source; everything keyed is derived at build time."** Keep 0006 (routing and isolation) separate.
  - Content: one manifest per Tenant; `expand()` feeds both `content.config.ts` and `#routing`; nothing generated is committed.
  - Rejected alternatives: a hand-written keyed config, committed generated files plus a drift gate (0007), a committed routing map (0013).
  - Pro: the 4-ADR supersession chain disappears.
  - Con: 3 numbers retire. 0002 is cited in 24 files and 0014 in 18.
- **A2. Two ADRs with sharper focus.**
  - 0002 covers only "agents edit a small manifest" (rejected: a hand-written cross-product config).
  - 0014 becomes "derived data is computed at build, never committed" (rejected: commit plus drift-check, which was 0007 and 0013).
  - Retire 0007 and 0013.
  - Pro: keeps the two most-cited numbers.
  - Con: two ADRs remain with a thin seam between them.
- **A3. One ADR "Manifest → expand() → collections, routes, catalog"** covering 0002, 0006, 0013, 0014 and the derivation part of 0025.
  - Pro: one place for every derivation. 0025's "Module consolidation" follow-up already asks for this in code.
  - Con: mixes the isolation guarantee with config plumbing, and makes a large ADR.

**B. Governance and merge (0003, 0004, 0017, 0020, 0022, 0023, 0026, 0027)**
- **B1. Sharpen the focus and move the tables out.**
  - 0003: who decides what. Net-new work needs a Trusted green-light; agents open and merge their own PRs; chartered jobs stay in scope.
  - The ledger table goes to `docs/agents/pr-workflow.md`, merged with "Per-tier merge authority" so there is one table for scope and mechanism.
  - 0004: only the Gate (what it proves, Inert/Heavy skipping, review before the first push) and the human-merge exceptions.
  - 0020: only the trust tiers.
  - 0022 and 0023 stay separate.
  - Pro: small diffs per ADR.
  - Con: the merge exceptions stay spread over 0004, 0020 and 0023.
- **B2. A new "Who merges what" ADR**, taking 0003's self-merge decision, 0004's exceptions, and 0020's and 0023's merge clauses.
  - 0004 becomes purely "the Gate".
  - Pro: one home for the decision agents check most often.
  - Con: 0004 is the most-cited ADR (108 files, 61 of them code), and many of those citations mean the merge exceptions, so pointers would move.
- **B3. Merge 0022 and 0023 (plus visitor-loop's standing green-light, which today exists only as a 2026-09-24 amendment in 0003) into one "Standing green-lights" ADR.** Each gets a short block: who starts it, what it may label or build, and what escalates.
  - Pro: the same pattern is stated once, and visitor-loop gets a real home.
  - Con: it couples a demo pipeline to permanent machinery.
- 0017, 0026 and 0027 stand alone in every option. 0017 is already near the target shape.

**C. Journal and session logs (0008, 0009, 0010, 0012, 0015)**
- **C1. Split 0009 three ways.**
  - (a) 0009 becomes "Session logs land straight on main": the one-file boundary, the reasoning, closure at work-complete rather than merge, and the external-session PR exception.
  - (b) A new ADR on append-only schema evolution: add optional fields only, otherwise use a schemaVersion union. 0012 and 0025 already depend on it.
  - (c) Derivation mechanics (hooks, sentinel, stitch, docsRead matching, `landedBy`) move to the log-session docs.
  - The two one-off repair exceptions are deleted, since git has them.
  - Pro: 592 lines become two short ADRs.
  - Con: 2 files link to `0009…#schema-evolution-policy`.
- **C2. Merge 0008 and 0010 into one "The Journal" ADR:** Platform infrastructure, three content kinds, Digests as pages in `pages/`.
  - Pro: 0008 has 0 amendments but stale terms, and 0010 is thin.
  - Con: the Digest detail duplicates the `layers/journal/CONTEXT.md` and digest SKILL material.
- **C3. Retire 0015.** Grades are already in CONTEXT.md; the process goes to the audit-skills SKILL; pack-Skill pinning goes to a short note in the guards or skills docs.
  - The alternative is to keep a 1–3 sentence ADR on "importance = conditional essentialness, not frequency" with its rejected alternative (raw frequency).

**D. Meta (0005, 0018, 0021, 0029, plus the new editing rule)**
- **D1. Split 0018.**
  - The layers/ half stays as a tiny ADR (rejected: `tenants/` plus a hand-kept `extends` list), or moves to `docs/agents/tenant-layers.md`.
  - The editing half is replaced by the new rule ("ADRs state the current decision; git holds history"), placed in 0029 or a new ADR.
- **D2. Merge 0021 and 0029 into "Where each kind of knowledge lives":**
  - vocabulary → CONTEXT;
  - decisions → ADR (including the editing rule);
  - file-bound instructions → rules;
  - action-bound instructions → CLAUDE.md;
  - how-to → `docs/agents`.
  - Pro: one map.
  - Con: 0029 is fresh and actionable on its own.
- **D3. Put the editing rule into `.agents/skills/domain-modeling/ADR-FORMAT.md`.** That file is a pack template (audit-docs calls it "Pack-generic"), so a re-install would clobber the edit. A repo doc such as `docs/agents/adr.md` is the viable variant.
- 0005 stays. Its rejected alternative (per-Tenant or user-profile Skills) is worth keeping.

**E. Content loading (0019, 0028)**
- **E1. Merge into "Client-side content loading".**
  - Navigation reads payloads; where the client DB still loads, failures show the dialog, and a chunk failure reloads itself once.
  - Rejected alternatives: patching `@nuxt/content` (0019's original decision), full page loads, in-page retry.
  - Pro: removes 0019's inverted title and Status.
  - Con: mixes caching policy with error UX.
- **E2. Keep both, retitled and sharpened.** 0019 becomes "Recovering from failed client content loads"; 0028 is payloads and the cache only.

**F. Architecture and rendering (0001, 0011, 0006, 0016, 0024, 0025, 0012)**
- **F1. Fold 0011 into 0001** as "how it ships today (PoC)".
  - Pro: removes 0001's amendment.
  - Con: 0011 is the piece most likely to be reverted, and merging blurs that.
- **F2. Fold 0016 into 0006** as one paragraph: "Tenant root pages are layer pages outside routing."
- 0024 and 0012 each stay alone and get trimmed.
- 0025 keeps its decision. The Commons specifics go to `layers/commons/CONTEXT.md`, and the "Deferred follow-ups" become issues.

**G. Tests and Gate shape (new cluster).** 0004's 07-07 and 10-12 amendments (tests live with their code; one build; "an e2e spec never builds") are a "don't clean this up" decision.
- Options: a short standalone ADR, or `tests/README.md` plus a code comment in `tests/support/e2e-global-setup.ts`.

### 2. What fails ADR-FORMAT's three-part test (hard to reverse, surprising, real trade-off)

| ADR / part | Fails on | Better home |
|---|---|---|
| 0007 whole | nothing current to decide | delete or stub; its rejected option goes into A's ADR |
| 0013 whole | intermediate step, superseded | fold into A |
| 0008 | renaming and content kinds are glossary, cheap to reverse | CONTEXT.md and `layers/journal/CONTEXT.md` (both already cover most of it) |
| 0010 | easy to reverse | journal CONTEXT (Digest) plus the digest SKILL. Its one surprising point ("not a dedicated collection because the resolver routes only `pages`") could survive as a sentence in 0006 |
| 0015 | process tuning, easy to reverse | audit-skills SKILL, CONTEXT.md grades, `verify-skills-lock` comment or guards doc |
| 0016 | small and reversible | paragraph in 0006 or `docs/agents/tenant-layers.md` |
| 0018 layers half | now the stock Nuxt convention, so not surprising | tenant-layers doc (keep one line on the rejected `tenants/`) |
| 0018 editing half | process, not architecture | see D |
| 0021 | weak: doc structure is reversible | `docs/agents/domain.md` (already documents it); or D2 |
| 0003 ledger table | configuration, not a decision | pr-workflow.md |
| 0009 mechanics sections (SessionEnd/PR #148 hooks, lander module, docsRead reason split, `session` reclassified, output-matching, both repair exceptions, `main` protection) | implementation and one-offs | log-session SKILL or a `docs/agents/session-logs.md`, code comments, git history |
| 0004 L1 correction narrative, the 07-19 / 10-10 merge-tier history | history | delete |
| 0020 Consequences "Amendments applied" | changelog | delete |
| 0014 / 0013 "Deleted:" lists, the #97 note | changelog | delete |

Likely passes: 0001, 0002 (as merged), 0003 core, 0004 core, 0005, 0006, 0009 core, 0011, 0012, 0014 core, 0017, 0019 current, 0020, 0022, 0023, 0024, 0025 core, 0026, 0027, 0028, 0029.

### 3. Implementation detail to move out, per ADR
- **0004:** e2e mechanics (`globalSetup`, `setupL2()`, per-spec SQLite) → `tests/README.md`. The Inert proof details → `scripts/gate.ts` comments. Untested-behaviour examples → keep in the ADR or pr-workflow.md.
- **0009:**
  - Hook registrations, sentinel `.session-logs/last-landed.json`, stitch rules → log-session SKILL or doc.
  - `MIN_DISTINCTIVE_LINE`, `LINE_PREFIXES`, `(not read)`, ratings fields → already in `scripts/shell-reads.ts`; point there.
  - Schema field lists → `shared/schemas/session.ts`.
- **0014:** the three alias wirings, the `addTypeTemplate` detail, the dev watch list → `modules/routing.ts` comment plus tenant-layers doc. The inline `node --import tsx/esm …` debug command → a script or doc.
- **0013:** jiti and synchronous-load detail → `content.config.ts` comment.
- **0015:** window size, the ≥3-session subagent check, 40-day observations, issue rules → audit-skills SKILL.
- **0019:** bug archaeology (dbPromises, retry values, ring buffer); classification and loop-safety mechanics → `app/composables/contentLoadRecovery.ts` and `chunkRecovery.ts` comments.
- **0024:** sentinel-hex rewrite, `handDrawnSeed`, `relaxNodeLabelOverflow`, font provenance → `app/utils/mermaid.ts`, `scripts/render-mermaid.ts`, `app/assets/fonts/README.md` (exists).
- **0025:** code sample, `catalogFrom`, alias wiring, Timeline adapter details → code plus `layers/commons/CONTEXT.md`. Deferred follow-ups → issues.
- **0026:** GitHub docs citations for composite semantics → `action.yml` comment.
- **0028:** byte measurements, LRU driver detail → `nuxt.config.ts` comments.
- **0011:** Dockerfile and entrypoint specifics → `deploy/README.md`.
- **0017:** the trailer format is already enforced by guards, so the ADR can just point to them.
- **0003:** dependabot mechanism → already single-homed in pr-workflow.md.

### 4. Candidate templates, each with a sketch of ADR-0028

**T1 – Minimal (ADR-FORMAT as written)**
- `# Title` – the decision as a sentence.
- One paragraph – context, decision, why, in 1–3 sentences.
- `## Considered options` (optional) – one line per rejected option, with its reason.
- `## Consequences` (optional) – only non-obvious effects.
- What agents must do sits in the paragraph. Rejected alternatives are a bullet list.

Sketch:
> # In-app navigation reads server-rendered payloads
> Querying Content in the browser downloads a ~450 KB SQLite runtime on the first navigation and is the failure path behind ADR-0019. So navigation fetches each route's `_payload.json` instead, which Nuxt produces only for cached routes: `/` and `/t/**` are cached for 60 s.
> ## Considered options
> - Full page loads: lose Tinkerfund's view transitions and in-memory state.
> - Keep browser queries: heavy and fragile.
> ## Consequences
> A cached page is the same for every visitor, so a page that reads a header or cookie needs `varies`. Server "now" can be up to about 2 minutes old.

**T2 – Rule card (agent-first)**
- `# Title`
- `## Do` – bullet actions or checks for agents, written positively. It comes first so skimmers hit it.
- `## Why` – 2–4 sentences.
- `## Not chosen` – "Option — why not", one line each. Framed as "don't reopen without new evidence".
- `## See` – pointers to the code, config and docs that hold the mechanics.

Sketch:
> # Navigation reads server payloads
> ## Do
> - Give a page that reads a request header or cookie `varies` (see Tinkerfund's config).
> - Expect server-computed "now" to be up to about 2 minutes old.
> - A new cached route needs a `routeRules` cache entry, or it gets no payload.
> ## Why
> Browser queries pull a ~450 KB runtime and are the main way content fails to load (ADR-0019).
> ## Not chosen
> - Full page loads: break view transitions and in-memory state.
> - Visibility prefetch: fetched up to 550 KB payloads per visible link.
> ## See
> `nuxt.config.ts` routeRules, `layers/tinkerfund/nuxt.config.ts`

**T3 – Decision record with an agent callout**
- Frontmatter: `status`, and `governs:` paths (this would also serve #1745's idea later).
- `> For agents:` callout at the top – 1–3 lines of must-do.
- `## Context` – the forces, briefly.
- `## Decision`
- `## Alternatives considered` – a table: option | why rejected | what would make us revisit.
- `## Consequences`

Sketch (Decision and Alternatives only):
> > **For agents:** pages that read headers or cookies need `varies`; cached routes give payloads.
> ## Decision
> Use payload extraction (`client`), cache `/` and `/t/**` for 60 s with no stale serving, and prefetch on interaction.
>
> | Option | Rejected because | Revisit if |
> |---|---|---|
> | Full page loads | breaks view transitions and state | those features go away |
> | Browser DB queries | 450 KB, fragile | Content gains a server-query switch |

Trade-offs between the templates:
- T1 matches the pack format, but buries what agents must do in prose.
- T2 is the most actionable, but drifts toward a how-to doc (writing-for-agents warns against caching what the environment already says).
- T3 is the most complete. The "Revisit if" column directly serves "stop reviews reverting decisions", but it is the heaviest.

### 5. Numbering when ADRs merge or retire

Inbound reference counts, in files outside `docs/adr` and outside the immutable Journal and Blog content:

| ADR | files | of which code | in other ADRs |
|---|---|---|---|
| 0004 | 108 | 61 | 21 |
| 0009 | 50 | 30 | 8 |
| 0003 | 36 | 5 | 14 |
| 0020 | 31 | 9 | 6 |
| 0025 | 31 | 24 | 2 |
| 0002 | 24 | 14 | 5 |
| 0001 | 24 | 8 | 6 |
| 0027 | 23 | 7 | 5 |
| 0018 | 19 | 4 | 10 |
| 0006 | 19 | 10 | 3 |
| 0014 | 18 | 7 | 5 |
| 0015 | 15 | 5 | 4 |
| 0013 | 13 | 6 | 3 |
| 0007 | 8 | 2 | 3 |

- 179 immutable Journal and Blog files cite ADR-0004 or ADR-0009; they can never be updated.
- 2 files deep-link `#schema-evolution-policy`.
- 71 references in live code and docs cite a specific amendment (for example "ADR-0004's 2026-10-12 amendment"), across `scripts/gate.ts`, `log-session.ts`, `session-trace.ts`, `shared/schemas/session.ts`, the journal manifest and others. These dangle under any option once amendments are folded in.
- My grep regex also matched short forms like "ADR-4", so the counts are approximate.

Options:
- **N1. Keep numbers; a retired file becomes a one-line stub** ("Merged into ADR-0002 — <title>").
  - Every old citation still resolves, including immutable history.
  - Cost: stubs are sediment, and each needs `NO_RULE` in `validate-adr-rules.ts` or a rule file.
- **N2. Merged ADRs keep the lowest number of their set; the other files are deleted and their numbers left as gaps.**
  - Live references need a sweep: 0007 → 8 files, 0013 → 13, 0014 → 18.
  - Immutable records point at missing files; readers fall back to git.
  - New ADRs still take highest number + 1.
- **N3. Renumber densely.** Breaks everything above, plus rule filenames and hashes. Cosmetic gain, highest cost.
- **N4. Merged results get new numbers (0030+); the old files are stubbed or deleted.**
  - Marks the change of form, but every citation of the merged set has to move.
  - Over the hot numbers (0004, 0009) this is the worst fit.

A section-level variant: when 0009's schema policy moves to a new ADR, the old anchor dies under every option unless 0009 keeps a pointer line.

### 6. Conflicts the new approach would trigger
- **`audit-docs/SKILL.md`:**
  - Lines 40–44 class `docs/adr/*` as "Historical — the append-only record. **Never rewrite a decision**", fixed under ADR-0018's correction-vs-reversal rule.
  - Lines 78–80 (Orphan-addition case 2) require "the amendment banner or Status-line pointer" on a superseded ADR. That is the opposite of no-history.
  - Line 221: any ADR edit escalates.
  - Line 115 keeps "don't regress" rationale with "a pointer to where the history lives (issue/ADR)".
- **`prune-trial/SKILL.md`:**
  - Bounds (lines 151–156) allow rewriting an ADR only if "what it decided does not change". Merging or retiring files is not clearly covered.
  - Lines 92–93 cut history to "a pointer to where the history lives (the issue, the ADR)". That treats ADRs as a history home.
  - `.agents/prune-trials.yml` lines 94/107 have an open trial on ADR-0009. Rewriting 0009 inside its window collides with that trial's verdict.
- **ADR-0027 itself** cites "ADR-0018's record-integrity rule". **ADR-0021 and CONTEXT.md "Retired terms"** say ADRs using retired terms are "left untouched as the historical record".
- **CONTEXT.md** cites amendments directly: the Session entry ("ADR-0009's external-sessions amendment") and the Friction entry (SHELL-READ-DETECTION, ADR-0009).
- **`scripts/validate-adr-rules.ts`:**
  - Requires `adr-NNNN.md` for every ADR file except `NO_RULE = {'0007'}`.
  - Any ADR edit changes its hash and fails the gate until the rule is re-stamped with `--write`.
  - Deleted or merged ADRs leave orphan rule files (`ruleAdr()` maps them by filename).
  - So even with summaries out of scope, every rewrite PR must touch `.claude/rules/`.
- **Human-merge paths:** `docs/adr/**` and `.claude/rules/**` are both listed, so each PR needs a human merge unless it runs as a Prune Trial (`merge-pr.ts --prune-trial` needs a ledger entry).
- **ADR-0003 ledger:**
  - The audit-docs row says "an ADR amendment … is out of scope".
  - The prune-trial row allows ADR rewrites "as long as an ADR rewrite keeps what it decided".
  - Moving the ledger (B1) also changes what pr-workflow.md's "Per-tier merge authority" points to.
- **Rule pointers:** every summary ends with "read the full ADR first: docs/adr/<file>". Merging or renaming files makes these dangle. The validator checks that docs exist only for non-ADR rules, not ADR rules.
- **CLAUDE.md:** the "grep -l <path-or-term> docs/adr/*" step is unaffected. ADR-0029's last bullet and issue #1745 are an alternative plan (frontmatter in ADRs, symlinked rules) that would reshape this again; decide whether the rewrite targets that end state.
- **ADR-FORMAT.md is a pack file** (Pack-generic in audit-docs). Repo-specific ADR conventions can't be written into it.
