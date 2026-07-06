<script setup lang="ts">
// The specimen index (#66): the biome's catalogue, read like a real one —
// binomial (its color signature worn as a swatch trio), common name, one-line
// character, and the rarity mark. Every row a doorway to the entry.
import type { SpecimenView } from '../../utils/atlas'
import RarityMark from './RarityMark.vue'

defineProps<{ specimens: SpecimenView[]; biome: string }>()
</script>

<template>
  <ul class="atlas-index">
    <li v-for="s in specimens" :key="s.slug">
      <NuxtLink class="row" :to="`/t/atlas/${biome}/${s.slug}`">
        <span class="swatches" aria-hidden="true">
          <i v-for="c in (s.signature?.colors ?? [])" :key="c.hex" :style="{ background: c.hex }" />
        </span>
        <span class="naming">
          <span class="binomial">{{ s.binomial }}</span>
          <span class="common"> · {{ s.common }}</span>
          <span v-if="s.blurb" class="char">{{ s.blurb }}</span>
        </span>
        <RarityMark :grade="s.rarity" />
      </NuxtLink>
    </li>
  </ul>
</template>
