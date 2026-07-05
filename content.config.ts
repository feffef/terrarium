// ⚠️  GENERATED FILE — DO NOT EDIT.
// Produced by scripts/generate.ts from tenants/*/tenant.config.ts (ADR-0002).
// Edit a Tenant's manifest and run `pnpm gen`. CI drift-checks this file.

import { defineCollection, defineContentConfig } from '@nuxt/content'
import { fileURLToPath } from 'node:url'
import blogManifest from './tenants/blog/tenant.config'
import journalManifest from './tenants/journal/tenant.config'

// Absolute path to a (Tenant, Space, Collection) content dir, resolved from this file.
const dir = (p: string) => fileURLToPath(new URL('./' + p, import.meta.url))

export default defineContentConfig({
  collections: {
    blog_david_pages: defineCollection({
      type: 'page',
      source: { cwd: dir('tenants/blog/content/david/pages'), include: '**/*.md', prefix: '/' },
      schema: blogManifest.collections.pages.schema,
    }),
    blog_david_pingbacks: defineCollection({
      type: 'data',
      source: { cwd: dir('tenants/blog/content/david/pingbacks'), include: '**/*.yml' },
      schema: blogManifest.collections.pingbacks.schema,
    }),
    blog_karen_pages: defineCollection({
      type: 'page',
      source: { cwd: dir('tenants/blog/content/karen/pages'), include: '**/*.md', prefix: '/' },
      schema: blogManifest.collections.pages.schema,
    }),
    blog_karen_pingbacks: defineCollection({
      type: 'data',
      source: { cwd: dir('tenants/blog/content/karen/pingbacks'), include: '**/*.yml' },
      schema: blogManifest.collections.pingbacks.schema,
    }),
    blog_kevin_pages: defineCollection({
      type: 'page',
      source: { cwd: dir('tenants/blog/content/kevin/pages'), include: '**/*.md', prefix: '/' },
      schema: blogManifest.collections.pages.schema,
    }),
    blog_kevin_pingbacks: defineCollection({
      type: 'data',
      source: { cwd: dir('tenants/blog/content/kevin/pingbacks'), include: '**/*.yml' },
      schema: blogManifest.collections.pingbacks.schema,
    }),
    journal_current_pages: defineCollection({
      type: 'page',
      source: { cwd: dir('tenants/journal/content/current/pages'), include: '**/*.md', prefix: '/' },
      schema: journalManifest.collections.pages.schema,
    }),
    journal_current_skills: defineCollection({
      type: 'data',
      source: { cwd: dir('tenants/journal/content/current/skills'), include: '**/*.yml' },
      schema: journalManifest.collections.skills.schema,
    }),
    journal_current_sessions: defineCollection({
      type: 'data',
      source: { cwd: dir('tenants/journal/content/current/sessions'), include: '**/*.yml' },
      schema: journalManifest.collections.sessions.schema,
    }),
    journal_archived_pages: defineCollection({
      type: 'page',
      source: { cwd: dir('tenants/journal/content/archived/pages'), include: '**/*.md', prefix: '/' },
      schema: journalManifest.collections.pages.schema,
    }),
    journal_archived_skills: defineCollection({
      type: 'data',
      source: { cwd: dir('tenants/journal/content/archived/skills'), include: '**/*.yml' },
      schema: journalManifest.collections.skills.schema,
    }),
    journal_archived_sessions: defineCollection({
      type: 'data',
      source: { cwd: dir('tenants/journal/content/archived/sessions'), include: '**/*.yml' },
      schema: journalManifest.collections.sessions.schema,
    }),
  },
})
