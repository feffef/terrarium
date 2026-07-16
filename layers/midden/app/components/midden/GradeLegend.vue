<script setup lang="ts">
// The one shared grade legend (#527): all six condition grades in the LOCKED
// decay-then-orthogonal order, each row showing glyph + label + the SAME terse
// one-line definition — all read from utils/condition.ts, so the definition text
// lives in exactly one place (#527: shown in the legend row, never authored
// twice). Reused in two places by later stories (the stratigraphy-sidebar header
// on a Site page, and as a static reference elsewhere), so it holds NO sidebar-
// specific layout — a self-contained <ul> of rows, like the Atlas RarityLegend.
//
// Optional `tally` (a Record<Grade, number>): when supplied, a per-site count
// renders next to each row ("N of this site's artifacts carry this grade"). The
// tally is the CALLER's to compute — this component only displays what it's given
// and shows nothing in that column when `tally` is omitted.
import { CONDITION_GRADES, type Grade } from '../../utils/condition'

defineProps<{ tally?: Record<Grade, number> }>()
</script>

<template>
  <ul class="midden-legend" :class="{ 'has-tally': tally }">
    <li v-for="c in CONDITION_GRADES" :key="c.grade">
      <MiddenConditionGlyph class="l-mark" :grade="c.grade" />
      <span class="l-def">{{ c.definition }}</span>
      <span
        v-if="tally"
        class="l-tally"
        :class="{ 'is-zero': !tally[c.grade] }"
      >{{ tally[c.grade] ?? 0 }}</span>
    </li>
  </ul>
</template>
