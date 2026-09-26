<script setup lang="ts">
import type { TinkerfundComment } from '../../types/tinkerfund'

const props = defineProps<{ comment: Omit<TinkerfundComment, 'replies'>; now: number }>()
const at = computed(() => resolveTinkerfundOffset(props.comment.posted, props.now))
</script>

<template>
  <article class="comment">
    <header>
      <b>{{ comment.author }}</b>
      <span v-if="comment.inventor" class="flag">Inventor</span>
      <TinkerfundTime class="when" :at="at" :text="formatTinkerfundAgo(now, at)" />
    </header>
    <p>{{ comment.text }}</p>
  </article>
</template>

<style scoped>
header { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; }
b { overflow-wrap: anywhere; }
.flag { padding: 1px 6px; border-radius: 5px; background: var(--tf-ink); color: var(--tf-surface); font: 600 11px/1.4 var(--tf-mono); text-transform: uppercase; letter-spacing: 0.06em; }
.when { color: var(--tf-muted); font: 500 12px/1.4 var(--tf-mono); }
p { margin: 4px 0 0; }
</style>
