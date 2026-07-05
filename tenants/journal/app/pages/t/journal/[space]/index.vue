<script setup lang="ts">
// The Journal Tenant's Space-landing overview. A more specific route than the
// Platform's generic catch-all (`/t/[tenant]/[space]/[...slug]`), so it wins for
// the Space *root* only — individual Documents still render via the catch-all.
//
// Isolation-respecting and presentation-only: it resolves the Space to its keyed
// collections through the SAME generated routing map the catch-all uses (a
// read-only import — no isolation logic is duplicated or changed), then reads
// only `journal_<space>_{pages,skills,sessions}`. Spaces cannot leak.
import type { Collections } from '@nuxt/content'
import { resolveSpaceRoute, type RoutingMap } from '~~/shared/routing'
import { routingMap } from '~~/shared/routing.generated'
import type { PageDoc, SessionDoc, SkillDoc } from '../../../../types/journal'
// Pure aggregation/formatting lives in a layer-local, unit-tested module (issue
// #61) — imported by relative path (the `~/` alias would resolve to the main
// app, not this layer; see docs/agents/tenant-layers.md §1). The SFC keeps only
// the thin `computed()` wrappers below.
import {
  cards as buildCards,
  digestList,
  externalSkillCount as countExternalSkills,
  frictionCount as countFrictionTotal,
  frictionTotals as rollupFrictions,
  kindCounts as countKinds,
  ownSkills as selectOwnSkills,
  prRefs as dedupePrRefs,
  skillGroups as groupSkills,
  skillsLabel as buildSkillsLabel,
  skillsSub as buildSkillsSub,
} from '../../../../utils/dashboard'

const route = useRoute()
const tenant = 'journal'
const space = String(route.params.space)

// Resolve through the SAME shared, unit-tested resolver the catch-all uses — no
// isolation logic is duplicated here; it reads only this (Tenant, Space)'s keys.
const resolved = resolveSpaceRoute(tenant, space, undefined)
if (!resolved) {
  throw createError({ statusCode: 404, statusMessage: `Unknown Space: ${tenant}/${space}` })
}
// Narrow each key to the concrete set of journal collections of that type
// (`journal_<space>_pages`, …) rather than the whole `keyof Collections` union.
// `queryCollection(key)` is generic in the key, so a wide key widens its result
// to every collection's item type (union) — losing the page/data fields the UI
// reads, and (for #55's now-enforced typecheck) failing on them. These template-
// literal Extracts keep the result typed as this Tenant's own collection items,
// which also stay `<ContentRenderer>`-compatible.
const pagesKey = resolved.pagesKey as Extract<keyof Collections, `journal_${string}_pages`>
const skillsKey = resolved.dataCollections.find((d) => d.name === 'skills')?.key as Extract<keyof Collections, `journal_${string}_skills`> | undefined
const sessionsKey = resolved.dataCollections.find((d) => d.name === 'sessions')?.key as Extract<keyof Collections, `journal_${string}_sessions`> | undefined

// The resolver deliberately exposes only the one resolved Space, so read the map
// directly (with the shared type) for the Space-toggle's list of sibling Spaces.
const spaces = Object.keys((routingMap as RoutingMap)[tenant] ?? {})

const { data } = await useAsyncData(route.path, async () => {
  const pages = await queryCollection(pagesKey).all()
  const skills = skillsKey ? await queryCollection(skillsKey).all() : []
  const sessions = sessionsKey ? await queryCollection(sessionsKey).all() : []
  return { pages, skills, sessions }
})

// `.all()` returns the full page Documents with their parsed body, so the root's
// editorial intro AND each Digest's body are already loaded — Digests expand inline
// here with no extra request, consistent with the session cards (ADR-0010).
const allPages = computed(() => data.value?.pages ?? [])
const rootDoc = computed(() => allPages.value.find((p) => p.path === '/') ?? null)
const page = computed(() => (rootDoc.value ?? null) as PageDoc | null)
const digests = computed(() => digestList(allPages.value))

