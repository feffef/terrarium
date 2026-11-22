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
      <h2>Recent sessions</h2>
      <p class="jd-note">The latest logged sessions that used this Skill.</p>
      <ul v-if="recent.length">
        <li v-for="s in recent" :key="s.session">
          <strong>{{ s.startedAt.slice(0, 10) }}</strong> — {{ s.goal }}
        </li>
      </ul>
      <p v-else>No logged session in this Space used it.</p>
      <button v-if="!showAllSessions && allSessions.length > CAP" type="button" @click="showAllSessions = true">
        Show all {{ allSessions.length }}
      </button>

      <template v-if="skill.auditSummary">
        <h2>Audit summary</h2>
        <p class="jd-note">What the most recent audit concluded about this Skill.</p>
        <JournalSkillAuditLine :audit="skill.auditSummary" />
      </template>

      <template v-if="allObservations.length">
        <h2>Audit observations</h2>
        <p class="jd-note">Internal notes that agents wrote down while auditing this Skill; newest first.</p>
        <ul>
          <li v-for="(o, i) in observations" :key="i">
            <strong>{{ o.date }}</strong> —
            <JournalRoleText :text="o.note" />
          </li>
        </ul>
        <button v-if="!showAllObservations && allObservations.length > CAP" type="button" @click="showAllObservations = true">
          Show all {{ allObservations.length }}
        </button>
      </template>

      <p><NuxtLink :to="`/t/journal/${space}/skills`">← all Skills</NuxtLink></p>
    </article>

    <SiteFooter />
  </main>
</template>

<style scoped>
.jd-note { margin: -0.25rem 0 0.5rem; font-size: 0.85rem; color: var(--jd-muted); }
</style>
