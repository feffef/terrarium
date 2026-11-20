<script setup lang="ts">
defineProps<{ text: string }>()
</script>

<template>
  <template v-for="(p, i) in skillRoleParts(text)" :key="i">
    <code v-if="p.kind === 'code'">{{ p.text }}</code>
    <em v-else-if="p.kind === 'em'">{{ p.text }}</em>
    <strong v-else-if="p.kind === 'strong'">{{ p.text }}</strong>
    <template v-else>{{ p.text }}</template>
  </template>
</template>
