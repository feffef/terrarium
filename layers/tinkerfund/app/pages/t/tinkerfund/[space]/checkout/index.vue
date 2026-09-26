<script setup lang="ts">
import type { TinkerfundZone } from '../../../../../utils/cart'

// The focused checkout (story #1384, Pledge flow #1365). Every choice lives in
// the URL query, so browser Back walks the steps and a reload keeps them.
definePageMeta({ viewTransition: true })

const STEPS = ['shipping', 'payment', 'review'] as const
const LABELS = ['Shipping', 'Payment', 'Review'] as const

const route = useRoute()
const router = useRouter()
const { space, collections } = useSpace('tinkerfund')
const locale = useTinkerfundLocale()
const money = (amount: number) => formatTinkerfundMoney(amount, locale.value)
const query = (key: string) => (typeof route.query[key] === 'string' ? route.query[key] : undefined)

const { data: shop, status, error } = await useAsyncData(`tinkerfund-checkout-${space}`, async () => {
  const [shop, backer, promotions] = await Promise.all([
    queryCollection(collections.shop).first(),
    queryCollection(collections.backer).first(),
    queryCollection(collections.promotions).all(),
  ])
  return { zones: shop?.zones ?? [], payments: shop?.payments ?? [], backer, promotions }
})

const step = computed(() => Math.max(0, STEPS.indexOf(query('step') as (typeof STEPS)[number])))
const zone = computed<TinkerfundZone>(() =>
  shop.value?.zones.find((z) => z.id === query('zone'))?.id ?? shop.value?.backer?.address.zone ?? 'domestic')
const zoneName = computed(() => shop.value?.zones.find((z) => z.id === zone.value)?.name ?? zone.value)
const payment = computed(() => shop.value?.payments.find((p) => p.id === query('pay')) ?? shop.value?.payments[0])

const { loaded, view, place, pledges, baked, now } = await useTinkerfundCart(zone)
const quote = computed(() => quoteTinkerfundCheckout(view.value, shop.value?.promotions ?? [], query('code'), now.value))
const stranded = computed(() => view.value.groups.some((g) => g.closed || g.lines.some((l) => l.unavailable || !l.ships)))
const adding = (campaign: string) => tinkerfundPledgeFor(campaign, pledges.value, baked.value)?.ref

// A choice replaces the entry; a step pushes one, so Back returns to it.
const choose = (change: Record<string, string | undefined>) => router.replace({ query: { ...route.query, ...change } })
const toStep = (i: number) => ({ query: { ...route.query, step: STEPS[i] } })

const entered = ref(query('code') ?? '')
const refusal = ref<string>()
function removeCode() {
  entered.value = ''
  choose({ code: undefined })
}
async function confirm() {
  const { refs, error } = place({ quote: quote.value, zone: zone.value, payment: payment.value?.id ?? '' })
  refusal.value = error
  if (refs) await router.replace({ path: tinkerfundPath(space, '/checkout/done'), query: { refs: refs.join(',') } })
}

useSeoMeta(tinkerfundSeo({ kind: 'private', space, title: 'Checkout' }))
</script>

