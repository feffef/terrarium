<script setup lang="ts">
// Activity rhythm (#73): a beautiful clock, not a chart. 24 hour-cells,
// midnight→midnight, filled where the creature stirs. Bands may wrap past
// midnight; the geometry lives in the pure `rhythmCells` helper.
import { rhythmCells, type Band } from '../../utils/atlas'

const props = defineProps<{ bands: Band[]; label?: string }>()
const cells = computed(() => rhythmCells(props.bands))
</script>

<template>
  <div class="atlas-rhythm">
    <div class="track" role="img" :aria-label="`active hours: ${label ?? ''}`">
      <i v-for="(on, h) in cells" :key="h" :class="{ on, 'dawn-tick': h % 6 === 0 }" />
    </div>
    <div class="scale" aria-hidden="true"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>
    <p v-if="label" class="rlabel">{{ label }}</p>
  </div>
</template>
