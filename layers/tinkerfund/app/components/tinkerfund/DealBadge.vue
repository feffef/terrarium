<script setup lang="ts">
import type { TinkerfundPromotion } from '../../types/tinkerfund'

defineProps<{ promotion: Pick<TinkerfundPromotion, 'title' | 'discount'> }>()
const locale = useTinkerfundLocale()
</script>

<template>
  <span class="deal" :title="promotion.title">
    <b>Deal</b> {{ formatTinkerfundDiscount(promotion.discount, locale) }}, applied automatically
  </span>
</template>

<style scoped>
.deal { display: inline-flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 3px 10px 3px 3px; border-radius: var(--tf-radius); background: var(--tf-accent-soft); color: var(--tf-ink); font: 500 13px/1.4 var(--tf-mono); }
/* Accent text on accent-soft misses AA (tokens-contrast.spec.ts), hence the filled chip. */
b { padding: 1px 6px; border-radius: 5px; background: var(--tf-accent); color: var(--tf-accent-ink); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
</style>
