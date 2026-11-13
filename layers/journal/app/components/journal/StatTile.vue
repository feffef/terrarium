<script setup lang="ts">
// One KPI tile in the Space's state strip. The whole tile is one link (its
// CTA, stretched over the tile), so no second link may sit inside it; the
// stats sit above that link so a tap opens their tooltip instead of following
// it. Its rows line up with its siblings' through the parent grid's subgrid.
import type { JournalKpiTile } from '../../utils/dashboard'

const props = defineProps<{ tile: JournalKpiTile }>()
// Shared by every tile, so opening one tooltip closes any other.
const openTip = useState<string | null>('journal-kpi-tip', () => null)
const tipId = (stat: string) => `kpi-${props.tile.key}-${stat}`
const toggleTip = (id: string) => (openTip.value = openTip.value === id ? null : id)
// A tap doesn't focus a button on iOS Safari, so blur can't close it; any tap off a stat does.
const closeOnTapOff = (e: PointerEvent) => {
  if (!(e.target as Element | null)?.closest('.stat')) openTip.value = null
}
onMounted(() => document.addEventListener('pointerdown', closeOnTapOff))
onBeforeUnmount(() => document.removeEventListener('pointerdown', closeOnTapOff))
</script>

<template>
  <div class="tile">
    <div class="band head">
      <div class="label">{{ tile.label }}</div>
      <div class="gloss">{{ tile.gloss }}</div>
    </div>
    <div class="band num">{{ tile.value }}</div>
    <div class="band stats">
      <span v-for="s in tile.stats" :key="s.key">
        <button
          type="button"
          class="stat"
          :class="{ open: openTip === tipId(s.key) }"
          :aria-label="`${s.label}: ${s.value}`"
          :aria-describedby="tipId(s.key)"
          @click="toggleTip(tipId(s.key))"
          @keydown.escape="openTip = null"
        >
          <span class="stat-value">{{ s.value }}</span>
          <span class="stat-label"><span v-if="s.severity" class="dot" :style="{ background: `var(--jd-sev-${s.severity})` }" />{{ s.label }}</span>
        </button>
        <span :id="tipId(s.key)" role="tooltip" class="tip">{{ s.hint }}</span>
      </span>
    </div>
    <div class="band foot">
      <NuxtLink :to="tile.to" class="cta">{{ tile.cta }}</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.tile {
  grid-row: span 4;
  display: grid;
  grid-template-rows: subgrid;
  row-gap: 0;
  background: var(--jd-surface);
  border: 1px solid var(--jd-line);
  border-radius: var(--jd-radius);
  box-shadow: var(--jd-shadow);
  position: relative;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.tile::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  height: 2px;
  border-radius: var(--jd-radius) var(--jd-radius) 0 0;
  background: linear-gradient(90deg, var(--jd-accent), transparent);
  opacity: 0.5;
}
.tile:hover { border-color: var(--jd-accent); transform: translateY(-2px); }
.band { padding: 0.75rem 0.7rem; }
.stats, .foot { padding-block: 0.5rem; }
.band + .band { border-top: 1px solid var(--jd-line); }
.label {
  font-family: var(--jd-mono);
  font-size: 0.68rem;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--jd-faint);
}
.gloss { color: var(--jd-muted); font-size: 0.82rem; margin-top: 0.25rem; line-height: 1.35; }
.num {
  font-family: var(--jd-mono);
  font-variant-numeric: tabular-nums;
  font-size: 2.9rem;
  line-height: 1;
  letter-spacing: -0.02em;
  align-self: center;
}

/* Positioned so every tooltip spans the band's full width and stays inside the tile. */
.stats { position: relative; display: flex; flex-wrap: wrap; gap: 0.3rem 0.35rem; align-content: start; }
.stat {
  /* Above the CTA's stretched ::after, so a tap reaches the stat, not the link. */
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0;
  font: inherit;
  color: inherit;
  background: none;
  border: 0;
  cursor: help;
}
.stat-value { font-family: var(--jd-mono); font-variant-numeric: tabular-nums; font-size: 0.9rem; color: var(--jd-ink); }
.stat-label {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.65rem;
  color: var(--jd-muted);
  border-bottom: 1px dotted var(--jd-faint);
}
.dot { width: 5px; height: 5px; border-radius: 50%; }
.tip {
  display: none;
  position: absolute;
  left: 0.5rem;
  right: 0.5rem;
  bottom: calc(100% - 0.35rem);
  z-index: 2;
  padding: 0.45rem 0.6rem;
  font-size: 0.78rem;
  line-height: 1.35;
  text-align: left;
  color: var(--jd-surface);
  background: var(--jd-ink);
  border-radius: 6px;
  box-shadow: var(--jd-shadow);
  pointer-events: none;
}
.stat:hover + .tip, .stat:focus-visible + .tip, .stat.open + .tip { display: block; }
.stat:focus-visible { outline: 2px solid var(--jd-accent); outline-offset: 2px; border-radius: 3px; }

.foot { align-self: end; }
.cta {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  font-family: var(--jd-mono);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--jd-accent);
  text-decoration: none;
  border: 1px solid var(--jd-accent);
  border-radius: 999px;
  transition: background-color 0.15s ease, color 0.15s ease;
}
/* Stretched over the whole tile, so the tile is one link. */
.cta::after { content: ''; position: absolute; inset: 0; border-radius: var(--jd-radius); }
.tile:hover .cta, .cta:focus-visible { background: var(--jd-accent); color: var(--jd-surface); }
.cta:focus-visible { outline: 2px solid var(--jd-accent); outline-offset: 3px; }
</style>
