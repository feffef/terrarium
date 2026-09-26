<script setup lang="ts">
import type { TinkerfundAddon } from '../../types/tinkerfund'
import type { TinkerfundCartRequest } from '../../utils/cart'

const props = defineProps<{
  slug: string
  addons: TinkerfundAddon[]
  state: CampaignState
  /** No Reward from this Campaign in the Cart yet, so an Add-on can't be had (issue #1365). */
  needsReward?: boolean
  /** Why the Cart turned an Add-on away, keyed `addon:<id>`. */
  refusals?: Record<string, string>
}>()
const emit = defineEmits<{ add: [request: TinkerfundCartRequest] }>()
const locale = useTinkerfundLocale()
const rows = computed(() => props.addons.map((addon) => ({ addon, stock: tinkerfundStock(addon) })))
</script>

<template>
  <div class="wrap">
    <p v-if="needsReward && state === 'live'" class="hint">Add a Reward to your Cart first: Add-ons come with one.</p>
    <ul class="addons">
      <li v-for="{ addon, stock } in rows" :key="addon.id">
        <div class="what">
          <b>{{ addon.title }}</b>
          <span v-if="addon.description" class="desc">{{ addon.description }}</span>
          <span v-if="stock.label" class="stock" :class="{ scarce: stock.soldOut }">{{ stock.label }}</span>
          <span v-if="refusals?.[`addon:${addon.id}`]" class="scarce" role="alert">{{ refusals[`addon:${addon.id}`] }}</span>
        </div>
        <span class="price">{{ formatTinkerfundMoney(addon.price, locale) }}</span>
        <button
          type="button"
          class="tf-btn"
          :disabled="state !== 'live' || stock.soldOut || needsReward"
          :aria-label="`Add ${addon.title} to cart`"
          @click="emit('add', { campaign: slug, addon: addon.id, quantity: 1 })"
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
