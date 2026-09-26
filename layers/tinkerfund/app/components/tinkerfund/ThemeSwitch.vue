<script setup lang="ts">
import type { TinkerfundTheme } from '../../utils/demo'

const OPTIONS: { value: TinkerfundTheme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

// SSR can't see the visitor's pick, so the switch shows System until mount.
const current = ref<TinkerfundTheme>('system')

function apply(theme: TinkerfundTheme) {
  current.value = theme
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.tfTheme
  else root.dataset.tfTheme = theme
}

function pick(theme: TinkerfundTheme) {
  try {
    writeTinkerfundTheme(sessionStorage, theme)
  } catch {
    // Storage blocked: the pick still applies until the next page load.
  }
  apply(theme)
}

onMounted(() => {
  try {
    apply(readTinkerfundTheme(sessionStorage))
  } catch {
    apply('system')
  }
})
</script>

<template>
  <fieldset class="theme">
    <legend class="tf-label">Theme</legend>
    <div class="options">
      <label v-for="opt in OPTIONS" :key="opt.value">
        <input
          type="radio"
          name="tf-theme"
          :value="opt.value"
          :checked="current === opt.value"
          @change="pick(opt.value)"
        >
        <span>{{ opt.label }}</span>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.theme { border: 0; margin: 0; padding: 0; }
legend { margin-bottom: 8px; }
.options {
  display: inline-flex;
  border: 1px solid var(--tf-muted);
  border-radius: var(--tf-radius);
  overflow: hidden;
  background: var(--tf-surface);
}
label { position: relative; }
label + label { border-left: var(--tf-hairline); }
input { position: absolute; opacity: 0; inset: 0; margin: 0; cursor: pointer; }
span {
  display: block;
  padding: 8px 12px;
  font: 500 12px/1 var(--tf-mono);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: background-color var(--tf-dur) var(--tf-ease), color var(--tf-dur) var(--tf-ease);
}
input:checked + span { background: var(--tf-ink); color: var(--tf-surface); }
input:focus-visible + span { outline: 2px solid var(--tf-link); outline-offset: -2px; }
</style>
