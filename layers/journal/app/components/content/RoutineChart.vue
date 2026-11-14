<script setup lang="ts">
// `::routine-chart{routine="<name>"}` — one Routine's runs as bars, oldest to
// newest, in the metric the page's switch has chosen. Bars share the other
// charts' y-scale (`routineChartCap`); a bar above it is cut off and marked.
const props = defineProps<{ routine?: string }>()

const routines = useRoutineData()
const metric = useRoutineMetric()

const series = computed(() => routines.value.find((r) => r.name === props.routine))
const runs = computed(() => (series.value ? sortedRuns(series.value) : []))
const cap = computed(() => routineChartCap(routines.value, metric.value))

const W = 300
const H = 80
const bars = computed(() => {
  const step = W / Math.max(runs.value.length, 1)
  return runs.value.map((run, i) => {
    const value = run[metric.value]
    const clipped = cap.value > 0 && value > cap.value
    const h = cap.value > 0 ? Math.max((Math.min(value, cap.value) / cap.value) * H, value > 0 ? 1 : 0) : 0
    return {
      x: i * step + step * 0.12,
      w: step * 0.76,
      h,
      clipped,
      text: formatRoutineMetric(metric.value, value),
    }
  })
})
// A native <title> tooltip shows after a delay, so the value is drawn by hand.
const hovered = ref<number | null>(null)
const tip = computed(() => {
  const b = hovered.value === null ? undefined : bars.value[hovered.value]
  return b && { text: b.text, left: `${((b.x + b.w / 2) / W) * 100}%`, bottom: `${(b.h / H) * 100}%` }
})
const total = computed(() => runs.value.reduce((a, run) => a + run[metric.value], 0))
const label = computed(() => ROUTINE_METRICS.find((m) => m.key === metric.value)!.label)

if (import.meta.dev && !series.value) {
  console.warn(`[journal] ::routine-chart{routine="${props.routine ?? ''}"} names no Routine in the routines collection`)
}
</script>

<template>
  <figure v-if="series" class="rc">
    <figcaption class="rc-head">
      <span class="rc-title">
        <span class="rc-name">{{ series.name }}</span>
        <span v-if="series.gist" class="rc-gist">{{ series.gist }}</span>
      </span>
      <span class="rc-sum">
        {{ formatRoutineMetric(metric, total) }} over {{ runs.length }} {{ runs.length === 1 ? 'run' : 'runs' }}
      </span>
    </figcaption>
    <div class="rc-plot">
      <svg
        class="rc-svg"
        :viewBox="`0 0 ${W} ${H}`"
        preserveAspectRatio="none"
        role="img"
        :aria-label="`${series.name}: ${label} per run, ${runs.length} runs, ${formatRoutineMetric(metric, total)} in total`"
        @pointerleave="hovered = null"
      >
        <line class="rc-base" x1="0" :x2="W" :y1="H" :y2="H" />
        <g v-for="(b, i) in bars" :key="i">
          <rect :class="['rc-bar', { clipped: b.clipped, on: hovered === i }]" :x="b.x" :y="H - b.h" :width="b.w" :height="b.h" />
          <rect v-if="b.clipped" class="rc-cut" :x="b.x" y="0" :width="b.w" height="3" />
          <rect class="rc-hit" :x="b.x" y="0" :width="b.w" :height="H" @pointerenter="hovered = i" />
        </g>
      </svg>
      <JournalTip v-if="tip" mono :style="{ left: tip.left, bottom: tip.bottom }">{{ tip.text }}</JournalTip>
    </div>
    <div class="rc-axis">
      <span>{{ runs[0]?.startedAt.slice(0, 10) }}</span>
      <span v-if="cap > 0">axis tops out at {{ formatRoutineMetric(metric, cap) }}</span>
      <span>{{ runs.at(-1)?.startedAt.slice(0, 10) }}</span>
    </div>
  </figure>
  <p v-else class="rc-missing">No Routine named “{{ routine }}” in this Space.</p>
</template>

<style scoped>
.rc {
  margin: 1.4rem 0 0.6rem;
  padding: 0.8rem 1rem 0.7rem;
  background: var(--jd-surface);
  border: 1px solid var(--jd-line);
  border-radius: var(--jd-radius);
  box-shadow: var(--jd-shadow);
}
.rc-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.2rem 1rem; margin-bottom: 0.5rem; }
.rc-title { display: flex; flex-direction: column; gap: 0.1rem; }
.rc-gist { font-size: 0.8rem; color: var(--jd-muted); }
.rc-name { font-family: var(--jd-mono); font-size: 0.85rem; color: var(--jd-ink); }
.rc-sum { font-family: var(--jd-mono); font-size: 0.75rem; color: var(--jd-muted); font-variant-numeric: tabular-nums; }
.rc-svg { display: block; width: 100%; height: 5rem; }
.rc-base { stroke: var(--jd-line); stroke-width: 1; vector-effect: non-scaling-stroke; }
.rc-bar { fill: var(--jd-accent); }
.rc-bar.on { fill: var(--jd-accent-bright); }
.rc-hit { fill: transparent; }
.rc-plot { position: relative; margin-top: 1.2rem; }
.rc-cut { fill: var(--jd-sev-major); }
.rc-axis {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.3rem;
  font-family: var(--jd-mono);
  font-size: 0.68rem;
  color: var(--jd-faint);
}
.rc-missing { font-family: var(--jd-mono); font-size: 0.8rem; color: var(--jd-sev-blocker); }
</style>
