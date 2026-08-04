<script setup lang="ts">
// Copy-the-deep-link control for one accordion item — a session card or a digest
// row (issue #450).
//
// It MUST be rendered as a sibling of `<JournalDisclosure>`, never inside it:
// the disclosure's root is the whole clickable head, so a click landing on an
// interactive child is spent on that child instead of toggling the accordion
// (PR #480, closed unmerged for exactly that regression). Hosts therefore place
// this absolutely, out of the head's flow — see the `.head-copy`/`.drow-copy`
// rules in SessionCard.vue and the Space landing.
//
// The URL is built from the anchor the page already mirrors into the hash, so
// what lands on the clipboard is the same fragment `openFromHash` re-opens.
const { anchor, what } = defineProps<{ anchor: string, what: string }>()

const route = useRoute()
const copied = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | null = null

const copy = async () => {
  try {
    await navigator.clipboard.writeText(`${window.location.origin}${route.path}#${anchor}`)
    copied.value = true
    if (resetTimer) clearTimeout(resetTimer)
    resetTimer = setTimeout(() => (copied.value = false), 1600)
  } catch {
    // Clipboard unavailable (insecure origin, denied permission) — the control
    // just doesn't confirm rather than surfacing an error, matching the Sparks
    // copy button on the Space landing.
  }
}

onBeforeUnmount(() => {
  if (resetTimer) clearTimeout(resetTimer)
})
</script>

<template>
  <button
    type="button"
    :class="{ copied }"
    :aria-label="copied ? `Link to this ${what} copied` : `Copy a link to this ${what}`"
    :title="copied ? 'Link copied' : 'Copy link'"
    @click="copy"
  >
    <span v-if="copied" class="flash" aria-hidden="true">Copied</span>
    <svg
      class="glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
    >
      <template v-if="copied">
        <path d="M4 12.5 9.5 18 20 6.5" />
      </template>
      <template v-else>
        <rect x="9" y="9" width="11" height="11" rx="2" style="fill: var(--jd-surface)" />
        <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
      </template>
    </svg>
  </button>
</template>

<style scoped>
button {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0;
  background: none;
  border: none;
  color: var(--jd-faint);
  cursor: pointer;
  transition: color 0.15s ease;
}
button:hover { color: var(--jd-accent); }
button.copied { color: var(--jd-accent); }
button:focus-visible { outline: 2px solid var(--jd-accent); outline-offset: 3px; border-radius: 4px; }
.glyph { width: 0.95rem; height: 0.95rem; display: block; }
/* Absolute so the acknowledgement can't reflow the row it sits on — the host
   positions this control out of the head's flow for the same reason. */
.flash {
  position: absolute;
  right: 100%;
  margin-right: 0.3rem;
  font-family: var(--jd-mono);
  font-size: 0.66rem;
  letter-spacing: 0.06em;
  color: var(--jd-accent);
  white-space: nowrap;
}
</style>
