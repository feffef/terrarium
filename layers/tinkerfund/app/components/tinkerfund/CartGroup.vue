<script setup lang="ts">
import type { TinkerfundCartGroup, TinkerfundCartRequest } from '../../utils/cart'

const props = defineProps<{ space: string; group: TinkerfundCartGroup; zone: string }>()
const emit = defineEmits<{ change: [request: TinkerfundCartRequest] }>()

const id = useId()
const money = useTinkerfundMoney()

function setBonus(event: Event) {
  const value = Math.floor(Number((event.target as HTMLInputElement).value))
  emit('change', { campaign: props.group.campaign, bonus: (Number.isFinite(value) && value > 0 ? value : 0) - (props.group.bonus ?? 0) })
}
</script>

<template>
  <section class="group tf-panel" :aria-labelledby="`${id}-h`">
    <header class="head">
      <h2 :id="`${id}-h`"><NuxtLink :to="tinkerfundCampaignPath(space, group.campaign)">{{ group.title }}</NuxtLink></h2>
      <p v-if="group.closed" class="notice">{{ group.closed }}: remove these to check out</p>
    </header>

    <ul class="lines">
      <li v-for="line in group.lines" :key="line.key" :class="{ out: line.unavailable }">
        <div class="what">
          <b>{{ line.title }}</b>
          <span v-if="line.detail" class="detail">{{ line.detail }}</span>
          <span class="each">{{ money(line.price) }} each</span>
          <span v-if="line.unavailable" class="notice">No longer available: {{ line.unavailable }}</span>
          <span v-else-if="!line.ships" class="notice">Doesn’t ship to {{ zone }}</span>
        </div>
        <div class="stepper">
          <button
            type="button"
            :aria-label="`Fewer ${line.title}`"
            :disabled="line.quantity <= 1"
            @click="emit('change', setTinkerfundLine(line, line.quantity - 1))"
          >
            −
          </button>
          <output :aria-label="`Quantity of ${line.title}`">{{ line.quantity }}</output>
          <button
            type="button"
            :aria-label="`More ${line.title}`"
            :disabled="!!line.unavailable || line.quantity >= line.max"
            @click="emit('change', setTinkerfundLine(line, line.quantity + 1))"
          >
            +
          </button>
        </div>
        <span class="amount">{{ money(line.amount) }}</span>
        <button type="button" class="remove" @click="emit('change', setTinkerfundLine(line, 0))">
          Remove<span class="tf-sr"> {{ line.title }}</span>
        </button>
      </li>
      <li v-if="group.bonus" class="bonus">
        <label class="what" :for="`${id}-bonus`">
          <b>{{ group.lines.length ? 'Bonus support' : 'Just support it' }}</b>
          <span class="detail">No Reward, whole euros</span>
        </label>
        <input :id="`${id}-bonus`" type="number" min="1" step="1" inputmode="numeric" :value="group.bonus" :disabled="!!group.closed" @change="setBonus">
        <span class="amount">{{ money(group.closed ? 0 : group.bonus) }}</span>
        <button type="button" class="remove" @click="emit('change', { campaign: group.campaign, bonus: -group.bonus })">
          Remove<span class="tf-sr"> bonus support</span>
        </button>
      </li>
    </ul>

    <dl class="foot">
      <div><dt>Shipping to {{ zone }}</dt><dd>{{ group.shipping ? money(group.shipping) : '—' }}</dd></div>
      <div><dt>Subtotal</dt><dd>{{ money(group.subtotal) }}</dd></div>
    </dl>
  </section>
</template>

<style scoped>
.group { display: grid; gap: 4px; padding: 16px; }
.head { display: grid; gap: 4px; }
h2 { margin: 0; font: 800 20px/1.15 var(--tf-font); font-stretch: 82%; overflow-wrap: anywhere; }
h2 a { color: var(--tf-ink); text-decoration: none; }
h2 a:hover { text-decoration: underline; }
.notice { margin: 0; color: var(--tf-bad); font-size: 14px; }
.lines { display: grid; margin: 0; padding: 0; list-style: none; }
li { display: grid; grid-template-columns: 1fr auto; grid-template-areas: 'what what' 'qty amount' 'remove amount'; gap: 8px 12px; align-items: center; padding: 12px 0; border-bottom: var(--tf-hairline); }
@media (min-width: 620px) {
  li { grid-template-columns: 1fr auto 90px auto; grid-template-areas: 'what qty amount remove'; }
}
.what { grid-area: what; display: grid; gap: 2px; min-width: 0; overflow-wrap: anywhere; }
.out .what b, .out .amount { color: var(--tf-muted); }
.detail, .each { color: var(--tf-muted); font-size: 13px; }
.each { font-family: var(--tf-mono); }
.stepper, .bonus input { grid-area: qty; justify-self: start; }
.stepper { display: inline-flex; border: var(--tf-hairline); border-radius: var(--tf-radius); overflow: hidden; }
.stepper button { width: 36px; min-height: 36px; border: 0; background: none; color: var(--tf-ink); cursor: pointer; font: 600 16px/1 var(--tf-mono); }
.stepper button:disabled { color: var(--tf-muted); cursor: not-allowed; }
.stepper output { display: grid; place-items: center; min-width: 32px; border-inline: var(--tf-hairline); font: 600 14px/1 var(--tf-mono); }
.bonus input { width: 96px; padding: 7px 8px; border: 1px solid var(--tf-muted); border-radius: var(--tf-radius); background: var(--tf-surface); color: var(--tf-ink); font: 600 14px/1.2 var(--tf-mono); }
.amount { grid-area: amount; justify-self: end; font: 600 15px/1 var(--tf-mono); font-variant-numeric: tabular-nums; }
.remove { grid-area: remove; justify-self: start; padding: 4px 0; border: 0; background: none; color: var(--tf-link); text-decoration: underline; cursor: pointer; font-size: 14px; }
.foot { display: grid; gap: 4px; margin: 8px 0 0; }
.foot div { display: flex; justify-content: space-between; gap: 12px; }
.foot dt { color: var(--tf-muted); font-size: 14px; }
.foot dd { margin: 0; font: 600 14px/1.4 var(--tf-mono); }
</style>
