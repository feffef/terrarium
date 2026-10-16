<script setup lang="ts">
// The Friction Ledger (GLOSSARY.md), rendered. A static segment, so it outranks
// the sibling `[...slug].vue`; reads only this Space's collections via useSpace.
import { routingMap } from '#routing'
import { resolveSpaceRoute } from '#shared/routing'

definePageMeta({ name: 'journal-frictions' })
const PAGE_TITLE = 'Friction Ledger'

const route = useRoute()
const { space, collections } = useSpace('journal')
// Only two Spaces: a session not in this one was moved to the other.
const otherSpace = Object.keys(routingMap.journal).find((s) => s !== space) ?? space

const { data } = await useAsyncData(route.path, async () => {
  const clusters = await queryCollection(collections.frictions).all()
  // Only the sessions a cluster cites travel in the payload (ADR-0028).
  const cited = new Set(clusters.flatMap((c) => c.occurrences.map((o) => o.session)))
  const goals: Record<string, string> = {}
  const own: string[] = []
  const read = async (sessions: typeof collections.sessions, isOwn: boolean) => {
    for (const s of await queryCollection(sessions).select('session', 'goal').all()) {
      if (!cited.has(s.session) || s.session in goals) continue
      goals[s.session] = s.goal
      if (isOwn) own.push(s.session)
    }
  }
  await read(collections.sessions, true)
  // Archiving moved older sessions to the other Space; read it for what is still missing.
  const other = cited.size > own.length ? resolveSpaceRoute('journal', otherSpace, undefined) : null
  if (other && otherSpace !== space) await read(other.collections.sessions, false)
  return { clusters, goals, own }
})
const panels = computed(() =>
  ledgerPanels(data.value?.clusters ?? [], space, new Set(data.value?.own), otherSpace, data.value?.goals),
)
const sections = computed(() => [
  {
    id: 'severe-h',
    title: 'Most severe',
    intro: 'The two highest severities reached, ranked by worst severity, then how often it hit that, then total.',
    entries: panels.value.severe,
  },
  {
    id: 'frequent-h',
    title: 'Most frequent',
    intro: 'The other clusters, ranked by how many sessions hit them.',
    entries: panels.value.frequent,
  },
])

useSeoMeta({ title: () => `${PAGE_TITLE} · journal/${space}` })
</script>

<template>
  <main class="jd jd-doc">
    <JournalBreadcrumb :space="space" :trail="['frictions']" />

    <article class="jd-prose">
      <h1>{{ PAGE_TITLE }}</h1>
      <p>
        What went wrong, grouped by root cause. Each cluster gathers the
        <strong>frictions</strong> agents logged in their session logs; the
        <code>frictions-to-fixes</code> Skill keeps it current. Fixed clusters stay
        listed: what went wrong matters as much as what is still open. A cluster
        sits in the list where it ranks higher. Click a cluster (▸) to expand its
        cause, merged PRs, sessions and logged frictions.
      </p>

      <template v-for="sec in sections" :key="sec.id">
        <h2 :id="sec.id">{{ sec.title }} <span class="n">{{ sec.entries.length }}</span></h2>
        <p class="intro">{{ sec.intro }}</p>
        <ul v-if="sec.entries.length" class="ledger">
          <li v-for="e in sec.entries" :id="`cluster-${e.name}`" :key="e.name">
            <details>
              <summary>
                <span class="count">{{ e.count }}<small>{{ e.count === 1 ? 'session' : 'sessions' }}</small></span>
                <span class="summary">{{ e.summary }}</span>
                <span class="pills">
                  <span class="pill sev" :class="e.worst" :title="`Worst severity: ${e.worst}`">{{ e.worst }}</span>
                  <span class="pill status" :class="e.status" :title="e.fixedOn ? `Fixed on ${e.fixedOn}` : undefined">
                    {{ e.status.replace('-', ' ') }}{{ e.fixedOn ? ` ${e.fixedOn.slice(5)}` : '' }}
                    <template v-if="e.status === 'fixed' && e.fixes.length">
                      · {{ e.fixes.length === 1 ? 'PR' : 'PRs' }}
                      <template v-for="(f, i) in e.fixes" :key="f.pr"><a :href="f.url" @click.stop>#{{ f.pr }}</a>{{ i < e.fixes.length - 1 ? ', ' : '' }}</template>
                    </template>
                  </span>
                </span>
              </summary>
              <p class="cause">{{ e.cause }}</p>
              <p v-if="e.ref" class="ref-text"><strong>References:</strong> {{ e.ref }}</p>
              <template v-if="e.fixes.length">
                <h3 class="occ-h">Merged PRs to fix it</h3>
                <p class="occ-intro">Newest first. Merged to fix it, which does not prove it worked.</p>
                <ul class="sol">
                  <li v-for="f in e.fixes" :key="f.pr">
                    {{ f.summary }} <a :href="f.url">PR #{{ f.pr }}</a> <span class="fix-date">{{ f.date }}</span>
                  </li>
                </ul>
              </template>
              <h3 class="occ-h">Occurrences</h3>
              <p class="occ-intro">Newest first: date (links to the session log) → the session's goal.</p>
              <ul class="occ">
                <li v-for="(o, i) in e.occurrences" :key="i">
                  <span class="dot" :class="o.severity" :title="o.severity" />
                  <NuxtLink :to="o.to" :aria-label="`Session log, ${o.date}, ${o.severity}`">{{ o.date }} →</NuxtLink>
                  <span v-if="o.goal" class="occ-goal">{{ o.goal }}</span>
                  <span v-else class="occ-goal">goal not available</span>
                  <span class="occ-sev">{{ o.severity }}</span>
                </li>
              </ul>
              <template v-if="e.reports.length">
                <h3 class="occ-h">Logged frictions and proposed solution</h3>
                <p class="occ-intro">As described by the agents that hit it.</p>
                <ul class="sol">
                  <li v-for="r in e.reports" :key="r.description + r.solution">
                    {{ r.description }}
                    <span class="proposed">→ {{ r.solution }}</span>
                    <NuxtLink :to="r.to" :aria-label="`Session log, ${r.date}`">{{ r.date }}</NuxtLink>
                  </li>
                </ul>
              </template>
            </details>
          </li>
        </ul>
        <p v-else>No friction clusters in this Space.</p>
      </template>
    </article>

    <SiteFooter />
  </main>
