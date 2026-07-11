<script setup lang="ts">
// One session log in the recent-activity feed. The collapsed head is a summary;
// clicking it expands the full log in place — its narrative, docs read, skills
// used, and every friction. Sessions are a `data` collection with no route of
// their own, so this inline disclosure is how the detail is reached. The
// clickable-row a11y wiring (role/tabindex/aria-expanded/keyboard) is single-homed
// in `<JournalDisclosure>`, shared with the digest rows on the Space landing —
// this component supplies only the head's own content via its default slot.
// Types are imported relatively (`~/` resolves to the main app in a layer —
// docs/agents/tenant-layers.md §1); `prUrl` arrives via the utils auto-import.
import type { SessionCardView } from '../../types/journal'

const { card } = defineProps<{ card: SessionCardView }>()
const expanded = ref(false)
const detailId = useId()
const toggle = () => (expanded.value = !expanded.value)
</script>

<template>
  <article class="card" :class="{ open: expanded }">
    <JournalDisclosure class="head" :expanded="expanded" :controls="detailId" @toggle="toggle">
      <div class="top">
        <span class="when">{{ card.when }} <span class="dur">· {{ card.duration }} min</span></span>
        <JournalStatusPill :status="card.status" />
      </div>
      <h3 class="goal">{{ card.goal }}</h3>
      <p class="outcome">{{ card.outcome }}</p>
      <div class="foot">
        <!-- @click.stop: the whole head toggles the card; a PR chip navigates instead -->
        <a v-for="pr in card.prs" :key="pr" class="chip pr" :href="prUrl(pr)" @click.stop>PR {{ pr.startsWith('#') ? pr : '#' + pr }}</a>
        <span v-if="card.model" class="chip model" title="Model(s) that drove this session">{{ card.model }}</span>
        <JournalFrictionStrata variant="inline" :counts="card.frictionCounts" :total="card.frictionTotal" />
        <span v-if="card.skills.length" class="skills">{{ card.skills.join(' · ') }}</span>
        <span class="sid">{{ card.sid }}</span>
        <span class="caret" aria-hidden="true">{{ expanded ? '▾' : '▸' }}</span>
      </div>
    </JournalDisclosure>

    <div v-if="expanded" :id="detailId" class="detail">
      <p v-if="card.summary" class="summary">{{ card.summary }}</p>

      <div v-if="card.subagents.length" class="block">
        <h4>Subagents</h4>
        <ul>
          <li v-for="(a, i) in card.subagents" :key="i">
            <span class="mono">{{ a.type || 'agent' }}</span
            ><span v-if="a.model" class="amodel"> · {{ a.model }}</span
            ><template v-if="a.task"> — {{ a.task }}</template>
          </li>
        </ul>
        <p class="subnote">
          The tools, Skills, and files below are the main session's only — each
          subagent works in its own context, so its internal activity isn't
          traced here.
        </p>
      </div>

      <div v-if="card.skillsUsed.length" class="block">
        <h4>Skills used</h4>
        <ul>
          <li v-for="s in card.skillsUsed" :key="s.name"><span class="mono">{{ s.name }}</span> — {{ s.reason }}</li>
        </ul>
      </div>

      <div v-if="card.frictions.length" class="block">
        <h4>Frictions</h4>
        <ul class="frictions">
          <li v-for="(f, i) in card.frictions" :key="i">
            <span class="sev" :data-sev="f.severity">{{ f.severity }}</span>
            <span class="fdesc">{{ f.description }}<span v-if="f.solution" class="fsol"> → {{ f.solution }}</span></span>
          </li>
        </ul>
      </div>

      <div v-if="card.learnings.length" class="block">
        <h4>Learnings</h4>
        <ul class="sparks">
          <li v-for="(l, i) in card.learnings" :key="i">{{ l }}</li>
        </ul>
      </div>

      <div v-if="card.ideas.length" class="block">
        <h4>Ideas</h4>
        <ul class="sparks">
          <li v-for="(idea, i) in card.ideas" :key="i">{{ idea }}</li>
        </ul>
      </div>

      <!-- Mechanical trace — verbose, transcript-derived lists. Tucked behind
           individual disclosures so they inform without swamping the narrative. -->
      <div v-if="card.docsRead.length || card.filesEdited.length || card.tools.length" class="trace-group">
        <details v-if="card.docsRead.length" class="trace">
          <summary>Files read <span class="n">{{ card.docsRead.length }}</span></summary>
          <ul>
            <li v-for="d in card.docsRead" :key="d.path"><code>{{ d.path }}</code> — {{ d.reason }}</li>
          </ul>
        </details>
        <details v-if="card.filesEdited.length" class="trace">
          <summary>Files edited <span class="n">{{ card.filesEdited.length }}</span></summary>
          <ul>
            <li v-for="f in card.filesEdited" :key="f"><code>{{ f }}</code></li>
          </ul>
        </details>
        <details v-if="card.tools.length" class="trace">
          <summary>Tools used <span class="n">{{ card.tools.length }}</span></summary>
          <div class="tools">
            <span v-for="t in card.tools" :key="t.name" class="tool"
              ><span class="mono">{{ t.name }}</span><span class="tcount">×{{ t.count }}</span></span
            >
          </div>
        </details>
      </div>
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
.card:hover { border-color: color-mix(in oklab, var(--jd-accent) 40%, var(--jd-line)); }
.card:not(.open):hover { transform: translateY(-2px); }
.head { cursor: pointer; display: block; border-radius: 6px; }
.head:focus-visible { outline: 2px solid var(--jd-accent); outline-offset: 4px; }
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
.chip.pr { color: var(--jd-accent); text-decoration: none; }
.chip.pr:hover { border-color: var(--jd-accent); text-decoration: underline; }
.chip.model { color: var(--jd-ink); }
.chip.model::before {
  content: '';
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--jd-accent);
  margin-right: 0.4rem;
  vertical-align: middle;
}
.skills { font-family: var(--jd-mono); font-size: 0.7rem; color: var(--jd-faint); }
.sid {
  margin-left: auto;
  font-family: var(--jd-mono);
  font-size: 0.7rem;
  color: var(--jd-faint);
}
.caret { color: var(--jd-faint); font-size: 0.78rem; }

