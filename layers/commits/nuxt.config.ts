// The Commits Tenant's Nuxt layer (CONTEXT.md: "a Tenant is implemented as a Nuxt
// layer"). Nuxt auto-extends every `layers/*` (ADR-0018); this file is what makes
// this directory a valid layer to extend. The Tenant is intentionally minimal —
// one MDC component (its only view), one server endpoint (the runtime git read),
// and no theme of its own — so there is nothing to configure here.
export default defineNuxtConfig({})
