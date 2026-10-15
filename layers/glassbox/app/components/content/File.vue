<script setup lang="ts">
import { parseLineRange } from '../../../page-refs.ts'

const props = defineProps<{ lines?: string }>()
const slots = useSlots()
const injected = inject(glassboxRevisionKey, undefined)
const page = computed(() => injected?.value)
const path = () => glassboxSlotText(slots)
</script>

<template>
  <component :is="page ? 'a' : 'span'" class="file" :href="page && glassboxFileUrl(path(), page.revision, parseLineRange(props.lines))"><slot /></component>
</template>

<style scoped>
.file {
  font: 0.82em var(--gb-mono, monospace);
  color: var(--gb-accent);
  text-decoration: underline 1px dotted;
  text-underline-offset: 4px;
}
span.file {
  color: inherit;
  text-decoration: none;
}
</style>
