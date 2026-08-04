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

// Client-side only, and false on the server, so the capped recent view is what
// renders initially (issue #450). Each mounted log owns its own state, so one
// wing's full ledger says nothing about another's.
const expanded = ref(false)

const rows = computed(() => {
  const sorted = [...props.observations].sort((a, b) => b.date.localeCompare(a.date))
  return props.limit && !expanded.value ? sorted.slice(0, props.limit) : sorted
})

// When a `limit` hides older entries, say so plainly rather than letting the log
// simply stop — otherwise a wing with a long ledger looks as sparse as a young
// one. The count keeps the naturalist honest about what the reader isn't seeing,
// and doubles as the label of the control that reveals them.
const truncatable = computed(() => Boolean(props.limit) && props.observations.length > props.limit!)
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
    <p v-if="truncatable" class="atlas-log-more">
      <template v-if="expanded">
        All {{ observations.length }} sightings, newest first — the ledger is open.
      </template>
      <template v-else>
        The {{ limit }} most recent of {{ observations.length }} sightings; the
        ledger keeps the earlier ones.
      </template>
      <button
        type="button"
        class="atlas-log-toggle"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >{{ expanded ? `Show only the ${limit} most recent` : `Show all ${observations.length} sightings` }}</button>
    </p>
  </template>
  <p v-else class="atlas-log empty">No sightings recorded here yet; the season is young.</p>
</template>
