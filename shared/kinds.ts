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
import type { ZodObject, ZodRawShape } from 'zod'
// Type-only import (erased at runtime) so there is no runtime import cycle with
// `manifest.ts`, which imports the KINDS runtime value from here.
import type { CollectionType } from './manifest'
import { sessionSchema } from './schemas/session'

/**
 * One collection kind: the Nuxt Content collection `type` it applies to, plus —
 * for a `data` kind — the shared Zod schema every conforming collection uses.
 *
 * A `page` kind carries NO schema: a routed `page` collection's cross-Tenant
 * contract is the built-in page fields (`title`/`description`/`path`/`body`)
 * `@nuxt/content` injects for every page, so the kind is a pure catalog-exposure
 * marker. This mirrors `CollectionDef`'s own page/data split (page schema
 * optional, data schema required — shared/manifest.ts).
 */
export interface KindDef {
  type: CollectionType
  /** Required for a `data` kind (its shared shape); absent for a `page` kind. */
  schema?: ZodObject<ZodRawShape>
}

/**
 * The kind registry — the single home for every shared cross-Tenant contract.
 *
 * `page` is the first kind: the routed-page contract the Search aggregator reads.
 * A future `data` kind (e.g. a shared `session` shape several Tenants adopt) is
 * one entry here carrying a `schema`; every collection that then references it
 * becomes catalog-visible for free, with no change to `expand()` or the catalog
 * module.
 */
export const KINDS = {
  page: { type: 'page' },
  // The first schema-bearing (data) kind: one session-log shape, single-homed in
  // shared/schemas/session.ts (ADR-0009/0025). The Journal's `sessions` collection
  // references it; the Commons Timeline reads it. A second Tenant adopting
  // `kind: 'session'` gets the same shape for free — zero re-declaration.
  session: { type: 'data', schema: sessionSchema },
} satisfies Record<string, KindDef>

export type KindName = keyof typeof KINDS

/**
 * Resolve a kind name to its definition, or throw. `registry` is injectable for
 * the L3 unit tests (mirroring `resolveSpaceRoute`'s injectable `map`), so the
 * data-kind resolution path can be exercised without minting a real, permanent
 * platform-wide contract in `KINDS`.
 */
export function resolveKind(kind: string, registry: Record<string, KindDef> = KINDS): KindDef {
  if (!Object.hasOwn(registry, kind)) {
    throw new Error(`unknown collection kind "${kind}" — add it to KINDS in shared/kinds.ts`)
  }
  return registry[kind]!
}
