<script setup lang="ts">
// Replaces a native `title` that relays detail too long to print on screen: it
// shows after a delay few readers wait for. The element is the hint's own root,
// so a caller's class and attributes land on it as they did on the `title` one.
// `align` picks the element's edge the label hangs from: its left edge by default,
// `end` for one near the right edge of its container.
const { text = '', align = 'start' } = defineProps<{ text?: string; align?: 'start' | 'center' | 'end' }>()
const left = { start: '0', center: '50%', end: '100%' }
const on = ref(false)
</script>

<template>
  <span class="hint" @pointerenter="on = true" @pointerleave="on = false">
    <slot />
    <JournalTip v-if="on && text" :align="align" :style="{ left: left[align], bottom: '100%' }">{{ text }}</JournalTip>
  </span>
</template>

<style scoped>
.hint { position: relative; }
</style>
