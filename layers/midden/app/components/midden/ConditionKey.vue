<script setup lang="ts">
// The condition key (owner-directed, final merged design): the grade legend left
// the landing and re-homed here, beside the finds whose condition WORDS it
// defines — filtered to the grades actually present in this dig report, read
// from the single-homed table in utils/condition.ts. A static sticky reference,
// NOT the removed scroll-synced stratigraphy gauge: no observers, no scroll
// state. The dig-report page places it (sticky positioning included) via its
// own grid; this component only renders the rows.
import { CONDITION_GRADES, type Grade } from '../../utils/condition'

const props = defineProps<{ grades: Grade[] }>()

const rows = computed(() => {
  const present = new Set(props.grades)
  return CONDITION_GRADES.filter((c) => present.has(c.grade))
})
</script>

<template>
  <aside v-if="rows.length" class="midden-key" aria-labelledby="midden-key-head">
    <p id="midden-key-head" class="sc midden-key__head">Condition key</p>
    <dl class="midden-key__list">
      <div v-for="c in rows" :key="c.grade" class="midden-key__row">
        <dt class="sc midden-key__term">{{ c.label }}</dt>
        <dd class="midden-key__def">{{ c.definition }}</dd>
      </div>
    </dl>
    <p class="tech midden-key__aside">curator-graded, never computed</p>
  </aside>
</template>

<style scoped>
.midden-key {
  border-top: 2px solid var(--midden-rule);
  padding-top: 0.85rem;
}
.midden-key__head {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--midden-accent);
}
.midden-key__list {
  margin: 0.35rem 0 0;
}
.midden-key__row {
  padding: 0.7rem 0 0;
}
.midden-key__row + .midden-key__row {
  margin-top: 0.7rem;
  border-top: 1px solid var(--midden-line);
}
.midden-key__term {
  margin: 0;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.09em;
  color: var(--midden-ink);
}
.midden-key__def {
  margin: 0.25rem 0 0;
  font-family: var(--midden-serif);
  font-style: italic;
  font-size: 0.84rem;
  line-height: 1.55;
  color: var(--midden-muted);
}
.midden-key__aside {
  margin: 0.95rem 0 0;
  color: var(--midden-faint);
}
</style>
