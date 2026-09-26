// Manifest for the Tinkerfund Tenant (layers/tinkerfund/CONTEXT.md).
// `prod` holds realistic simulated content; `qa` holds edge-case test data
// that Tinkerfund's e2e tests run against (issue #1375). No `kind`: Tinkerfund
// stays out of the Commons' Catalog. The content model is issue #1366;
// cross-Document references are checked in scripts/validate-content-refs.ts.
// Every Collection's schema lives in schemas.ts.
import { defineTenant } from '../../shared/manifest'
import { backer, category, commentThread, inventor, page, promotion, shop, updateLog } from './schemas'

export default defineTenant({
  name: 'tinkerfund',
  spaces: ['prod', 'qa'],
  collections: {
    pages: { type: 'page', source: '**/*.md', schema: page },
    inventors: { type: 'data', source: '*.yml', schema: inventor },
    categories: { type: 'data', source: '*.yml', schema: category },
    comments: { type: 'data', source: '*.yml', schema: commentThread },
    updates: { type: 'data', source: '*.yml', schema: updateLog },
    promotions: { type: 'data', source: '*.yml', schema: promotion },
    backer: { type: 'data', source: '*.yml', schema: backer },
    shop: { type: 'data', source: '*.yml', schema: shop },
  },
})
