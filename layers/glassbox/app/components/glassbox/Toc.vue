<script setup lang="ts">
import type { TocLink } from '@nuxt/content'

const props = defineProps<{ links: TocLink[] }>()
const nav = useTemplateRef<HTMLElement>('nav')

const entries = computed(() => props.links.flatMap((link) => [link, ...(link.children ?? [])]))
// The heading being read; a Walkthrough emphasises its stop too.
const current = defineModel<string>('current')
const open = ref(false)
// A Walkthrough stop shows only its number until it is current (design 1b).
const stops = computed(() => Object.fromEntries(entries.value.map((entry) => [entry.id, glassboxStopNumber(entry.text)])))
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
// The bar wraps to as many rows as it needs, so jumped-to headings clear its measured height (theme.css).
let resizes: ResizeObserver | undefined
onMounted(() => {
  track()
  addEventListener('scroll', track, { passive: true })
  addEventListener('resize', track)
  const root = nav.value!.closest<HTMLElement>('.gb')
  // The open mobile panel is not what a heading has to clear once a link closes it.
  resizes = new ResizeObserver(([entry]) => {
    if (!open.value) root?.style.setProperty('--gb-toc-h', `${Math.ceil(entry!.borderBoxSize[0]!.blockSize)}px`)
  })
  resizes.observe(nav.value!)
})
onUnmounted(() => {
  resizes?.disconnect()
  cancelAnimationFrame(frame)
  removeEventListener('scroll', track)
  removeEventListener('resize', track)
})
watch(entries, () => nextTick(track))
</script>

<template>
  <nav ref="nav" class="toc" :class="{ open }" aria-label="On this page" @keydown.esc="open = false">
    <button type="button" class="toggle" :aria-expanded="open" aria-controls="gb-toc-list" @click="open = !open">
      <span class="gb-label">On this page</span>
      <span class="shown">{{ shown }}</span>
      <span class="caret" aria-hidden="true">{{ open ? '▴' : '▾' }}</span>
    </button>
    <span class="gb-label lead">On this page</span>
    <ol id="gb-toc-list">
      <li v-for="entry in entries" :key="entry.id" :class="`depth-${entry.depth}`">
        <a :href="`#${entry.id}`" :aria-current="entry.id === current ? 'location' : undefined" @click="open = false"><span v-if="stops[entry.id]" class="stop" :class="{ only: entry.id !== current }"><span>{{ stops[entry.id]!.n }}</span><span class="title">{{ stops[entry.id]!.title }}</span></span><template v-else>{{ entry.text }}</template></a>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.toc {
  position: sticky;
  top: var(--gb-toc-top);
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 28px 0;
  padding: 6px 8px 6px 16px;
  border: 1px solid var(--gb-pane-edge);
  border-radius: 14px;
  background: var(--gb-bar);
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
.stop .title { margin-left: 0.35em; }
.stop.only .title { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

/* Below 1024px: a collapsed pill under the sticky header. */
@media (max-width: 1023.98px) {
  .toc { display: block; margin: 20px 0; padding: 0; border-radius: 12px; }
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
  .stop.only .title { position: static; width: auto; height: auto; clip-path: none; }
}
</style>
