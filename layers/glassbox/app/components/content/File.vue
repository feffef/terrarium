<script setup lang="ts">
import type { VNode } from 'vue'
import { parseLineRange } from '../../../page-refs.ts'

const props = defineProps<{ lines?: string }>()
const slots = useSlots()
const injected = inject(glassboxRevisionKey, undefined)
const page = computed(() => injected?.value)

// `:file[path]` passes the path as its slot text.
const path = () => (slots.default?.() ?? []).map((v: VNode) => (typeof v.children === 'string' ? v.children : '')).join('').trim()
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
