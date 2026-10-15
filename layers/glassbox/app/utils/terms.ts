import type { ComputedRef, InjectionKey } from 'vue'
import type { MinimarkNode } from '@nuxt/content'
import { glassboxTermId } from '../../page-refs.ts'

export interface GlassboxTerm {
  term: string
  definition: string
  source?: string
}

/** The page's terms by entry id. */
export const glassboxTermsKey: InjectionKey<ComputedRef<Record<string, GlassboxTerm>>> = Symbol('glassbox-terms')

/** The entry id of every `:term` in a page's parsed body, once each, so the
 *  payload carries only the terms the page uses (ADR-0028). */
export function glassboxPageTerms(body: { value?: MinimarkNode[] } | undefined): string[] {
  const ids = new Set<string>()
  const walk = (nodes: MinimarkNode[]) => {
    for (const node of nodes) {
      if (typeof node === 'string') continue
      const [tag, props, ...children] = node
      if (tag === 'term') {
        const text = children.filter((c) => typeof c === 'string').join('')
        ids.add(glassboxTermId(text, typeof props.id === 'string' ? props.id : undefined))
      }
      else walk(children)
    }
  }
  walk(body?.value ?? [])
  return [...ids]
}
