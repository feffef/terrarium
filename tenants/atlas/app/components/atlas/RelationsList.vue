<script setup lang="ts">
// A specimen's Relations (#71): every edge touching it, from its own point of
// view — both what it does and what is done to it (the reverse label is derived,
// so both directions show from one authored fact). Each links to the counterpart,
// wearing that creature's color signature. Empty is a mystery, not a void.
import type { Relation, SpecimenView } from '../../utils/atlas'

defineProps<{
  relations: Relation[]
  specimensBySlug: Record<string, SpecimenView>
  biome: string
}>()
</script>

<template>
  <ul v-if="relations.length" class="atlas-relations">
    <li v-for="r in relations" :key="`${r.kind}-${r.dir}-${r.other}`">
      <span class="kind">{{ r.label }}</span>
      <span class="rel-body">
        <NuxtLink
          v-if="specimensBySlug[r.other]"
          class="who"
          :to="`/t/atlas/${biome}/${r.other}`"
        >
          <span
            class="dot"
            :style="{ background: specimensBySlug[r.other]?.signature?.colors?.[0]?.hex || 'var(--biome-accent)' }"
          />{{ specimensBySlug[r.other]?.binomial }}</NuxtLink>
        <span v-else class="who">{{ r.other }}</span>
        <span class="rel-note"> — {{ r.note }}</span>
      </span>
    </li>
  </ul>
  <p v-else class="atlas-relations empty">No observed relations; the naturalists remain suspicious.</p>
</template>
