<script setup lang="ts">
defineProps<{ to: string }>()
</script>

<template>
  <div class="gb-trail">
    <NuxtLink class="gb-home" to="/">terrarium</NuxtLink>
    <span class="gb-trail-sep" aria-hidden="true">/</span>
    <NuxtLink class="gb-brand" :to="to" title="Glass Box guide home; the outlined square is its logo mark"><strong>Glass Box</strong> <span>Terrarium, explained from the inside</span></NuxtLink>
  </div>
</template>
