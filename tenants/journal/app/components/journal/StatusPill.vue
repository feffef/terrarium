<script setup lang="ts">
// A session's `status` rendered as state-in-form: colour + glyph, not just a word,
// so completed / partial / blocked / abandoned read at a glance.
defineProps<{
  status: 'completed' | 'partial' | 'blocked' | 'abandoned'
}>()
</script>

<template>
  <span class="pill" :class="status">
    <span class="glyph" />{{ status }}
  </span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--jd-mono);
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  border: 1px solid transparent;
}
.glyph {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.completed {
  color: var(--jd-status-completed);
  background: color-mix(in oklab, var(--jd-status-completed) 12%, var(--jd-surface));
  border-color: color-mix(in oklab, var(--jd-status-completed) 30%, transparent);
}
.completed .glyph { background: var(--jd-status-completed); }
.partial {
  color: var(--jd-status-partial);
  background: color-mix(in oklab, var(--jd-status-partial) 14%, var(--jd-surface));
  border-color: color-mix(in oklab, var(--jd-status-partial) 34%, transparent);
}
.partial .glyph { background: var(--jd-status-partial); }
.blocked {
  color: var(--jd-status-blocked);
  background: color-mix(in oklab, var(--jd-status-blocked) 14%, var(--jd-surface));
  border-color: color-mix(in oklab, var(--jd-status-blocked) 34%, transparent);
}
.blocked .glyph { background: var(--jd-status-blocked); }
.abandoned {
  color: var(--jd-status-abandoned);
  background: color-mix(in oklab, var(--jd-status-abandoned) 14%, var(--jd-surface));
  border-color: color-mix(in oklab, var(--jd-status-abandoned) 34%, transparent);
}
.abandoned .glyph { background: var(--jd-status-abandoned); }
</style>
