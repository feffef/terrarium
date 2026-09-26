<script setup lang="ts">
import type { TinkerfundHit } from '../../utils/search'

// The WAI-ARIA combobox pattern with native elements, so no library (issue #1361).
// Without JavaScript it is a plain GET form to the results page.
const props = defineProps<{ value?: string; autofocus?: boolean }>()

const { link } = useTinkerfundSpace()
const search = useTinkerfundSearch()
const action = link('/search')
const id = useId()
const input = useTemplateRef<HTMLInputElement>('input')

const term = ref(props.value ?? '')
const hits = ref<TinkerfundHit[]>([])
const open = ref(false)
const active = ref(-1)
const all = computed(() => ({ path: `${action}?q=${encodeURIComponent(term.value.trim())}`, title: `All results for “${term.value.trim()}”` }))
const options = computed<TinkerfundHit[]>(() => [...hits.value.map((h) => ({ ...h, path: link(h.path) })), all.value])
const expanded = computed(() => open.value && hits.value.length > 0)

let timer: ReturnType<typeof setTimeout> | undefined
let asked = 0
function suggest() {
  clearTimeout(timer)
  active.value = -1
  const mine = ++asked
  if (term.value.trim().length < 2) {
    open.value = false
    return
  }
  timer = setTimeout(async () => {
    const found = await search(term.value, 5).catch(() => [])
    if (mine !== asked) return
    hits.value = found
    open.value = true
  }, 120)
}
onUnmounted(() => clearTimeout(timer))
onMounted(() => {
  if (props.autofocus) input.value?.focus()
})

function move(step: number) {
  if (!expanded.value) return suggest()
  const n = options.value.length
  const next = active.value + step
  active.value = next >= n ? -1 : next < -1 ? n - 1 : next
}

function close() {
  open.value = false
  active.value = -1
}

function submit() {
  const option = options.value[active.value]
  close()
  const q = term.value.trim()
  return navigateTo(option ? option.path : q ? { path: action, query: { q } } : action)
}

function leave(e: FocusEvent) {
  if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) close()
}
</script>

<template>
  <form class="search" role="search" :action="action" method="get" @submit.prevent="submit" @focusout="leave">
    <label>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
      <span class="tf-sr">Search Campaigns</span>
      <input
        ref="input"
        v-model="term"
        name="q"
        type="search"
        placeholder="Search Campaigns"
        autocomplete="off"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="expanded"
        :aria-controls="`${id}-list`"
        :aria-activedescendant="active >= 0 ? `${id}-${active}` : undefined"
        @input="suggest"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.esc="close"
      >
    </label>
    <!-- Focus stays in the field, or browsers that don't focus a clicked link close the list before the click lands. -->
    <div v-show="expanded" :id="`${id}-list`" class="list" role="listbox" aria-label="Suggestions" @mousedown.prevent>
      <NuxtLink
        v-for="(option, i) in options"
        :id="`${id}-${i}`"
        :key="option.path"
        :to="option.path"
        role="option"
        tabindex="-1"
        :aria-selected="i === active"
        :class="{ all: i === hits.length }"
        @click="close"
      >
        <span class="title">{{ option.title }}</span>
        <span v-if="option.description" class="desc">{{ option.description }}</span>
      </NuxtLink>
    </div>
    <p v-show="open && !hits.length" class="list none" role="status">No Campaign matches “{{ term.trim() }}”.</p>
  </form>
</template>

<style scoped>
.search { position: relative; }
.search label {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 7px 10px;
  border: 1px solid var(--tf-muted);
  border-radius: var(--tf-radius);
  background: var(--tf-bg);
  color: var(--tf-muted);
}
svg { width: 20px; height: 20px; flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
input { width: 100%; border: 0; background: none; color: var(--tf-ink); }
input::placeholder { color: var(--tf-muted); opacity: 1; }
input:focus-visible { outline: none; }
label:focus-within { outline: 2px solid var(--tf-link); outline-offset: 2px; }

.list {
  position: absolute;
  z-index: 20;
  inset: calc(100% + 6px) 0 auto;
  display: grid;
  padding: 6px;
  border: var(--tf-hairline);
  border-radius: var(--tf-radius);
  background: var(--tf-surface);
  box-shadow: var(--tf-shadow);
}
.list a { display: grid; gap: 2px; padding: 8px 10px; border-radius: 6px; color: var(--tf-ink); text-decoration: none; }
.list a:hover, .list a[aria-selected="true"] { background: var(--tf-bg); }
.list a[aria-selected="true"] { outline: 2px solid var(--tf-link); outline-offset: -2px; }
.title { font-weight: 600; overflow-wrap: anywhere; }
.desc { color: var(--tf-muted); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.list a.all { border-top: var(--tf-hairline); margin-top: 4px; border-radius: 0 0 6px 6px; font: 500 13px/1.4 var(--tf-mono); }
.all .title { font-weight: 500; }
.none { margin: 0; padding: 12px 14px; color: var(--tf-muted); font-size: 14px; }
</style>
