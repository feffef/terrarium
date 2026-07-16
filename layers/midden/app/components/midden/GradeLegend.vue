<script setup lang="ts">
// The condition ladder (#527; redesign handoff, direction 1d "The condition
// ladder"): all six grades in the LOCKED decay-then-orthogonal order, each row
// showing the glyph + its `.sc` label + the SAME terse one-line definition — all
// read from utils/condition.ts, so the definition text lives in exactly one
// place (#527, never authored twice). A dashed axis-break divider before
// `never-activated` marks where the ladder stops being "further decay" and
// becomes a different axis (the erosion grades above it; never-activated / lost
// below). Self-contained; used on the trench index.
import { CONDITION_GRADES } from '../../utils/condition'

// The axis break falls before the first non-erosion grade. `never-activated`
// and `lost` sit on their own axes (utils/condition.ts) — the divider is drawn
// above whichever grade first leaves the erosion axis.
const EROSION_AXIS = new Set(['fresh', 'intact', 'fragmentary', 'dissolved'])
</script>

<template>
  <div class="midden-ladder">
    <template v-for="c in CONDITION_GRADES" :key="c.grade">
      <div v-if="!EROSION_AXIS.has(c.grade) && c.grade === 'never-activated'" class="mono midden-ladder__break">
        a different axis — not further decay
      </div>
      <div class="midden-ladder__row">
        <span class="midden-ladder__mark">
          <MiddenConditionGlyph :grade="c.grade" :size="22" />
          <span class="sc midden-ladder__label">{{ c.label }}</span>
        </span>
        <span class="midden-ladder__def">{{ c.definition }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.midden-ladder {
  display: flex;
  flex-direction: column;
}

.midden-ladder__break {
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 0.68rem;
  color: var(--midden-faint);
  margin: 14px 0 8px;
  padding-top: 12px;
  border-top: 1px dashed var(--midden-rule);
}

.midden-ladder__row {
  display: grid;
  grid-template-columns: 12rem 1fr;
  gap: 8px 18px;
  align-items: baseline;
  padding: 7px 0;
}

.midden-ladder__mark {
  display: inline-flex;
  align-items: center;
  gap: 9px;
}
.midden-ladder__label {
  font-size: 0.95rem;
  letter-spacing: 0.03em;
  color: var(--midden-ink);
}

.midden-ladder__def {
  font-style: italic;
  font-size: 0.9rem;
  line-height: 1.45;
  color: var(--midden-muted);
}

@media (max-width: 34rem) {
  .midden-ladder__row {
    grid-template-columns: 1fr;
    gap: 2px;
    padding: 9px 0;
  }
}
</style>
