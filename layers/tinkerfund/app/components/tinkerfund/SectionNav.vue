<script setup lang="ts">
// Anchor links, not tabs: every section stays on the page (issue #1375).
const props = defineProps<{ sections: { id: string; label: string; count?: number }[] }>()
const nav = useTemplateRef<HTMLElement>('nav')
const current = ref(props.sections[0]?.id)

const target = (id: string) => document.getElementById(id)
const isSticky = (el: HTMLElement | null) => !!el && getComputedStyle(el).position === 'sticky'

let observer: IntersectionObserver | undefined
let resizes: ResizeObserver | undefined
const inView = new Map<string, boolean>()

// The band from just below the nav to mid-screen is where a section is being read.
function watchSections() {
  const bar = nav.value!
  const line = Number.parseFloat(getComputedStyle(bar).top) + bar.offsetHeight + 24
  observer?.disconnect()
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) inView.set(entry.target.id, entry.isIntersecting)
    current.value = currentTinkerfundSection(
      props.sections.map(({ id }) => ({ id, inView: !!inView.get(id), sticky: isSticky(target(id)) })),
    ) ?? current.value
  }, { rootMargin: `-${line}px 0px -50% 0px` })
  for (const { id } of props.sections) {
    const el = target(id)
    if (el) observer.observe(el)
  }
}

// The band moves when the nav or the sticky site header above it changes size, so it is measured again.
onMounted(() => {
  resizes = new ResizeObserver(watchSections)
  resizes.observe(nav.value!)
  const header = document.querySelector('.tf-header')
  if (header) resizes.observe(header)
})
onUnmounted(() => {
  resizes?.disconnect()
  observer?.disconnect()
})

// A sticky section (desktop Rewards, #1380) is already in view: jumping to it
// would only scroll the page away from what is being read.
function go(event: MouseEvent, id: string) {
  const el = target(id)
  if (!isSticky(el)) return
  event.preventDefault()
  el!.focus({ preventScroll: true })
  current.value = id
}
</script>

<template>
  <nav ref="nav" class="sections" aria-label="Sections">
    <a
      v-for="s in sections"
      :key="s.id"
      :href="`#${s.id}`"
      :aria-current="s.id === current ? 'location' : undefined"
      @click="go($event, s.id)"
    >
      {{ s.label }}<small v-if="s.count !== undefined">{{ s.count }}</small>
    </a>
  </nav>
</template>

<style scoped>
.sections {
  position: sticky;
  top: 60px;
  z-index: 5;
  display: flex;
  overflow-x: auto;
  margin: 28px 0 0;
  border-bottom: var(--tf-hairline);
  background: var(--tf-bg);
  scrollbar-width: none;
}
.sections a {
  display: inline-flex;
  gap: 6px;
  align-items: baseline;
  padding: 14px;
  border-bottom: 2px solid transparent;
  color: var(--tf-muted);
  font: 500 12px/1 var(--tf-mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  text-decoration: none;
  white-space: nowrap;
  transition: color var(--tf-dur) var(--tf-ease), border-color var(--tf-dur) var(--tf-ease);
}
.sections a:hover { color: var(--tf-ink); }
.sections a[aria-current] { border-bottom-color: var(--tf-accent); color: var(--tf-ink); }
small { font: inherit; color: var(--tf-muted); }
</style>
