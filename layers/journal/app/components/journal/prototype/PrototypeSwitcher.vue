<script setup lang="ts">
// THROWAWAY — prototype-only. Floating bottom-bar switcher for the "how should an
// external session be marked" UI prototype (see NOTES.md next to this file).
// Delete this whole `prototype/` folder once a variant is picked and folded in.
const { variants, current } = defineProps<{ variants: string[]; current: string }>()
const emit = defineEmits<{ pick: [string] }>()

const labels: Record<string, string> = {
  A: 'A — inline tag',
  B: 'B — card treatment',
  C: 'C — grouped section',
}

const cycle = (dir: 1 | -1) => {
  const i = variants.indexOf(current)
  const next = variants[(i + dir + variants.length) % variants.length]
  emit('pick', next)
}

const onKey = (e: KeyboardEvent) => {
  const el = document.activeElement
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable)) return
  if (e.key === 'ArrowLeft') cycle(-1)
  if (e.key === 'ArrowRight') cycle(1)
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="switcher" role="toolbar" aria-label="Prototype variant switcher">
    <button type="button" aria-label="Previous variant" @click="cycle(-1)">←</button>
    <span class="label">{{ labels[current] ?? current }}</span>
    <button type="button" aria-label="Next variant" @click="cycle(1)">→</button>
  </div>
</template>

<style scoped>
.switcher {
  position: fixed;
  left: 50%;
  bottom: 1.25rem;
  transform: translateX(-50%);
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.5rem 0.4rem 0.9rem;
  background: #1a1a1a;
  color: #fff;
  border-radius: 999px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
  font: 600 0.78rem ui-monospace, monospace;
}
.label { min-width: 12ch; text-align: center; }
button {
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
}
button:hover { background: rgba(255, 255, 255, 0.24); }
</style>
