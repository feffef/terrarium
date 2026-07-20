<template>
  <!-- The SVG is our own build-time artifact (committed by scripts/render-mermaid.ts,
       gate-checked by verify:mermaid), never user input — so v-html is safe here (ADR-0024). -->
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div v-if="svg" class="mermaid-diagram" v-html="svg" />
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

const svgByKey: Record<string, string> = Object.fromEntries(
  Object.entries(bakedSvgs).map(([path, content]) => [
    path.replace(/^.*\/(.+)\.svg$/, '$1'),
    content,
  ]),
)

const svg = computed(() => svgByKey[mermaidKey(props.code)])
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
