<script setup lang="ts">
import type { VNode } from 'vue'
import { parseLineRange } from '../../../page-refs.ts'

const props = defineProps<{ lines?: string }>()
const slots = useSlots()
const page = inject(glassboxRevisionKey)!

// `:file[path]` passes the path as its slot text.
const path = () => (slots.default?.() ?? []).map((v: VNode) => (typeof v.children === 'string' ? v.children : '')).join('').trim()
</script>

<template>
  <a class="file" :href="glassboxFileUrl(path(), page?.revision ?? '', parseLineRange(props.lines))"><slot /></a>
</template>

<style scoped>
.file {
  font: 0.82em "JetBrains Mono", monospace;
  color: var(--gb-accent);
  text-decoration: underline 1px dotted;
  text-underline-offset: 4px;
}
</style>
