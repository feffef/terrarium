<script setup lang="ts">
// `::almanac` (feedback rework) — seats the specimen's almanac dial IN the field
// note, so the essay reads in the order the reader asked for: a general
// introduction to the specimen, then the wheel, then the year season by season.
// It injects the Almanac the page provides and feeds the shared PhenologyWheel
// from it (the specimen's phases + the biome's dated ledger), so the dial in the
// prose and the ::season-note blocks below it turn on the very same needle.
//
// Degrades to nothing when no Almanac is in scope (a non-specimen Document).
// Resolution: `components/content/` + pascal-cased tag (`::almanac` → Almanac),
// the same render-time mechanism as the sibling MDC components — no schema or
// config change.
const almanac = useAlmanac()
const phases = computed(() => almanac?.phases.value ?? [])
const specimenLabel = computed(() => almanac?.specimenLabel.value)
// The dial's rim ticks read only `date`; the Almanac carries the fuller
// observation objects, which are structurally compatible.
const observations = computed(() => almanac?.observations.value ?? [])

if (import.meta.dev && !almanac) {
  console.warn(
    '[atlas] ::almanac has no Almanac in scope; it renders nothing. Place it in a '
    + 'specimen field note (the specimen page provides the dial state).',
  )
}
</script>

<template>
  <AtlasPhenologyWheel
    v-if="almanac"
    class="entry-almanac"
    :phases="phases"
    :specimen-label="specimenLabel"
    :observations="observations"
  />
</template>
