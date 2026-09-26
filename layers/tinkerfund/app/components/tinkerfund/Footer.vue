<script setup lang="ts">
const { link } = useTinkerfundSpace()
const categories = useTinkerfundCategories()
</script>

<template>
  <footer class="foot tf-noprint">
    <div class="tf-wrap grid">
      <div class="brand">
        <TinkerfundWordmark :to="link()" />
        <p>Back new inventions before anyone else.</p>
      </div>
      <nav aria-label="Categories">
        <p class="tf-label">Categories</p>
        <NuxtLink v-for="c in categories" :key="c.slug" :to="link(`/category/${c.slug}`)">{{ c.name }}</NuxtLink>
      </nav>
      <nav aria-label="Tinkerfund">
        <p class="tf-label">Tinkerfund</p>
        <NuxtLink :to="link('/how-it-works')">How it works</NuxtLink>
        <NuxtLink :to="link('/deals')">Deals</NuxtLink>
        <TinkerfundResetDemo />
      </nav>
      <TinkerfundThemeSwitch />
    </div>
    <div class="tf-wrap legal">
      <p>A demo shop on <NuxtLink to="/">the Terrarium</NuxtLink>. Nothing is charged and nothing ships.</p>
    </div>
  </footer>
</template>

<style scoped>
.foot { margin-top: 64px; border-top: var(--tf-hairline); background: var(--tf-surface); }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 28px;
  padding-block: 32px;
}
.brand p { margin: 10px 0 0; color: var(--tf-muted); }
nav { display: grid; gap: 6px; align-content: start; justify-items: start; }
nav a { color: var(--tf-ink); text-decoration: none; }
nav a:hover { text-decoration: underline; }
.tf-label { margin: 0 0 4px; }
.legal { padding-block: 16px; border-top: var(--tf-hairline); color: var(--tf-muted); font-size: 13px; }
.legal p { margin: 0; }
</style>
