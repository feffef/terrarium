import type { ComputedRef, InjectionKey, Slots, VNode } from 'vue'

export interface GlassboxTerm {
  definition: string
  source?: string
}

/** The page's terms by entry id, picked by `glassboxPageTerms`. */
export const glassboxTermsKey: InjectionKey<ComputedRef<Record<string, GlassboxTerm>>> = Symbol('glassbox-terms')

/** The text an inline component gets as its slot: `:file[path]`, `:term[Space]`. */
export function glassboxSlotText(slots: Slots) {
  return (slots.default?.() ?? []).map((v: VNode) => (typeof v.children === 'string' ? v.children : '')).join('').trim()
}
