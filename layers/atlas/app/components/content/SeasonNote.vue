<script setup lang="ts">
// `::season-note{of="<season>"}` (feedback rework) — one Glass-Year season's
// paragraph of the field note. The almanac dial is the essay's season selector;
// this block shows ONLY while the needle rides its season, so turning the dial
// wholly swaps the prose from season to season (the reader's own words: "a
// paragraph for each specific season … use the wheel to fully switch").
//
// Progressive enhancement, done the same way ::phase does it, so SSR stays
// mismatch-free: every season-note server-renders EXPANDED, and the client's
// first (hydrating) paint matches — all notes visible. Only in `onMounted`,
// after hydration, does it collapse to the one the needle is on. So crawlers
// and no-JS readers get the whole year top-to-bottom (each block headed by its
// season), and a JS reader gets the season selector. `v-show` (not `v-if`)
// keeps every hidden note — and any `::sighting` inside it — mounted, so all
// their dial ticks stay registered whichever season is showing.
//
// Without an Almanac provider (a non-specimen Document) it degrades to plain,
// always-visible prose. Resolution: `components/content/` + pascal-cased tag
// (`::season-note` → SeasonNote), the same render-time mechanism as Season.vue —
// no schema or config change.
const props = defineProps<{ of?: string }>()

const almanac = useAlmanac()
const season = computed(() => GLASS_SEASONS.find((s) => s.name === props.of))

if (import.meta.dev && !season.value) {
  console.warn(
    `[atlas] ::season-note{of="${props.of ?? ''}"} names no season of the Glass Year; `
    + `the calendar keeps only: ${GLASS_SEASONS.map((s) => s.name).join(', ')}.`,
  )
}

// False until mounted → SSR and first client paint both render every note
// expanded (no hydration mismatch); the collapse happens post-hydration.
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

/** The needle's season right now (only meaningful with a provider). */
const selected = computed(() => (almanac ? seasonOf(almanac.day.value).name : null))

/** Show while un-mounted (SSR/first paint), when there is no dial to key on, or
 *  when this is the season the needle rides. */
const show = computed(
  () => !mounted.value || !almanac || !season.value || selected.value === season.value.name,
)

/** Compact day-span for the header, e.g. "d. 141–233". */
const spanText = computed(() =>
  season.value ? `d. ${season.value.span[0]}–${season.value.span[1]}` : '',
)
</script>

<template>
  <section
    v-show="show"
    class="atlas-season-note"
    :class="{ 'sn-anim': show && mounted && !!almanac }"
  >
    <header v-if="season" class="sn-head">
      <span class="sn-label">{{ season.label }}</span>
      <span class="sn-span">{{ spanText }}</span>
    </header>
    <div class="sn-body"><slot /></div>
  </section>
</template>
