<script setup lang="ts">
import type { TinkerfundPledgeChange } from '../../../../../../utils/account'
import type { TinkerfundPledge } from '../../../../../../utils/cart'

// One Pledge (story #1385): the Confirmation's receipt, printable, and — while
// its Campaign is Live — a change with a priced review, or a cancel.
definePageMeta({ viewTransition: true })

const route = useRoute()
const { space, collections } = useSpace('tinkerfund')
const locale = useTinkerfundLocale()
const money = (amount: number) => formatTinkerfundMoney(amount, locale.value)

const { data: shop, status, error } = await useAsyncData(`tinkerfund-pledge-shop-${space}`, () => queryCollection(collections.shop).first())
const { loaded, pledges, baked, catalog, now, revise, cancel } = await useTinkerfundCart()

const reference = computed(() => String(route.params.ref))
const held = computed(() =>
  tinkerfundAccountPledges(pledges.value, baked.value, catalog.value, now.value, shop.value?.payments[0]?.id ?? '')
    .find((a) => a.pledge.ref === reference.value))
const entry = computed(() => held.value && catalog.value[held.value.pledge.campaign])
const receiptOf = (pledge: TinkerfundPledge) => tinkerfundReceipt(pledge, entry.value!)
const receipt = computed(() => held.value && entry.value && receiptOf(held.value.pledge))
const zoneName = computed(() => {
  const zone = held.value?.pledge.zone
  return shop.value?.zones.find((z) => z.id === zone)?.name ?? zone ?? ''
})
const payment = computed(() => shop.value?.payments.find((p) => p.id === held.value?.pledge.payment)?.label ?? held.value?.pledge.payment)

const mode = ref<'view' | 'edit' | 'review'>('view')
const proposal = ref<{ change: TinkerfundPledgeChange; pledge: TinkerfundPledge }>()
const refusal = ref<string>()
const done = ref<string>()
const heading = ref<HTMLElement>()
watch(mode, () => nextTick(() => heading.value?.focus()))

function edit() {
  proposal.value = undefined
  refusal.value = undefined
  done.value = undefined
  mode.value = 'edit'
}
function review(change: TinkerfundPledgeChange) {
  const { pledge, error } = reviseTinkerfundPledge(held.value!.pledge, change, entry.value!, now.value)
  refusal.value = error
  if (!pledge) return
  proposal.value = { change, pledge }
  mode.value = 'review'
}
function confirm() {
  refusal.value = revise(held.value!.pledge, proposal.value!.change)
  if (refusal.value) return
  done.value = 'Your Pledge is changed.'
  mode.value = 'view'
}
function withdraw() {
  refusal.value = cancel(held.value!.pledge)
  if (!refusal.value) done.value = 'Your Pledge is cancelled. Nothing will be charged.'
}

const difference = computed(() => proposal.value && receipt.value ? tinkerfundCents(receiptOf(proposal.value.pledge).total - receipt.value.total) : 0)
const signed = (amount: number) => (amount > 0 ? `+${money(amount)}` : amount < 0 ? `−${money(-amount)}` : 'No change')
const print = () => window.print()

useSeoMeta(tinkerfundSeo({ kind: 'private', space, title: `Pledge ${reference.value}` }))
</script>

