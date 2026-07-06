<script setup lang="ts">
// The Space's Skill Inventory grouped by importance — the curated "use these"
// list CLAUDE.md points agents at. `essential` / `specialist` Skills show their
// role; supporting / peripheral collapse to compact chips.
import type { Importance, SkillDoc } from '../../types/journal'

defineProps<{
  groups: { importance: Importance; skills: SkillDoc[] }[]
}>()
</script>

<template>
  <div>
    <div v-for="g in groups" :key="g.importance" class="imp-group">
      <div class="imp-head">
        <span class="label">{{ g.importance }}</span>
        <span class="bar" />
        <span class="n">{{ g.skills.length }}</span>
      </div>

      <template v-if="g.importance === 'essential' || g.importance === 'specialist'">
        <div v-for="s in g.skills" :key="s.name" class="skill">
          <div class="name">
            {{ s.name }}
            <span v-if="s.category === 'platform-operation'" class="po">platform-op</span>
          </div>
          <p class="role">{{ s.role }}</p>
        </div>
      </template>

      <div v-else class="chips-inline">
        <span v-for="s in g.skills" :key="s.name" class="chip">{{ s.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.imp-group + .imp-group { margin-top: 1.05rem; }
.imp-head { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.55rem; }
.label {
  font-family: var(--jd-mono);
  font-size: 0.68rem;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--jd-ink);
}
.imp-head .bar { height: 1px; flex: 1; background: var(--jd-line); }
.imp-head .n { font-family: var(--jd-mono); font-size: 0.72rem; color: var(--jd-faint); }
.skill { padding: 0.5rem 0; border-bottom: 1px dashed var(--jd-line); }
.skill:last-child { border-bottom: 0; }
.name {
  font-family: var(--jd-mono);
  font-size: 0.86rem;
  color: var(--jd-ink);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.name .po {
  font-size: 0.6rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--jd-accent);
  border: 1px solid color-mix(in oklab, var(--jd-accent) 35%, transparent);
  border-radius: 4px;
  padding: 0 0.3rem;
}
.role { margin: 0.25rem 0 0; font-size: 0.83rem; color: var(--jd-muted); font-family: var(--jd-serif); }
.chips-inline { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.chip {
  font-family: var(--jd-mono);
  font-size: 0.75rem;
  color: var(--jd-muted);
  background: var(--jd-surface-2);
  border: 1px solid var(--jd-line);
  padding: 0.16rem 0.5rem;
  border-radius: 6px;
}
</style>
