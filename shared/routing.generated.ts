// ⚠️  GENERATED FILE — DO NOT EDIT.
// Produced by scripts/generate.ts from tenants/*/tenant.config.ts (ADR-0002).
// Edit a Tenant's manifest and run `pnpm gen`. CI drift-checks this file.

// Runtime routing map: Tenant → Space → Collection → generated collection key.
export const routingMap = {
  "status": {
    "current": {
      "pages": "status_current_pages",
      "skills": "status_current_skills"
    },
    "archived": {
      "pages": "status_archived_pages",
      "skills": "status_archived_skills"
    }
  }
} as const

export type TenantName = keyof typeof routingMap

// Every (Tenant, Space) that owns a page collection — the L2 smoke-render targets (ADR-0004).
export const entryRoutes: string[] = [
  "/t/status/archived",
  "/t/status/current"
]
