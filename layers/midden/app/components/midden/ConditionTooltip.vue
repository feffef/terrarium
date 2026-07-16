<script setup lang="ts">
// Condition tooltip (#523, Tier-1 interaction): hover or keyboard-focus on a
// grade's glyph reveals that grade's FIXED definition — the same string the
// GradeLegend shows, read from utils/condition.ts (never authored twice, #527).
// A real hover/focus-triggered popup, not a native `title`: it must be styleable
// and testable, and reachable by keyboard. The trigger renders the ConditionGlyph
// (glyph + always-visible label); the bubble adds the definition on demand.
import { conditionMeta, type Grade } from '../../utils/condition'

const props = withDefaults(defineProps<{ grade: Grade; size?: number }>(), { size: 16 })

const meta = computed(() => conditionMeta(props.grade))
const open = ref(false)

function show() {
  open.value = true
}
function hide() {
  open.value = false
}
</script>

<template>
  <span class="midden-tip" @mouseenter="show" @mouseleave="hide">
    <button
      type="button"
      class="tip-trigger"
      :aria-describedby="open ? `tip-${grade}` : undefined"
      @focus="show"
      @blur="hide"
      @keydown.escape="hide"
    >
      <MiddenConditionGlyph :grade="grade" :size="size" />
    </button>
    <span v-if="open" :id="`tip-${grade}`" class="tip-bubble" role="tooltip">
      <span class="tip-grade">{{ meta.label }}</span>
      {{ meta.definition }}
    </span>
  </span>
</template>
