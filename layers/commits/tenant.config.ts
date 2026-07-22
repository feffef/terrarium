// Manifest for the Commits Tenant — a deliberately tiny *technical* proof-of-
// concept (CONTEXT.md Tenants roster: Commits; layers/commits/CONTEXT.md).
// Unlike the demo/content Tenants, it authors almost no content: its one page is
// a shell whose interesting value — the repo's latest commit — is read from the
// live git repo at *runtime* via a backend endpoint (layers/commits/server/api),
// deliberately outside ADR-0001's build-time-baked model. See the Tenant's
// CONTEXT.md for why that exception is scoped to this PoC and nothing else.
//
// Declarative intent only; `content.config.ts` builds the keyed collection from
// this manifest and the routing map is derived at build time (ADR-0013/0014).
import { defineTenant } from '../../shared/manifest'

export default defineTenant({
  name: 'commits',
  // One Space — a plain `poc` label; this Tenant has no lifecycle/voice/place
  // distinction to model, it just needs a home for its single landing page.
  spaces: ['poc'],
  collections: {
    // The routed landing (`/t/commits/poc`). The `page` type supplies
    // path/title/description/body/seo, and the page's own body embeds the
    // `::latest-commit` MDC component that does the runtime fetch — so no
    // authored frontmatter schema is needed here.
    pages: {
      type: 'page',
      kind: 'page', // opt into the cross-Tenant #catalog (ADR-0025)
      source: '**/*.md',
    },
  },
})
