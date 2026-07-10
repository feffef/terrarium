<script setup lang="ts">
// `::sighting{date="YYYY-MM-DD"}` (#283) — a pull-quote citing the field log
// by date. An empty body renders the referenced observation's own note,
// looked up through the Almanac's `findSighting` (single-homed: the ledger
// line is never retyped here); an authored body overrides the note while
// keeping the validated date-link. Registers its day as a distinguished tick
// on the dial — in setup, per the Almanac contract, so the mark appears
// reactively post-hydration and never in SSR HTML — and deregisters on
// unmount. The quote flares while the needle sits on its day. The quote text
// itself is content and server-renders; only the flare is JS enhancement.
//
// Resolution: `components/content/` + pascal-cased tag (`::sighting` →
// Sighting), same mechanism as Season.vue — render-time only.
import { Comment, Fragment, Text, type VNode } from 'vue'

const props = defineProps<{ date?: string }>()

const almanac = useAlmanac()
const uid = useId()

/** The date as a Glass-Year day, or null when unparseable (dateToDay throws
 *  on a malformed string — a bad date must not take the essay down). */
const sightingDay = computed<number | null>(() => {
  if (!props.date) return null
  try {
    return dateToDay(props.date)
  } catch {
    return null
  }
})

/** The ledger's entry for this date — the specimen's own when it has one. */
const obs = computed(() => (props.date && almanac ? almanac.findSighting(props.date) : undefined))

if (import.meta.dev) {
  if (!props.date || sightingDay.value === null) {
    console.warn(
      `[atlas] ::sighting{date="${props.date ?? ''}"} is not a real 'YYYY-MM-DD' date; `
      + `the ledger cannot be searched for it.`,
    )
  } else if (almanac && !obs.value) {
    console.warn(
      `[atlas] ::sighting{date="${props.date}"} matches no observation in this biome's `
      + `field log; the ledger has no entry to quote.`,
    )
  }
}

/** '2026-06-20' → '20 June 2026' — the attribution's spoken form. */
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const prettyDate = computed(() => {
  const m = props.date ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(props.date) : null
  if (!m || sightingDay.value === null) return props.date ?? ''
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`
})

// The dial's distinguished tick — registered in setup (idempotent by id),
// removed on unmount, exactly as the contract in composables/almanac.ts asks.
if (almanac && sightingDay.value !== null) {
  almanac.register({
    id: uid,
    day: sightingDay.value,
    kind: 'sighting',
    label: `sighted ${prettyDate.value}${obs.value?.time ? `, at ${obs.value.time}` : ''}`,
  })
  onUnmounted(() => almanac.unregister(uid))
}

/** Flare while the needle sits on this sighting's day. */
const hot = computed(() =>
  Boolean(almanac && sightingDay.value !== null && almanac.day.value === sightingDay.value),
)

// An authored body overrides the ledger note. MDC hands an empty `::sighting`
// either no default slot or one of empty/whitespace nodes — treat both as
// empty, recursing through fragments and empty elements.
const slots = useSlots()
function vnodesHaveContent(nodes: VNode[]): boolean {
  return nodes.some((n) => {
    if (n.type === Comment) return false
    if (n.type === Text) return typeof n.children === 'string' && n.children.trim().length > 0
    if (n.type === Fragment || typeof n.type === 'string') {
      if (Array.isArray(n.children)) return vnodesHaveContent(n.children as VNode[])
      return typeof n.children === 'string' && n.children.trim().length > 0
    }
    return true // a component vnode counts as content
  })
}
const hasBody = computed(() => vnodesHaveContent(slots.default?.() ?? []))
</script>

<template>
  <figure class="atlas-sighting" :class="{ 'is-hot': hot }">
    <blockquote class="s-quote">
      <template v-if="hasBody"><slot /></template>
      <p v-else-if="obs?.note">{{ obs.note }}</p>
      <p v-else class="s-wanting">
        The ledger has nothing under this date, and we are not prepared to put
        words in its mouth.
      </p>
    </blockquote>
    <figcaption class="s-cite">
      <svg class="s-rosette" viewBox="-6 -6 12 12" aria-hidden="true">
        <path d="M 0 -4.5 L 3.2 0 L 0 4.5 L -3.2 0 Z" />
      </svg>
      <span class="s-source">the ledger</span>
      <span v-if="prettyDate" class="s-date">{{ prettyDate }}</span>
      <span v-if="obs?.time" class="s-tod">at {{ obs.time }}</span>
    </figcaption>
  </figure>
</template>
