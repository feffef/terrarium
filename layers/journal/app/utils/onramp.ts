// The newcomer on-ramp: pages that opt in with `onramp` frontmatter (the `pages`
// schema in tenant.config.ts), in reading order. Shared by the Space landing's
// "New here?" cards and each on-ramp page's "Read next" tour footer.
export interface OnrampPage {
  path?: string
  onramp?: number
  onrampLabel?: string
  onrampBlurb?: string
}

export interface OnrampStep {
  path: string
  label: string
  blurb?: string
}

// Cards ahead of the Space's own pages. The Glass Box guide is another Tenant's
// page, so it can't opt in through frontmatter: it is a plain link, no
// cross-Tenant read (ADR-0025). Both the landing's cards and the tour footer
// count it, so their "N of M" agree.
export const ONRAMP_LEADING = [
  {
    title: 'How Terrarium works',
    blurb:
      'Start with how Terrarium works, the overview that opens the Glass Box guide: a textbook of the concepts Terrarium is built on, with Terrarium as the worked example.',
    to: '/t/glassbox/guide',
  },
]

export function onrampSteps(pages: readonly OnrampPage[]): OnrampStep[] {
  return pages
    .filter((p) => p.onramp != null && p.onrampLabel && p.path)
    .sort((a, b) => (a.onramp ?? 0) - (b.onramp ?? 0))
    .map((p) => ({ path: p.path as string, label: p.onrampLabel as string, blurb: p.onrampBlurb }))
}
