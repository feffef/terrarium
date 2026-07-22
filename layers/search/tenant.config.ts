// Manifest for the Search Tenant — the platform's first *aggregator* (ADR-0025,
// issue #642): a platform view that reads the cross-Tenant `#catalog` rather than
// owning cross-Tenant content. It is the honest answer to what the dollhouse fork
// (#631) reached for — one search box over every Tenant — built on the sanctioned
// read primitive (`queryAcrossTenants`) instead of a static microsite with a
// hardcoded roster and faked data.
//
// Declarative intent only; `content.config.ts` builds the keyed collection at
// config-evaluation time (ADR-0002/0013). One Space (`all`) is enough — there is
// no lifecycle/voice/place distinction here, just the single index over the whole
// Platform.
import { defineTenant } from '../../shared/manifest'

export default defineTenant({
  name: 'search',
  spaces: ['all'],
  collections: {
    // The search view's OWN landing page (`/t/search/all`). Deliberately NOT
    // `kind: 'page'`: an aggregator must not index itself, and the absence of a
    // `kind` is exactly what keeps it out of `#catalog`. This is the isolation
    // default made concrete — a collection is invisible to any aggregator unless
    // it opts in (ADR-0025). No schema: the `page` type injects title/description,
    // and the single index.md landing carries no extra frontmatter.
    pages: { type: 'page', source: '**/*.md' },
  },
})
