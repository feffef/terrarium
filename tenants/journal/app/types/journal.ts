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
  prs: string[]
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

// A Digest prepared for the Space overview's "Recent digests" list — derived from
// a Digest page Document (path under '/digests/') so the template stays dumb.
export interface DigestView {
  date: string
  summary: string
  path: string
}

// A session prepared for display in the recent-activity feed — the page derives
// this from a SessionDoc (formats dates, counts frictions) so the card component
// stays a dumb renderer.
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
}
