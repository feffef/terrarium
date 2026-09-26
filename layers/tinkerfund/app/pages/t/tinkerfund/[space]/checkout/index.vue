<script setup lang="ts">
import { zone as zoneSchema } from '../../../../../../tenant.config'
import type { TinkerfundQuoteGroup } from '../../../../../utils/checkout'

// The focused checkout (story #1384, Pledge flow #1365). Every choice lives in
// the URL query, so browser Back walks the steps and a reload keeps them.
definePageMeta({ viewTransition: true })

const STEPS = ['shipping', 'payment', 'review'] as const
const LABELS = ['Shipping', 'Payment', 'Review'] as const

const route = useRoute()
const router = useRouter()
const { space, link } = useTinkerfundSpace()
const money = useTinkerfundMoney()
const query = (key: string) => (typeof route.query[key] === 'string' ? route.query[key] : undefined)

const chosen = computed(() => zoneSchema.safeParse(query('zone')).data)
const [{ shop, zoneName, paymentLabel, status, error }, { loaded, zone, view, quote: quoteFor, place, backer }] =
  await Promise.all([useTinkerfundShop(), useTinkerfundCart(chosen)])

const step = computed(() => Math.max(0, STEPS.indexOf(query('step') as (typeof STEPS)[number])))
const payment = computed(() => (shop.value?.payments.some((p) => p.id === query('pay')) ? query('pay') : shop.value?.payments[0]?.id) ?? '')

const quote = computed(() => quoteFor(query('code')))
const stranded = computed(() => view.value.groups.some((g) => g.closed || g.unshipped.length || g.lines.some((l) => l.unavailable || !l.ships)))
function addsTo({ existing, shipping, rezoned, replacedCode }: TinkerfundQuoteGroup) {
  if (!existing) return undefined
  const moves = rezoned
    ? `, which moves from ${zoneName(existing.zone)}: it ships for ${money(existing.shipping + shipping)} instead of ${money(existing.shipping)}`
    : ''
  const code = replacedCode ? ` Code ${quote.value.code} replaces its earlier code ${replacedCode}: a Pledge holds one code.` : ''
  return `Adds to your Pledge ${existing.ref}${moves}.${code}`
}
const shippingRow = computed(() => tinkerfundShippingRow(quote.value, zoneName(zone.value), money))

// A choice replaces the entry; a step pushes one, so Back returns to it.
const choose = (change: Record<string, string | undefined>) => router.replace({ query: { ...route.query, ...change } })
const toStep = (i: number) => ({ query: { ...route.query, step: STEPS[i] } })

const heading = ref<HTMLElement>()
watch(step, () => nextTick(() => heading.value?.focus()))

const entered = ref(query('code') ?? '')
const refusal = ref<string>()
const placing = ref(false)
function removeCode() {
  entered.value = ''
  choose({ code: undefined })
}
async function confirm() {
  const { refs, error } = place({ zone: zone.value, payment: payment.value, code: query('code') })
  refusal.value = error
  placing.value = !!refs
  if (refs) await router.replace({ path: link('/checkout/done'), query: { refs: refs.join(',') } })
}

useSeoMeta(tinkerfundSeo({ kind: 'private', space, title: 'Checkout' }))
</script>

