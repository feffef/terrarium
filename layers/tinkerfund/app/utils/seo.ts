// Titles, descriptions and social meta for every Tinkerfund page type, decided
// once here (story #1376) and spread into useSeoMeta() by each page. There is
// no og:image: Tinkerfund's media is inline SVG, which link previews ignore.

export type TinkerfundPageKind = 'home' | 'campaign' | 'update' | 'listing' | 'page' | 'private' | 'not-found'

export interface TinkerfundSeoInput {
  kind: TinkerfundPageKind
  space: string
  title?: string
  description?: string
}

const SITE_DESCRIPTION = 'Back independent inventors and their inventions before they reach anyone else.'

export function tinkerfundSeo({ kind, space, title, description }: TinkerfundSeoInput) {
  // qa is edge-case test data: branded so its tabs are obvious, never indexed.
  const brand = space === 'prod' ? 'Tinkerfund' : `Tinkerfund ${space.toUpperCase()}`
  const name = title ?? (kind === 'not-found' ? 'Page not found' : brand)
  const heading = kind === 'home' ? `${brand} — ${name}` : name
  const fullTitle = kind === 'home' ? heading : `${heading} · ${brand}`
  const indexable = space === 'prod' && kind !== 'private' && kind !== 'not-found'
  const text = description ?? SITE_DESCRIPTION
  return {
    title: fullTitle,
    description: text,
    ogTitle: heading,
    ogDescription: text,
    ogSiteName: 'Tinkerfund',
    ogType: kind === 'update' ? ('article' as const) : ('website' as const),
    twitterCard: 'summary' as const,
    robots: indexable ? 'index, follow' : 'noindex, nofollow',
  }
}
