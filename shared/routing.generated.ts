// ⚠️  GENERATED FILE — DO NOT EDIT.
// Produced by scripts/generate.ts from tenants/*/tenant.config.ts (ADR-0002/0013).
// Edit a Tenant's manifest and run `pnpm gen`. CI drift-checks this file.

// Runtime routing map: Tenant → Space → Collection → generated collection key.
export const routingMap = {
  "blog": {
    "david": {
      "pages": "blog_david_pages",
      "pingbacks": "blog_david_pingbacks"
    },
    "karen": {
      "pages": "blog_karen_pages",
      "pingbacks": "blog_karen_pingbacks"
    },
    "kevin": {
      "pages": "blog_kevin_pages",
      "pingbacks": "blog_kevin_pingbacks"
    }
  },
  "journal": {
    "current": {
      "pages": "journal_current_pages",
      "skills": "journal_current_skills",
      "sessions": "journal_current_sessions"
    },
    "archived": {
      "pages": "journal_archived_pages",
      "skills": "journal_archived_skills",
      "sessions": "journal_archived_sessions"
    }
  }
} as const

export type TenantName = keyof typeof routingMap

// Every (Tenant, Space) that owns a page collection — the L2 smoke-render targets (ADR-0004).
export const entryRoutes: string[] = [
  "/t/blog/david",
  "/t/blog/karen",
  "/t/blog/kevin",
  "/t/journal/archived",
  "/t/journal/current"
]