<template>
  <TinkerfundShell>
    <template #header>
      <TinkerfundCheckoutHeader :steps="LABELS" :step="step" />
    </template>

    <div class="checkout">
      <h1 ref="heading" class="tf-h1" tabindex="-1">{{ LABELS[step] }}</h1>
      <p class="banner" role="note"><b>Demo</b> — no payment is taken</p>

      <p v-if="!loaded || placing" class="empty tf-panel">{{ placing ? 'Placing your Pledge…' : 'Opening your checkout…' }}</p>
      <section v-else-if="!view.groups.length" class="empty tf-panel">
        <p>Your Cart is empty, so there is nothing to check out.</p>
        <NuxtLink class="tf-btn primary" :to="link('/cart')">Back to your Cart</NuxtLink>
      </section>

      <div v-else class="layout">
        <div class="steps">
          <section v-if="step === 0" class="step" aria-label="Shipping">
            <div v-if="backer" class="address tf-panel">
              <p class="tf-label">Ship to · the demo Backer</p>
              <address>
                {{ backer.name }}<br>{{ backer.address.street }}<br>
                {{ backer.address.postcode }} {{ backer.address.city }}<br>{{ backer.address.country }}
              </address>
            </div>
            <fieldset class="choices">
              <legend>Shipping zone</legend>
              <label v-for="z in shop?.zones" :key="z.id">
                <input type="radio" name="zone" :value="z.id" :checked="z.id === zone" @change="choose({ zone: z.id })">
                <span>{{ z.name }}</span>
              </label>
            </fieldset>
            <TinkerfundPledgeSummary v-for="group in quote.groups" :key="group.campaign" :pledge="group" :zone="zoneName(zone)" :note="addsTo(group)" />
            <p v-if="stranded" class="refusal" role="alert">
              Something here can’t be pledged to {{ zoneName(zone) }}. Choose another zone, or
              <NuxtLink :to="link('/cart')">change your Cart</NuxtLink>.
            </p>
            <p class="actions">
              <NuxtLink class="tf-btn" :to="link('/cart')">Back to Cart</NuxtLink>
              <NuxtLink v-if="!stranded" class="tf-btn primary" :to="toStep(1)">Continue to payment</NuxtLink>
            </p>
          </section>

          <section v-else-if="step === 1" class="step" aria-label="Payment">
            <p class="lead">Pick a way not to pay. Tinkerfund never asks for card details.</p>
            <fieldset class="choices stacked">
              <legend>Payment method</legend>
              <label v-for="p in shop?.payments" :key="p.id">
                <input type="radio" name="pay" :value="p.id" :checked="p.id === payment" @change="choose({ pay: p.id })">
                <span>{{ p.label }}</span>
              </label>
            </fieldset>
            <p class="actions">
              <NuxtLink class="tf-btn" :to="toStep(0)">Back</NuxtLink>
              <NuxtLink class="tf-btn primary" :to="toStep(2)">Review your Pledges</NuxtLink>
            </p>
          </section>

          <section v-else class="step" aria-label="Review">
            <dl class="choices-made tf-summary-list text tf-panel">
              <div><dt>Ship to</dt><dd>{{ zoneName(zone) }} <NuxtLink :to="toStep(0)">Change<span class="tf-sr"> shipping</span></NuxtLink></dd></div>
              <div><dt>Pay with</dt><dd>{{ paymentLabel(payment) }} <NuxtLink :to="toStep(1)">Change<span class="tf-sr"> payment</span></NuxtLink></dd></div>
            </dl>
            <TinkerfundPledgeSummary
              v-for="group in quote.groups"
              :key="group.campaign"
              :pledge="group"
              :zone="zoneName(zone)"
              :note="addsTo(group)"
            />
            <p class="note">One Pledge per Campaign. You’re only charged if a Campaign is funded, when it ends.</p>
            <p v-if="stranded" class="refusal" role="alert">
              Something here can’t be pledged to {{ zoneName(zone) }}. <NuxtLink :to="toStep(0)">Back to shipping</NuxtLink>
            </p>
            <p v-else-if="refusal" class="refusal" role="alert">{{ refusal }}</p>
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
          <dl class="tf-summary-list">
            <div><dt>Subtotal</dt><dd>{{ money(quote.subtotal) }}</dd></div>
            <div v-if="quote.discount"><dt>Discount</dt><dd>−{{ money(quote.discount) }}</dd></div>
            <div><dt>{{ shippingRow.label }}</dt><dd>{{ shippingRow.amount }}</dd></div>
            <div class="total"><dt>Total</dt><dd>{{ money(quote.total) }}</dd></div>
          </dl>
          <ul v-if="quote.deals.length" class="deals">
            <li v-for="deal in quote.deals" :key="deal">{{ deal }}</li>
          </ul>
          <p v-if="quote.code" class="applied">
            Code <b>{{ quote.code }}</b> applied
            <button type="button" class="tf-link remove" @click="removeCode">Remove<span class="tf-sr"> code</span></button>
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
.lead, .note { color: var(--tf-muted); }
.address { display: grid; gap: 6px; padding: 16px; }
.address > * { margin: 0; }
address { font-style: normal; }
.choices { display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; margin: 0; padding: 0; border: 0; }
.choices legend { margin-bottom: 8px; padding: 0; font-weight: 600; }
.choices.stacked { display: grid; }
.choices label { display: flex; gap: 10px; align-items: center; padding: 10px 14px; border: var(--tf-hairline); border-radius: var(--tf-radius); background: var(--tf-surface); cursor: pointer; }
.choices label:has(:checked) { border-color: var(--tf-ink); box-shadow: inset 0 0 0 1px var(--tf-ink); }
.choices-made { padding: 14px 16px; }
.choices-made a { margin-left: 8px; font-weight: 400; font-size: 14px; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; }
.refusal { color: var(--tf-bad); font-size: 14px; }
.summary { display: grid; gap: 10px; padding: 18px; }
@media (min-width: 900px) { .summary { position: sticky; top: 16px; } }
.summary h2 { margin: 0; font: 800 20px/1.1 var(--tf-font); font-stretch: 82%; }
.summary > * { margin: 0; }
.deals { display: grid; gap: 4px; padding: 0; list-style: none; color: var(--tf-good); font: 500 13px/1.3 var(--tf-mono); }
.applied { font-size: 14px; }
.remove { margin-left: 6px; }
.code { display: grid; gap: 6px; }
.code .row { display: flex; gap: 8px; }
.code input { flex: 1; min-width: 0; padding: 8px 10px; border: 1px solid var(--tf-muted); border-radius: var(--tf-radius); background: var(--tf-surface); color: var(--tf-ink); font: 500 14px/1.2 var(--tf-mono); text-transform: uppercase; }
.code p { margin: 0; }
</style>
