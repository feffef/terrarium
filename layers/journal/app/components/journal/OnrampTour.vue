<script setup lang="ts">
const props = defineProps<{ steps: OnrampStep[]; current: string; base: string }>()

const at = computed(() => props.steps.findIndex((s) => s.path === props.current))
const prev = computed(() => props.steps[at.value - 1])
const next = computed(() => props.steps[at.value + 1])
</script>

<template>
  <nav v-if="at >= 0" class="tour" aria-label="Start here">
    <p class="tour-step">Start here · {{ at + 1 }} of {{ steps.length }}</p>
    <div class="tour-links">
      <NuxtLink v-if="prev" :to="base + prev.path" rel="prev" class="tour-prev">
        <span aria-hidden="true">←</span> {{ prev.label }}
      </NuxtLink>
      <NuxtLink v-if="next" :to="base + next.path" rel="next" class="tour-next">
        Next: {{ next.label }} <span aria-hidden="true">→</span>
      </NuxtLink>
      <NuxtLink v-else :to="base" class="tour-next">
        That's the short version — back to the Journal <span aria-hidden="true">→</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<style scoped>
.tour {
  margin: 2.4rem 0 0;
  padding: 1rem 1.1rem;
  background: var(--jd-surface);
  border: 1px solid var(--jd-line);
  border-left: 3px solid var(--jd-accent);
  border-radius: var(--jd-radius);
}
.tour-step {
  margin: 0 0 0.6rem;
  font-family: var(--jd-mono);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--jd-muted);
}
.tour-links { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.6rem 1.2rem; }
.tour-links a { color: var(--jd-accent); font-weight: 600; text-decoration: none; }
.tour-links a:hover { text-decoration: underline; }
.tour-next { margin-left: auto; text-align: right; }
</style>
