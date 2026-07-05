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
import { routingMap } from '~~/shared/routing.generated'

type Severity = 'nit' | 'minor' | 'moderate' | 'major' | 'blocker'
type Importance = 'core' | 'supporting' | 'peripheral'

interface Friction { description: string; solution: string; severity: Severity }
interface SessionDoc {
  session: string
  startedAt: string
  endedAt: string
  kind: 'interactive' | 'autonomous'
  goal: string
  status: 'completed' | 'partial' | 'blocked' | 'abandoned'
  outcome: string
  prs: string[]
  skillsUsed: { name: string; reason: string }[]
  frictions: Friction[]
}
interface SkillDoc { name: string; category: 'platform-operation' | 'general-engineering'; importance: Importance; role: string }
interface PageDoc { title?: string; description?: string; badge?: string }

type Map = Record<string, Record<string, Record<string, string>>>

const route = useRoute()
const tenant = 'journal'
const space = String(route.params.space)

const spaceCollections = (routingMap as Map)[tenant]?.[space]
if (!spaceCollections?.pages) {
  throw createError({ statusCode: 404, statusMessage: `Unknown Space: ${tenant}/${space}` })
}
const pagesKey = spaceCollections.pages as keyof Collections
const skillsKey = spaceCollections.skills as keyof Collections | undefined
const sessionsKey = spaceCollections.sessions as keyof Collections | undefined

const spaces = Object.keys((routingMap as Map)[tenant] ?? {})

const { data } = await useAsyncData(route.path, async () => {
  const page = await queryCollection(pagesKey).path('/').first()
  const skills = skillsKey ? await queryCollection(skillsKey).all() : []
  const sessions = sessionsKey ? await queryCollection(sessionsKey).all() : []
  return { page, skills, sessions }
})

const page = computed(() => (data.value?.page ?? null) as PageDoc | null)
const skills = computed(() => (data.value?.skills ?? []) as unknown as SkillDoc[])
const sessions = computed(() =>
  ((data.value?.sessions ?? []) as unknown as SessionDoc[])
    .slice()
    .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime()),
)

