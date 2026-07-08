// Content-shape types for the journal Tenant's UI layer, mirroring the manifest's
// `sessions` and `skills` collection schemas (layers/journal/tenant.config.ts).
// Kept in one place so the layer's page and components can't drift on them.
//
// Deliberately NOT aliases of `@nuxt/content`'s generated `Collections[...]`
// item types: `dashboard.ts`'s own header comment (and the layer's
// tests/unit/journal-dashboard.spec.ts) call out that this module is pure and unit-tested outside
// the Nuxt app, via `tsc -p tsconfig.node.json` / vitest — neither program
// includes `.nuxt/content/types.d.ts`, so `Collections` resolves with no
// journal keys there and any alias built from it collapses to `never`. Instead
// these stay hand-maintained, but shaped to match the *generated* item type
// field-for-field (down to which fields are optional, per each Collection's
// `.default(...)` in the manifest) — so a plain, uncast assignment from
// `queryCollection(...)`'s real result in `[space]/index.vue` either
// typechecks (shapes agree) or fails loudly (issue #94), with no `as unknown
// as` escape hatch erasing the check either way.
export type Severity = 'nit' | 'minor' | 'moderate' | 'major' | 'blocker'
export type Importance = 'essential' | 'specialist' | 'supporting' | 'peripheral'
export type Status = 'completed' | 'in-review' | 'partial' | 'blocked' | 'abandoned'

export interface Friction {
  description: string
  solution: string
  severity: Severity
}

export interface SessionDoc {
  session: string
  startedAt: string
  endedAt: string
  kind: 'interactive' | 'delegated' | 'autonomous'
  goal: string
  status: Status
  outcome: string
  summary: string
  // Optional: the manifest's `z.array(...).default([])` (tenant.config.ts)
  // makes these optional on the generated collection item type — always
  // populated by the time content is queried, but not guaranteed by the type,
  // so readers must fall back (`?? []`) rather than assume.
  prs?: string[]
  // Merged reads/skills (ADR-0009 amendment): the agent's curated entries plus
  // transcript-observed ones the SessionEnd extractor folds in with a derived
  // placeholder reason — `(read before editing)` for a docsRead path also
  // edited, `(no reason given)` otherwise. Shape unchanged from the authored-only era.
  docsRead?: { path: string; reason: string }[]
  skillsUsed?: { name: string; reason: string }[]
  // Mechanical trace — derived from the transcript (ADR-0009 amendment), never
  // self-reported. All optional: absent ⇒ an older, authored-only log.
  durationSec?: number
  models?: Record<string, number>
  toolCounts?: Record<string, number>
  filesEdited?: string[]
  subagents?: Subagent[]
  gitBranch?: string
  entrypoint?: string
  cliVersion?: string
  // Required: no `.default()` on `frictions` — the manifest forces every
  // session log to state its frictions explicitly (may be `[]`, not omitted).
  frictions: Friction[]
  // Optional authored spark fields (tenant.config.ts): knowledge the session
  // inferred (`learnings`) and rough future-work ideas (`ideas`). Absent unless
  // the session actually noted one — never padded to `[]`.
  learnings?: string[]
  ideas?: string[]
}

export interface Subagent {
  type?: string
  task?: string
  model?: string
}

export interface SkillDoc {
  name: string
  category: 'platform-operation' | 'general-engineering'
  importance: Importance
  role: string
}

export interface PageDoc {
  path?: string
  title?: string
  description?: string
  badge?: string
  summary?: string
  // Dashboard on-ramp opt-in (mirrors the `pages` schema): a page becomes a
  // "New here?" card by setting `onramp` to its sort order, with `onrampLabel`/
  // `onrampBlurb` as the card's teaser copy. Optional — ordinary pages omit them.
  onramp?: number
  onrampLabel?: string
  onrampBlurb?: string
}

// A session prepared for display in the recent-activity feed — the page derives
// this from a SessionDoc (formats dates, counts frictions) so the card component
// stays a dumb renderer. The `collapsed` fields drive the summary row; the rest
// fill the expand-on-click detail (the full log, which has no route of its own
// since sessions are a `data` collection).
export interface SessionCardView {
  when: string
  duration: number
  goal: string
  status: Status
  outcome: string
  prs: string[]
  frictionCounts: Record<Severity, number>
  frictionTotal: number
  skills: string[]
  sid: string
  // Model(s) that drove the session, formatted short (e.g. `opus-4-8`), busiest
  // first — an always-visible summary chip. Empty for older, authored-only logs.
  model: string
  // Expanded detail:
  summary: string
  subagents: Subagent[]
  docsRead: { path: string; reason: string }[]
  skillsUsed: { name: string; reason: string }[]
  frictions: Friction[]
  // Authored spark fields — normalized to arrays (empty ⇒ the card hides them).
  learnings: string[]
  ideas: string[]
  // Mechanical trace, tucked behind in-card disclosures so the verbose lists
  // inform without cluttering. All may be empty (older logs, or a session that
  // edited nothing / spawned no subagent).
  filesEdited: string[]
  tools: { name: string; count: number }[]
}
