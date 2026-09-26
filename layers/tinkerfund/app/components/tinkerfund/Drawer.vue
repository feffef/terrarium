<script setup lang="ts">
withDefaults(defineProps<{ side?: 'left' | 'right'; closeLabel?: string }>(), { side: 'right', closeLabel: 'Close' })

const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const open = () => {
  if (!dialog.value?.open) dialog.value?.showModal()
}
const close = () => dialog.value?.close()
defineExpose({ open, close })
</script>

<template>
  <dialog ref="dialog" class="drawer" :class="side" @click="$event.target === dialog && close()">
    <div class="body">
      <div class="top">
        <slot name="top" />
        <button type="button" class="close" :aria-label="closeLabel" @click="close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <slot :close="close" />
    </div>
  </dialog>
</template>

<style scoped>
.drawer {
  margin: 0 0 0 auto;
  width: min(380px, 90vw);
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
.left { margin: 0; border-left: 0; border-right: var(--tf-hairline); }
.left:not([open]) { translate: -100% 0; }
@starting-style { .left[open] { translate: -100% 0; } }
.drawer::backdrop { background: rgb(0 0 0 / 0.45); }
.body { display: grid; gap: 16px; padding: 16px; }
.top { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.top :slotted(h2) { margin: 0; font: 800 22px/1.1 var(--tf-font); font-stretch: 80%; }
.close { display: grid; place-items: center; flex: none; width: 38px; height: 38px; border: 0; border-radius: var(--tf-radius); background: none; color: var(--tf-ink); cursor: pointer; }
.close:hover { background: var(--tf-bg); }
svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
</style>
