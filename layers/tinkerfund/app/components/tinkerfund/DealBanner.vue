<script setup lang="ts">
defineProps<{
  promotion: {
    title: string
    description?: string
    code?: string
    discount: { percent: number } | { amount: number }
    startAt: number
    endAt?: number
  }
  clock: number
  /** Scheduled Promotions count down to their start. */
  scheduled?: boolean
  /** Where "See all Deals" goes; left out on Deals itself. */
  more?: string
}>()
const locale = useTinkerfundLocale()
</script>

<template>
  <div class="banner" :class="{ scheduled }">
    <p class="tag">{{ scheduled ? 'Starting soon' : 'Deal' }} · {{ formatTinkerfundDiscount(promotion.discount, locale) }}</p>
    <p class="title">{{ promotion.title }}</p>
    <p v-if="promotion.description" class="desc">{{ promotion.description }}</p>
    <p class="terms">
      <span v-if="promotion.code">Use code <code>{{ promotion.code }}</code> at checkout.</span>
      <span v-else>Applied automatically.</span>
      <span v-if="scheduled">
        <TinkerfundTime :at="promotion.startAt" :text="`Starts in ${formatTinkerfundCountdown(tinkerfundCountdown(clock, promotion.startAt))}`" />.
      </span>
      <span v-else-if="promotion.endAt">
        <TinkerfundTime :at="promotion.endAt" :text="`Ends in ${formatTinkerfundCountdown(tinkerfundCountdown(clock, promotion.endAt))}`" />.
      </span>
      <span v-else>No end date.</span>
    </p>
    <NuxtLink v-if="more" class="tf-btn" :to="more">See all Deals</NuxtLink>
  </div>
</template>

<style scoped>
.banner {
  display: grid;
  gap: 6px 18px;
  align-items: center;
  padding: 18px 20px;
  border-radius: var(--tf-radius-panel);
  background: var(--tf-accent-soft);
  border: 1px solid color-mix(in srgb, var(--tf-accent) 40%, var(--tf-line));
}
.scheduled { background: var(--tf-surface); border: var(--tf-hairline); }
@media (min-width: 720px) {
  .banner:has(.tf-btn) { grid-template-columns: 1fr auto; }
  .banner .tf-btn { grid-column: 2; grid-row: 1 / span 4; }
}
p { margin: 0; }
.tag { font: 600 12px/1.2 var(--tf-mono); letter-spacing: 0.06em; text-transform: uppercase; color: var(--tf-ink); }
.scheduled .tag { color: var(--tf-muted); }
.title { font: 800 22px/1.15 var(--tf-font); font-stretch: 82%; }
.desc { max-width: 60ch; }
.terms { display: flex; flex-wrap: wrap; gap: 0 0.3em; color: var(--tf-muted); font-size: 14px; }
code { padding: 1px 6px; border-radius: 4px; background: var(--tf-ink); color: var(--tf-surface); font: 600 13px/1.4 var(--tf-mono); }
.tf-btn { justify-self: start; background: var(--tf-surface); }
</style>
