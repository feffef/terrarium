<script setup lang="ts">
// The condition legend (#527; flattened visitor experience): all six grades in
// the LOCKED decay-then-orthogonal order, each row showing the `.sc` label +
// the SAME terse one-line definition — read from utils/condition.ts, so the
// definition text lives in exactly one place (#527, never authored twice).
// Shown exactly ONCE, on the landing — a find never repeats it, so there is
// nothing left to decode at the point of reading (post-MVP simplification,
// layers/midden/CONTEXT.md).
//
// A quiet hairline (no label) marks where the ladder stops reading as further
// decay and becomes a different axis (the erosion grades above it;
// never-activated / lost below) — a visual hint, not a second copy of prose.
import { CONDITION_GRADES } from '../../utils/condition'

const EROSION_AXIS = new Set(['fresh', 'intact', 'fragmentary', 'dissolved'])
</script>

<template>
  <div class="midden-legend">
    <div
      v-for="c in CONDITION_GRADES"
      :key="c.grade"
      class="midden-legend__row"
      :class="{ 'midden-legend__row--break': !EROSION_AXIS.has(c.grade) && c.grade === 'never-activated' }"
    >
      <span class="sc midden-legend__label">{{ c.label }}</span>
      <span class="midden-legend__def">{{ c.definition }}</span>
    </div>
  </div>
</template>

<style scoped>
.midden-legend {
  display: flex;
  flex-direction: column;
}

.midden-legend__row {
  display: grid;
  grid-template-columns: 10rem 1fr;
  gap: 6px 18px;
  align-items: baseline;
  padding: 8px 0;
  border-top: 1px solid var(--midden-line);
}
.midden-legend__row:first-child {
  border-top: none;
}
.midden-legend__row--break {
  margin-top: 6px;
  border-top: 1px dashed var(--midden-rule);
}

.midden-legend__label {
  font-size: 0.92rem;
  letter-spacing: 0.03em;
  color: var(--midden-ink);
}

.midden-legend__def {
  font-style: italic;
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--midden-muted);
}

@media (max-width: 34rem) {
  .midden-legend__row {
    grid-template-columns: 1fr;
    gap: 2px;
    padding: 10px 0;
  }
}
</style>
