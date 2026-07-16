<script setup lang="ts">
// A prominent, modal surface for a failed client-side content load (issue #236).
// A Space page's `useAsyncData` query against @nuxt/content's client WASM SQLite
// DB can fail on a client-side navigation and used to render as a *silent*
// permanent blank. This raises a native <dialog> instead: a plain "something
// went wrong" message, a disclosure with the technical detail (the error, plus
// the __content_db_errors ring buffer if any tool wrote one), and a reload —
// the only reliable recovery, since @nuxt/content poisons its own client DB
// state on a failed load and only a fresh page (server-DB render) recovers.
//
// Driven by the page's `useAsyncData` `status` so it opens on 'error'. The page
// keeps it mounted rather than v-if'ing it, so the dialog isn't torn down and
// re-created as `status` transitions.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    status: 'idle' | 'pending' | 'success' | 'error'
    error?: unknown
    accent?: string
    context?: string
  }>(),
  { error: undefined, accent: undefined, context: undefined },
)

const dialog = ref<HTMLDialogElement | null>(null)

function sync() {
  const el = dialog.value
  if (!el || typeof el.showModal !== 'function') return
  if (props.status === 'error' && !el.open) el.showModal()
  else if (props.status === 'success' && el.open) el.close()
}
watch(() => props.status, sync)
// `status` can already be 'error' by the time this mounts (a client-nav load
// that failed before paint), so sync once on mount too.
onMounted(sync)
onBeforeUnmount(() => dialog.value?.open && dialog.value.close())

const details = computed(() => {
  const lines: string[] = []
  if (props.context) lines.push(`route: ${props.context}`)
  const err = props.error as { statusCode?: number; statusMessage?: string; message?: string } | undefined
  if (err) {
    lines.push(`error: ${err.statusMessage || err.message || String(err)}`)
    if (err.statusCode) lines.push(`status: ${err.statusCode}`)
  }
  if (import.meta.client) {
    try {
      const log = JSON.parse(window.localStorage.getItem('__content_db_errors') || '[]')
      if (Array.isArray(log) && log.length) {
        lines.push('recent content-db errors:', JSON.stringify(log.slice(-5), null, 2))
      }
    } catch {
      /* details are best-effort */
    }
  }
  return lines.join('\n') || 'No additional detail was captured.'
})

function reload() {
  if (import.meta.client) window.location.reload()
}
</script>

<template>
  <dialog
    ref="dialog"
    class="cle-dialog"
    aria-labelledby="cle-title"
    :style="accent ? { '--cle-accent': accent } : undefined"
  >
    <h2 id="cle-title" class="cle-title">Something went wrong</h2>
    <p class="cle-body">
      This content couldn’t be loaded. Reloading the page usually fixes it.
    </p>

    <div class="cle-actions">
      <button type="button" class="cle-btn cle-btn--primary" autofocus @click="reload">
        Reload page
      </button>
    </div>

    <details class="cle-details">
      <summary>Technical details</summary>
      <pre class="cle-pre">{{ details }}</pre>
    </details>
  </dialog>
</template>

<style scoped>
.cle-dialog {
  --cle-accent: #2d6cdf;
  max-width: min(32rem, calc(100vw - 2rem));
  border: 1px solid #8886;
  border-radius: 12px;
  padding: 1.4rem 1.5rem;
  color: inherit;
  background: Canvas;
  box-shadow: 0 12px 40px #0004;
  font-family: system-ui, sans-serif;
}
.cle-dialog::backdrop {
  background: #0006;
  backdrop-filter: blur(2px);
}
.cle-title { margin: 0 0 0.4rem; font-size: 1.2rem; }
.cle-body { margin: 0 0 1.1rem; opacity: 0.85; }
.cle-actions { display: flex; flex-wrap: wrap; gap: 0.6rem; }
.cle-btn {
  font: inherit;
  cursor: pointer;
  padding: 0.45rem 1rem;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--cle-accent) 55%, transparent);
  background: color-mix(in srgb, var(--cle-accent) 10%, transparent);
  color: inherit;
}
.cle-btn--primary {
  border-color: var(--cle-accent);
  background: var(--cle-accent);
  color: #fff;
}
.cle-btn:disabled { cursor: default; opacity: 0.6; }
.cle-btn:focus-visible { outline: 2px solid var(--cle-accent); outline-offset: 2px; }
.cle-details { margin-top: 1.1rem; }
.cle-details summary { cursor: pointer; opacity: 0.8; font-size: 0.9rem; }
.cle-pre {
  margin: 0.6rem 0 0;
  padding: 0.7rem 0.8rem;
  max-height: 12rem;
  overflow: auto;
  border-radius: 7px;
  background: #8881;
  font-size: 0.78rem;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
