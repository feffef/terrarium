<script setup lang="ts">
// The exact date is in the visitor's own time zone (issue #1364), which only
// the browser knows: the server renders UTC and the browser swaps it after mount.
// Without `text`, the exact date is the visible text; with it, a hover title.
const props = defineProps<{ at: number; text?: string }>()
const locale = useTinkerfundLocale()
const mounted = ref(false)
onMounted(() => (mounted.value = true))
const exact = computed(() => {
  const date = new Date(props.at).toLocaleString(locale.value, { dateStyle: 'long', timeStyle: 'short', timeZone: mounted.value ? undefined : 'UTC' })
  return mounted.value ? date : `${date} UTC`
})
</script>

<template>
  <time :datetime="new Date(at).toISOString()" :title="text && exact">{{ text ?? exact }}</time>
</template>
