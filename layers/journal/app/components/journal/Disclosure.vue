<script setup lang="ts">
// Single home for the "clickable row toggles a hidden panel" a11y wiring
// shared by the digest rows (Space landing, `[space]/index.vue`) and the
// session-card head (`SessionCard.vue`) — both hand-rolled the identical
// `role="button"` + `tabindex` + `aria-expanded` + click/enter/space wiring
// before this extraction (grounded code review). This component owns ONLY
// that interaction contract; it renders no visual content of its own.
//
// Callers keep their own markup (via the default slot), their own class for
// styling (via Vue's attribute fallthrough onto this component's single root
// element — the class ends up on the SAME div the a11y attributes are on),
// and their own scoped CSS: per Vue's scoped-style rules, a child component's
// ROOT node is affected by both its own scoped styles and its parent's, so
// `class="drow"`/`class="head"` here still resolves against the caller's
// `<style scoped>` (Vue docs, "Scoped CSS → child component root nodes").
//
// `controls` is optional: SessionCard's detail panel has a stable id
// (`useId()`) to point `aria-controls` at, but the digest rows' panel does
// not — passing `undefined` simply omits the attribute, matching the digest
// row's previous behavior exactly.
const { expanded, controls = undefined } = defineProps<{ expanded: boolean; controls?: string }>()
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <div
    role="button"
    tabindex="0"
    :aria-expanded="expanded"
    :aria-controls="controls"
    @click="emit('toggle')"
    @keydown.enter.prevent="emit('toggle')"
    @keydown.space.prevent="emit('toggle')"
  >
    <slot />
  </div>
</template>
