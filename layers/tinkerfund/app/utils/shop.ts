export function tinkerfundPath(space: string, path = ''): string {
  return `/t/tinkerfund/${space}${path}`
}

// The launch categories (issue #1368), until the `categories` data collection
// (story #1377) becomes their home.
export const TINKERFUND_CATEGORIES = [
  { slug: 'kitchen', name: 'Kitchen' },
  { slug: 'desk', name: 'Desk' },
  { slug: 'outdoors', name: 'Outdoors' },
] as const
