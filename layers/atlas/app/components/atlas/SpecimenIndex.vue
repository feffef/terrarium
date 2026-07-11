<script setup lang="ts">
// The specimen index (#66): the biome's catalogue, read like a real one —
// binomial (its color signature worn as a swatch trio), common name, one-line
// character, and the rarity mark. Every row a doorway to the entry.
//
// `highlight` (#285, map #279): an optional externally-driven slug — the
// biome landing wires this to the composite almanac wheel via
// `v-model:highlight`, so hovering/focusing a phase band there lights up the
// matching row here, and vice versa. Unused (both undefined) elsewhere: no
// behavior change for any other caller.
import type { SpecimenView } from '../../utils/atlas'

const props = defineProps<{ specimens: SpecimenView[]; biome: string; highlight?: string | null }>()
const emit = defineEmits<{ 'update:highlight': [slug: string | null] }>()

function rowEnter(slug: string) {
  emit('update:highlight', slug)
}
function rowLeave(slug: string) {
  // Only clear if this row is still the one lit — guards a fast hover hop
  // (e.g. row → composite wheel band) against clobbering a highlight some
  // other source just set (mirrors AtlasPhenologyWheel's bandLeave).
  if (props.highlight === slug) emit('update:highlight', null)
}
</script>

<template>
  <ul class="atlas-index">
    <li v-for="s in specimens" :key="s.slug">
      <NuxtLink
        class="row"
        :class="{ hot: highlight === s.slug, dim: !!highlight && highlight !== s.slug }"
        :to="`/t/atlas/${biome}/${s.slug}`"
        @mouseenter="rowEnter(s.slug)"
        @mouseleave="rowLeave(s.slug)"
        @focus="rowEnter(s.slug)"
        @blur="rowLeave(s.slug)"
      >
        <span class="swatches" aria-hidden="true">
          <i v-for="c in (s.signature?.colors ?? [])" :key="c.hex" :style="{ background: c.hex }" />
        </span>
        <span class="naming">
          <span class="binomial">{{ s.binomial }}</span>
          <span class="common"> · {{ s.common }}</span>
          <span v-if="s.blurb" class="char">{{ s.blurb }}</span>
        </span>
        <AtlasRarityMark :grade="s.rarity" />
      </NuxtLink>
    </li>
  </ul>
</template>
