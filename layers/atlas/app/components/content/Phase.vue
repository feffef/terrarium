<script setup lang="ts">
// `::phase{of="name"}` (#283) — binds the enclosed passage to one of this
// specimen's declared phenology phases. Progressive enhancement (map #279
// decision 4): the passage server-renders fully inked and STAYS inked — for
// crawlers, no-JS readers, and anyone who never touches the dial. Only once
// the reader engages the wheel (`engaged` on the Almanac contract) does the
// ink follow the needle: full ink while the needle rides inside the phase's
// arc, a legible pencil — lighter ink, never a ghost — while it is outside.
// The margin arc-glyph swings the needle to the phase's midpoint.
//
// Resolution: `components/content/` + pascal-cased tag (`::phase` → Phase),
// same mechanism as Season.vue — render-time only, no schema change.
const props = defineProps<{ of?: string }>()

const almanac = useAlmanac()
const phase = computed(() => almanac?.phases.value.find((p) => p.name === props.of))

if (import.meta.dev && almanac && !phase.value) {
  console.warn(
    `[atlas] ::phase{of="${props.of ?? ''}"} names no phase this specimen declares; `
    + `its phenology admits only: ${
      almanac.phases.value.map((p) => p.name).join(', ') || '(none at all)'
    }.`,
  )
}

/** The needle is inside this phase's arc. */
const now = computed(() =>
  Boolean(almanac && phase.value && inSpan(almanac.day.value, phase.value.span)),
)

/** Pencil only after the reader has engaged the dial — `engaged` is false on
 *  every fresh render (server and client), so SSR output and first paint are
 *  always full ink and hydration cannot mismatch. */
const penciled = computed(() => Boolean(almanac?.engaged.value && phase.value && !now.value))

const glyphArc = computed(() => (phase.value ? ringArcPath(phase.value.span, 5) : ''))

/** The margin glyph appears only when there is a phase and a dial to swing. */
const live = computed(() => Boolean(almanac && phase.value))

function swing() {
  if (!almanac || !phase.value) return
  almanac.engage()
  almanac.setDay(spanMidpoint(phase.value.span))
}
</script>

<template>
  <div class="atlas-phase" :class="{ 'is-penciled': penciled, 'is-now': now }">
    <button
      v-if="live"
      type="button"
      class="phase-glyph"
      :title="`${phase!.label} — swing the needle to it`"
      @click="swing"
    >
      <svg viewBox="-8 -8 16 16" aria-hidden="true">
        <circle class="year" r="5" />
        <path class="arc" :d.attr="glyphArc" />
      </svg>
    </button>
    <div class="phase-body"><slot /></div>
  </div>
</template>
