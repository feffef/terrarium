// Collection *kinds* — the cross-Tenant read contracts (ADR-0025, issue #642).
// A kind is a NAMED, shared shape that a manifest collection may assert
// conformance to, so an aggregator (a platform view like the Commons Tenant) can
// read that collection across every Tenant that opts in — WITHOUT re-declaring
// each schema (drift) or importing another Tenant's manifest internals
// (coupling). `#routing` was the first cross-Tenant derivation; the `#catalog`
// this feeds is the second (rule of two), so the concept earns a name.
//
// Opt-in is the whole point: a collection with no `kind` (a bespoke inline
// schema) is invisible to `#catalog` and to `queryAcrossTenants`. Isolation
// stays the default; cross-Tenant exposure is an explicit, per-collection
// declaration. This file — like `content.config.ts` / `shared/expand.ts` /
// `modules/*` — is ADR-0004 human-only-to-merge: a kind is a versioned contract
// that multiple Tenants and aggregators depend on, so widening or removing one
// is a breaking-change surface.
import { z, type ZodObject, type ZodRawShape } from 'zod'
// Type-only import (erased at runtime) so there is no runtime import cycle with
// `manifest.ts`, which imports the KINDS runtime value from here.
import type { CollectionType } from './manifest'
import { sessionSchema } from './schemas/session'
import { utcTimestamp } from './schemas/timestamp'

/**
 * One collection kind: the Nuxt Content collection `type` it applies to, plus
 * its **contract** — the *minimum* shared Zod shape every conforming collection
 * carries (ADR-0025). A collection's effective schema is the contract merged
 * with the collection's own local `schema` (shared/expand.ts), so a kind states
 * the cross-Tenant floor while each Tenant keeps declaring its private fields.
 * A contract may cover anything from a few optional cross-cutting fields
 * (`page`) to a collection's entire shape (`session`) — that spread is a matter
 * of degree, not two different mechanisms.
 */
export interface KindDef {
  type: CollectionType
  contract: ZodObject<ZodRawShape>
}

/**
 * The kind registry — the single home for every shared cross-Tenant shape.
 *
 * `page` is the routed-page contract aggregators read. The built-in page fields
 * (`title`/`description`/`path`/`body`) come from `@nuxt/content` itself, so the
 * contract adds only the cross-cutting *metadata* an aggregator depends on —
 * OPTIONAL, because a `pages` collection is heterogeneous (a Space's index
 * landing carries no publish date; only dated posts do). The win is that the
 * field name + type is single-homed here instead of re-declared per Tenant.
 *
 * A future shared kind is one entry here; every collection that then references
 * it becomes catalog-visible for free, with no change to `expand()` or the
 * catalog module.
 */
export const KINDS = {
  page: {
    type: 'page',
    contract: z.object({
      /** Publish instant — what the Commons Timeline orders dated pages by. */
      publishedAt: utcTimestamp.optional(),
      /** One-line headline (e.g. a Journal digest's day-summary) an aggregator
       *  prefers over the title. */
      summary: z.string().optional(),
    }),
  },
  // The first whole-shape contract: one session-log schema, single-homed in
  // shared/schemas/session.ts (ADR-0009/0025). The Journal's `sessions` collection
  // references it; the Commons Timeline reads it. A second Tenant adopting
  // `kind: 'session'` gets the same shape for free — zero re-declaration.
  session: { type: 'data', contract: sessionSchema },
} satisfies Record<string, KindDef>

export type KindName = keyof typeof KINDS

/**
 * Resolve a kind name to its definition, or throw. `registry` is injectable for
 * the L3 unit tests (mirroring `resolveSpaceRoute`'s injectable `map`), so the
 * resolution path can be exercised without minting a real, permanent
 * platform-wide contract in `KINDS`.
 */
export function resolveKind(kind: string, registry: Record<string, KindDef> = KINDS): KindDef {
  if (!Object.hasOwn(registry, kind)) {
    throw new Error(`unknown collection kind "${kind}" — add it to KINDS in shared/kinds.ts`)
  }
  return registry[kind]!
}
