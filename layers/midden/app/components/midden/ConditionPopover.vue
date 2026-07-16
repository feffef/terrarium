<script setup lang="ts">
// Condition popover (#523, Tier-2 interaction): opening it reveals the artifact-
// SPECIFIC rationale — the curator's own `catalogNote` and the artifact's verbatim
// `inscription` — as an anchored inline expansion, explicitly NOT a full-screen
// modal (adopted Opus dissent, #523: it preserves the dig-report reading flow).
//
// Unlike the tooltip, this component reads NOTHING from condition.ts: it renders
// whatever rationale text it is handed. It is `open`-controlled (`v-model:open`)
// so a future ArtifactCard.vue can make the WHOLE card the click target and drive
// this from there; the panel anchors itself to wherever this component is mounted.
// The `lost` gravestone convention omits `inscription` structurally (tenant.config
// comment), so the inscription block simply doesn't render when none is passed.
const props = withDefaults(
  defineProps<{
    open?: boolean
    catalogNote: string
    inscription?: { text: string; source: string }
  }>(),
  { open: false, inscription: undefined },
)

const emit = defineEmits<{ 'update:open': [boolean] }>()

function close() {
  if (props.open) emit('update:open', false)
}
</script>

<template>
  <div class="midden-popover">
    <!-- The trigger surface (a future ArtifactCard wires the click). Kept as a
         slot so this component makes no assumption about what opens it. -->
    <slot />

    <div
      v-if="open"
      class="pop-panel"
      role="dialog"
      aria-label="curator's rationale"
      tabindex="-1"
      @keydown.escape="close"
    >
      <p v-if="catalogNote" class="pop-note">{{ catalogNote }}</p>
      <p v-else class="pop-note pop-empty">No note was recorded for this find.</p>

      <blockquote v-if="inscription" class="pop-inscription">
        {{ inscription.text }}
        <cite class="pop-source">{{ inscription.source }}</cite>
      </blockquote>
    </div>
  </div>
</template>