<template>
  <TinkerfundShell :space="space">
    <div class="pledge-page">
      <p class="back tf-noprint"><NuxtLink :to="tinkerfundPath(space, '/account')">← Your account</NuxtLink></p>
      <h1 v-if="!loaded">Opening your Pledge…</h1>
      <section v-else-if="!held || !receipt || !entry" class="empty tf-panel">
        <h1>No Pledge to show</h1>
        <p>Pledge {{ reference }} belongs to a tab that has since closed, or to a demo that was reset.</p>
        <NuxtLink class="tf-btn primary" :to="tinkerfundPath(space, '/account')">Back to your account</NuxtLink>
      </section>

      <template v-else-if="mode === 'view'">
        <header class="intro">
          <p class="tf-label">Receipt · Pledge {{ held.pledge.ref }}</p>
          <h1 ref="heading" tabindex="-1">{{ receipt.title }}</h1>
          <TinkerfundPledgeState :state="held.state" />
        </header>
        <p v-if="done" class="done" role="status">{{ done }}</p>
        <dl class="facts tf-panel">
          <div><dt>Placed</dt><dd><TinkerfundTime :at="held.pledge.placed" /></dd></div>
          <div><dt>Paid with</dt><dd>{{ payment }}</dd></div>
          <div><dt>Ships to</dt><dd>{{ zoneName }}</dd></div>
        </dl>
        <TinkerfundPledgeSummary
          :space="space"
          :pledge="receipt"
          :zone="zoneName"
          :reference="held.pledge.ref"
          :ends-at="held.state === 'pending' ? held.endsAt : undefined"
        />
        <p v-if="held.state === 'cancelled'" class="status">Cancelled <TinkerfundTime :at="held.pledge.cancelled!" />. Nothing was charged.</p>
        <p v-else-if="held.state === 'unfunded'" class="status">Not charged: the Campaign ended <TinkerfundTime :at="held.endsAt" /> short of its goal.</p>
        <p v-else-if="held.state !== 'pending'" class="status">
          Charged when the Campaign was funded, <TinkerfundTime :at="held.endsAt" />.{{ held.state === 'delivered' ? ' Delivered.' : '' }}
        </p>
        <p v-else-if="refusal" class="refusal" role="alert">{{ refusal }}</p>
        <div class="actions tf-noprint">
          <button type="button" class="tf-btn" @click="print">Print receipt</button>
          <template v-if="!held.locked">
            <button type="button" class="tf-btn primary" @click="edit">Change Pledge</button>
            <TinkerfundCancelPledge :reference="held.pledge.ref" :title="receipt.title" @confirm="withdraw" />
          </template>
          <p v-else-if="held.state !== 'cancelled'" class="locked">Locked: its Campaign has ended.</p>
        </div>
      </template>

      <template v-else-if="mode === 'edit'">
        <header class="intro">
          <p class="tf-label">Pledge {{ held.pledge.ref }} · {{ receipt.title }}</p>
          <h1 ref="heading" tabindex="-1">Change</h1>
        </header>
        <TinkerfundPledgeEditor
          :campaign="entry.campaign"
          :pledge="held.pledge"
          :start="proposal?.change"
          :zone="zoneName"
          :error="refusal"
          @review="review"
          @close="mode = 'view'"
        />
      </template>

      <template v-else-if="proposal">
        <header class="intro">
          <p class="tf-label">Pledge {{ held.pledge.ref }} · {{ receipt.title }}</p>
          <h1 ref="heading" tabindex="-1">Review changes</h1>
        </header>
        <TinkerfundPledgeSummary :space="space" :pledge="receiptOf(proposal.pledge)" :zone="zoneName" note="Your Pledge, once changed" />
        <dl class="difference tf-panel">
          <div><dt>Was</dt><dd>{{ money(receipt.total) }}</dd></div>
          <div><dt>Now</dt><dd>{{ money(receiptOf(proposal.pledge).total) }}</dd></div>
          <div class="total"><dt>Difference</dt><dd>{{ signed(difference) }}</dd></div>
        </dl>
        <p class="note">Still pending: you’re only charged if the Campaign is funded, when it ends on <TinkerfundTime :at="held.endsAt" />.</p>
        <p v-if="refusal" class="refusal" role="alert">{{ refusal }}</p>
        <p class="actions">
          <button type="button" class="tf-btn" @click="mode = 'edit'">Back to changes</button>
          <button type="button" class="tf-btn primary" @click="confirm">Confirm changes</button>
        </p>
      </template>
    </div>
    <ContentLoadErrorDialog :status="status" :error="error" :context="route.path" />
  </TinkerfundShell>
</template>

<style scoped>
.pledge-page { display: grid; gap: 16px; max-width: 760px; }
.back { margin: 0; font-size: 14px; }
.empty { display: grid; gap: 14px; justify-items: start; margin: 0; padding: 22px; }
.empty > * { margin: 0; }
.intro { display: grid; gap: 8px; }
.intro > * { margin: 0; }
h1 { margin: 0; outline: none; font: 800 clamp(30px, 4vw, 42px)/1.05 var(--tf-font); font-stretch: 78%; overflow-wrap: anywhere; }
.facts, .difference { display: grid; gap: 6px; margin: 0; padding: 14px 16px; }
.facts div, .difference div { display: flex; justify-content: space-between; gap: 12px; }
dt { color: var(--tf-muted); }
dd { margin: 0; text-align: right; }
.difference dd { font: 600 15px/1.4 var(--tf-mono); font-variant-numeric: tabular-nums; }
.difference .total { padding-top: 8px; border-top: var(--tf-hairline); }
.difference .total dt { color: var(--tf-ink); font-weight: 600; }
.done { margin: 0; padding: 10px 14px; border-radius: var(--tf-radius); background: var(--tf-accent-soft); }
.status, .note, .locked { margin: 0; color: var(--tf-muted); }
.refusal { margin: 0; color: var(--tf-bad); }
.actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 0; }
</style>
