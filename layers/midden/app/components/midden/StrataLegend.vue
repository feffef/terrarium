<script setup lang="ts">
// The trench-index strata legend (#528): a STATIC, non-interactive read of the
// same stacked-slate-band vocabulary as the stratigraphy sidebar (#524) —
// oldest-to-newest, each band showing its label and date range — so a reader
// learns the dig-season scale before picking a site. No scroll-highlight, no
// click, no filter (that's the sidebar's job, on a Site page).
//
// Deterministic date formatting (no `toLocaleDateString`, whose output can
// differ between the SSR locale and the client's, causing a hydration
// mismatch) — the same spelled-out-month convention as the Atlas's
// `formatIsoDate` (layers/atlas/app/utils/almanac.ts), reimplemented locally
// since only this component needs it.
const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${Number(day)} ${MONTH_ABBR[Number(month) - 1]} ${year}`
}

function formatRange(start: string, end: string | null): string {
  return end === null ? `${formatDate(start)} — present` : `${formatDate(start)} – ${formatDate(end)}`
}
</script>

<template>
  <ol class="midden-strata-legend" aria-label="Dig seasons">
    <li v-for="season in DIG_SEASONS" :key="season.slug" class="midden-strata-legend__band">
      <span class="midden-strata-legend__swatch" aria-hidden="true" />
      <span class="midden-strata-legend__label">{{ season.label }}</span>
      <span class="midden-strata-legend__range">{{ formatRange(season.start, season.end) }}</span>
    </li>
  </ol>
</template>

<style scoped>
.midden-strata-legend {
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 2px;
}

.midden-strata-legend__band {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.35rem 0;
}

.midden-strata-legend__swatch {
  display: inline-block;
  width: 1.25rem;
  height: 0.85rem;
  flex-shrink: 0;
  background: var(--midden-slate, #5a5f66);
}

.midden-strata-legend__label {
  font-weight: 600;
  color: var(--midden-ink, #2a251d);
}

.midden-strata-legend__range {
  color: var(--midden-muted, #736a58);
  font-size: 0.85rem;
}
</style>
