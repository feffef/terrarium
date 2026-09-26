<script setup lang="ts">
import type { TinkerfundAccountCampaign, TinkerfundPledgeChange } from '../../utils/account'
import type { TinkerfundPledge } from '../../utils/cart'

// Changing a Pledge (story #1385): its lines, options, Add-ons and bonus. The
// page checks the change and shows what it costs before anything is saved.
const props = defineProps<{
  campaign: TinkerfundAccountCampaign
  /** What the Pledge holds now: stock it holds stays available to it. */
  pledge: TinkerfundPledge
  /** Where to start editing from, when coming back from the review. */
  start?: TinkerfundPledgeChange
  zone: string
  error?: string
}>()
const emit = defineEmits<{ review: [change: TinkerfundPledgeChange]; close: [] }>()

const whole = (value: unknown) => Math.max(0, Math.floor(Number(value) || 0))
const locale = useTinkerfundLocale()
const money = (amount: number) => formatTinkerfundMoney(amount, locale.value)

const from = props.start ?? props.pledge
const draft = reactive({
  lines: from.lines.map((l) => ({ ...l, options: { ...l.options } })),
  addons: Object.fromEntries((props.campaign.addons ?? []).map((a) => [a.id, from.addons.find((x) => x.id === a.id)?.quantity ?? 0])),
  bonus: from.bonus ?? 0,
})

type Reward = TinkerfundAccountCampaign['rewards'][number]
const held = (id: string) => props.pledge.lines.filter((l) => l.reward === id).reduce((n, l) => n + l.quantity, 0)
const max = (reward: Reward) => tinkerfundMaxQuantity({ ...reward, claimed: reward.claimed - held(reward.id) })
const addonMax = (addon: NonNullable<TinkerfundAccountCampaign['addons']>[number]) =>
  tinkerfundMaxQuantity({ ...addon, claimed: addon.claimed - (props.pledge.addons.find((a) => a.id === addon.id)?.quantity ?? 0) })
const ships = (reward: Reward) => !reward.shipsTo || reward.shipsTo.includes(props.pledge.zone)
const linesOf = (reward: Reward) => draft.lines.filter((l) => l.reward === reward.id)
const wanted = (reward: Reward) => linesOf(reward).reduce((n, l) => n + whole(l.quantity), 0)
const canAdd = (reward: Reward) => ships(reward) && wanted(reward) < max(reward) && (!!reward.options?.length || !linesOf(reward).length)

function addLine(reward: Reward) {
  const options = Object.fromEntries((reward.options ?? []).map((g) => [g.id, g.choices[0]!.id]))
  draft.lines.push({ reward: reward.id, options, quantity: 1 })
}
const removeLine = (line: (typeof draft.lines)[number]) => draft.lines.splice(draft.lines.indexOf(line), 1)

function review() {
  emit('review', {
    lines: draft.lines.map((l) => ({ ...l, quantity: whole(l.quantity) })),
    addons: Object.entries(draft.addons).map(([id, quantity]) => ({ id, quantity: whole(quantity) })),
    bonus: whole(draft.bonus),
  })
}
</script>

<template>
  <form class="editor" aria-label="Change your Pledge" @submit.prevent="review">
    <p class="note">Rewards ship to {{ zone }}. Stock you already hold stays yours while you change it.</p>

    <fieldset v-for="reward in campaign.rewards" :key="reward.id" class="reward tf-panel">
      <legend>{{ reward.title }} <span class="price">{{ money(reward.price) }}</span></legend>
      <p class="facts">
        <span v-if="reward.limit">Max {{ reward.limit }} per Backer</span>
        <span v-if="reward.stock !== undefined">{{ tinkerfundStock({ ...reward, claimed: reward.claimed - held(reward.id) }).label }}</span>
        <span v-if="!reward.shipsTo">Digital</span>
        <span v-if="!ships(reward)" class="flag">Doesn’t ship to {{ zone }}</span>
      </p>
      <div v-for="(line, i) in linesOf(reward)" :key="i" class="line">
        <label v-for="group in reward.options" :key="group.id">
          <span>{{ group.name }}<span class="tf-sr"> of {{ reward.title }} {{ i + 1 }}</span></span>
          <select v-model="line.options[group.id]">
            <option v-for="choice in group.choices" :key="choice.id" :value="choice.id">{{ choice.label }}</option>
          </select>
        </label>
        <label>
          <span>Quantity<span class="tf-sr"> of {{ reward.title }}{{ reward.options?.length ? ` ${i + 1}` : '' }}</span></span>
          <input v-model="line.quantity" type="number" min="0" :max="max(reward)" step="1" inputmode="numeric">
        </label>
        <button type="button" class="link" @click="removeLine(line)">Remove<span class="tf-sr"> {{ reward.title }} {{ i + 1 }}</span></button>
      </div>
      <button v-if="canAdd(reward)" type="button" class="tf-btn add" @click="addLine(reward)">
        {{ linesOf(reward).length ? 'Add another' : 'Add' }}<span class="tf-sr"> {{ reward.title }}</span>
      </button>
    </fieldset>

    <fieldset v-if="campaign.addons?.length" class="reward tf-panel">
      <legend>Add-ons</legend>
      <p class="facts">Add-ons need a Reward from this Campaign.</p>
      <label v-for="addon in campaign.addons" :key="addon.id" class="addon">
        <span>{{ addon.title }} <span class="price">{{ money(addon.price) }}</span></span>
        <input v-model="draft.addons[addon.id]" type="number" min="0" :max="addonMax(addon)" step="1" inputmode="numeric" :aria-label="`Quantity of ${addon.title}`">
      </label>
    </fieldset>

    <fieldset class="reward tf-panel">
      <legend>Bonus support</legend>
      <label class="addon">
        <span>Amount (EUR), whole euros</span>
        <input v-model="draft.bonus" type="number" min="0" step="1" inputmode="numeric">
      </label>
    </fieldset>

    <p v-if="error" class="flag" role="alert">{{ error }}</p>
    <p class="actions">
      <button type="button" class="tf-btn" @click="emit('close')">Keep it as it is</button>
      <button type="submit" class="tf-btn primary">Review changes</button>
    </p>
  </form>
</template>

<style scoped>
.editor { display: grid; gap: 14px; }
.editor > * { margin: 0; }
.note, .facts { color: var(--tf-muted); font-size: 14px; }
.reward { display: grid; gap: 10px; min-width: 0; margin: 0; padding: 14px 16px; }
legend { float: left; width: 100%; padding: 0; font-weight: 700; overflow-wrap: anywhere; }
.price { margin-left: 6px; font: 600 14px/1 var(--tf-mono); color: var(--tf-muted); }
.facts { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 0; }
.facts:empty { display: none; }
.line { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; padding-top: 10px; border-top: var(--tf-hairline); }
.line label, .addon { display: grid; gap: 4px; font-size: 14px; }
.addon { grid-template-columns: 1fr auto; align-items: center; }
select, input { box-sizing: border-box; height: 40px; padding: 6px 8px; border: 1px solid var(--tf-muted); border-radius: var(--tf-radius); background: var(--tf-surface); color: var(--tf-ink); }
input { width: 88px; font: 600 14px/1.2 var(--tf-mono); }
.add { justify-self: start; padding: 7px 12px; }
.link { padding: 8px 0; border: 0; background: none; color: var(--tf-link); text-decoration: underline; cursor: pointer; font-size: 14px; }
.flag { color: var(--tf-bad); font-size: 14px; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; }
</style>