// ── Formatting helpers ───────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n: number) => String(n).padStart(2, '0')
function fmtWhen(iso: string): string {
  const d = new Date(iso)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} · ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`
}
function durMin(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000))
}
function shortId(s: string): string {
  return s.length > 18 ? `${s.slice(0, 13)}…${s.slice(-4)}` : s
}

// ── Aggregations (scoped to this Space) ──────────────────
const emptySev = (): Record<Severity, number> => ({ nit: 0, minor: 0, moderate: 0, major: 0, blocker: 0 })

function countFrictions(list: Friction[]): Record<Severity, number> {
  const c = emptySev()
  for (const f of list) if (f.severity in c) c[f.severity]++
  return c
}

const cards = computed(() =>
  sessions.value.map((s) => ({
    key: s.session,
    when: fmtWhen(s.endedAt),
    duration: durMin(s.startedAt, s.endedAt),
    goal: s.goal,
    status: s.status,
    outcome: s.outcome,
    prs: s.prs,
    frictionCounts: countFrictions(s.frictions),
    frictionTotal: s.frictions.length,
    skills: s.skillsUsed.map((x) => x.name),
    sid: shortId(s.session),
  })),
)

const frictionTotals = computed(() => {
  const c = emptySev()
  for (const s of sessions.value) for (const f of s.frictions) if (f.severity in c) c[f.severity]++
  return c
})
const frictionCount = computed(() => sessions.value.reduce((n, s) => n + s.frictions.length, 0))

const kindCounts = computed(() => ({
  interactive: sessions.value.filter((s) => s.kind === 'interactive').length,
  autonomous: sessions.value.filter((s) => s.kind === 'autonomous').length,
}))

const importanceCounts = computed(() => ({
  core: skills.value.filter((s) => s.importance === 'core').length,
  supporting: skills.value.filter((s) => s.importance === 'supporting').length,
  peripheral: skills.value.filter((s) => s.importance === 'peripheral').length,
}))

const skillGroups = computed(() => {
  const order: Importance[] = ['core', 'supporting', 'peripheral']
  return order
    .map((importance) => ({
      importance,
      skills: skills.value
        .filter((s) => s.importance === importance)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((g) => g.skills.length > 0)
})

const prRefs = computed(() => {
  const seen = new Set<string>()
  for (const s of sessions.value) for (const pr of s.prs) seen.add(pr.replace(/^#/, ''))
  return [...seen].sort((a, b) => Number(a) - Number(b))
})

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
          from <code>journal_{{ space }}_*</code>
        </div>
      </div>
    </header>

    <!-- State of this Space -->
    <section class="tiles" aria-label="State of this Space">
      <JournalStatTile
        label="Sessions logged"
        :value="sessions.length"
        :sub="`${kindCounts.interactive} interactive · ${kindCounts.autonomous} autonomous`"
      />
      <JournalStatTile
        label="Skills catalogued"
        :value="skills.length"
        :sub="`${importanceCounts.core} core · ${importanceCounts.supporting} supporting · ${importanceCounts.peripheral} peripheral`"
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
          <JournalSessionCard
            v-for="c in cards"
            :key="c.key"
            :when="c.when"
            :duration="c.duration"
            :goal="c.goal"
            :status="c.status"
            :outcome="c.outcome"
            :prs="c.prs"
            :friction-counts="c.frictionCounts"
            :friction-total="c.frictionTotal"
            :skills="c.skills"
            :sid="c.sid"
          />
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
          <JournalFrictionStrata :counts="frictionTotals" :total="frictionCount" />
          <p v-if="frictionCount" class="friction-note">
            Graded <span class="mono">nit → blocker</span> — the raw sediment the
            future <span class="mono">consolidate</span> / <span class="mono">codify</span>
            jobs mine for recurring pain.
          </p>
        </section>

        <section class="panel">
          <div class="section-head">
            <h2>Skill catalogue</h2>
            <span class="count">{{ skills.length }} installed</span>
          </div>
          <JournalSkillCatalogue v-if="skillGroups.length" :groups="skillGroups" />
          <p v-else class="empty">No Skills catalogued in this Space.</p>
        </section>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.jd {
  /* Palette — humus & foliage neutrals with a fern accent; earthy severity ramp.
     Tokens live on the wrapper so every child component inherits them. */
  --jd-ground: #f3f5ef;
  --jd-surface: #fbfcf9;
  --jd-surface-2: #ecf0e6;
  --jd-ink: #1a2420;
  --jd-muted: #586359;
  --jd-faint: #8a9488;
  --jd-line: #dbe0d5;
  --jd-accent: #356a4c;
  --jd-accent-bright: #4e9e6a;

  --jd-sev-nit: #7e9384;
  --jd-sev-minor: #be9c40;
  --jd-sev-moderate: #ce823a;
  --jd-sev-major: #c6603c;
  --jd-sev-blocker: #a8331f;

  --jd-status-completed: var(--jd-accent);
  --jd-status-partial: #be9c40;
  --jd-status-blocked: #a8331f;
  --jd-status-abandoned: var(--jd-faint);

  --jd-serif: 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif;
  --jd-mono: ui-monospace, 'SF Mono', 'Cascadia Code', 'JetBrains Mono', 'Roboto Mono', Menlo, monospace;
  --jd-radius: 10px;
  --jd-shadow: 0 1px 2px rgba(26, 36, 32, 0.05), 0 6px 20px -12px rgba(26, 36, 32, 0.18);

  display: block;
  min-height: 100vh;
  margin: 0;
  background: var(--jd-ground);
  color: var(--jd-ink);
  font-family: var(--jd-serif);
  line-height: 1.5;
  max-width: 1120px;
  padding: clamp(1.5rem, 4vw, 3rem) clamp(1rem, 4vw, 2.25rem) 3rem;
  margin-inline: auto;
}

@media (prefers-color-scheme: dark) {
  .jd {
    --jd-ground: #10140e;
    --jd-surface: #171c15;
    --jd-surface-2: #1f251c;
    --jd-ink: #e7ebe0;
    --jd-muted: #9da995;
    --jd-faint: #6e7a68;
    --jd-line: #2a3327;
    --jd-accent: #6fbf89;
    --jd-accent-bright: #8fd9a5;

    --jd-sev-nit: #8aa093;
    --jd-sev-minor: #d6bc68;
    --jd-sev-moderate: #e39a55;
    --jd-sev-major: #de7a55;
    --jd-sev-blocker: #d0563f;

    --jd-status-partial: #d6bc68;
    --jd-status-blocked: #d0563f;
    --jd-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px -14px rgba(0, 0, 0, 0.6);
  }
}

.mono { font-family: var(--jd-mono); }

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.1rem;
  font-family: var(--jd-mono);
  font-size: 0.8rem;
}
.breadcrumb .sep { color: var(--jd-line); }
.breadcrumb a { color: var(--jd-muted); text-decoration: none; }
.breadcrumb a:hover { color: var(--jd-accent); }
.breadcrumb .here { color: var(--jd-ink); }

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
