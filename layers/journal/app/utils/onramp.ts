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

export function onrampSteps(pages: readonly OnrampPage[]): OnrampStep[] {
  return pages
    .filter((p) => p.onramp != null && p.onrampLabel && p.path)
    .sort((a, b) => (a.onramp ?? 0) - (b.onramp ?? 0))
    .map((p) => ({ path: p.path as string, label: p.onrampLabel as string, blurb: p.onrampBlurb }))
}