<template>
  <TinkerfundShell :space="space">
    <template #header>
      <TinkerfundCheckoutHeader :space="space" :steps="LABELS" :step="step" />
    </template>

    <div class="checkout">
      <h1>{{ LABELS[step] }}</h1>
      <p class="banner" role="note"><b>Demo</b> — no payment is taken</p>

      <p v-if="!loaded" class="empty tf-panel">Opening your checkout…</p>
      <section v-else-if="!view.groups.length" class="empty tf-panel">
        <p>Your Cart is empty, so there is nothing to check out.</p>
        <NuxtLink class="tf-btn primary" :to="tinkerfundPath(space, '/cart')">Back to your Cart</NuxtLink>
      </section>

      <div v-else class="layout">
        <div class="steps">
          <section v-if="step === 0" class="step" aria-label="Shipping">
            <div v-if="shop?.backer" class="address tf-panel">
              <p class="tf-label">Ship to · the demo Backer</p>
              <address>
                {{ shop.backer.name }}<br>{{ shop.backer.address.street }}<br>
                {{ shop.backer.address.postcode }} {{ shop.backer.address.city }}<br>{{ shop.backer.address.country }}
              </address>
            </div>
            <fieldset class="choices">
              <legend>Shipping zone</legend>
              <label v-for="z in shop?.zones" :key="z.id">
                <input type="radio" name="zone" :value="z.id" :checked="z.id === zone" @change="choose({ zone: z.id })">
                <span>{{ z.name }}</span>
              </label>
            </fieldset>
            <TinkerfundPledgeSummary v-for="group in quote.groups" :key="group.campaign" :space="space" :pledge="group" :zone="zoneName" />
            <p v-if="stranded" class="refusal" role="alert">
              Something here can’t be pledged to {{ zoneName }}. Choose another zone, or
              <NuxtLink :to="tinkerfundPath(space, '/cart')">change your Cart</NuxtLink>.
            </p>
            <p class="actions">
              <NuxtLink class="tf-btn" :to="tinkerfundPath(space, '/cart')">Back to Cart</NuxtLink>
              <NuxtLink v-if="!stranded" class="tf-btn primary" :to="toStep(1)">Continue to payment</NuxtLink>
            </p>
          </section>

          <section v-else-if="step === 1" class="step" aria-label="Payment">
            <p class="lead">Pick a way not to pay. Tinkerfund never asks for card details.</p>
            <fieldset class="choices stacked">
              <legend>Payment method</legend>
              <label v-for="p in shop?.payments" :key="p.id">
                <input type="radio" name="pay" :value="p.id" :checked="p.id === payment?.id" @change="choose({ pay: p.id })">
                <span>{{ p.label }}</span>
              </label>
            </fieldset>
            <p class="actions">
              <NuxtLink class="tf-btn" :to="toStep(0)">Back</NuxtLink>
              <NuxtLink class="tf-btn primary" :to="toStep(2)">Review your Pledges</NuxtLink>
            </p>
          </section>

          <section v-else class="step" aria-label="Review">
            <dl class="choices-made tf-panel">
              <div><dt>Ship to</dt><dd>{{ zoneName }} <NuxtLink :to="toStep(0)">Change<span class="tf-sr"> shipping</span></NuxtLink></dd></div>
              <div><dt>Pay with</dt><dd>{{ payment?.label }} <NuxtLink :to="toStep(1)">Change<span class="tf-sr"> payment</span></NuxtLink></dd></div>
            </dl>
            <TinkerfundPledgeSummary
              v-for="group in quote.groups"
              :key="group.campaign"
              :space="space"
              :pledge="group"
              :zone="zoneName"
              :note="adding(group.campaign) && `Adds to your Pledge ${adding(group.campaign)}`"
            />
            <p class="note">One Pledge per Campaign. You’re only charged if a Campaign is funded, when it ends.</p>
            <p v-if="refusal" class="refusal" role="alert">{{ refusal }}</p>
            <p class="actions">
              <NuxtLink class="tf-btn" :to="toStep(1)">Back</NuxtLink>
              <button type="button" class="tf-btn primary" :disabled="stranded" @click="confirm">
                Confirm {{ quote.groups.length === 1 ? 'Pledge' : `${quote.groups.length} Pledges` }}
              </button>
            </p>
          </section>
        </div>

        <aside class="summary tf-panel" aria-labelledby="summary-h">
          <h2 id="summary-h">Summary</h2>
          <dl>
            <div><dt>Subtotal</dt><dd>{{ money(quote.subtotal) }}</dd></div>
            <div v-if="quote.discount"><dt>Discount</dt><dd>−{{ money(quote.discount) }}</dd></div>
            <div><dt>Shipping</dt><dd>{{ money(quote.shipping) }}</dd></div>
            <div class="total"><dt>Total</dt><dd>{{ money(quote.total) }}</dd></div>
          </dl>
          <ul v-if="quote.deals.length" class="deals">
            <li v-for="deal in quote.deals" :key="deal">{{ deal }}</li>
          </ul>
          <p v-if="quote.code" class="applied">
            Code <b>{{ quote.code }}</b> applied
            <button type="button" class="link" @click="removeCode">Remove<span class="tf-sr"> code</span></button>
          </p>
          <form v-else class="code" @submit.prevent="choose({ code: entered.trim().toUpperCase() || undefined })">
            <label class="tf-label" for="tf-code">Discount code</label>
            <div class="row">
              <input id="tf-code" v-model="entered" autocomplete="off" autocapitalize="characters" spellcheck="false">
              <button type="submit" class="tf-btn">Apply</button>
            </div>
            <p v-if="quote.codeProblem" class="refusal" role="alert">{{ quote.codeProblem }}</p>
          </form>
        </aside>
      </div>
    </div>
    <ContentLoadErrorDialog :status="status" :error="error" :context="route.path" />
  </TinkerfundShell>
