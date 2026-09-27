<script setup lang="ts">
// Cancelling a Pledge asks first, in a modal <dialog> (Pledge flow #1365).
defineProps<{ reference: string; title: string }>()
const emit = defineEmits<{ confirm: [] }>()

const id = useId()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const close = () => dialog.value?.close()
function confirm() {
  close()
  emit('confirm')
}
</script>

<template>
  <button type="button" class="tf-btn danger" @click="dialog?.showModal()">Cancel Pledge</button>
  <dialog ref="dialog" class="confirm tf-panel" :aria-labelledby="`${id}-h`" :aria-describedby="`${id}-d`">
    <h2 :id="`${id}-h`">Cancel Pledge {{ reference }}?</h2>
    <p :id="`${id}-d`">
      Your Pledge to {{ title }} comes out of its total straight away, and nothing will be charged. You can pledge
      again while the Campaign is Live.
    </p>
    <p class="actions">
      <button type="button" class="tf-btn" autofocus @click="close">Keep Pledge</button>
      <button type="button" class="tf-btn danger" @click="confirm">Yes, cancel it</button>
    </p>
  </dialog>
</template>

<style scoped>
.danger { border-color: var(--tf-bad); color: var(--tf-bad); }
.confirm {
  width: min(440px, calc(100vw - 32px));
  padding: 20px;
  color: var(--tf-ink);
  opacity: 1;
  transition: opacity var(--tf-dur) var(--tf-ease), overlay var(--tf-dur) allow-discrete, display var(--tf-dur) allow-discrete;
}
.confirm:not([open]) { opacity: 0; }
@starting-style { .confirm[open] { opacity: 0; } }
.confirm::backdrop { background: rgb(0 0 0 / 0.45); }
.confirm > * { margin: 0 0 12px; }
.confirm > :last-child { margin: 0; }
h2 { font: 800 22px/1.15 var(--tf-font); font-stretch: 80%; overflow-wrap: anywhere; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; }
</style>
