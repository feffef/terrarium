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
const recent = recentSkillSessions(sessions, name, 5)
const observations = [...skill.observations].sort((a, b) => b.date.localeCompare(a.date))

useSeoMeta({ title: `${name} · journal/${space}` })
</script>

<template>
  <main class="jd jd-doc">
    <JournalBreadcrumb :space="space" :trail="['skills', name]" />

    <article class="jd-prose">
      <h1><JournalSkillName :name="name" /></h1>
      <p v-if="skill.gist">{{ skill.gist }}</p>
      <p v-else>
        <template v-for="(p, i) in skillRoleParts(skill.role)" :key="i">
          <code v-if="p.kind === 'code'">{{ p.text }}</code>
          <em v-else-if="p.kind === 'em'">{{ p.text }}</em>
          <strong v-else-if="p.kind === 'strong'">{{ p.text }}</strong>
          <template v-else>{{ p.text }}</template>
        </template>
      </p>
      <JournalSkillAuditLine v-if="skill.auditSummary" :audit="skill.auditSummary" />

      <template v-if="observations.length">
        <h2>Audit observations</h2>
        <ul>
          <li v-for="(o, i) in observations" :key="i">
            <strong>{{ o.date }}</strong> —
            <template v-for="(p, j) in skillRoleParts(o.note)" :key="j">
              <code v-if="p.kind === 'code'">{{ p.text }}</code>
              <em v-else-if="p.kind === 'em'">{{ p.text }}</em>
              <strong v-else-if="p.kind === 'strong'">{{ p.text }}</strong>
              <template v-else>{{ p.text }}</template>
            </template>
          </li>
        </ul>
      </template>

      <h2>Recent sessions</h2>
      <ul v-if="recent.length">
        <li v-for="s in recent" :key="s.session">
          <strong>{{ s.startedAt.slice(0, 10) }}</strong> — {{ s.goal }}
        </li>
      </ul>
      <p v-else>No logged session in this Space used it.</p>

      <p><NuxtLink :to="`/t/journal/${space}/skills`">← all Skills</NuxtLink></p>
    </article>

    <SiteFooter />
  </main>
</template>
