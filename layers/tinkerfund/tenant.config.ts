// Manifest for the Tinkerfund Tenant (layers/tinkerfund/CONTEXT.md).
// `prod` holds realistic simulated content; `qa` holds edge-case test data
// that Tinkerfund's e2e tests run against (issue #1375). No `kind`: Tinkerfund
// stays out of the Commons' Catalog.
import { defineTenant } from '../../shared/manifest'

export default defineTenant({
  name: 'tinkerfund',
  spaces: ['prod', 'qa'],
  collections: {
    pages: { type: 'page', source: '**/*.md' },
  },
})
