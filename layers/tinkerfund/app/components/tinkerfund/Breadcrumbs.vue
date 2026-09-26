<script setup lang="ts">
defineProps<{ items: { label: string; to?: string }[] }>()
</script>

<template>
  <nav class="crumbs" aria-label="Breadcrumb">
    <ol>
      <li v-for="(item, i) in items" :key="i">
        <NuxtLink v-if="item.to" :to="item.to">{{ item.label }}</NuxtLink>
        <span v-else aria-current="page">{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
ol { display: flex; flex-wrap: wrap; gap: 4px 0; margin: 0 0 16px; padding: 0; list-style: none; font: 500 12px/1.4 var(--tf-mono); color: var(--tf-muted); }
li { overflow-wrap: anywhere; }
li + li::before { content: '›'; margin-inline: 8px; }
.crumbs a { color: var(--tf-muted); }
.crumbs a:hover { color: var(--tf-ink); }
[aria-current] { color: var(--tf-ink); }
</style>