// Which Digests are expanded, keyed by content path — an inline disclosure, the
// same interaction as the session cards.
const openDigests = reactive<Record<string, boolean>>({})
const toggleDigest = (path: string) => {
  openDigests[path] = !openDigests[path]
}
const skills = computed(() => (data.value?.skills ?? []) as unknown as SkillDoc[])
const sessions = computed(() =>
  ((data.value?.sessions ?? []) as unknown as SessionDoc[])
    .slice()
    .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime()),
)

// ── Derived dashboard data — thin wrappers over the pure module ──
const cards = computed(() => buildCards(sessions.value))
const frictionTotals = computed(() => rollupFrictions(sessions.value))
const frictionCount = computed(() => countFrictionTotal(sessions.value))
const kindCounts = computed(() => countKinds(sessions.value))
const prRefs = computed(() => dedupePrRefs(sessions.value))

const ownSkills = computed(() => selectOwnSkills(skills.value))
const externalSkillCount = computed(() => countExternalSkills(skills.value))
const skillsLabel = computed(() => buildSkillsLabel(externalSkillCount.value))
const skillsSub = computed(() => buildSkillsSub(ownSkills.value))
const skillGroups = computed(() => groupSkills(ownSkills.value))

const title = computed(() => page.value?.title ?? `The Platform Journal — ${space}`)
const lede = computed(() => page.value?.description ?? `The ${space} Space of the journal Tenant.`)

useHead({ title: `${title.value} · journal/${space}` })
</script>

<template>
  <main class="jd">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <NuxtLink to="/">terrarium</NuxtLink>
      <span class="sep">/</span>
      <span>journal</span>
      <span class="sep">/</span>
      <span class="here">{{ space }}</span>
    </nav>

    <header class="masthead">
      <div>
        <h1>{{ title }}</h1>
        <p class="lede">{{ lede }}</p>
      </div>
      <div class="spaces">
        <div class="space-toggle" role="tablist" aria-label="Space">
          <NuxtLink
            v-for="s in spaces"
            :key="s"
            :to="`/t/journal/${s}`"
            role="tab"
            :aria-current="s === space ? 'page' : undefined"
          >
            <span class="dot" />{{ s }}
          </NuxtLink>
        </div>
        <div class="snapshot">
          <span class="live">live snapshot</span><br >
          updates as sessions are logged
        </div>
      </div>
    </header>

    <!-- Free-form editorial intro — the root page's Markdown body -->
    <section v-if="rootDoc" class="intro">
      <ContentRenderer :value="rootDoc" />
    </section>

    <!-- Daily digests — a plain-language, day-by-day recap of project activity -->
    <section v-if="digests.length" class="panel digests">
      <div class="section-head">
        <h2>Daily digests</h2>
        <span class="count">newest first</span>
      </div>
      <p class="panel-intro">
        A plain recap of what changed across the project each day — click any day
        to read the full story.
      </p>
      <ul class="digest-list">
        <li
          v-for="d in digests"
          :key="d.doc.path"
          class="digest"
          :class="{ open: openDigests[d.doc.path] }"
        >
          <div
            class="drow"
            role="button"
            tabindex="0"
            :aria-expanded="!!openDigests[d.doc.path]"
            @click="toggleDigest(d.doc.path)"
            @keydown.enter.prevent="toggleDigest(d.doc.path)"
            @keydown.space.prevent="toggleDigest(d.doc.path)"
          >
            <span class="digest-date">{{ d.date }}</span>
            <span class="digest-summary">{{ d.summary }}</span>
            <span class="caret" aria-hidden="true">{{ openDigests[d.doc.path] ? '▾' : '▸' }}</span>
          </div>
          <div v-if="openDigests[d.doc.path]" class="digest-body">
            <ContentRenderer :value="d.doc" />
          </div>
        </li>
      </ul>
    </section>

    <!-- State of this Space -->
    <section class="tiles" aria-label="State of this Space">
      <JournalStatTile
        label="Sessions logged"
        :value="sessions.length"
        :sub="`${kindCounts.interactive} interactive · ${kindCounts.autonomous} autonomous`"
      />
      <JournalStatTile
        :label="skillsLabel"
        :value="ownSkills.length"
        :sub="skillsSub"
      />
      <JournalStatTile
        label="Frictions surfaced"
        :value="frictionCount"
        :sub="`${frictionTotals.blocker} blockers · ${frictionTotals.major} major`"
      />
      <JournalStatTile
        label="PRs referenced"
        :value="prRefs.length"
        :sub="prRefs.length ? prRefs.map((p) => '#' + p).join(' · ') : 'none yet'"
      />
    </section>

    <div class="grid">
      <!-- Recent activity -->
      <section class="feed">
        <div class="section-head">
          <h2>Recent activity</h2>
          <span class="count">session logs, newest first</span>
        </div>
        <div v-if="cards.length" class="cards">
          <JournalSessionCard v-for="c in cards" :key="c.key" :card="c" />
        </div>
        <p v-else class="empty">No sessions logged in this Space yet.</p>
      </section>

      <!-- Rail -->
      <aside class="rail">
        <section class="panel">
          <div class="section-head">
            <h2>Friction signal</h2>
            <span class="count">{{ frictionCount }} across {{ sessions.length }} session{{ sessions.length === 1 ? '' : 's' }}</span>
          </div>
          <p class="panel-intro">
            Pain-points agents log about their own work — recorded so the
            platform can improve. More logged is better, not worse.
          </p>
          <JournalFrictionStrata :counts="frictionTotals" :total="frictionCount" />
          <p v-if="frictionCount > 0" class="friction-note">
            Graded <span class="mono">nit → blocker</span>. These are
            pain-points agents honestly log about their own work, recorded so
            the platform can later spot recurring problems on its own.
          </p>
        </section>

        <section class="panel">
          <div class="section-head">
            <h2>Platform Skills</h2>
            <span class="count">{{ ownSkills.length }} authored here</span>
          </div>
          <JournalSkillCatalogue v-if="skillGroups.length" :groups="skillGroups" />
          <p v-else class="empty">No Platform Skills authored in this Space yet.</p>
          <p v-if="externalSkillCount" class="skill-note">
            Backed by {{ externalSkillCount }} general-engineering Skills from an
            external pack — <span class="mono">used</span>, not evolved here.
          </p>
        </section>
      </aside>
    </div>
  </main>
