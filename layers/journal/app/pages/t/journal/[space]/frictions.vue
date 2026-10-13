<script setup lang="ts">
// The Friction Ledger (CONTEXT.md), rendered. A static segment, so it outranks
// the sibling `[...slug].vue`; reads only this Space's collections via useSpace.
import { routingMap } from '#routing'

definePageMeta({ name: 'journal-frictions' })
const PAGE_TITLE = 'Friction Ledger'

const route = useRoute()
const { space, collections } = useSpace('journal')

const { data } = await useAsyncData(route.path, async () => {
  const clusters = await queryCollection(collections.frictions).all()
  const sessions = await queryCollection(collections.sessions).select('session').all()
  return { clusters, sessionIds: sessions.map((s) => s.session) }
})
// Only two Spaces: a session not in this one was moved to the other.
const otherSpace = Object.keys(routingMap.journal).find((s) => s !== space) ?? space
const panels = computed(() =>
  ledgerPanels(data.value?.clusters ?? [], space, new Set(data.value?.sessionIds ?? []), otherSpace),
)
const sections = computed(() => [
  {
    id: 'severe-h',
    title: 'Most severe',
    intro: 'Ranked by the worst severity a cluster has reached, then by how often it hit that, then by its total.',
    entries: panels.value.severe,
  },
  {
    id: 'frequent-h',
    title: 'Most frequent',
    intro: 'Every other cluster, ranked by how many sessions hit it.',
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
        listed: what went wrong matters as much as what is still open. Expand one
        for the sessions that hit it.
      </p>

      <template v-for="sec in sections" :key="sec.id">
        <h2 :id="sec.id">{{ sec.title }} <span class="n">{{ sec.entries.length }}</span></h2>
        <p class="intro">{{ sec.intro }}</p>
        <ul v-if="sec.entries.length" class="ledger">
          <li v-for="e in sec.entries" :id="`cluster-${e.name}`" :key="e.name">
            <details>
              <summary>
                <span class="count" :aria-label="`${e.count} sessions`">{{ e.count }}</span>
                <span class="cause">{{ e.cause }}</span>
                <span class="pills">
                  <span class="pill sev" :class="e.worst" :title="`Worst severity: ${e.worst}`">{{ e.worst }}</span>
                  <span class="pill status" :class="e.status" :title="e.fixedOn ? `Fixed on ${e.fixedOn}` : undefined">
                    {{ e.status.replace('-', ' ') }}{{ e.fixedOn ? ` ${e.fixedOn.slice(5)}` : '' }}
                  </span>
                  <a v-for="r in e.refLinks" :key="r.url" class="pill ref" :href="r.url" @click.stop>{{ r.label }}</a>
                </span>
              </summary>
              <p v-if="e.ref" class="ref-text">{{ e.ref }}</p>
              <ul class="occ">
                <li v-for="(o, i) in e.occurrences" :key="i">
                  <span class="dot" :class="o.severity" :title="o.severity" />
                  <NuxtLink :to="o.to" :aria-label="`Session log, ${o.date}, ${o.severity}`">{{ o.date }} →</NuxtLink>
                  <span class="occ-sev">{{ o.severity }}</span>
                </li>
              </ul>
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
.cause { overflow-wrap: anywhere; }
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
.jd-prose .pill.ref { color: var(--jd-accent); }
.jd-prose .pill.ref:hover { border-color: var(--jd-accent); }
.ref-text { margin: 0 0 0.4rem 3.3rem; font-size: 0.8rem; color: var(--jd-muted); }
.occ {
  list-style: none;
  margin: 0 0 0.7rem 3.3rem;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 0.15rem 1rem;
  font-family: var(--jd-mono);
  font-size: 0.75rem;
}
.occ li { margin: 0; }
.jd-prose .occ a { color: var(--jd-ink); text-decoration: none; }
.jd-prose .occ a:hover { color: var(--jd-accent); text-decoration: underline; }
.occ-sev { color: var(--jd-faint); margin-left: 0.4rem; }
@media (max-width: 560px) {
  .ref-text, .occ { margin-left: 0; }
}
</style>
