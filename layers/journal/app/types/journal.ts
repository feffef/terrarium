import type { z } from 'zod'
import type { sessionSchema } from '../../../../shared/schemas/session'
import type { skillSchema } from '../../tenant.config'

// `z.input`, not `z.infer`: the schemas' `.default([])` fields are optional on the
// generated content type, which only the input type matches.
export type SessionDoc = z.input<typeof sessionSchema>
export type SkillDoc = z.input<typeof skillSchema>
export type Friction = SessionDoc['frictions'][number]
export type Severity = Friction['severity']
export type Status = SessionDoc['status']
export type Subagent = NonNullable<SessionDoc['subagents']>[number]
export type Importance = SkillDoc['importance']

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
  // Model(s) that drove the session, formatted short (e.g. `opus-4-8`), busiest
  // first — an always-visible summary chip. Empty for older, authored-only logs.
  model: string
  // Normalized from SessionDoc's optional `external` (ADR-0009 amendment) —
  // absent/false ⇒ our own Claude Code harness. Drives the card's "external"
  // marking; never affects which sessions are included, only how one renders.
  external: boolean
  // The session's Claude Code web-UI page; null for an external harness's log,
  // which has no such page.
  url: string | null
  // Expanded detail:
  sid: string
  summary: string
  subagents: Subagent[]
  docsRead: { path: string; reason: string }[]
  skillsUsed: { name: string; reason: string }[]
  frictions: Friction[]
  // Authored note fields — normalized to arrays (empty ⇒ the card hides them).
  learnings: string[]
  ideas: string[]
  // Mechanical trace, tucked behind in-card disclosures so the verbose lists
  // inform without cluttering. All may be empty (older logs, or a session that
  // edited nothing / spawned no subagent).
  filesEdited: string[]
  docsReadViaShell: string[]
  tools: { name: string; count: number }[]
}

// ── Ideas & learnings (issue #440) ───────────────────────
// One authored idea or learning, flattened out of its SessionDoc with the
// provenance needed to link back to that session's card.
export interface NoteItem {
  note: string
  kind: 'idea' | 'learning'
  session: string
  date: string
  anchor: string
}
