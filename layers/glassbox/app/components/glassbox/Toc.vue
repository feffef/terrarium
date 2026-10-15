<script setup lang="ts">
interface TocLink { id: string; text: string; depth: number; children?: TocLink[] }
const props = defineProps<{ links: TocLink[] }>()

const entries = computed(() => props.links.flatMap((link) => [link, ...(link.children ?? [])]))
const current = ref<string>()
const open = ref(false)
const shown = computed(() => (entries.value.find((entry) => entry.id === current.value) ?? entries.value[0])?.text)

let frame = 0
function track() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    const headings = entries.value.flatMap(({ id }) => {
      const el = document.getElementById(id)
      return el ? [{ id, top: el.getBoundingClientRect().top }] : []
    })
    const atEnd = scrollY > 0 && innerHeight + scrollY >= document.documentElement.scrollHeight - 2
    current.value = currentGlassboxHeading(headings, innerHeight / 3, atEnd)
  })
}
onMounted(() => {
  track()
  addEventListener('scroll', track, { passive: true })
  addEventListener('resize', track)
})
onUnmounted(() => {
  cancelAnimationFrame(frame)
  removeEventListener('scroll', track)
  removeEventListener('resize', track)
})
watch(entries, () => nextTick(track))
</script>

<template>
  <nav class="toc" :class="{ open }" aria-label="On this page" @keydown.esc="open = false">
    <button type="button" class="toggle" :aria-expanded="open" aria-controls="gb-toc-list" @click="open = !open">
      <span class="gb-label">On this page</span>
      <span class="shown">{{ shown }}</span>
      <span class="caret" aria-hidden="true">{{ open ? '▴' : '▾' }}</span>
    </button>
    <span class="gb-label lead">On this page</span>
    <ol id="gb-toc-list">
      <li v-for="entry in entries" :key="entry.id" :class="`depth-${entry.depth}`">
        <a :href="`#${entry.id}`" :aria-current="entry.id === current ? 'location' : undefined" @click="open = false">{{ entry.text }}</a>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.toc {
  position: sticky;
  top: 12px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 28px 0;
  padding: 6px 8px 6px 16px;
  border: 1px solid var(--gb-pane-edge);
  border-radius: 14px;
  background: color-mix(in srgb, var(--gb-bg) 86%, transparent);
  box-shadow: var(--gb-pane-shadow);
  backdrop-filter: blur(16px);
  font-size: 14.5px;
  line-height: 1.3;
}
.toggle { display: none; }
.lead { flex: none; white-space: nowrap; }
ol { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; margin: 0; padding: 0; list-style: none; }
a {
  display: block;
  padding: 7px 11px;
  border-radius: 9px;
  color: var(--gb-ink);
  text-decoration: none;
}
a:hover { background: var(--gb-tint); }
.depth-3 a { color: var(--gb-muted); }
/* An h2's h3s read as one group ("Why · Watch for", design 1b). */
.depth-3 + .depth-3 { display: flex; align-items: center; margin-left: -8px; }
.depth-3 + .depth-3::before { content: '·'; margin-right: 2px; color: var(--gb-muted); }
.depth-3 + .depth-3 a { padding-left: 4px; }
a[aria-current] { background: var(--gb-solid); color: var(--gb-solid-ink); }

/* Below 1024px: a collapsed pill under the sticky header (.gb-header, theme.css). */
@media (max-width: 1023.98px) {
  .toc { top: 76px; display: block; margin: 20px 0; padding: 0; border-radius: 12px; }
  .lead { display: none; }
  .toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    padding: 0 14px;
    border: 0;
    background: none;
    color: var(--gb-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .shown { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  ol { display: none; }
  .open ol {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 4px 8px 10px;
    border-top: 1px solid var(--gb-line);
  }
  a { display: flex; align-items: center; min-height: 40px; padding: 0 10px; font-size: 15px; }
  .depth-3 a { padding-left: 24px; font-size: 14px; }
  .depth-3 + .depth-3 { display: block; margin: 0; }
  .depth-3 + .depth-3::before { content: none; }
  .depth-3 + .depth-3 a { padding-left: 24px; }
}
</style>
