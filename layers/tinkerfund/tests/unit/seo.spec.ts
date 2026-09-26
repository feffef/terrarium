// Per-page-type titles, descriptions and social meta (story #1376 decides SEO).
import { describe, expect, it } from 'vitest'
import { tinkerfundSeo } from '../../app/utils/seo.ts'

describe('tinkerfundSeo', () => {
  it('leads the prod Home title with the brand, falls back to the site description, and is indexable', () => {
    expect(tinkerfundSeo({ kind: 'home', space: 'prod', title: 'Back new inventions before anyone else' })).toEqual({
      title: 'Tinkerfund — Back new inventions before anyone else',
      description: 'Back independent inventors and their inventions before they reach anyone else.',
      ogTitle: 'Tinkerfund — Back new inventions before anyone else',
      ogDescription: 'Back independent inventors and their inventions before they reach anyone else.',
      ogSiteName: 'Tinkerfund',
      ogType: 'website',
      twitterCard: 'summary',
      robots: 'index, follow',
    })
  })

  it('suffixes a page title with the brand and keeps its own description', () => {
    const meta = tinkerfundSeo({ kind: 'page', space: 'prod', title: 'How Tinkerfund works', description: 'The short version.' })
    expect(meta.title).toBe('How Tinkerfund works · Tinkerfund')
    expect(meta.ogTitle).toBe('How Tinkerfund works')
    expect(meta.description).toBe('The short version.')
    expect(meta.robots).toBe('index, follow')
  })

  it('falls back to the site description when a page has none', () => {
    expect(tinkerfundSeo({ kind: 'listing', space: 'prod', title: 'Discover' }).description)
      .toBe('Back independent inventors and their inventions before they reach anyone else.')
  })

  it('marks an Update as an article', () => {
    expect(tinkerfundSeo({ kind: 'update', space: 'prod', title: 'We shipped' }).ogType).toBe('article')
    expect(tinkerfundSeo({ kind: 'campaign', space: 'prod', title: 'Mug' }).ogType).toBe('website')
  })

  it('keeps the visitor-only pages and the 404 out of search results', () => {
    expect(tinkerfundSeo({ kind: 'private', space: 'prod', title: 'Cart' }).robots).toBe('noindex, nofollow')
    const notFound = tinkerfundSeo({ kind: 'not-found', space: 'prod' })
    expect(notFound.title).toBe('Page not found · Tinkerfund')
    expect(notFound.robots).toBe('noindex, nofollow')
  })

  it('brands the qa Space as QA and keeps every qa page out of search results', () => {
    const home = tinkerfundSeo({ kind: 'home', space: 'qa', title: 'Component gallery' })
    expect(home.title).toBe('Tinkerfund QA — Component gallery')
    expect(home.robots).toBe('noindex, nofollow')
    expect(tinkerfundSeo({ kind: 'page', space: 'qa', title: 'How Tinkerfund works' }).title)
      .toBe('How Tinkerfund works · Tinkerfund QA')
  })
})
