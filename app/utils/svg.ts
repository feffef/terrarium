// Authored SVG reaches the page through v-html, so markup that could run script
// or fetch off-site never gets past validation. One home for the content schemas
// and verify:mermaid. Lives in app/utils (so Nuxt auto-imports it) only because
// the Nitro server bundle can't resolve a shared/ import from layer schemas.
import { z } from 'zod'

// Static drawing elements only: anything that links, animates, styles the page,
// or escapes the svg context is simply not on the list.
const ELEMENTS = new Set(
  ('svg g defs path text tspan circle ellipse rect line polyline polygon marker use title desc '
    + 'lineargradient radialgradient stop clippath mask filter fegaussianblur feturbulence '
    + 'fedisplacementmap fecomposite fecolormatrix fedropshadow').split(' '),
)
// Mermaid's labels and theme need these (ADR-0024).
const HTML_ELEMENTS = new Set(['foreignobject', 'div', 'span', 'p', 'br', 'style'])

const HAZARDS: [RegExp, string][] = [
  // Browsers decode entities before acting on a value, so only the five that
  // can't spell a keyword pass; write any other character literally.
  [/&(?!(?:amp|lt|gt|quot|apos);)/i, 'uses a character reference'],
  [/\\/, 'uses an escape'],
  [/[\s/"']on[a-z]+\s*=/i, 'sets an event handler'],
  [/(?:^|[\s/"'])(?:xlink:)?href\s*=(?!\s*["']?#)/i, 'links outside the document'],
  [/url\((?!\s*["']?#)|@import/i, 'loads an external resource'],
]

/** Why `markup` is unsafe to inject, or undefined. `html` admits mermaid's extra elements. */
export function svgHazard(markup: string, { html = false } = {}): string | undefined {
  for (const [, name] of markup.matchAll(/<([a-z][^\s/>]*)/gi)) {
    const tag = name!.toLowerCase()
    if (!ELEMENTS.has(tag) && !(html && HTML_ELEMENTS.has(tag))) return `uses <${name}>`
  }
  return HAZARDS.find(([pattern]) => pattern.test(markup))?.[1]
}

export function flagSvgHazard(markup: string, ctx: z.RefinementCtx): void {
  const hazard = svgHazard(markup)
  if (hazard) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `unsafe SVG: ${hazard}` })
}

export const safeSvg = z.string().superRefine(flagSvgHazard)
