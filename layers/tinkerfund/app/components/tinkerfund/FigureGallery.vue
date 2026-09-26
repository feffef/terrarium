<script setup lang="ts">
import type { TinkerfundCampaign } from '../../types/tinkerfund'

// FIG. 1 is always the isometric face; patent figures follow (issue #1363).
defineProps<{ figures: TinkerfundCampaign['figures']; registry: string }>()
const active = ref(0)
</script>

<template>
  <div class="gallery">
    <TinkerfundFigure
      :svg="figures[active]!.svg"
      :label="`FIG. ${active + 1} · ${registry}`"
      :caption="figures[active]!.caption"
    />
    <div class="thumbs" role="group" aria-label="Figures">
      <button
        v-for="(figure, i) in figures"
        :key="i"
        type="button"
        :aria-pressed="i === active"
        :aria-label="`Figure ${i + 1}: ${figure.caption}`"
        @click="active = i"
      >
        <TinkerfundFigure :svg="figure.svg" :label="`FIG. ${i + 1}`" :caption="figure.caption" small />
      </button>
    </div>
  </div>
</template>

<style scoped>
.gallery { display: grid; gap: 10px; align-content: start; }
.thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 8px; }
button {
  padding: 0;
  border: 2px solid transparent;
  border-radius: calc(var(--tf-radius) + 2px);
  background: none;
  cursor: pointer;
}
button[aria-pressed='true'] { border-color: var(--tf-ink); }
</style>