.detail {
  margin-top: 0.9rem;
  padding-top: 0.9rem;
  border-top: 1px dashed var(--jd-line);
}
.summary { margin: 0 0 0.95rem; color: var(--jd-ink); font-size: 0.95rem; line-height: 1.55; }
.block { margin: 0 0 0.9rem; }
.block:last-child { margin-bottom: 0; }
.block h4 {
  margin: 0 0 0.45rem;
  font-family: var(--jd-mono);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--jd-faint);
}
.block ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 0.4rem; }
.block li { font-size: 0.88rem; color: var(--jd-muted); line-height: 1.5; }
.block code, .mono { font-family: var(--jd-mono); font-size: 0.82em; color: var(--jd-ink); }
.frictions li { display: grid; grid-template-columns: max-content 1fr; gap: 0.6rem; align-items: baseline; }
.sparks li { display: grid; grid-template-columns: max-content 1fr; gap: 0.55rem; align-items: baseline; }
.sparks li::before { content: '›'; color: var(--jd-accent); font-weight: 600; }
.sev {
  font-family: var(--jd-mono);
  font-size: 0.66rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.sev[data-sev='nit'] { color: var(--jd-sev-nit); }
.sev[data-sev='minor'] { color: var(--jd-sev-minor); }
.sev[data-sev='moderate'] { color: var(--jd-sev-moderate); }
.sev[data-sev='major'] { color: var(--jd-sev-major); }
.sev[data-sev='blocker'] { color: var(--jd-sev-blocker); }
.fsol { color: var(--jd-faint); }
.amodel { font-family: var(--jd-mono); color: var(--jd-accent); font-size: 0.82em; }
.subnote { margin: 0.55rem 0 0; font-size: 0.8rem; font-style: italic; color: var(--jd-faint); line-height: 1.5; }

/* Mechanical-trace disclosures — native <details>, one per verbose list. */
.trace-group { display: flex; flex-direction: column; gap: 0.4rem; }
.trace {
  border: 1px solid var(--jd-line);
  border-radius: 6px;
  background: var(--jd-surface-2);
}
.trace > summary {
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.6rem;
  font-family: var(--jd-mono);
  font-size: 0.68rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--jd-faint);
  border-radius: 6px;
}
.trace > summary::-webkit-details-marker { display: none; }
.trace > summary::before { content: '▸'; font-size: 0.72em; color: var(--jd-faint); }
.trace[open] > summary::before { content: '▾'; }
.trace > summary:focus-visible { outline: 2px solid var(--jd-accent); outline-offset: 2px; }
.trace .n {
  font-size: 0.92em;
  color: var(--jd-muted);
  background: var(--jd-surface);
  border: 1px solid var(--jd-line);
  border-radius: 999px;
  padding: 0 0.42rem;
  font-variant-numeric: tabular-nums;
}
.trace > ul { margin: 0; padding: 0 0.7rem 0.6rem; list-style: none; display: flex; flex-direction: column; gap: 0.35rem; }
.trace li { font-size: 0.84rem; color: var(--jd-muted); line-height: 1.45; }
.tools { display: flex; flex-wrap: wrap; gap: 0.35rem; padding: 0 0.7rem 0.6rem; }
.tool {
  display: inline-flex;
  align-items: baseline;
  gap: 0.28rem;
  background: var(--jd-surface);
  border: 1px solid var(--jd-line);
  border-radius: 5px;
  padding: 0.14rem 0.42rem;
  font-size: 0.75rem;
  color: var(--jd-muted);
}
.tool .tcount { color: var(--jd-faint); font-variant-numeric: tabular-nums; }
@media (max-width: 460px) {
  .sid { display: none; }
}
</style>
