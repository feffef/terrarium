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
    mermaid.initialize({ startOnLoad: false })
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
  color: var(--jd-accent, #a33);
  font-size: 0.85em;
}
</style>
