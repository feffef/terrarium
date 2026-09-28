<script setup lang="ts">
// A plain string with its jargon glossed (issue #1463). Given `parts`, renders
// a page-level first-use split; alone, glosses every term's first use in `text`
// — the form a lone catalogNote outside a dig report uses (#1464).
import type { MiddenGlossPart } from '../../utils/gloss'

const props = defineProps<{ text: string; parts?: MiddenGlossPart[] }>()
const shown = computed(() => props.parts ?? middenGlossParts(props.text, new Set()))
</script>

<template>
  <template v-for="(part, i) in shown" :key="i">
    <template v-if="typeof part === 'string'">{{ part }}</template>
    <MiddenGloss v-else :term="part.key">{{ part.text }}</MiddenGloss>
  </template>
</template>
