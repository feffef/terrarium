<script setup lang="ts">
// `::phase-note{of="<phase>"}` — one of THIS specimen's own phenology phases,
// and its paragraph of the field note. The dial's content is tied to the
// specimen's phases (the reader's model): each creature's essay follows its own
// arc — dormant → stirring → active → waning — rather than the six shared
// seasons, which stay on the dial's rim as informational context. Turning the
// dial moves the needle from phase to phase and swaps the paragraph.
//
// The specimen's phases are a gapless partition of the year (checked), so every
// needle day sits in exactly one phase — there is always exactly one note to
// show. Same SSR-safe collapse as the old season notes: every note server-
// renders EXPANDED (no-JS/crawlers get the whole year, each block headed by its
// phase) and collapses to the needle's phase only after hydration.
//
// Resolution: `components/content/` + pascal-cased tag (`::phase-note` →
// PhaseNote), render-time only — no schema or config change. Degrades to plain
// always-visible prose without an Almanac provider (a non-specimen Document).
const props = defineProps<{ of?: string }>()

const almanac = useAlmanac()
const phase = computed(() => almanac?.phases.value.find((p) => p.name === props.of))

if (import.meta.dev && almanac && !phase.value) {
  console.warn(
    `[atlas] ::phase-note{of="${props.of ?? ''}"} names no phase this specimen declares; `
    + `its phenology admits only: ${
      almanac.phases.value.map((p) => p.name).join(', ') || '(none at all)'
    }.`,
  )
}

const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

/** The phase the needle sits in right now (the partition guarantees exactly one). */
const selected = computed(() =>
  almanac ? (almanac.phases.value.find((p) => inSpan(almanac.day.value, p.span))?.name ?? null) : null,
)

/** Show while un-mounted (SSR/first paint), when there is no dial to key on, or
 *  when this is the phase the needle rides. */
const show = computed(
  () => !mounted.value || !almanac || !phase.value || selected.value === phase.value.name,
)

/** Compact day-span for the header, e.g. "d. 100–280". */
const spanText = computed(() =>
  phase.value ? `d. ${phase.value.span[0]}–${phase.value.span[1]}` : '',
)
</script>

<template>
  <section
    v-show="show"
    class="atlas-season-note"
    :class="{ 'sn-anim': show && mounted && !!almanac }"
  >
    <header v-if="phase" class="sn-head">
      <span class="sn-label">{{ phase.label }}</span>
      <span class="sn-span">{{ spanText }}</span>
    </header>
    <div class="sn-body"><slot /></div>
  </section>
</template>
