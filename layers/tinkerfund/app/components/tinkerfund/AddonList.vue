<script setup lang="ts">
import type { TinkerfundBacking } from '../../composables/tinkerfund'
import type { TinkerfundAddon } from '../../types/tinkerfund'

const props = defineProps<{
  addons: TinkerfundAddon[]
  backing: TinkerfundBacking
  /** No Reward from this Campaign in the Cart yet, so an Add-on can't be had (issue #1365). */
  needsReward?: boolean
}>()
const money = useTinkerfundMoney()
const rows = computed(() => props.addons.map((addon) => ({ addon, stock: tinkerfundStock(addon), refusal: props.backing.refusals[`addon:${addon.id}`] })))
</script>

<template>
  <div class="wrap">
    <p v-if="needsReward && backing.state === 'live'" class="hint">Add a Reward to your Cart first: Add-ons come with one.</p>
    <ul class="addons">
      <li v-for="{ addon, stock, refusal } in rows" :key="addon.id">
        <div class="what">
          <b>{{ addon.title }}</b>
          <span v-if="addon.description" class="desc">{{ addon.description }}</span>
          <span v-if="stock.label" class="stock" :class="{ scarce: stock.soldOut }">{{ stock.label }}</span>
          <span v-if="refusal" class="scarce" role="alert">{{ refusal }}</span>
        </div>
        <span class="price">{{ money(addon.price) }}</span>
        <button
          type="button"
          class="tf-btn"
          :disabled="backing.state !== 'live' || stock.soldOut || needsReward"
          :aria-label="`Add ${addon.title} to cart`"
          @click="backing.add({ campaign: backing.slug, addon: addon.id, quantity: 1 })"
        >
          Add
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.wrap { display: grid; gap: 8px; }
.hint { margin: 0; color: var(--tf-muted); font-size: 14px; }
.addons { display: grid; margin: 0; padding: 0; list-style: none; border: var(--tf-hairline); border-radius: 12px; background: var(--tf-surface); }
li { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: center; padding: 10px 12px; }
li + li { border-top: var(--tf-hairline); }
.what { display: grid; gap: 2px; min-width: 0; overflow-wrap: anywhere; }
.desc, .stock { color: var(--tf-muted); font-size: 13px; }
.stock { font-family: var(--tf-mono); }
.scarce { color: var(--tf-bad); font-size: 13px; }
.price { font: 600 15px/1 var(--tf-mono); font-variant-numeric: tabular-nums; }
.tf-btn { padding: 7px 12px; }
.tf-btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
