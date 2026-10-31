<script setup lang="ts">
// Authored titles and notes mark inline code with backticks; show them as code.
// `links` turns prose `#N` into issue links (issue #2719); opt-in, as a title can sit inside a link.
const props = defineProps<{ text: string; links?: boolean }>()
const parts = computed(() => props.text.split(/`([^`]+)`/))
</script>

<template>
  <template v-for="(part, i) in parts" :key="i"><code v-if="i % 2" class="midden-ticks">{{ part }}</code><template v-else-if="links"><template v-for="(r, j) in middenIssueRefParts(part)" :key="j"><a v-if="typeof r !== 'string'" :href="r.href" target="_blank" rel="noopener noreferrer">{{ r.ref }}</a><template v-else>{{ r }}</template></template></template><template v-else>{{ part }}</template></template>
</template>

<style scoped>
.midden-ticks {
  font-family: var(--midden-mono);
  font-size: 0.88em;
  overflow-wrap: anywhere;
}
</style>
