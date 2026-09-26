<script setup lang="ts">
defineProps<{ space: string }>()

useHead({
  bodyAttrs: { class: 'tf-page' },
  script: [{ key: 'tf-theme', innerHTML: tinkerfundThemeBootScript, tagPosition: 'head' }],
})
</script>

<template>
  <div class="shell">
    <a class="skip" href="#tf-main">Skip to content</a>
    <div class="demo" role="note">
      <div class="tf-wrap">
        <span>Demo shop — nothing here is real</span>
        <span aria-hidden="true">·</span>
        <TinkerfundResetDemo />
      </div>
    </div>
    <!-- A page with its own header is a focused flow: no footer either (#1367). -->
    <slot name="header"><TinkerfundHeader :space="space" /></slot>
    <main id="tf-main" class="tf-wrap main">
      <slot />
    </main>
    <TinkerfundFooter v-if="!$slots.header" :space="space" />
  </div>
</template>

<style scoped>
.shell { min-height: 100vh; display: flex; flex-direction: column; }
.main { flex: 1; width: 100%; box-sizing: border-box; padding-top: 28px; }
.demo { border-bottom: var(--tf-hairline); background: var(--tf-bg); color: var(--tf-muted); font-size: 13px; }
.demo .tf-wrap { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: center; padding-block: 5px; }
.skip {
  position: absolute;
  left: 8px;
  top: -40px;
  z-index: 20;
  padding: 8px 12px;
  border-radius: var(--tf-radius);
  background: var(--tf-ink);
  color: var(--tf-surface);
}
.skip:focus { top: 8px; }
</style>
