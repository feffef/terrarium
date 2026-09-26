<script setup lang="ts">
import type { TinkerfundBacking } from '../../composables/tinkerfund'
import type { TinkerfundReward } from '../../types/tinkerfund'

const props = defineProps<{ reward: TinkerfundReward; backing: TinkerfundBacking; now: number }>()

const locale = useTinkerfundLocale()
const money = useTinkerfundMoney()
const { zoneName } = await useTinkerfundShop()
const id = useId()
const state = computed(() => props.backing.state)
const refusal = computed(() => props.backing.refusals[`reward:${props.reward.id}`])
const stock = computed(() => tinkerfundStock(props.reward))
const open = computed(() => state.value === 'live' && !stock.value.soldOut)
const max = computed(() => tinkerfundMaxQuantity(props.reward))
const quantity = ref(1)
const options = reactive<Record<string, string>>(
  Object.fromEntries((props.reward.options ?? []).map((g) => [g.id, g.choices[0]!.id])),
)
const ships = computed(() =>
  props.reward.shipsTo ? `Ships to ${props.reward.shipsTo.map(zoneName).join(', ')}` : 'Digital, nothing ships',
)
const button = computed(() => {
  if (state.value === 'upcoming') return 'Opens at launch'
  if (state.value === 'ended') return 'Closed'
  return stock.value.soldOut ? TINKERFUND_SOLD_OUT : 'Add to cart'
})

function step(by: number) {
  quantity.value = Math.min(max.value, Math.max(1, quantity.value + by))
}
function add() {
  props.backing.add({ campaign: props.backing.slug, reward: props.reward.id, options: { ...options }, quantity: quantity.value })
}
</script>

<template>
  <article class="reward" :class="{ out: stock.soldOut }" :aria-labelledby="`${id}-title`">
    <div class="head">
      <h3 :id="`${id}-title`">{{ reward.title }}</h3>
      <p class="price">{{ money(reward.price) }}</p>
    </div>
    <p v-if="reward.description" class="desc">{{ reward.description }}</p>
    <ul class="facts">
      <li v-if="stock.label" :class="{ scarce: stock.soldOut }">{{ stock.label }}</li>
      <li v-if="reward.limit">{{ tinkerfundLimitNotice(reward.limit) }}</li>
      <li>{{ ships }}</li>
      <li>Est. delivery {{ formatTinkerfundMonth(resolveTinkerfundOffset(reward.delivery, now), locale) }}</li>
      <li>{{ reward.claimed.toLocaleString(locale) }} claimed</li>
    </ul>
    <form @submit.prevent="add">
      <fieldset :disabled="!open">
        <legend class="tf-sr">Choose {{ reward.title }}</legend>
        <fieldset v-for="group in reward.options" :key="group.id" class="group">
          <legend class="tf-label">{{ group.name }}</legend>
          <div class="choices">
            <label v-for="choice in group.choices" :key="choice.id">
              <input v-model="options[group.id]" type="radio" :name="`${id}-${group.id}`" :value="choice.id">
              <span>{{ choice.label }}</span>
            </label>
          </div>
        </fieldset>
        <div class="buy">
          <div v-if="open && max > 1" class="tf-stepper">
            <button type="button" aria-label="Fewer" :disabled="quantity <= 1" @click="step(-1)">−</button>
            <output :aria-label="`Quantity of ${reward.title}`" aria-live="polite">{{ quantity }}</output>
            <button type="button" aria-label="More" :disabled="quantity >= max" @click="step(1)">+</button>
          </div>
          <button type="submit" class="tf-btn" :class="{ primary: open }">
            <svg v-if="state === 'ended'" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            {{ button }}
          </button>
        </div>
        <p v-if="refusal" class="refusal" role="alert">{{ refusal }}</p>
      </fieldset>
    </form>
  </article>
</template>

<style scoped>
.reward { display: grid; gap: 10px; padding: 16px; border: var(--tf-hairline); border-radius: 12px; background: var(--tf-surface); }
.reward > * { margin: 0; }
.head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
h3 { margin: 0; font: 700 19px/1.15 var(--tf-font); font-stretch: 88%; overflow-wrap: anywhere; }
.price { margin: 0; font: 600 20px/1 var(--tf-mono); font-variant-numeric: tabular-nums; white-space: nowrap; }
.desc { color: var(--tf-muted); font-size: 14px; }
.facts { display: flex; flex-wrap: wrap; gap: 4px 12px; padding: 0; list-style: none; font: 500 12px/1.4 var(--tf-mono); color: var(--tf-muted); }
.scarce, .refusal { color: var(--tf-bad); }
.refusal { margin: 0; font-size: 14px; }
fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
form > fieldset { display: grid; gap: 10px; }
.group { display: grid; gap: 6px; }
.choices { display: flex; flex-wrap: wrap; border: var(--tf-hairline); border-radius: var(--tf-radius); overflow: hidden; width: fit-content; max-width: 100%; }
.choices label { position: relative; }
.choices input { position: absolute; opacity: 0; }
.choices span { display: block; padding: 7px 11px; border-left: var(--tf-hairline); font: 500 12px/1.2 var(--tf-mono); text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; }
.choices label:first-child span { border-left: 0; }
.choices input:checked + span { background: var(--tf-ink); color: var(--tf-surface); }
.choices input:focus-visible + span { outline: 2px solid var(--tf-link); outline-offset: -2px; }
.buy { display: flex; flex-wrap: wrap; gap: 8px; align-items: stretch; }
.buy .tf-btn { flex: 1; }
:disabled { cursor: not-allowed; }
fieldset:disabled .tf-btn, fieldset:disabled .choices { opacity: 0.6; }
svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
</style>
