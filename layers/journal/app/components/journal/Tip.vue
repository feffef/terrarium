<script setup lang="ts">
// The hover label of the Routine charts and the session card's token bar. A
// native `title` shows only after a delay, so the label is drawn by hand. The
// parent sets `left` and `bottom` inside a `position: relative` wrapper; `align`
// says which edge of the label sits at `left` (centred by default). Prose is a
// dark serif pill, like the KPI tiles' tooltips; `mono` is the light pill for a
// bare value, like a chart's number.
defineProps<{ align?: 'start' | 'center' | 'end'; mono?: boolean }>()
</script>

<template>
  <span class="tip" :class="[align, { mono }]" role="tooltip"><slot /></span>
</template>

<style scoped>
.tip {
  position: absolute;
  z-index: 5;
  white-space: pre-line;
  transform: translate(-50%, -0.2rem);
  width: max-content;
  max-width: min(22rem, 90vw);
  padding: 0.45rem 0.6rem;
  font-family: var(--jd-serif);
  font-size: 0.78rem;
  line-height: 1.35;
  text-align: left;
  text-transform: none;
  letter-spacing: normal;
  color: var(--jd-surface);
  background: var(--jd-ink);
  border-radius: 6px;
  box-shadow: var(--jd-shadow);
  pointer-events: none;
}
.tip.mono {
  padding: 0 0.3rem;
  font-family: var(--jd-mono);
  font-size: 0.72rem;
  line-height: 1.2;
  color: var(--jd-ink);
  background: var(--jd-surface);
  border-radius: 3px;
  box-shadow: none;
}
.tip.start { transform: translate(0, -0.2rem); }
.tip.end { transform: translate(-100%, -0.2rem); }
</style>
