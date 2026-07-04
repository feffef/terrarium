// ⚠️  GENERATED FILE — DO NOT EDIT.
// Produced by scripts/generate.ts from tenants/*/tenant.config.ts (ADR-0002).
// Edit a Tenant's manifest and run `pnpm gen`. CI drift-checks this file.

import { defineCollection, defineContentConfig } from '@nuxt/content'
import { fileURLToPath } from 'node:url'
import statusManifest from './tenants/status/tenant.config'

// Absolute path to a (Tenant, Space, Collection) content dir, resolved from this file.
const dir = (p: string) => fileURLToPath(new URL('./' + p, import.meta.url))

export default defineContentConfig({
  collections: {
    status_current_pages: defineCollection({
      type: 'page',
      source: { cwd: dir('tenants/status/content/current/pages'), include: '**/*.md', prefix: '/' },
      schema: statusManifest.collections.pages.schema,
    }),
    status_current_glossary: defineCollection({
      type: 'data',
      source: { cwd: dir('tenants/status/content/current/glossary'), include: '**/*.yml' },
      schema: statusManifest.collections.glossary.schema,
    }),
    status_archived_pages: defineCollection({
      type: 'page',
      source: { cwd: dir('tenants/status/content/archived/pages'), include: '**/*.md', prefix: '/' },
      schema: statusManifest.collections.pages.schema,
    }),
    status_archived_glossary: defineCollection({
      type: 'data',
      source: { cwd: dir('tenants/status/content/archived/glossary'), include: '**/*.yml' },
      schema: statusManifest.collections.glossary.schema,
    }),
  },
})
