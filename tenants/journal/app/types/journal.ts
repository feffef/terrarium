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
  title?: string
  description?: string
  badge?: string
}
