<template>
  <MermaidDiagram v-if="language === 'mermaid'" :code="code" />
  <pre v-else :class="$props.class"><slot /></pre>
</template>

<script setup lang="ts">
// Overrides @nuxtjs/mdc's bundled ProsePre.vue for ```mermaid fenced blocks
// (issue #364); every other language falls through to the stock markup
// unchanged. Lives at the Platform app root because the override is global,
// not per-Tenant — see docs/agents/tenant-layers.md §5 for why.
const { code = '', language = null } = defineProps<{
  code?: string
  language?: string | null
  filename?: string | null
  highlights?: unknown[]
  meta?: string | null
  class?: string | null
}>()
</script>

<style>
pre code .line{display:block}
</style>