</template>

<style scoped>
.jd-prose { max-width: 80ch; }
.n { color: var(--jd-faint); font-weight: 400; margin-left: 0.4rem; }
.intro { color: var(--jd-muted); font-size: 0.88rem; }
.ledger { list-style: none; padding: 0; margin: 0; }
.ledger > li { margin: 0; border-top: 1px solid var(--jd-line); }
.ledger > li:first-child { border-top: 0; }
summary {
  display: grid;
  grid-template-columns: 2.6rem 1fr;
  gap: 0.3rem 0.7rem;
  padding: 0.55rem 0;
  cursor: pointer;
  list-style: none;
  font-size: 0.92rem;
}
summary::-webkit-details-marker { display: none; }
summary:focus-visible { outline: 2px solid var(--jd-accent); outline-offset: 2px; border-radius: 4px; }
.count {
  grid-row: span 2;
  font-family: var(--jd-mono);
  font-size: 1.15rem;
  font-weight: 600;
  text-align: right;
  color: var(--jd-ink);
}
.count small { display: block; font-size: 0.6rem; font-weight: 400; letter-spacing: 0.04em; color: var(--jd-muted); }
.summary { overflow-wrap: anywhere; }
.summary::before { content: '▸'; display: inline-block; width: 1rem; color: var(--jd-muted); }
details[open] .summary::before { content: '▾'; }
.pills { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.pill {
  font-family: var(--jd-mono);
  font-size: 0.66rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 0.05rem 0.5rem;
  border: 1px solid var(--jd-line);
  border-radius: 999px;
  color: var(--jd-muted);
  white-space: nowrap;
  text-decoration: none;
}
.pill.sev::before, .dot {
  content: '';
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  margin-right: 0.35rem;
  background: var(--jd-sev-nit);
}
.pill.sev.minor::before, .dot.minor { background: var(--jd-sev-minor); }
.pill.sev.moderate::before, .dot.moderate { background: var(--jd-sev-moderate); }
.pill.sev.major::before, .dot.major { background: var(--jd-sev-major); }
.pill.sev.blocker::before, .dot.blocker { background: var(--jd-sev-blocker); }
.pill.status.fixed { color: var(--jd-surface); background: var(--jd-accent); border-color: var(--jd-accent); }
.pill.status.open { color: var(--jd-ink); border-color: var(--jd-ink); }
.cause, .ref-text { margin: 0 0 0.4rem 3.3rem; font-size: 0.8rem; color: var(--jd-muted); overflow-wrap: anywhere; }
.jd-prose .occ-h { margin: 0.6rem 0 0.1rem 3.3rem; font-size: 0.8rem; color: var(--jd-ink); }
.occ-intro { margin: 0 0 0.4rem 3.3rem; font-size: 0.75rem; color: var(--jd-muted); }
.occ {
  list-style: none;
  margin: 0 0 0.7rem 3.3rem;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.25rem;
  font-family: var(--jd-mono);
  font-size: 0.75rem;
}
.occ li { margin: 0; }
/* About 20 lines, then scroll inside the list. */
.occ, .sol { max-height: 24rem; overflow-y: auto; overscroll-behavior: contain; }
.sol { margin: 0 0 0.7rem 3.3rem; padding-left: 1.1rem; font-size: 0.78rem; color: var(--jd-muted); overflow-wrap: anywhere; }
.sol li { margin-bottom: 0.35rem; }
.proposed { display: block; color: var(--jd-ink); }
.jd-prose .sol a { color: var(--jd-faint); font-family: var(--jd-mono); font-size: 0.7rem; }
.pill.status { white-space: normal; border-radius: 0.9rem; }
.jd-prose .pill.status a { color: inherit; text-decoration: underline; }
.fix-date { color: var(--jd-faint); font-family: var(--jd-mono); font-size: 0.7rem; }
.jd-prose .occ a { color: var(--jd-ink); text-decoration: none; }
.jd-prose .occ a:hover { color: var(--jd-accent); text-decoration: underline; }
.occ-goal { margin-left: 0.5rem; font-family: var(--jd-serif); font-size: 0.8rem; color: var(--jd-muted); }
.occ-sev { color: var(--jd-faint); margin-left: 0.4rem; }
@media (max-width: 560px) {
  .cause, .ref-text, .occ, .sol, .jd-prose .occ-h, .occ-intro { margin-left: 0; }
}
</style>
