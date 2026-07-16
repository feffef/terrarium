<script setup lang="ts">
// The trench-index dig-seasons list (#528; redesign handoff, direction 1d "Dig
// seasons"): each season as a row of name + date range + a PROPORTIONAL bar
// sized by how many finds it holds, newest at the surface (top). A static,
// non-interactive read of the same dig-season vocabulary the depth-gauge
// scroll-syncs against on a Site page.
//
// `counts` (a per-season-slug tally the trench index computes from its loaded
// artifacts) drives each bar's width; a season with no finds still renders its
// row, just with an empty bar. The open-ended "Current Midden" season is drawn
// in terracotta (it is still accruing); closed seasons in slate.
const props = defineProps<{ counts?: Record<string, number> }>()

const countFor = (slug: string): number => props.counts?.[slug] ?? 0

const total = computed(() => DIG_SEASONS.reduce((n, s) => n + countFor(s.slug), 0))

// Newest at the surface (top), like a real section read from the ground down.
const seasonsNewestFirst = computed(() => [...DIG_SEASONS].reverse())

function barWidth(slug: string): string {
  if (total.value === 0) return '0%'
  return `${Math.round((countFor(slug) / total.value) * 100)}%`
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${Number(day)} ${MONTH_ABBR[Number(month) - 1]} ${year}`
}
function formatRange(start: string, end: string | null): string {
  return end === null ? `${formatDate(start)} → present` : `${formatDate(start)} – ${formatDate(end)}`
}
</script>

<template>
  <div class="midden-seasons">
    <div
      v-for="season in seasonsNewestFirst"
      :key="season.slug"
      class="midden-seasons__row"
    >
      <div class="midden-seasons__id">
        <span class="midden-seasons__name" :class="{ 'midden-seasons__name--open': season.end === null }">{{ season.label }}</span>
        <span class="mono midden-seasons__dates">{{ formatRange(season.start, season.end) }}<template v-if="season.end === null"> · open-ended</template></span>
      </div>
      <div class="midden-seasons__track" role="img" :aria-label="`${countFor(season.slug)} finds`">
        <div
          class="midden-seasons__bar"
          :class="{ 'midden-seasons__bar--open': season.end === null }"
          :style="{ width: barWidth(season.slug) }"
        />
      </div>
      <span class="mono midden-seasons__count">{{ countFor(season.slug) }}</span>
    </div>
  </div>
</template>

<style scoped>
.midden-seasons {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.midden-seasons__row {
  display: grid;
  grid-template-columns: 16rem 1fr 3.5rem;
  gap: 16px;
  align-items: center;
  padding: 9px 0;
  border-top: 1px solid var(--midden-line);
}

.midden-seasons__name {
  font-size: 1.02rem;
  font-weight: 500;
  color: var(--midden-ink);
}
.midden-seasons__name--open {
  color: var(--midden-accent-2);
}
.midden-seasons__dates {
  display: block;
  color: var(--midden-faint);
  margin-top: 2px;
  font-size: 0.72rem;
}

.midden-seasons__track {
  height: 14px;
  background: var(--midden-slate-wash);
  position: relative;
}
.midden-seasons__bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: var(--midden-slate);
  opacity: 0.5;
}
.midden-seasons__bar--open {
  background: var(--midden-accent);
  opacity: 1;
}

.midden-seasons__count {
  text-align: right;
  color: var(--midden-muted);
  font-size: 0.78rem;
}

@media (max-width: 34rem) {
  .midden-seasons__row {
    grid-template-columns: 1fr 2.5rem;
    gap: 6px 12px;
  }
  .midden-seasons__track { grid-column: 1 / -1; order: 3; }
}
</style>
