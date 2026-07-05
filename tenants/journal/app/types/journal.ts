// Content-shape types for the journal Tenant's UI layer, mirroring the manifest's
// `sessions` and `skills` collection schemas (tenants/journal/tenant.config.ts).
// Kept in one place so the layer's page and components can't drift on them.
export type Severity = 'nit' | 'minor' | 'moderate' | 'major' | 'blocker'
export type Importance = 'core' | 'supporting' | 'peripheral'
export type Status = 'completed' | 'partial' | 'blocked' | 'abandoned'

export interface Friction {
  description: string
  solution: string
  severity: Severity
}

export interface SessionDoc {
  session: string
  startedAt: string
  endedAt: string
  kind: 'interactive' | 'autonomous'
  goal: string
  status: Status
  outcome: string
  summary: string
  prs: string[]
  docsRead: { path: string; reason: string }[]
  skillsUsed: { name: string; reason: string }[]
  frictions: Friction[]
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
  // Expanded detail:
  summary: string
  docsRead: { path: string; reason: string }[]
  skillsUsed: { name: string; reason: string }[]
  frictions: Friction[]
}
