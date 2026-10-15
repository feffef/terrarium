<template>
  <!-- Our own committed SVG (ADR-0024), checked script-free by verify:mermaid (app/utils/svg.ts). -->
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div v-if="svg" class="mermaid-diagram" :style="width && { '--diagram-w': width }" v-html="svg" />
  <pre v-else class="mermaid-diagram-fallback">{{ code }}</pre>
</template>

<script setup lang="ts">
// Mermaid is pre-rendered at authoring time to a committed, theme-adaptive SVG
// (issue #379, ADR-0024) — the browser ships ZERO mermaid JS. `ProsePre.vue`
// hands us the fenced source as `code`; we look up its committed SVG by the same
// content-hash key the renderer used (`mermaidKey`, auto-imported from
// app/utils/mermaid.ts) and inject it. The SVG carries live `var(--diagram-*)`
// refs, so it re-themes against the host Tenant's palette and dark mode with no
// JS. A missing SVG (a diagram not yet rendered — the drift gate `verify:mermaid`
// blocks that from shipping) degrades to a `<pre>` of the source.
//
// SSR-safe: the SVGs are bundled by `import.meta.glob` (below) and the lookup is
// deterministic, so server and client render the same markup — no hydration gap,
// and the diagram is present in the initial HTML.
const props = defineProps<{ code: string }>()

// Eagerly bundle every committed SVG as a raw string, keyed by its `<key>.svg`
// basename (== mermaidKey of the source). Vite requires a literal glob path.
const bakedSvgs = import.meta.glob('../assets/mermaid/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const layerFonts = import.meta.glob('../../layers/*/mermaid-font.ts', {
  import: 'default',
  eager: true,
}) as Record<string, MermaidFont>
const route = useRoute()

const svg = computed(() => {
  const font = layerFonts[`../../layers/${route.path.split('/')[2]}/mermaid-font.ts`]
  return bakedSvgs[`../assets/mermaid/${mermaidKey(props.code, font)}.svg`]
})
// The drawn width, for a Tenant that keeps a diagram from scaling below legible
// (glassbox theme.css); set in the server render, so no layout shift.
const width = computed(() => svg.value?.match(/max-width:\s*([\d.]+px)/)?.[1])
</script>

<style scoped>
.mermaid-diagram :deep(svg) {
  max-width: 100%;
  height: auto;
}

.mermaid-diagram-fallback {
  white-space: pre-wrap;
}
</style>

<!-- The default render font, Gelasio (app/utils/mermaid.ts, ADR-0024): ship the
     face the SVG was measured in so labels don't clip under a wider fallback
     (issue #379). A layer with its own font serves it from its own CSS. Unscoped
     so the @font-face is global; it only applies where the baked <style> names it. -->
<style>
@font-face {
  font-family: 'Gelasio';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('../assets/fonts/gelasio-latin-400-normal.woff2') format('woff2');
}
</style>
