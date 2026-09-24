<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const notFound = computed(() => props.error.statusCode === 404)
useHead({
  title: () => `${notFound.value ? 'Page not found' : 'Something went wrong'} · terrarium`,
  bodyAttrs: { style: 'margin: 0' },
})
</script>

<template>
  <main class="err">
    <p class="code">{{ error.statusCode }}</p>
    <h1>{{ notFound ? 'This page doesn’t exist' : 'Something went wrong' }}</h1>
    <p class="note">
      {{ notFound ? 'Nothing grows at this address — it may have moved, or never existed.' : 'Something broke on our side. Try again in a moment.' }}
    </p>
    <a href="/" class="home" @click.prevent="clearError({ redirect: '/' })">← Back to the terrarium</a>
  </main>
</template>

<style scoped>
.err {
  --bg: #fbfbfa;
  --ink: #1c1e1c;
  --muted: #5b615b;
  --accent: #356a4c;

  min-height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  padding: 2rem 1rem;
  background: var(--bg);
  color: var(--ink);
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  text-align: center;
}
@media (prefers-color-scheme: dark) {
  .err {
    --bg: #14160f;
    --ink: #e9ebe4;
    --muted: #a1a89b;
    --accent: #6fbf89;
  }
}
.code {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--accent);
}
h1 { margin: 0; font-size: clamp(1.6rem, 5vw, 2.2rem); }
.note { margin: 0; max-width: 30rem; color: var(--muted); line-height: 1.55; }
.home { margin-top: 0.75rem; color: var(--accent); font-weight: 600; text-decoration: none; }
.home:hover { text-decoration: underline; }
</style>
