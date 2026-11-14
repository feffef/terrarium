<script setup lang="ts">
// Replaces a native `title` that relays detail too long to print on screen: it
// shows after a delay few readers wait for. The element is the hint's own root,
// so a caller's class and attributes land on it as they did on the `title` one.
// `end` hangs the label from the element's right edge, for one near the right
// edge of its container; otherwise it hangs from the left edge.
const { text = '', align = 'start' } = defineProps<{ text?: string; align?: 'start' | 'end' }>()
const shown = ref(false)
</script>

<template>
  <span class="hint" @pointerenter="shown = true" @pointerleave="shown = false">
    <slot />
    <JournalTip v-if="shown && text" :align="align" :style="{ left: align === 'end' ? '100%' : '0', bottom: '100%' }">{{ text }}</JournalTip>
  </span>
</template>

<style scoped>
.hint { position: relative; }
</style>
