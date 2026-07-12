<template>
  <MermaidDiagram v-if="isMermaidLanguage(language)" :code="code" />
  <pre v-else :class="$props.class"><slot /></pre>
</template>

<script setup lang="ts">
// Overrides @nuxtjs/mdc's bundled ProsePre.vue for ```mermaid fenced blocks
// (issue #364); every other language falls through to the stock markup
// unchanged. Lives at the Platform app root because the override is global,
// not per-Tenant — see docs/agents/tenant-layers.md §4 for why. `isMermaidLanguage`
// and `MermaidDiagram` resolve via Nuxt auto-import — no import needed (§1).
const { code, language } = withDefaults(
  defineProps<{
    code?: string
    language?: string | null
    filename?: string | null
    highlights?: unknown[]
    meta?: string | null
    class?: string | null
  }>(),
  {
    code: '',
    language: null,
    filename: null,
    highlights: () => [],
    meta: null,
    class: null,
  },
)
</script>

<style>
pre code .line{display:block}
</style>
