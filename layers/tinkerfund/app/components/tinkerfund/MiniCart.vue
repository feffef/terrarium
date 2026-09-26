<script setup lang="ts">
import type { TinkerfundCartRequest, TinkerfundCartView } from '../../utils/cart'

const props = defineProps<{ view: TinkerfundCartView }>()

const id = useId()
const money = useTinkerfundMoney()
const { link } = useTinkerfundSpace()
const drawer = useTemplateRef('drawer')
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
  drawer.value?.open()
}

defineExpose({ show })
</script>

<template>
  <TinkerfundDrawer ref="drawer" :aria-labelledby="`${id}-h`">
    <template #top><h2 :id="`${id}-h`">Added to your Cart</h2></template>
    <template #default="{ close }">
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
        <dt>Subtotal <span>· {{ tinkerfundCount(view.count, 'item') }}</span></dt>
        <dd>{{ money(view.subtotal) }}</dd>
      </dl>
      <p class="note">Shipping and discounts are worked out at checkout.</p>
      <div class="actions">
        <NuxtLink class="tf-btn" :to="link('/cart')" @click="close">View cart</NuxtLink>
        <NuxtLink class="tf-btn primary" :to="link('/checkout')" @click="close">Checkout</NuxtLink>
      </div>
    </template>
  </TinkerfundDrawer>
</template>

<style scoped>
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
