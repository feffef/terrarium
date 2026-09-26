<script setup lang="ts">
// Relative up front, the exact date on hover in the visitor's own time zone
// (issue #1364) — which only the browser knows, so it is set after mount.
const props = defineProps<{ at: number; text: string }>()
const exact = ref<string>()
onMounted(() => {
  exact.value = new Date(props.at).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })
})
</script>

<template>
  <time :datetime="new Date(at).toISOString()" :title="exact">{{ text }}</time>
</template>
