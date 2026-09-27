// Authored SVG reaches the page through v-html, so markup that could run script
// never gets past validation. One home for the content schemas and verify:mermaid.
import { z } from 'zod'

const HAZARDS: [RegExp, string][] = [
  [/<\s*(?:script|iframe|embed|object)\b/i, 'embeds a script or frame'],
  [/[\s/"']on[a-z]+\s*=/i, 'sets an event handler'],
  [/\b(?:javascript|vbscript|data)\s*:/i, 'uses a script or data URL'],
  [/(?:^|[\s/"'])(?:xlink:)?href\s*=\s*(?!["']?#)/i, 'links outside the document'],
  [/<\s*(?:animate|set)\b[^>]*attributeName\s*=\s*["']?(?:xlink:)?href/i, 'animates a link'],
]

/** Why `markup` is unsafe to inject, or undefined. `html` admits
 *  `<foreignObject>`, which mermaid's labels need (ADR-0024). */
export function svgHazard(markup: string, { html = false } = {}): string | undefined {
  if (!html && /<\s*foreignObject\b/i.test(markup)) return 'embeds HTML via foreignObject'
  return HAZARDS.find(([pattern]) => pattern.test(markup))?.[1]
}

export function flagSvgHazard(markup: string, ctx: z.RefinementCtx): void {
  const hazard = svgHazard(markup)
  if (hazard) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `unsafe SVG: ${hazard}` })
}

export const safeSvg = z.string().superRefine(flagSvgHazard)