</template>

<style scoped>
.checkout { display: grid; gap: 18px; }
.banner { margin: 0; padding: 10px 14px; border-radius: var(--tf-radius); background: var(--tf-mark); color: var(--tf-mark-ink); font: 500 14px/1.3 var(--tf-mono); text-align: center; }
.empty { display: grid; gap: 14px; justify-items: start; margin: 0; padding: 22px; }
.empty p { margin: 0; }
.layout { display: grid; gap: 20px; align-items: start; }
@media (min-width: 900px) { .layout { grid-template-columns: minmax(0, 1fr) 320px; } }
.step { display: grid; gap: 14px; }
.step > * { margin: 0; }
h1 { margin: 0; font: 800 clamp(28px, 4vw, 38px)/1.05 var(--tf-font); font-stretch: 78%; }
.lead, .note { color: var(--tf-muted); }
.address { display: grid; gap: 6px; padding: 16px; }
.address > * { margin: 0; }
address { font-style: normal; }
.choices { display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; margin: 0; padding: 0; border: 0; }
.choices legend { margin-bottom: 8px; padding: 0; font-weight: 600; }
.choices.stacked { display: grid; }
.choices label { display: flex; gap: 10px; align-items: center; padding: 10px 14px; border: var(--tf-hairline); border-radius: var(--tf-radius); background: var(--tf-surface); cursor: pointer; }
.choices label:has(:checked) { border-color: var(--tf-ink); box-shadow: inset 0 0 0 1px var(--tf-ink); }
.choices-made { display: grid; gap: 6px; margin: 0; padding: 14px 16px; }
.choices-made div { display: flex; justify-content: space-between; gap: 12px; }
.choices-made dt { color: var(--tf-muted); }
.choices-made dd { margin: 0; font-weight: 600; text-align: right; }
.choices-made a { margin-left: 8px; font-weight: 400; font-size: 14px; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; }
.refusal { color: var(--tf-bad); font-size: 14px; }
.summary { display: grid; gap: 10px; padding: 18px; }
@media (min-width: 900px) { .summary { position: sticky; top: 16px; } }
.summary h2 { margin: 0; font: 800 20px/1.1 var(--tf-font); font-stretch: 82%; }
.summary > * { margin: 0; }
.summary dl { display: grid; gap: 6px; }
.summary dl div { display: flex; justify-content: space-between; gap: 12px; }
.summary dt { color: var(--tf-muted); }
.summary dd { margin: 0; font: 600 15px/1.4 var(--tf-mono); font-variant-numeric: tabular-nums; }
.summary .total { padding-top: 8px; border-top: var(--tf-hairline); }
.summary .total dt { color: var(--tf-ink); font-weight: 600; }
.summary .total dd { font-size: 18px; }
.deals { display: grid; gap: 4px; padding: 0; list-style: none; color: var(--tf-good); font: 500 13px/1.3 var(--tf-mono); }
.applied { font-size: 14px; }
.link { margin-left: 6px; padding: 0; border: 0; background: none; color: var(--tf-link); text-decoration: underline; cursor: pointer; font: inherit; }
.code { display: grid; gap: 6px; }
.code .row { display: flex; gap: 8px; }
.code input { flex: 1; min-width: 0; padding: 8px 10px; border: 1px solid var(--tf-muted); border-radius: var(--tf-radius); background: var(--tf-surface); color: var(--tf-ink); font: 500 14px/1.2 var(--tf-mono); text-transform: uppercase; }
.code p { margin: 0; }
</style>
