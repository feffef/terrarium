<script setup lang="ts">
import type { TinkerfundBrowseQuery } from '../../utils/browse'

// Rendered twice on Discover (side column and mobile drawer), so every name
// and id comes from useId().
const props = defineProps<{
  query: TinkerfundBrowseQuery
  /** Left out on a Category page, whose category is fixed. */
  categories?: { slug: string; name: string }[]
  bounds: { min: number; max: number }
}>()
const emit = defineEmits<{ update: [query: TinkerfundBrowseQuery] }>()
const id = useId()

const STATES = [
  { value: undefined, label: 'Any' },
  { value: 'live', label: 'Live' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ended', label: 'Ended' },
] as const

const set = (patch: Partial<TinkerfundBrowseQuery>) => emit('update', { ...props.query, ...patch })

// The readouts follow a thumb while it moves; the query changes on release.
const low = ref(0)
const high = ref(0)
watchEffect(() => {
  low.value = props.query.min ?? props.bounds.min
  high.value = props.query.max ?? props.bounds.max
})
function setPrice(edge: 'min' | 'max', value: number) {
  const min = edge === 'min' ? value : Math.min(low.value, value)
  const max = edge === 'max' ? value : Math.max(high.value, value)
  set({ min: min > props.bounds.min ? min : undefined, max: max < props.bounds.max ? max : undefined })
}

const active = computed(() => Object.keys(tinkerfundBrowseRouteQuery({ ...props.query, sort: 'popular' })).length > 0)
</script>

<template>
  <form class="filters" @submit.prevent>
    <fieldset v-if="categories">
      <legend class="tf-label">Category</legend>
      <label>
        <input type="radio" :name="`${id}-category`" :checked="!query.category" @change="set({ category: undefined })">
        All categories
      </label>
      <label v-for="c in categories" :key="c.slug">
        <input type="radio" :name="`${id}-category`" :checked="query.category === c.slug" @change="set({ category: c.slug })">
        {{ c.name }}
      </label>
    </fieldset>

    <fieldset>
      <legend class="tf-label">State</legend>
      <label v-for="s in STATES" :key="s.label">
        <input type="radio" :name="`${id}-state`" :checked="query.state === s.value" @change="set({ state: s.value })">
        {{ s.label }}
      </label>
    </fieldset>

    <fieldset>
      <legend class="tf-label">Show only</legend>
      <label>
        <input type="checkbox" :checked="query.soon" @change="set({ soon: ($event.target as HTMLInputElement).checked || undefined })">
        Ending soon
      </label>
      <label>
        <input type="checkbox" :checked="query.deal" @change="set({ deal: ($event.target as HTMLInputElement).checked || undefined })">
        On Deal
      </label>
    </fieldset>

    <fieldset>
      <legend class="tf-label">Reward price</legend>
      <label class="range">
        <span>From <output :for="`${id}-min`">{{ formatTinkerfundMoney(low) }}</output></span>
        <input
          :id="`${id}-min`"
          v-model.number="low"
          type="range"
          :min="bounds.min"
          :max="bounds.max"
          @change="setPrice('min', low)"
        >
      </label>
      <label class="range">
        <span>Up to <output :for="`${id}-max`">{{ formatTinkerfundMoney(high) }}</output></span>
        <input
          :id="`${id}-max`"
          v-model.number="high"
          type="range"
          :min="bounds.min"
          :max="bounds.max"
          @change="setPrice('max', high)"
        >
      </label>
    </fieldset>

    <button v-if="active" type="button" class="clear" @click="emit('update', { sort: query.sort })">Clear filters</button>
  </form>
</template>

<style scoped>
.filters { display: grid; gap: 22px; align-content: start; }
fieldset { display: grid; gap: 6px; margin: 0; padding: 0; border: 0; }
legend { margin-bottom: 8px; padding: 0; }
label { display: flex; gap: 8px; align-items: flex-start; font-size: 15px; line-height: 1.4; cursor: pointer; }
input[type='radio'], input[type='checkbox'] { flex: none; width: 16px; height: 16px; margin: 2px 0 0; accent-color: var(--tf-accent); }
.range { display: grid; gap: 4px; }
.range span { color: var(--tf-muted); font-size: 14px; }
output { color: var(--tf-ink); font: 600 14px/1 var(--tf-mono); }
input[type='range'] { width: 100%; margin: 0; accent-color: var(--tf-accent); }
.clear {
  justify-self: start;
  padding: 0;
  border: 0;
  background: none;
  color: var(--tf-link);
  text-decoration: underline;
  cursor: pointer;
}
</style>
