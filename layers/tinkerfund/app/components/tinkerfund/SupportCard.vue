<script setup lang="ts">
import type { TinkerfundBacking } from '../../composables/tinkerfund'

// Bonus support (issue #1365): on its own it is a no-Reward Pledge; beside a
// Reward it tops that Pledge up.
const props = defineProps<{ backing: TinkerfundBacking }>()
const id = useId()
const amount = ref(10)

function add() {
  if (amount.value > 0) props.backing.add({ campaign: props.backing.slug, bonus: amount.value })
}
</script>

<template>
  <article class="support" :aria-labelledby="`${id}-title`">
    <h3 :id="`${id}-title`">Just support it</h3>
    <p class="desc">No Reward, only the satisfaction. With a Reward in your Cart, this adds to that Pledge as bonus support.</p>
    <form @submit.prevent="add">
      <fieldset :disabled="backing.state !== 'live'">
        <label :for="`${id}-amount`" class="tf-label">Amount (EUR)</label>
        <div class="row">
          <input :id="`${id}-amount`" v-model.number="amount" type="number" min="1" step="1" inputmode="numeric" required>
          <button type="submit" class="tf-btn">Add support</button>
        </div>
        <p v-if="backing.refusals.bonus" class="refusal" role="alert">{{ backing.refusals.bonus }}</p>
      </fieldset>
    </form>
  </article>
</template>

<style scoped>
.support { display: grid; gap: 10px; padding: 16px; border: 1px dashed var(--tf-muted); border-radius: 12px; }
.support > * { margin: 0; }
h3 { font: 700 19px/1.15 var(--tf-font); font-stretch: 88%; }
.desc { color: var(--tf-muted); font-size: 14px; }
fieldset { display: grid; gap: 6px; min-width: 0; margin: 0; padding: 0; border: 0; }
.row { display: flex; gap: 8px; }
input {
  width: 100%;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--tf-muted);
  border-radius: var(--tf-radius);
  background: var(--tf-surface);
  color: var(--tf-ink);
  font: 600 16px/1.2 var(--tf-mono);
}
.tf-btn { flex: none; }
fieldset:disabled { opacity: 0.6; }
.refusal { margin: 0; color: var(--tf-bad); font-size: 14px; }
</style>
