<script setup lang="ts">
// The rarity mark (#69): a five-dot ladder for the graded scale, a lone star for
// mythic. Appears on the museum label, the specimen index, and the food web.
import type { Rarity } from '../../utils/atlas'

const props = defineProps<{ grade: Rarity | undefined; showGrade?: boolean }>()
const meta = computed(() => rarityMeta(props.grade))
</script>

<template>
  <span
    class="atlas-rarity"
    :class="{ 'is-mythic': meta.grade === 'mythic' }"
    :title="`${meta.grade} — ${meta.gloss}`"
    :aria-label="`rarity: ${meta.grade}, ${meta.gloss}`"
  >
    <span v-if="meta.grade === 'mythic'" class="star" aria-hidden="true">✦</span>
    <span v-else class="dots" aria-hidden="true"
      ><span v-for="i in 5" :key="i" :class="{ off: i > meta.dots }">●</span></span
    >
    <span v-if="showGrade" class="grade">{{ meta.grade }}</span>
  </span>
</template>
