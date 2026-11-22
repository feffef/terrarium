<script setup lang="ts">
// One Skill's page, current Space only. Reads that Space's own Skill Inventory
// and session logs via useSpace (ADR-0006). No Frictions: the stored shapes tie
// none to a Skill.
const route = useRoute()
const { space, collections } = useSpace('journal')
const name = String(route.params.name)
const notFound = () => createError({ statusCode: 404, statusMessage: 'No such Skill', fatal: true })
if (space !== 'current') throw notFound()

const { data } = await useAsyncData(route.path, async () => ({
  skill: (await queryCollection(collections.skills).where('name', '=', name).first()) ?? null,
  sessions: await queryCollection(collections.sessions).all(),
}))
const skill = data.value?.skill
if (!skill) throw notFound()

const sessions = data.value?.sessions ?? []
const CAP = 5
const allSessions = recentSkillSessions(sessions, name, Infinity)
const allObservations = [...skill.observations].sort((a, b) => b.date.localeCompare(a.date))
const showAllSessions = ref(false)
const showAllObservations = ref(false)
const recent = computed(() => (showAllSessions.value ? allSessions : allSessions.slice(0, CAP)))
const observations = computed(() => (showAllObservations.value ? allObservations : allObservations.slice(0, CAP)))

useSeoMeta({ title: `${name} · journal/${space}` })
</script>

<template>
  <main class="jd jd-doc">
    <JournalBreadcrumb :space="space" :trail="['skills', name]" />

    <article class="jd-prose">
      <h1><JournalSkillName :name="name" /></h1>
      <p v-if="skill.gist">{{ skill.gist }}</p>
      <p v-else>
        <JournalRoleText :text="skill.role" />
      </p>
    </article>

    <section class="block">
      <div class="section-head">
        <h2>Recent sessions</h2>
        <span class="count">{{ allSessions.length }} logged</span>
      </div>
      <p class="panel-intro">The latest logged sessions that used this Skill. Each links to its log.</p>
      <ul v-if="recent.length" class="rows">
        <li v-for="s in recent" :key="s.session">
          <span class="row-date">{{ s.startedAt.slice(0, 10) }}</span>
          <NuxtLink :to="`/t/journal/${space}#${sessionAnchor(s.session)}`">{{ s.goal }}</NuxtLink>
        </li>
      </ul>
      <p v-else class="empty">No logged session in this Space used it.</p>
      <button v-if="!showAllSessions && allSessions.length > CAP" type="button" class="show-all" @click="showAllSessions = true">
        Show all {{ allSessions.length }}
      </button>
    </section>

    <section v-if="skill.auditSummary" class="block">
      <div class="section-head"><h2>Audit summary</h2></div>
      <p class="panel-intro">What the most recent audit concluded about this Skill.</p>
      <JournalSkillAuditLine :audit="skill.auditSummary" />
    </section>

    <section v-if="allObservations.length" class="block">
      <div class="section-head">
        <h2>Audit observations</h2>
        <span class="count">{{ allObservations.length }} notes</span>
      </div>
      <p class="panel-intro">Internal notes that agents wrote down while auditing this Skill; newest first.</p>
      <ul class="rows">
        <li v-for="(o, i) in observations" :key="i">
          <span class="row-date">{{ o.date }}</span>
          <JournalRoleText :text="o.note" />
        </li>
      </ul>
      <button v-if="!showAllObservations && allObservations.length > CAP" type="button" class="show-all" @click="showAllObservations = true">
        Show all {{ allObservations.length }}
      </button>
    </section>

    <p class="back"><NuxtLink :to="`/t/journal/${space}/skills`">← all Skills</NuxtLink></p>

    <SiteFooter />
  </main>
</template>

<style scoped>
.block { margin-top: 1.75rem; }
.section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin: 0 0 0.6rem; padding-bottom: 0.55rem; border-bottom: 1px solid var(--jd-line); }
.section-head h2 { margin: 0; font-family: var(--jd-mono); font-weight: 600; font-size: 0.78rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--jd-ink); }
.count { color: var(--jd-faint); font-family: var(--jd-mono); font-size: 0.75rem; }
.panel-intro { margin: 0 0 0.6rem; color: var(--jd-muted); font-size: 0.92rem; line-height: 1.5; }
.empty { color: var(--jd-faint); font-size: 0.9rem; margin: 0; }
.rows { list-style: none; margin: 0; padding: 0; }
.rows li { display: grid; grid-template-columns: max-content 1fr; gap: 0.1rem 0.9rem; align-items: baseline; padding: 0.7rem 0; border-top: 1px solid var(--jd-line); font-size: 0.96rem; }
.rows li:first-child { border-top: 0; }
.row-date { font-family: var(--jd-mono); font-size: 0.82rem; color: var(--jd-accent); white-space: nowrap; }
.rows a, .back a { color: var(--jd-accent); text-decoration: underline; text-underline-offset: 2px; }
.rows a:hover, .back a:hover { color: var(--jd-accent-bright); }
.show-all { display: block; margin: 0.9rem 0 0; padding: 0.5rem 0.9rem; font-family: var(--jd-mono); font-size: 0.78rem; color: var(--jd-muted); background: var(--jd-surface-2); border: 1px solid var(--jd-line); border-radius: var(--jd-radius); cursor: pointer; }
.show-all:hover { color: var(--jd-ink); border-color: var(--jd-accent); }
.back { margin-top: 1.75rem; }
</style>
