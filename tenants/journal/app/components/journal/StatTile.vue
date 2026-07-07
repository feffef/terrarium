<script setup lang="ts">
// One KPI readout in the Space's state strip. Presentational — the page computes
// the number and its breakdown from this Space's collections. The breakdown is
// either the `sub` string or, when it needs markup (e.g. links), the #sub slot.
defineProps<{
  label: string
  value: number | string
  sub?: string
}>()
const slots = useSlots()
</script>

<template>
  <div class="tile">
    <div class="label">{{ label }}</div>
    <div class="num">{{ value }}</div>
    <div v-if="sub || slots.sub" class="sub"><slot name="sub">{{ sub }}</slot></div>
  </div>
</template>

<style scoped>
.tile {
  background: var(--jd-surface);
  border: 1px solid var(--jd-line);
  border-radius: var(--jd-radius);
  padding: 1rem 1.1rem 1.05rem;
  position: relative;
  overflow: hidden;
  box-shadow: var(--jd-shadow);
}
.tile::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--jd-accent), transparent);
  opacity: 0.5;
}
.label {
  font-family: var(--jd-mono);
  font-size: 0.68rem;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--jd-faint);
}
.num {
  font-family: var(--jd-mono);
  font-variant-numeric: tabular-nums;
  font-size: 2.15rem;
  line-height: 1;
  letter-spacing: -0.02em;
  margin: 0.35rem 0 0.3rem;
}
.sub {
  color: var(--jd-muted);
  font-size: 0.78rem;
}
</style>
