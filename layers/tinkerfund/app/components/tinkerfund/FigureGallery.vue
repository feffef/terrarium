<script setup lang="ts">
import type { TinkerfundCampaign } from '../../types/tinkerfund'

// FIG. 1 is always the isometric face; patent figures follow (issue #1363).
defineProps<{ figures: TinkerfundCampaign['figures']; registry: string }>()
const active = ref(0)
</script>

<template>
  <div class="gallery">
    <figure class="figure">
      <div class="frame">
        <span class="tf-label cap">FIG. {{ active + 1 }} · {{ registry }}</span>
        <TinkerfundFigure :svg="figures[active]!.svg" :caption="figures[active]!.caption" />
      </div>
      <figcaption>{{ figures[active]!.caption }}</figcaption>
    </figure>
    <div class="thumbs" role="group" aria-label="Figures">
      <button
        v-for="(figure, i) in figures"
        :key="i"
        type="button"
        :aria-pressed="i === active"
        :aria-label="`Figure ${i + 1}: ${figure.caption}`"
        @click="active = i"
      >
        <span class="frame small">
          <span class="tf-label cap">FIG. {{ i + 1 }}</span>
          <TinkerfundFigure :svg="figure.svg" />
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.gallery { display: grid; gap: 10px; align-content: start; }
.figure { display: grid; gap: 8px; margin: 0; }
.frame {
  position: relative;
  display: block;
  padding: 28px 14px 10px;
  border: var(--tf-hairline);
  border-radius: var(--tf-radius-panel);
  background: var(--tf-paper), var(--tf-surface);
}
.cap { position: absolute; left: 12px; top: 10px; }
svg { display: block; width: 100%; height: auto; }
figcaption { color: var(--tf-muted); font-size: 14px; }
.small { padding: 4px; border-radius: var(--tf-radius); }
.small .cap { position: static; display: block; font-size: 10px; }
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
