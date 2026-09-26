<script setup lang="ts">
import type { TinkerfundPledgeContents } from '../../../../../../utils/cart'

definePageMeta({ viewTransition: true })

const route = useRoute()
const { space, link } = useTinkerfundSpace()
const money = useTinkerfundMoney()
const [{ zoneName: nameOf, paymentLabel, status, error }, { loaded, account, catalog, preview, revise, cancel }] =
  await Promise.all([useTinkerfundShop(), useTinkerfundCart()])

const reference = computed(() => String(route.params.ref))
const current = computed(() => account.value.find((a) => a.pledge.ref === reference.value))
const entry = computed(() => current.value && catalog.value[current.value.pledge.campaign])
const receipt = computed(() => current.value?.receipt)
const zoneName = computed(() => nameOf(current.value?.pledge.zone))
const payment = computed(() => paymentLabel(current.value?.pledge.payment))

const mode = ref<'view' | 'edit' | 'review'>('view')
const proposal = ref<{ change: TinkerfundPledgeContents; receipt: ReturnType<typeof tinkerfundReceipt> }>()
const refusal = ref<string>()
const done = ref<string>()
const heading = ref<HTMLElement>()
const focusHeading = () => nextTick(() => heading.value?.focus())
watch(mode, focusHeading)
const HEADINGS = { view: 'Receipt', edit: 'Change your Pledge', review: 'Review changes' }

function edit() {
  proposal.value = undefined
  refusal.value = undefined
  done.value = undefined
  mode.value = 'edit'
}
function review(change: TinkerfundPledgeContents) {
  const { state, error } = preview({ type: 'change', ref: reference.value, change })
  const pledge = state.pledges.find((p) => p.ref === reference.value)
  refusal.value = error
  if (error || !pledge) return
  proposal.value = { change, receipt: tinkerfundReceipt(pledge, entry.value!) }
  mode.value = 'review'
}
function confirm() {
  refusal.value = revise(reference.value, proposal.value!.change)
  if (refusal.value) return
  done.value = 'Your Pledge is changed.'
  mode.value = 'view'
}
function withdraw() {
  refusal.value = cancel(reference.value)
  if (refusal.value) return
  done.value = 'Your Pledge is cancelled. Nothing will be charged.'
  focusHeading()
}

const difference = computed(() => proposal.value && receipt.value ? tinkerfundCents(proposal.value.receipt.total - receipt.value.total) : 0)
const print = () => window.print()

useSeoMeta(tinkerfundSeo({ kind: 'private', space, title: `Pledge ${reference.value}` }))
</script>

<template>
  <TinkerfundShell>
    <div class="pledge-page">
      <p class="back tf-noprint"><NuxtLink :to="link('/account')">← Your account</NuxtLink></p>
      <h1 v-if="!loaded" class="tf-h1">Opening your Pledge…</h1>
      <section v-else-if="!current || !receipt || !entry" class="empty tf-panel">
        <h1 class="tf-h1">No Pledge to show</h1>
        <p>Pledge {{ reference }} belongs to a tab that has since closed, or to a demo that was reset.</p>
        <NuxtLink class="tf-btn primary" :to="link('/account')">Back to your account</NuxtLink>
      </section>

      <template v-else>
        <header class="intro">
          <p class="tf-label">{{ mode === 'view' ? receipt.title : `Pledge ${current.pledge.ref} · ${receipt.title}` }}</p>
          <h1 ref="heading" class="tf-h1" tabindex="-1">{{ HEADINGS[mode] }}</h1>
          <TinkerfundPledgeState v-if="mode === 'view'" :state="current.state" />
        </header>
        <!-- Kept in the DOM so a new message is announced (#1401 review). -->
        <p :class="done ? 'done' : 'tf-sr'" role="status">{{ done }}</p>

        <template v-if="mode === 'view'">
          <dl class="facts tf-summary-list text tf-panel">
            <div><dt>Placed</dt><dd><TinkerfundTime :at="current.pledge.placed" /></dd></div>
            <div><dt>Paid with</dt><dd>{{ payment }}</dd></div>
            <div><dt>Ships to</dt><dd>{{ zoneName }}</dd></div>
          </dl>
          <TinkerfundPledgeSummary
            :pledge="receipt"
            :zone="zoneName"
            :reference="current.pledge.ref"
            :ends-at="current.state === 'pending' ? current.endsAt : undefined"
          />
          <p v-if="current.state === 'cancelled'" class="status">Cancelled <TinkerfundTime :at="current.pledge.cancelled!" />. Nothing was charged.</p>
          <p v-else-if="current.state === 'unfunded'" class="status">Not charged: the Campaign ended <TinkerfundTime :at="current.endsAt" /> short of its goal.</p>
          <p v-else-if="current.state !== 'pending'" class="status">
            Charged when the Campaign was funded, <TinkerfundTime :at="current.endsAt" />.{{ current.state === 'delivered' ? ' Delivered.' : '' }}
          </p>
          <p v-else-if="refusal" class="refusal" role="alert">{{ refusal }}</p>
          <div class="actions tf-noprint">
            <button type="button" class="tf-btn" @click="print">Print receipt</button>
            <template v-if="!current.locked">
              <button type="button" class="tf-btn primary" @click="edit">Change Pledge</button>
              <TinkerfundCancelPledge :reference="current.pledge.ref" :title="receipt.title" @confirm="withdraw" />
            </template>
            <p v-else-if="current.state !== 'cancelled'" class="locked">Locked: its Campaign has ended.</p>
          </div>
        </template>

        <TinkerfundPledgeEditor
          v-else-if="mode === 'edit'"
          :campaign="entry.campaign"
          :pledge="current.pledge"
          :start="proposal?.change"
          :zone="zoneName"
          :error="refusal"
          @review="review"
          @close="mode = 'view'"
        />

        <template v-else-if="proposal">
          <TinkerfundPledgeSummary :pledge="proposal.receipt" :zone="zoneName" note="Your Pledge, once changed" />
          <dl class="difference tf-summary-list tf-panel">
            <div><dt>Was</dt><dd>{{ money(receipt.total) }}</dd></div>
            <div><dt>Now</dt><dd>{{ money(proposal.receipt.total) }}</dd></div>
            <div class="total"><dt>Difference</dt><dd>{{ formatTinkerfundChange(difference, money) }}</dd></div>
          </dl>
          <p class="note">Still pending: you’re only charged if the Campaign is funded, when it ends on <TinkerfundTime :at="current.endsAt" />.</p>
          <p v-if="refusal" class="refusal" role="alert">{{ refusal }}</p>
          <p class="actions">
            <button type="button" class="tf-btn" @click="mode = 'edit'">Back to changes</button>
            <button type="button" class="tf-btn primary" @click="confirm">Confirm changes</button>
          </p>
        </template>
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
.facts, .difference { padding: 14px 16px; }
.done { margin: 0; padding: 10px 14px; border-radius: var(--tf-radius); background: var(--tf-accent-soft); }
.status, .note, .locked { margin: 0; color: var(--tf-muted); }
.refusal { margin: 0; color: var(--tf-bad); }
.actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 0; }
</style>
