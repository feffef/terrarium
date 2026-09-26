<script setup lang="ts">
import type { TinkerfundCartRequest } from '../../types/tinkerfund'
import type { TinkerfundCartView } from '../../utils/cart'

// The drawer an add opens (page inventory #1367); reduced motion drops its
// slide through the theme's global rule.
const props = defineProps<{ space: string; view: TinkerfundCartView }>()

const id = useId()
const locale = useTinkerfundLocale()
const money = (amount: number) => formatTinkerfundMoney(amount, locale.value)
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const added = ref<TinkerfundCartRequest>()

const group = computed(() => props.view.groups.find((g) => g.campaign === added.value?.campaign))
const line = computed(() => {
  const request = added.value
  if (!request || 'bonus' in request) return undefined
  const key = tinkerfundCartLineKey(request)
  return group.value?.lines.find((l) => l.key === key)
})

function show(request: TinkerfundCartRequest) {
  added.value = request
  if (!dialog.value?.open) dialog.value?.showModal()
}
const close = () => dialog.value?.close()
const closeOnBackdrop = (e: MouseEvent) => {
  if (e.target === dialog.value) close()
}

defineExpose({ show })
</script>

<template>
  <dialog ref="dialog" class="drawer" :aria-labelledby="`${id}-h`" @click="closeOnBackdrop">
    <div class="body">
      <div class="top">
        <h2 :id="`${id}-h`">Added to your Cart</h2>
        <button type="button" class="close" aria-label="Close" @click="close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>

      <div v-if="group" class="added tf-panel">
        <p class="tf-label">{{ group.title }}</p>
        <template v-if="line">
          <b>{{ line.title }}</b>
          <span v-if="line.detail" class="detail">{{ line.detail }}</span>
          <span class="each">{{ line.quantity }} × {{ money(line.price) }}</span>
        </template>
        <template v-else-if="group.bonus">
          <b>Bonus support</b>
          <span class="each">{{ money(group.bonus) }}</span>
        </template>
      </div>

      <dl class="sum">
        <dt>Subtotal <span>· {{ formatTinkerfundItems(view.count) }}</span></dt>
        <dd>{{ money(view.subtotal) }}</dd>
      </dl>
      <p class="note">Shipping and discounts are worked out at checkout.</p>

      <div class="actions">
        <NuxtLink class="tf-btn" :to="tinkerfundPath(space, '/cart')" @click="close">View cart</NuxtLink>
        <NuxtLink class="tf-btn primary" :to="tinkerfundPath(space, '/checkout')" @click="close">Checkout</NuxtLink>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.drawer {
  margin: 0 0 0 auto;
  width: min(380px, 92vw);
  max-width: none;
  height: 100dvh;
  max-height: none;
  padding: 0;
  border: 0;
  border-left: var(--tf-hairline);
  background: var(--tf-surface);
  color: var(--tf-ink);
  translate: 0 0;
  transition: translate var(--tf-dur) var(--tf-ease), overlay var(--tf-dur) allow-discrete,
    display var(--tf-dur) allow-discrete;
}
.drawer:not([open]) { translate: 100% 0; }
@starting-style { .drawer[open] { translate: 100% 0; } }
.drawer::backdrop { background: rgb(0 0 0 / 0.45); }
.body { display: grid; gap: 16px; padding: 18px; }
.top { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
h2 { margin: 0; font: 800 22px/1.1 var(--tf-font); font-stretch: 80%; }
.close { display: grid; place-items: center; width: 38px; height: 38px; border: 0; border-radius: var(--tf-radius); background: none; color: var(--tf-ink); cursor: pointer; }
.close:hover { background: var(--tf-bg); }
svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
.added { display: grid; gap: 4px; padding: 14px; overflow-wrap: anywhere; }
.added > * { margin: 0; }
.detail { color: var(--tf-muted); font-size: 14px; }
.each { font: 600 14px/1.4 var(--tf-mono); }
.sum { display: flex; justify-content: space-between; align-items: baseline; margin: 0; padding-top: 12px; border-top: var(--tf-hairline); }
.sum dt { font-weight: 600; }
.sum dt span { color: var(--tf-muted); font-weight: 400; }
.sum dd { margin: 0; font: 600 18px/1 var(--tf-mono); font-variant-numeric: tabular-nums; }
.note { margin: 0; color: var(--tf-muted); font-size: 14px; }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
</style>
