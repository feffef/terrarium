<script setup lang="ts">
// Small icon-button that writes an item's deep-link URL to the clipboard —
// built from the SAME anchor the page-wide accordion in `index.vue` already
// mirrors to `location.hash` (`sessionAnchor`/`digestAnchor` in
// `utils/dashboard.ts`), so the copied link matches exactly what the URL bar
// shows once the item is open. Single-homed here so both feeds (session
// cards, digest rows) share one control instead of two hand-rolled copies.
//
// Lives inside `<JournalDisclosure>`'s clickable head, so its own click and
// keydown must not bubble into the disclosure's toggle — the `.stop`
// modifiers below match the PR-chip precedent in `SessionCard.vue`.
const { anchor, label = 'Copy link to this entry' } = defineProps<{ anchor: string; label?: string }>()

const route = useRoute()
const copied = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | undefined

async function copyLink() {
  const url = `${window.location.origin}${route.path}#${anchor}`
  try {
    await navigator.clipboard.writeText(url)
    copied.value = true
    clearTimeout(resetTimer)
    resetTimer = setTimeout(() => {
      copied.value = false
    }, 1600)
  } catch {
    // Clipboard access can be denied (permissions, insecure context) — the
    // control simply doesn't flip to its "copied" state; nothing else to do.
  }
}

onBeforeUnmount(() => clearTimeout(resetTimer))
</script>

<template>
  <button
    type="button"
    class="copy-link"
    :class="{ copied }"
    :aria-label="copied ? 'Link copied to clipboard' : label"
    :title="copied ? 'Link copied' : label"
    @click.stop="copyLink"
    @keydown.stop
  >
    <svg v-if="!copied" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6.5 9.5 9.5 6.5" />
      <path d="M7 4.2 8.3 2.9a2.2 2.2 0 0 1 3.1 3.1L10 7.3" />
      <path d="M9 11.8 7.7 13.1a2.2 2.2 0 0 1-3.1-3.1L5.9 8.7" />
    </svg>
    <svg v-else viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3.2 8.4 6.4 11.6 12.8 4.8" />
    </svg>
  </button>
</template>

<style scoped>
.copy-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 1.55rem;
  height: 1.55rem;
  padding: 0;
  border: 1px solid var(--jd-line);
  border-radius: 6px;
  background: var(--jd-surface-2);
  color: var(--jd-faint);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.copy-link:hover { color: var(--jd-accent); border-color: var(--jd-accent); }
.copy-link:focus-visible { outline: 2px solid var(--jd-accent); outline-offset: 2px; }
.copy-link.copied { color: var(--jd-accent); border-color: var(--jd-accent); }
</style>
