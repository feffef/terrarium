<script setup lang="ts">
// One KPI readout in the Space's state strip. Presentational — the page computes
// the number and its breakdown from this Space's collections. The breakdown is
// either the `sub` string or, when it needs markup, the #sub slot. With `to`,
// the whole tile is one link, so the slot must hold no link of its own.
defineProps<{
  label: string
  value: number | string
  sub?: string
  gloss?: string
  to?: string
}>()
const slots = useSlots()
const NuxtLink = resolveComponent('NuxtLink')
</script>

<template>
  <component :is="to ? NuxtLink : 'div'" :to="to" class="tile" :class="{ link: to }">
    <div class="label">{{ label }}</div>
    <div v-if="gloss" class="gloss">{{ gloss }}</div>
    <div class="num">{{ value }}</div>
    <div v-if="sub || slots.sub" class="sub"><slot name="sub">{{ sub }}</slot></div>
  </component>
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
.link {
  display: block;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.link:hover { border-color: var(--jd-accent); transform: translateY(-2px); }
.link:focus-visible { outline: 2px solid var(--jd-accent); outline-offset: 3px; }
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
.gloss {
  color: var(--jd-muted);
  font-size: 0.78rem;
  margin-top: 0.2rem;
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
