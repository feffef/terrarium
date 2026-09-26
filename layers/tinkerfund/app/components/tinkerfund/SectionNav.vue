<script setup lang="ts">
// Anchor links, not tabs: every section stays on the page (issue #1375).
const props = defineProps<{ sections: { id: string; label: string; count?: number }[] }>()
const nav = useTemplateRef<HTMLElement>('nav')
const current = ref(props.sections[0]?.id)

let frame = 0
function update() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    const line = (nav.value?.getBoundingClientRect().bottom ?? 0) + 24
    const tops = props.sections.flatMap(({ id }) => {
      const el = document.getElementById(id)
      return el ? [{ id, top: el.getBoundingClientRect().top }] : []
    })
    current.value = currentTinkerfundSection(tops, line) ?? current.value
  })
}
onMounted(() => {
  update()
  addEventListener('scroll', update, { passive: true })
  addEventListener('resize', update, { passive: true })
})
onUnmounted(() => {
  cancelAnimationFrame(frame)
  removeEventListener('scroll', update)
  removeEventListener('resize', update)
})
</script>

<template>
  <nav ref="nav" class="sections" aria-label="Sections">
    <a
      v-for="s in sections"
      :key="s.id"
      :href="`#${s.id}`"
      :aria-current="s.id === current ? 'location' : undefined"
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
