<script setup lang="ts">
// The field log (#72): dated observations, newest first — the Atlas's heartbeat.
// Terse, in-fiction lines; a specimen mention links to its entry (wearing its
// color signature). Optional `limit` for the biome-landing's recent view; the
// specimen entry passes its own filtered slice.
import type { SpecimenView } from '../../utils/atlas'

interface Observation {
  date: string
  time: string
  specimen?: string
  note: string
}

const props = defineProps<{
  observations: Observation[]
  specimensBySlug: Record<string, SpecimenView>
  biome: string
  limit?: number
}>()

const rows = computed(() => {
  const sorted = [...props.observations].sort((a, b) => b.date.localeCompare(a.date))
  return props.limit ? sorted.slice(0, props.limit) : sorted
})

// When a `limit` hides older entries, say so plainly rather than letting the log
// simply stop — otherwise a wing with a long ledger looks as sparse as a young
// one. The count keeps the naturalist honest about what the reader isn't seeing.
const hidden = computed(() => Math.max(0, props.observations.length - rows.value.length))
</script>

<template>
  <template v-if="rows.length">
    <ul class="atlas-log">
      <li v-for="(o, i) in rows" :key="`${o.date}-${i}`">
        <span class="when">{{ o.date }}</span>
        <span class="tod">{{ o.time }}</span>
        <span class="obs">
          <NuxtLink
            v-if="o.specimen && specimensBySlug[o.specimen]"
            class="who"
            :to="`/t/atlas/${biome}/${o.specimen}`"
          >{{ specimensBySlug[o.specimen]?.binomial }}</NuxtLink><template v-if="o.specimen && specimensBySlug[o.specimen]"> — </template>{{ o.note }}
        </span>
      </li>
    </ul>
    <p v-if="hidden" class="atlas-log-more">
      The {{ rows.length }} most recent of {{ observations.length }} sightings; the
      ledger keeps the earlier ones.
    </p>
  </template>
  <p v-else class="atlas-log empty">No sightings recorded here yet; the season is young.</p>
</template>
