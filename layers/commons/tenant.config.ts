// Manifest for the Commons Tenant — the Platform's shared, cross-Tenant space:
// the home for **Aggregator** views that read across every Tenant (ADR-0025,
// issue #642). The name is on-metaphor (a building's commons) and ages past its
// current two views: **Search** (one box over every opted-in page) and
// **Timeline** (every timestamped piece of content, newest first). A future
// cross-Tenant view — an activity feed, a tag index, a directory — is another
// Space here, not another Tenant.
//
// Declarative intent only; `content.config.ts` builds the keyed collections at
// config-evaluation time (ADR-0002/0013).
import { defineTenant } from '../../shared/manifest'

export default defineTenant({
  name: 'commons',
  // One Space per cross-Tenant view. Each Space's `pages/index.md` is its landing;
  // the layer's `[space]/index.vue` renders the right view for the Space.
  spaces: ['search', 'timeline'],
  collections: {
    // Each view's OWN landing page. Deliberately NOT `kind: 'page'`: an aggregator
    // must not index or timeline itself, and the absence of a `kind` is exactly
    // what keeps it out of `#catalog`. The isolation default, made concrete — a
    // collection is invisible to every aggregator unless it opts in (ADR-0025).
    pages: { type: 'page', source: '**/*.md' },
  },
})
