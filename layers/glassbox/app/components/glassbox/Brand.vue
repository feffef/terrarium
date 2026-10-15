<script setup lang="ts">
defineProps<{ to: string }>()
</script>

<template>
  <NuxtLink class="gb-brand" :to="to"><strong>Glass Box</strong> <span>Terrarium, explained from the inside</span></NuxtLink>
</template>