</template>

<style scoped>
/* The `.jd` tokens + base layout, `.mono`, and the breadcrumb live in the shared
   theme (tenants/journal/app/assets/theme.css, registered globally in the layer's
   nuxt.config). This block holds only the landing-page-specific styling. */
.masthead {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem 2rem;
  align-items: start;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--jd-line);
}
h1 {
  font-family: var(--jd-serif);
  font-weight: 600;
  font-size: clamp(1.9rem, 4.2vw, 2.7rem);
  line-height: 1.05;
  letter-spacing: -0.01em;
  margin: 0 0 0.55rem;
  text-wrap: balance;
}
.lede { margin: 0; max-width: 54ch; color: var(--jd-muted); font-size: 1.02rem; }

.intro { margin: 1.6rem 0 0; max-width: 68ch; font-size: 1.04rem; }
.intro :deep(p) { margin: 0 0 0.8rem; color: var(--jd-muted); }
.intro :deep(p:last-child) { margin-bottom: 0; }
.intro :deep(a) { color: var(--jd-accent); text-decoration: none; }
.intro :deep(a:hover) { text-decoration: underline; }
.intro :deep(strong) { color: var(--jd-ink); font-weight: 600; }
.intro :deep(code) {
  font-family: var(--jd-mono);
  font-size: 0.88em;
  background: var(--jd-surface-2);
  padding: 0.1em 0.35em;
  border-radius: 4px;
}
.intro :deep(h2) {
  font-family: var(--jd-mono);
  font-size: 0.88rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--jd-ink);
  margin: 1.3rem 0 0.5rem;
}

