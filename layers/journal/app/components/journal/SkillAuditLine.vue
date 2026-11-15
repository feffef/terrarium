<script setup lang="ts">
defineProps<{ audit: { date: string; text: string } }>()
</script>

<template>
  <p class="audit" :class="{ stale: auditIsStale(audit.date) }">
    <span class="audit-date">last audited {{ formatAuditDate(audit.date) }}</span>
    {{ audit.text }}
  </p>
</template>

<style scoped>
.audit { margin: 0.25rem 0 0; font-size: 0.8rem; color: var(--jd-muted); font-family: var(--jd-serif); }
.audit-date { font-family: var(--jd-mono); font-size: 0.68rem; color: var(--jd-faint); margin-right: 0.4rem; }
.audit.stale { opacity: 0.55; }
</style>
