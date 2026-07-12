<template>
  <ClientOnly>
    <div ref="containerRef" class="mermaid-diagram" />
    <template #fallback>
      <pre class="mermaid-diagram-fallback">{{ code }}</pre>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
// Mermaid is client-only (issue #364): it manipulates the DOM directly and
// pulls in a large renderer, so it's dynamically imported at render time (below)
// rather than at module scope — that keeps it out of the SSR bundle and out
// of the default client bundle for pages that never render a diagram.
const props = defineProps<{ code: string }>()

const containerRef = ref<HTMLDivElement | null>(null)
const id = useId()

// Theme the diagram from the host Tenant's palette when it opts in (issue #364
// follow-up). This component is Platform-generic, so it reads a small `--diagram-*`
// contract off its own mounted element — inherited from whichever Tenant wrapper
// it renders under (e.g. journal's `.jd`) — rather than any one Tenant's token
// names; the Tenant maps its own tokens to this contract in its theme CSS
// (docs/agents/tenant-layers.md §2). A Tenant that sets none keeps mermaid's
// default theme. getComputedStyle resolves the vars live, so a Tenant's
// dark-mode token overrides are picked up for free on the next render.
const DIAGRAM_TOKENS: Record<string, string> = {
  primaryColor: '--diagram-node-bg',
  primaryBorderColor: '--diagram-node-border',
  primaryTextColor: '--diagram-node-text',
  lineColor: '--diagram-line',
  fontFamily: '--diagram-font',
  fontSize: '--diagram-font-size',
  edgeLabelBackground: '--diagram-edge-label-bg',
  clusterBkg: '--diagram-cluster-bg',
  clusterBorder: '--diagram-cluster-border',
}

function tenantThemeVariables(el: HTMLElement): Record<string, string> | undefined {
  const styles = getComputedStyle(el)
  const vars: Record<string, string> = {}
  for (const [themeVar, cssVar] of Object.entries(DIAGRAM_TOKENS)) {
    const value = styles.getPropertyValue(cssVar).trim()
    if (value) vars[themeVar] = value
  }
  return Object.keys(vars).length ? vars : undefined
}

// `<ClientOnly>` flips its own `mounted` flag inside ITS OWN `onMounted`, one
// child-mount-order step ahead of this component's `onMounted` — but the
// resulting re-render that actually attaches `containerRef`'s <div> is a
// queued job that flushes on a later microtask, after both onMounted hooks
// have already run synchronously. A plain `onMounted` here raced that swap
// and always found `containerRef.value` still null (issue #364, silent no-op
// — no error, no fallback, just an empty container). Watching the ref instead
// fires exactly once it's actually attached, whenever that happens.
watch(containerRef, async (container) => {
  if (!container) return
  try {
    const mermaid = (await import('mermaid')).default
    const themeVariables = tenantThemeVariables(container)
    mermaid.initialize(themeVariables ? { startOnLoad: false, theme: 'base', themeVariables } : { startOnLoad: false })
    const renderId = `mermaid-${id.replace(/:/g, '')}`
    const { svg } = await mermaid.render(renderId, props.code)
    container.innerHTML = svg
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    container.innerHTML = ''
    const pre = document.createElement('pre')
    pre.textContent = props.code
    const note = document.createElement('p')
    note.className = 'mermaid-diagram-error'
    note.textContent = `Mermaid render failed: ${message}`
    container.append(pre, note)
  }
}, { immediate: true })
</script>

<style scoped>
.mermaid-diagram-fallback {
  white-space: pre-wrap;
}

.mermaid-diagram-error {
  color: var(--diagram-error, #a33);
  font-size: 0.85em;
}
</style>