.spaces { display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end; }
.space-toggle {
  display: inline-flex;
  background: var(--jd-surface-2);
  border: 1px solid var(--jd-line);
  border-radius: 999px;
  padding: 3px;
  font-family: var(--jd-mono);
  font-size: 0.8rem;
}
.space-toggle a {
  text-decoration: none;
  color: var(--jd-muted);
  padding: 0.28rem 0.8rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  text-transform: lowercase;
}
.space-toggle a[aria-current='page'] {
  background: var(--jd-surface);
  color: var(--jd-ink);
  box-shadow: var(--jd-shadow);
}
.space-toggle .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--jd-accent); }
.space-toggle a:not([aria-current='page']) .dot { background: var(--jd-faint); }
.snapshot { color: var(--jd-faint); font-size: 0.72rem; text-align: right; font-family: var(--jd-mono); }
.snapshot .live { color: var(--jd-accent); }
.snapshot .live::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--jd-accent);
  margin-right: 0.35rem;
  vertical-align: middle;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.9rem;
  margin: 1.75rem 0 2.25rem;
}

.grid { display: grid; grid-template-columns: 1.7fr 1fr; gap: 1.6rem; align-items: start; }

.digests { margin-top: 1.75rem; }
.panel-intro { margin: 0 0 0.95rem; max-width: 72ch; color: var(--jd-muted); font-size: 0.92rem; line-height: 1.5; }
.digest-list { list-style: none; margin: 0; padding: 0; }
.digest { border-top: 1px solid var(--jd-line); }
.digest:first-child { border-top: 0; }
.drow {
  display: grid;
  grid-template-columns: max-content 1fr max-content;
  gap: 0.1rem 0.9rem;
  align-items: baseline;
  padding: 0.7rem 0;
  cursor: pointer;
  border-radius: 6px;
}
.drow:focus-visible { outline: 2px solid var(--jd-accent); outline-offset: 3px; }
.digest-date { font-family: var(--jd-mono); font-size: 0.82rem; color: var(--jd-accent); white-space: nowrap; }
.digest-summary { color: var(--jd-ink); font-size: 0.96rem; }
.digest.open .digest-summary { color: var(--jd-muted); }
.caret { color: var(--jd-faint); font-size: 0.78rem; }

.digest-body { padding: 0 0 1rem; }
.digest-body :deep(h1) { display: none; } /* the row already shows the date */
.digest-body :deep(p) { margin: 0 0 0.7rem; color: var(--jd-muted); font-size: 0.95rem; line-height: 1.6; }
.digest-body :deep(p:last-child) { margin-bottom: 0; }
.digest-body :deep(a) { color: var(--jd-accent); text-decoration: none; }
.digest-body :deep(a:hover) { text-decoration: underline; }
.digest-body :deep(strong) { color: var(--jd-ink); font-weight: 600; }
.digest-body :deep(code) {
  font-family: var(--jd-mono);
  font-size: 0.85em;
  background: var(--jd-surface-2);
  padding: 0.1em 0.35em;
  border-radius: 4px;
}
.digest-body :deep(ul) { margin: 0 0 0.7rem; padding-left: 1.1rem; color: var(--jd-muted); }

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 0 1rem;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid var(--jd-line);
}
.section-head h2 {
  margin: 0;
  font-family: var(--jd-mono);
  font-weight: 600;
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--jd-ink);
}
.section-head .count { color: var(--jd-faint); font-family: var(--jd-mono); font-size: 0.75rem; }

.cards { display: flex; flex-direction: column; gap: 0.85rem; }
.empty { color: var(--jd-faint); font-size: 0.9rem; margin: 0; }

.rail { display: flex; flex-direction: column; gap: 1.6rem; }
.panel {
  background: var(--jd-surface);
  border: 1px solid var(--jd-line);
  border-radius: var(--jd-radius);
  padding: 1.1rem 1.15rem 1.2rem;
  box-shadow: var(--jd-shadow);
}
.friction-note { margin: 0.9rem 0 0; font-size: 0.82rem; color: var(--jd-muted); }
.friction-note .mono { color: var(--jd-ink); }
.skill-note { margin: 0.9rem 0 0; font-size: 0.8rem; color: var(--jd-muted); }
.skill-note .mono { color: var(--jd-ink); }

@media (max-width: 900px) {
  .tiles { grid-template-columns: repeat(2, 1fr); }
  .grid { grid-template-columns: 1fr; }
  .masthead { grid-template-columns: 1fr; }
  .spaces { align-items: flex-start; }
  .snapshot { text-align: left; }
}
@media (max-width: 460px) {
  .tiles { grid-template-columns: 1fr 1fr; }
}
</style>
