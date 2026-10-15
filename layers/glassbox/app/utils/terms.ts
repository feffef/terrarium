import type { ComputedRef, InjectionKey } from 'vue'

export interface GlassboxTerm {
  term: string
  definition: string
  source?: string
}

/** The page's terms by entry id, picked by `glassboxPageTerms`. */
export const glassboxTermsKey: InjectionKey<ComputedRef<Record<string, GlassboxTerm>>> = Symbol('glassbox-terms')
