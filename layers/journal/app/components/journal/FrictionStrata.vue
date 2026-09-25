<script setup lang="ts">
// Frictions rendered as soil strata — the accumulated sediment the
// self-improvement Skills mine (`frictions-to-fixes` today; CONTEXT.md:
// Friction). The default slot replaces the "N frictions" caption.
import type { Severity } from '../../types/journal'

const props = defineProps<{
  counts: Record<Severity, number>
  total: number
}>()

const ORDER: Severity[] = ['nit', 'minor', 'moderate', 'major', 'blocker']
const sevVar = (s: Severity) => `var(--jd-sev-${s})`
const severityLabel = computed(
  () => `Friction severity: ${ORDER.map((s) => props.counts[s] + ' ' + s).join(', ')}`,
)
</script>

<template>
  <div class="fbar">
    <template v-if="total > 0">
      <span
        class="track"
        :title="severityLabel"
        :aria-label="severityLabel"
      >
        <template v-for="s in ORDER" :key="s">
          <span v-if="counts[s] > 0" :style="{ flex: counts[s], background: sevVar(s) }" />
        </template>
      </span>
      <span class="n"><slot>{{ total }} friction{{ total === 1 ? '' : 's' }}</slot></span>
    </template>
    <span v-else class="n none">no frictions</span>
  </div>
</template>

<style scoped>
.fbar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.55rem; }
.fbar .track {
  display: flex;
  height: 7px;
  width: 118px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--jd-surface-2);
  box-shadow: inset 0 0 0 1px var(--jd-line);
}
.fbar .track span { height: 100%; }
.fbar .n {
  font-family: var(--jd-mono);
  font-size: 0.72rem;
  color: var(--jd-muted);
  font-variant-numeric: tabular-nums;
}
.fbar .n.none { color: var(--jd-faint); }
</style>
