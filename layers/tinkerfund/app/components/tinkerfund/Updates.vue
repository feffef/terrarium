<script setup lang="ts">
import type { TinkerfundUpdate } from '../../types/tinkerfund'

const props = defineProps<{ updates: TinkerfundUpdate[]; now: number }>()
const list = computed(() => tinkerfundUpdates(props.updates, props.now))

// The server never sees the hash, so a linked Update opens once in the browser.
const route = useRoute()
const root = useTemplateRef<HTMLElement>('root')
function openLinked(hash: string) {
  const target = hash.startsWith('#update-') ? document.getElementById(hash.slice(1)) : null
  if (!(target instanceof HTMLDetailsElement) || !root.value?.contains(target)) return
  target.open = true
  target.scrollIntoView()
}
onMounted(() => watch(() => route.hash, openLinked, { immediate: true }))
</script>

<template>
  <ol v-if="list.length" ref="root" class="updates">
    <li v-for="(u, i) in list" :key="u.n">
      <details :id="`update-${u.n}`" :open="i === 0">
        <summary>
          <b>{{ u.title }}</b>{{ ' ' }}<span class="meta">
            <span>Update #{{ u.n }}</span> ·
            <TinkerfundTime :at="u.at" :text="formatTinkerfundAgo(now, u.at)" />
          </span>
        </summary>
        <p v-for="(p, j) in u.paragraphs" :key="j">{{ p }}</p>
      </details>
    </li>
  </ol>
  <p v-else class="empty">No Updates yet.</p>
</template>

<style scoped>
.updates { display: grid; margin: 0; padding: 0; list-style: none; }
.updates > li { border-bottom: var(--tf-hairline); }
summary { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 8px; padding: 12px 0; cursor: pointer; }
summary::-webkit-details-marker { display: none; }
summary::before { content: ''; grid-row: span 2; width: 6px; height: 6px; margin: 6px 4px 0 0; border: solid var(--tf-muted); border-width: 0 2px 2px 0; rotate: -45deg; transition: rotate 0.15s; }
details[open] > summary::before { rotate: 45deg; }
summary b { overflow-wrap: anywhere; }
summary:hover b { text-decoration: underline; }
.meta { grid-column: 2; color: var(--tf-muted); font: 500 12px/1.4 var(--tf-mono); }
details > p { margin: 0 0 12px 20px; }
@media (prefers-reduced-motion: reduce) { summary::before { transition: none; } }
.empty { color: var(--tf-muted); }
</style>
