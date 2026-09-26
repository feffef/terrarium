<script setup lang="ts">
// The focused checkout's header (page inventory #1367): no navigation, so
// nothing pulls the Backer out of the flow but the wordmark.
defineProps<{ steps: readonly string[]; step: number }>()
const { link } = useTinkerfundSpace()
</script>

<template>
  <header class="head tf-noprint">
    <div class="tf-wrap row">
      <TinkerfundWordmark :to="link()" />
      <p class="secure">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
        Secure checkout (demo)
      </p>
      <ol class="steps" aria-label="Checkout steps">
        <li v-for="(label, i) in steps" :key="label" :class="{ done: i < step }" :aria-current="i === step ? 'step' : undefined">
          <span class="n" aria-hidden="true">{{ i < step ? '✓' : i + 1 }}</span>{{ label }}
        </li>
      </ol>
    </div>
  </header>
</template>

<style scoped>
.head { border-bottom: var(--tf-hairline); background: var(--tf-surface); }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px; min-height: 60px; padding-block: 8px; }
.secure { display: inline-flex; gap: 6px; align-items: center; margin: 0; color: var(--tf-muted); font: 500 13px/1.2 var(--tf-mono); }
svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.steps { display: flex; gap: 6px; margin: 0 0 0 auto; padding: 0; list-style: none; }
@media (max-width: 619px) { .steps { width: 100%; margin: 0; } }
.steps li { display: inline-flex; gap: 6px; align-items: center; padding: 5px 10px 5px 6px; border: var(--tf-hairline); border-radius: 999px; color: var(--tf-muted); font: 500 13px/1 var(--tf-font); }
.n { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: var(--tf-bg); font: 600 11px/1 var(--tf-mono); }
.steps [aria-current] { border-color: var(--tf-ink); color: var(--tf-ink); font-weight: 600; }
.steps [aria-current] .n { background: var(--tf-ink); color: var(--tf-surface); }
.steps .done .n { background: var(--tf-good); color: var(--tf-surface); }
</style>
