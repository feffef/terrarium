<script setup lang="ts">
// A prominent, modal surface for a failed client-side content load (issue #236).
// A Space page's `useAsyncData` query against @nuxt/content's client WASM SQLite
// DB can fail on a client-side navigation and used to render as a *silent*
// permanent blank. This raises a native <dialog> instead: a plain "something
// went wrong" message, a disclosure with the technical detail, and a reload —
// the only reliable recovery, since @nuxt/content poisons its own client DB
// state on a failed load and only a fresh page (server-DB render) recovers.
//
// Driven by the page's `useAsyncData` `status` so it opens on 'error'. The page
// keeps it mounted rather than v-if'ing it, so the dialog isn't torn down and
// re-created as `status` transitions.
//
// One failure class never gets this far: a failed dynamic import of a build
// chunk auto-recovers by reloading instead (ADR-0019's 2026-08-04 amendment).
// Every Space page already mounts this component, so wiring the recovery here
// is what keeps it a single mechanism rather than one per page.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    status: 'idle' | 'pending' | 'success' | 'error'
    error?: unknown
    accent?: string
  }>(),
  { error: undefined, accent: undefined },
)

const route = useRoute()

const dialog = ref<HTMLDialogElement | null>(null)

function sync() {
  if (props.status === 'error' && recoverFromContentLoadError(props.error)) return
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
  const lines = [`route: ${route.path}`]
  const err = props.error as { statusCode?: number; statusMessage?: string; message?: string } | undefined
  if (err) {
    lines.push(`error: ${err.statusMessage || err.message || String(err)}`)
    if (err.statusCode) lines.push(`status: ${err.statusCode}`)
  }
  return lines.join('\n')
})

function reload() {
  window.location.reload()
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
