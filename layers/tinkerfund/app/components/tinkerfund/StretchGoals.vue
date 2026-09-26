<script setup lang="ts">
import type { TinkerfundStretchGoal } from '../../types/tinkerfund'

defineProps<{ goals: TinkerfundStretchGoal[]; pledged: number }>()
const locale = useTinkerfundLocale()
</script>

<template>
  <ul class="goals">
    <li v-for="goal in goals" :key="goal.id" :class="{ yes: pledged >= goal.amount }">
      <span class="box" aria-hidden="true">{{ pledged >= goal.amount ? '✓' : '' }}</span>
      <span class="amount">{{ formatTinkerfundMoney(goal.amount, locale) }}</span>
      <span>{{ goal.title }}</span>
      <span class="tf-sr">{{ pledged >= goal.amount ? '(unlocked)' : '(not yet)' }}</span>
    </li>
  </ul>
</template>

<style scoped>
.goals { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
li { display: grid; grid-template-columns: 22px 90px 1fr; gap: 12px; align-items: center; padding: 10px 0; border-bottom: var(--tf-hairline); }
.box { display: grid; place-items: center; width: 20px; height: 20px; border: 1.5px solid var(--tf-muted); border-radius: 4px; font-size: 13px; line-height: 1; }
.yes .box { border-color: var(--tf-accent); background: var(--tf-accent); color: var(--tf-accent-ink); }
.amount { font: 600 14px/1 var(--tf-mono); font-variant-numeric: tabular-nums; }
li:not(.yes) { color: var(--tf-muted); }
</style>
