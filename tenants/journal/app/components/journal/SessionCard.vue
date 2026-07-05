<script setup lang="ts">
// One session log in the recent-activity feed. The page derives the display-ready
// view from this Space's `sessions` collection; this component just renders it.
import type { SessionCardView } from '../../types/journal'

const { card } = defineProps<{ card: SessionCardView }>()
</script>

<template>
  <article class="card">
    <div class="top">
      <span class="when">{{ card.when }} <span class="dur">· {{ card.duration }} min</span></span>
      <JournalStatusPill :status="card.status" />
    </div>
    <h3 class="goal">{{ card.goal }}</h3>
    <p class="outcome">{{ card.outcome }}</p>
    <div class="foot">
      <span v-for="pr in card.prs" :key="pr" class="chip pr">PR {{ pr.startsWith('#') ? pr : '#' + pr }}</span>
      <JournalFrictionStrata variant="inline" :counts="card.frictionCounts" :total="card.frictionTotal" />
      <span v-if="card.skills.length" class="skills">{{ card.skills.join(' · ') }}</span>
      <span class="sid">{{ card.sid }}</span>
    </div>
  </article>
</template>

<style scoped>
.card {
  background: var(--jd-surface);
  border: 1px solid var(--jd-line);
  border-radius: var(--jd-radius);
  padding: 1rem 1.15rem 1.05rem;
  box-shadow: var(--jd-shadow);
  transition: transform 0.15s ease, border-color 0.15s ease;
}
.card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in oklab, var(--jd-accent) 40%, var(--jd-line));
}
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.when {
  font-family: var(--jd-mono);
  font-size: 0.73rem;
  color: var(--jd-muted);
  font-variant-numeric: tabular-nums;
}
.when .dur { color: var(--jd-faint); }
.goal {
  font-family: var(--jd-serif);
  font-size: 1.12rem;
  font-weight: 600;
  margin: 0 0 0.3rem;
  line-height: 1.25;
  text-wrap: balance;
}
.outcome { margin: 0 0 0.8rem; color: var(--jd-muted); font-size: 0.92rem; }
.foot {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  flex-wrap: wrap;
}
.chip {
  font-family: var(--jd-mono);
  font-size: 0.72rem;
  color: var(--jd-muted);
  background: var(--jd-surface-2);
  border: 1px solid var(--jd-line);
  padding: 0.16rem 0.5rem;
  border-radius: 6px;
}
.chip.pr { color: var(--jd-accent); }
.skills { font-family: var(--jd-mono); font-size: 0.7rem; color: var(--jd-faint); }
.sid {
  margin-left: auto;
  font-family: var(--jd-mono);
  font-size: 0.7rem;
  color: var(--jd-faint);
}
@media (max-width: 460px) {
  .sid { display: none; }
}
</style>
