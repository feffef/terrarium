<script setup lang="ts">
// Frictions rendered as soil strata — the accumulated sediment the future
// `codify`/`consolidate` jobs mine (CONTEXT.md). `full` is the panel readout
// (strata + legend); `inline` is the compact per-session bar on a card.
import type { Severity } from '../../types/journal'

withDefaults(
  defineProps<{
    counts: Record<Severity, number>
    total: number
    variant?: 'full' | 'inline'
  }>(),
  { variant: 'full' },
)

const ORDER: Severity[] = ['nit', 'minor', 'moderate', 'major', 'blocker']
const sevVar = (s: Severity) => `var(--jd-sev-${s})`
</script>

<template>
  <!-- Compact bar for a session card -->
  <div v-if="variant === 'inline'" class="fbar">
    <template v-if="total > 0">
      <span class="track">
        <template v-for="s in ORDER" :key="s">
          <span v-if="counts[s] > 0" :style="{ flex: counts[s], background: sevVar(s) }" />
        </template>
      </span>
      <span class="n">{{ total }} friction{{ total === 1 ? '' : 's' }}</span>
    </template>
    <span v-else class="n none">no frictions</span>
  </div>

  <!-- Full panel readout -->
  <div v-else>
    <template v-if="total > 0">
      <div
        class="strata"
        role="img"
        :aria-label="`Friction severity: ${ORDER.map((s) => counts[s] + ' ' + s).join(', ')}`"
      >
        <template v-for="s in ORDER" :key="s">
          <div v-if="counts[s] > 0" class="seg" :style="{ flex: counts[s], background: sevVar(s) }">
            <b>{{ counts[s] }}</b>
          </div>
          <div v-else class="seg empty"><b>0</b></div>
        </template>
      </div>
      <div class="legend">
        <div v-for="s in ORDER" :key="s" class="item">
          <span class="sw" :style="{ background: sevVar(s) }" />{{ s }}<span class="c">{{ counts[s] }}</span>
        </div>
      </div>
    </template>
    <p v-else class="empty-note">No frictions logged in this Space yet.</p>
  </div>
</template>

<style scoped>
/* inline */
.fbar { display: flex; align-items: center; gap: 0.55rem; }
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

/* full */
.strata {
  display: flex;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px var(--jd-line);
}
.seg {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.seg b {
  font-family: var(--jd-mono);
  font-size: 0.72rem;
  color: #fff;
  padding-bottom: 0.3rem;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.35);
}
.seg.empty {
  flex: 0 0 26px;
  background: var(--jd-surface-2);
  box-shadow: inset 1px 0 0 var(--jd-line);
}
.seg.empty b { color: var(--jd-faint); text-shadow: none; }
.legend {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem 0.9rem;
  margin-top: 0.9rem;
}
.legend .item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--jd-muted);
}
.legend .sw { width: 10px; height: 10px; border-radius: 3px; flex: none; }
.legend .item .c {
  margin-left: auto;
  font-family: var(--jd-mono);
  font-variant-numeric: tabular-nums;
  color: var(--jd-ink);
}
.empty-note { margin: 0; color: var(--jd-faint); font-size: 0.85rem; }
</style>
