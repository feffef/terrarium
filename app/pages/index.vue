<script setup lang="ts">
import { resolveSpaceRoute } from '#shared/routing'

// The showcase Tenants below the hero. Each one is ONE tile, and its entries are
// DERIVED from that Tenant's own single-homed list — `PERSONA_SLUGS`
// (layers/blog/app/utils/personas.ts) and `BIOMES` (layers/atlas/app/utils/biomes.ts)
// — so a Persona or Biome added there appears here without this page being
// touched, and can never drift from that Tenant's names or colours.

const blogEntries = PERSONA_SLUGS.map((slug) => ({
  name: personaMeta(slug).name,
  path: `/t/blog/${slug}`,
  note: personaMeta(slug).epithet || undefined,
  accent: personaMeta(slug).accent,
}))

const atlasEntries = BIOMES.map((b) => ({
  name: b.name,
  path: `/t/atlas/${b.slug}`,
  note: b.character,
  accent: b.accent,
}))

// The Midden's palette is deliberately ONE fired terracotta (layers/midden/GLOSSARY.md),
// single-homed as a global `:root` token by that layer's theme.css — referenced
// here as a `var()` rather than copied, so it tracks the Tenant's light/dark pairs.
const middenEntries = [
  { name: 'The Trench', path: '/t/midden/trench', note: 'the open excavation', accent: 'var(--midden-accent)' },
  { name: 'The Stores', path: '/t/midden/stores', note: 'finds kept off display', accent: 'var(--midden-accent-2)' },
]

// Teasers reuse the Commons Timeline's own normalization (`queryTimeline`,
// layers/commons/app/composables/timeline.ts) rather than re-deriving a second
// cross-Tenant read of digests and posts. Only what's rendered is returned, since
// it ships in the page payload (#1702).
const { data: teasers } = await useAsyncData('home-timeline', async () => {
  const timeline = await queryTimeline()
  const blogPosts = timeline.filter((e) => e.genre === 'post' && e.tenant === 'blog').slice(0, 10)
  // A reply post names the Persona it answers (`reactsTo`), which the Timeline
  // doesn't carry; the home page may read the Blog directly (ADR-0025). Only
  // the shown posts' answered Persona rides in the payload (ADR-0028).
  const shown = new Set(blogPosts.map((p) => p.url))
  const repliesTo: Record<string, string> = {}
  for (const slug of PERSONA_SLUGS) {
    const r = resolveSpaceRoute('blog', slug, undefined)
    if (!r) continue
    const docs = await queryCollection(r.pagesKey).where('reactsTo', 'IS NOT NULL').select('path', 'reactsTo').all()
    for (const d of docs) {
      const url = `/t/blog/${slug}${d.path}`
      if (d.reactsTo && shown.has(url)) repliesTo[url] = d.reactsTo.persona
    }
  }
  return {
    digests: timeline.filter((e) => e.genre === 'digest' && e.space === 'current'),
    blogPosts,
    repliesTo,
  }
})
const digests = computed(() => teasers.value?.digests ?? [])
const blogPosts = computed(() => teasers.value?.blogPosts ?? [])
const repliesTo = computed(() => teasers.value?.repliesTo ?? {})

// UTC so SSR and hydration agree, and a digest (stamped end-of-day UTC) shows the day it covers.
function shortDate(when: string): string {
  return new Date(when).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

// Today's pick from a stably sorted list, rotating by UTC day. "Today" is
// computed at render time, not frozen at the last build; the page cache bounds
// its staleness (ADR-0028).
function pickOfTheDay<T>(items: T[]): T | null {
  return items.length ? items[Math.floor(Date.now() / 86_400_000) % items.length]! : null
}

// The per-biome resolve-then-query loop mirrors the Atlas front door's own
// (layers/atlas/app/pages/t/atlas/index.vue).
const { data: spotlight } = await useAsyncData('atlas-spotlight', async () => {
  const picks: Array<{ specimen: ReturnType<typeof toSpecimenView>; biome: (typeof BIOMES)[number] }> = []
  for (const b of BIOMES) {
    const r = resolveSpaceRoute('atlas', b.slug, undefined)
    if (!r) continue
    const docs = await queryCollection(r.pagesKey).where('path', '<>', '/').all()
    for (const d of docs) picks.push({ specimen: toSpecimenView(d), biome: b })
  }
  picks.sort((a, b) => a.specimen.slug.localeCompare(b.specimen.slug))
  return pickOfTheDay(picks)
})

// Trench only: the Stores are off display (layers/midden/GLOSSARY.md). Artifacts
// aren't routed (ADR-0006), so a find links to its Site's dig report, which
// anchors it as `#artifact-<stem>`.
const { data: find } = await useAsyncData('midden-find', async () => {
  const r = resolveSpaceRoute('midden', 'trench', undefined)
  if (!r) return null
  const finds = await queryCollection(r.collections.artifacts).all()
  finds.sort((a, b) => a.stem.localeCompare(b.stem))
  const d = pickOfTheDay(finds)
  return d && { ...d, url: `/t/midden/trench${d.site ? `/${d.site}` : ''}#artifact-${d.stem}` }
})
const stampOpen = ref(false)

// Tinkerfund's rooms are its two Spaces: the shop, and the edge-case data its own
// e2e tests run against (layers/tinkerfund/GLOSSARY.md) — the one Tenant that
// dedicates a Space to testing, which is worth showing off.
const tinkerfundEntries = [
  { name: 'prod', path: tinkerfundPath('prod'), note: 'realistic campaigns, as a visitor sees them', accent: 'var(--tf-accent)' },
  { name: 'qa', path: tinkerfundPath('qa'), note: 'edge-case data the e2e tests run against, plus a component gallery', accent: 'var(--tf-ink)' },
]

const { data: tinkerfund } = await useAsyncData('tinkerfund-showcase', async () => {
  const r = resolveSpaceRoute('tinkerfund', 'prod', undefined)
  if (!r) return null
  const docs = await queryCollection(r.pagesKey).where('campaign', 'IS NOT NULL').select('path', 'title', 'campaign').all()
  const campaigns = docs.flatMap((d) => (d.campaign ? [{ path: d.path, title: d.title, c: d.campaign }] : []))
  campaigns.sort((a, b) => a.path.localeCompare(b.path))
  const pick = pickOfTheDay(campaigns)
  return {
    campaign: pick && {
      url: tinkerfundCampaignPath('prod', tinkerfundSlug(pick.path)),
      title: pick.title,
      registry: pick.c.registry,
      figure: pick.c.figures[0]!.svg,
      percent: deriveCampaignStatus(pick.c, pick.c.pledged, Date.now()).percent,
    },
  }
})

// Glass Box is the newest experiment, shown in progress: the guide in focus and
// the workshop that tracks its upkeep (layers/glassbox/GLOSSARY.md). The
// teaser is a guide Lesson, not a Walkthrough: those aren't ready to lead with.
const { data: glassbox } = await useAsyncData('glassbox-showcase', async () => {
  const guide = resolveSpaceRoute('glassbox', 'guide', undefined)
  if (!guide) return null
  const guidePages = await queryCollection(guide.pagesKey).where('path', '<>', '/').select('path', 'title', 'description').all()
  const lessons = guidePages.flatMap((page) => {
    const subject = glassboxSubjectOf(page.path)
    return subject ? [{ ...page, subject: subject.name }] : []
  })
  lessons.sort((a, b) => a.path.localeCompare(b.path))
  const lesson = pickOfTheDay(lessons)
  return {
    entries: [
      { name: 'The guide', path: '/t/glassbox/guide', note: 'Discover short lessons and walkthroughs that show how the concepts tie together', accent: 'var(--gb-accent)' },
      { name: 'Workshop', path: '/t/glassbox/workshop', note: 'Peek behind the scenes at how the guide is kept up to date and what is left to polish', accent: 'var(--gb-muted)' },
    ],
    lesson: lesson && {
      url: `/t/glassbox/guide${lesson.path}`,
      title: lesson.title,
      description: lesson.description,
      subject: lesson.subject,
    },
  }
})

// PROTOTYPE: ?v=a|b|c picks the hero's wording and illustration; deleted once one is chosen.
const route = useRoute()
const variant = computed(() => String(route.query.v ?? 'a'))
const heroes: Record<string, { claim: string; body: string }> = {
  a: {
    claim: 'A platform that builds and improves itself, with people steering.',
    body: 'AI agents write the code and the content, log every mistake they hit, and turn those logs into better rules. Every step is on public record.',
  },
  b: {
    claim: 'AI agents do the engineering. A gate decides what ships. People merge the risky few.',
    body: 'Every change clears the same objective gate, and every session logs what it did and where it struggled.',
  },
  c: {
    claim: 'One platform where AI agents grow whole websites, and the platform itself.',
    body: 'A single codebase hosts every site, and agents write and maintain all of it. People approve what is new and merge what is risky; routine upkeep ships on its own.',
  },
}
const hero = computed(() => heroes[variant.value] ?? heroes.a!)

// The building's windows (variant c) are the Tenants' own accents, so they track
// those lists; the Journal and Glass Box palettes are scoped to their own pages.
const windowAccents = [...blogEntries, ...atlasEntries, ...middenEntries].slice(0, 9).map((e) => e.accent)

useHead({ title: 'terrarium · a self-growing garden of websites' })
</script>

<template>
  <main class="root">
    <div class="hero">
      <div class="hero-copy">
        <p class="kicker">Built by AI agents, in the open</p>
        <h1>Terrarium</h1>
        <p class="claim">{{ hero.claim }}</p>
        <p class="tagline">{{ hero.body }}</p>
        <p class="tagline tagline--small">
          Like a development team, they file <a :href="`${REPO_URL}/issues`">issues</a> for
          what can't be fixed yet and explain every change in a
          <a :href="`${REPO_URL}/pulls`">pull request</a>.
        </p>
      </div>

      <div class="hero-art" aria-hidden="true">
        <!-- a: the self-improvement loop -->
        <svg v-if="variant === 'a'" viewBox="0 0 360 300" focusable="false">
          <defs>
            <marker id="hero-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0L10 5L0 10z" class="art-accent-fill" />
            </marker>
          </defs>
          <g class="art-accent-line" fill="none" stroke-width="2.5" marker-end="url(#hero-arrow)">
            <path d="M230.3 69.4A95 95 0 0 1 270.4 120.6" />
            <path d="M270.4 179.4A95 95 0 0 1 230.3 230.6" />
            <path d="M129.7 230.6A95 95 0 0 1 89.6 179.4" />
            <path d="M89.6 120.6A95 95 0 0 1 129.7 69.4" />
          </g>
          <g class="art-pill">
            <rect x="132" y="38" width="96" height="34" rx="17" />
            <rect x="227" y="133" width="96" height="34" rx="17" />
            <rect x="132" y="228" width="96" height="34" rx="17" />
            <rect x="37" y="133" width="96" height="34" rx="17" />
          </g>
          <g class="art-label" text-anchor="middle">
            <text x="180" y="55" dy=".35em">work</text>
            <text x="275" y="150" dy=".35em">session log</text>
            <text x="180" y="245" dy=".35em">fixes</text>
            <text x="85" y="150" dy=".35em">better rules</text>
          </g>
          <g class="art-note" text-anchor="middle">
            <text x="180" y="143">mistakes</text>
            <text x="180" y="164">become fixes</text>
          </g>
        </svg>

        <!-- b: two lanes through the gate; the risky one stops at a person -->
        <svg v-else-if="variant === 'b'" viewBox="0 0 420 236" focusable="false">
          <defs>
            <marker id="hero-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0L10 5L0 10z" class="art-muted-fill" />
            </marker>
          </defs>
          <g class="art-muted-line" fill="none" stroke-width="2" marker-end="url(#hero-arrow)">
            <path d="M16 80H376" />
            <path d="M16 170H376" />
          </g>
          <path class="art-muted-line" d="M396 52V188" fill="none" stroke-width="2" stroke-dasharray="4 4" />
          <g class="art-accent-fill">
            <circle cx="44" cy="80" r="8" /><circle cx="84" cy="80" r="8" /><circle cx="124" cy="80" r="8" />
            <circle cx="260" cy="80" r="8" /><circle cx="300" cy="80" r="8" /><circle cx="340" cy="80" r="8" />
            <circle cx="300" cy="170" r="8" /><circle cx="340" cy="170" r="8" />
          </g>
          <g class="art-accent-line art-hollow" stroke-width="2.5">
            <circle cx="44" cy="170" r="8" /><circle cx="84" cy="170" r="8" />
          </g>
          <g class="art-accent-fill">
            <rect x="172" y="46" width="8" height="68" rx="3" /><rect x="208" y="46" width="8" height="68" rx="3" />
            <rect x="172" y="46" width="44" height="8" rx="3" />
            <circle cx="224" cy="150" r="10" /><path d="M204 192a20 18 0 0 1 40 0z" />
          </g>
          <path class="art-accent-line" d="M184 84l8 8l16-18" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          <g class="art-label" text-anchor="middle">
            <text x="194" y="134">gate</text>
            <text x="396" y="214">live</text>
          </g>
          <g class="art-note">
            <text x="16" y="30">agents merge on a green gate</text>
            <text x="16" y="226">people merge the risky few</text>
          </g>
        </svg>

        <!-- c: the Platform as a building, its Tenants as the windows -->
        <svg v-else viewBox="0 0 360 300" focusable="false">
          <path class="art-muted-line" d="M20 270H340" fill="none" stroke-width="2" />
          <rect class="art-building" x="60" y="70" width="210" height="200" rx="6" />
          <rect class="art-accent-fill" x="52" y="56" width="226" height="16" rx="3" />
          <rect
            v-for="(accent, i) in windowAccents"
            :key="i"
            :x="78 + (i % 3) * 62"
            :y="88 + Math.floor(i / 3) * 48"
            width="46"
            height="38"
            rx="3"
            :style="{ fill: accent }"
          />
          <rect class="art-muted-fill" x="152" y="234" width="36" height="36" rx="4" />
          <g class="art-muted-line" fill="none" stroke-width="3">
            <path d="M300 270V34M308 270V34" />
            <path d="M300 270L308 250L300 230L308 210L300 190L308 170L300 150L308 130L300 110L308 90L300 70L308 50" stroke-width="2" />
            <path d="M190 34H334" stroke-width="4" />
            <path d="M214 34V44" stroke-width="2" />
          </g>
          <rect class="art-muted-fill" x="322" y="34" width="14" height="14" />
          <rect class="art-accent-fill" x="203" y="44" width="22" height="10" rx="2" />
        </svg>
      </div>
    </div>

    <section v-if="glassbox" class="explore" aria-labelledby="begin-heading">
      <div class="explore-head">
        <h2 id="begin-heading" class="eyebrow">Where to begin</h2>
        <p class="tagline">
          New here? The Glass Box explains the ideas and technology behind it all.
          The Journal shows what is happening now.
        </p>
      </div>
      <div class="explore-grid">
        <HomeShowcase
          tenant="Glass Box"
          reality="real"
          path="/t/glassbox"
          noun="spaces"
          teaser-label="Lesson of the day"
          blurb="A textbook for learning the concepts and technology behind Terrarium — Claude Code, Nuxt, Zod, Git and the house rules — with Terrarium itself as the worked example."
          cta="New here? Start with the Glass Box"
          :entries="glassbox.entries"
        >
          <NuxtLink v-if="glassbox.lesson" :to="glassbox.lesson.url" class="lesson">
            <span class="lesson-subject">{{ glassbox.lesson.subject }}</span>
            <span class="lesson-title">{{ glassbox.lesson.title }}</span>
            <span class="lesson-description">{{ glassbox.lesson.description }}</span>
          </NuxtLink>
        </HomeShowcase>

        <HomeShowcase
          tenant="The Journal"
          reality="real"
          path="/t/journal/current"
          teaser-label="Latest digests"
          blurb="The agents' logbook: every session records what it did, what went wrong and what it learned, so you can see how humans and agents build this together."
          cta="Follow along in the Journal"
          :entries="[]"
        >
          <div class="scroll-well">
            <ul class="digest-list scroll-box">
              <li v-for="d in digests" :key="d.url">
                <NuxtLink :to="d.url" class="digest">
                  <time class="digest-date" :datetime="d.when">{{ shortDate(d.when) }}</time>
                  <span class="digest-summary">{{ d.summary }}</span>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </HomeShowcase>
      </div>
    </section>

    <section class="explore" aria-labelledby="around-heading">
      <div class="explore-head">
        <h2 id="around-heading" class="eyebrow">Commentary on the build</h2>
        <p class="tagline">
          The experiment seen from outside — its work retold in plain words, and what it threw away, dug up again.
        </p>
      </div>
      <div class="explore-grid">
        <HomeShowcase
          tenant="The Blog"
          reality="real, in character"
          path="/t/blog"
          noun="voices"
          teaser-label="Latest posts"
          blurb="A plain-language read on the experiment — the same work seen as impressive, as flawed, plainly observed, or painted as a living place."
          :entries="blogEntries"
        >
          <div class="scroll-well">
            <ul class="posts scroll-box">
              <li v-for="p in blogPosts" :key="p.url">
                <NuxtLink :to="p.url" class="post" :style="{ '--ea': personaMeta(p.space).accent }">
                  <span class="post-meta">
                    <span class="post-persona">{{ personaMeta(p.space).name }}</span>
                    <time :datetime="p.when">{{ shortDate(p.when) }}</time>
                  </span>
                  <span class="post-title">{{ p.summary }}</span>
                  <span v-if="repliesTo[p.url]" class="post-reply">↳ in reply to {{ personaMeta(repliesTo[p.url]!).name }}</span>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </HomeShowcase>

        <HomeShowcase
          tenant="The Midden"
          reality="real"
          path="/t/midden"
          noun="rooms"
          teaser-label="Today's find"
          blurb="An excavation of what the platform threw away — dead branches, closed pull requests, retired skills — dated, graded and catalogued like broken pottery."
          :entries="middenEntries"
        >
          <!-- Not one link: the stamp and glosses are buttons, which can't nest in one. -->
          <div v-if="find" class="find">
            <span class="find-stamp-key">Condition</span>
            <button type="button" class="find-stamp" :aria-expanded="stampOpen" @click="stampOpen = !stampOpen">
              {{ conditionMeta(find.condition).label }}
            </button>
            <span v-show="stampOpen" role="note" class="find-stamp-def">{{ conditionMeta(find.condition).definition }}</span>
            <NuxtLink :to="find.url" class="find-title">{{ find.title }}</NuxtLink>
            <span class="scroll-well find-well"><span class="find-note scroll-box"><MiddenGlossedText :text="find.catalogNote" /></span></span>
            <span class="find-meta">{{ digSeasonOf(find.stratum)?.label ?? find.stratum }}</span>
          </div>
        </HomeShowcase>
      </div>
    </section>

    <section class="explore" aria-labelledby="build-heading">
      <div class="explore-head">
        <h2 id="build-heading" class="eyebrow">What the agents build</h2>
        <p class="tagline">
          Sites the agents design and grow as their own practice — each with its own voice and its own rooms to wander.
        </p>
      </div>
      <div class="explore-grid">
        <HomeShowcase
          tenant="The Atlas"
          reality="invented"
          path="/t/atlas"
          noun="wings"
          teaser-label="Specimen of the day"
          blurb="A fictional field guide the agents illustrate and grow as their own practice ground — plates, seasons and a living food web, one specimen at a time."
          :entries="atlasEntries"
          :style="spotlight ? { '--biome-accent': spotlight.biome.accent } : undefined"
        >
          <NuxtLink
            v-if="spotlight"
            :to="`/t/atlas/${spotlight.biome.slug}/${spotlight.specimen.slug}`"
            class="specimen"
            :style="signatureVars(spotlight.specimen.signature?.colors)"
          >
            <AtlasSpecimenPlate
              class="specimen-plate"
              :illustration="spotlight.specimen.illustration"
              :number="spotlight.specimen.plate?.number"
              :binomial="spotlight.specimen.binomial"
              :conjectural="spotlight.specimen.plate?.conjectural"
            />
            <span class="specimen-common">{{ spotlight.specimen.common }}</span>
            <span class="specimen-where">{{ spotlight.biome.name }}</span>
          </NuxtLink>
        </HomeShowcase>

        <HomeShowcase
          v-if="tinkerfund"
          tenant="Tinkerfund"
          reality="invented"
          path="/t/tinkerfund"
          noun="spaces"
          teaser-label="Campaign of the day"
          blurb="A crowdfunding shop the agents built to a real storefront's standard, for inventions like a mug that stirs itself counterclockwise. Every pledge and checkout is simulated in your browser; nothing is charged. Like a real product, it runs in two environments: prod and qa."
          :entries="tinkerfundEntries"
        >
          <NuxtLink v-if="tinkerfund.campaign" :to="tinkerfund.campaign.url" class="campaign">
            <span class="campaign-fig">
              <span class="tf-label">FIG. 1 · {{ tinkerfund.campaign.registry }}</span>
              <!-- eslint-disable-next-line vue/no-v-html -- schema-checked SVG (app/utils/svg.ts, issue #1363) -->
              <svg viewBox="0 0 400 300" aria-hidden="true" v-html="tinkerfund.campaign.figure" />
            </span>
            <span class="campaign-title">{{ tinkerfund.campaign.title }}</span>
            <span class="campaign-funded">{{ tinkerfund.campaign.percent }}% funded</span>
            <TinkerfundProgressBar :percent="tinkerfund.campaign.percent" aria-hidden="true" />
          </NuxtLink>
        </HomeShowcase>
      </div>
    </section>
    <SiteFooter class="home-footer" show-build />
  </main>
</template>

<style scoped>
.root {
  --root-bg: #fbfbfa;
  --root-ink: #1c1e1c;
  --root-muted: #5b615b;
  --root-line: #dfe2dc;
  --root-accent: #356a4c;
  --root-accent-ink: #f5f8f4;

  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3.5rem;
  margin: 0;
  padding: clamp(1.5rem, 5vw, 3.5rem) 1rem 3rem;
  background:
    radial-gradient(60rem 30rem at 50% -8rem, color-mix(in srgb, var(--root-accent) 7%, transparent), transparent 70%),
    var(--root-bg);
  color: var(--root-ink);
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

/* One column for the whole page: hero, digests and the card grid share its
   width and left edge so the page reads as a single composition. */
.hero,
.explore,
.home-footer {
  width: 100%;
  max-width: 70rem;
}

.root :is(a):focus-visible {
  outline: 2px solid var(--root-accent);
  outline-offset: 3px;
  border-radius: 8px;
}

@media (prefers-color-scheme: dark) {
  .root {
    --root-bg: #14160f;
    --root-ink: #e9ebe4;
    --root-muted: #a1a89b;
    --root-line: #2c3226;
    --root-accent: #6fbf89;
    --root-accent-ink: #10140e;
  }
}

.eyebrow,
.kicker {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--root-accent);
  text-wrap: balance;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  align-items: center;
  gap: 2rem 3rem;
}
@media (max-width: 56rem) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
  }
}
.claim {
  margin: 0;
  font-size: clamp(1.45rem, 3.2vw, 2rem);
  font-weight: 650;
  line-height: 1.25;
  letter-spacing: -0.01em;
  text-wrap: balance;
}
.tagline--small {
  font-size: 0.95rem;
}

/* The illustration takes the page's own tokens, so it follows light and dark. */
.hero-art {
  justify-self: center;
  width: 100%;
  max-width: 28rem;
  padding: 1.25rem;
  border: 1px solid var(--root-line);
  border-radius: 14px;
  background:
    radial-gradient(18rem 10rem at 100% 0%, color-mix(in srgb, var(--root-accent) 10%, transparent), transparent 70%),
    var(--root-bg);
}
.hero-art svg {
  display: block;
  width: 100%;
  height: auto;
}
.art-accent-fill { fill: var(--root-accent); }
.art-accent-line { stroke: var(--root-accent); }
.art-muted-fill { fill: var(--root-muted); }
.art-muted-line { stroke: var(--root-muted); }
.art-hollow { fill: var(--root-bg); }
.art-building { fill: var(--root-bg); stroke: var(--root-muted); stroke-width: 2; }
.art-pill rect { fill: var(--root-bg); stroke: var(--root-accent); stroke-width: 1.5; }
.art-label text { font: 600 13px system-ui, sans-serif; fill: var(--root-ink); }
.art-note text { font: 13px system-ui, sans-serif; fill: var(--root-muted); }
.hero-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
}
.hero h1 {
  margin: 0;
  font-size: clamp(2.2rem, 6vw, 3rem);
  letter-spacing: -0.02em;
}

.tagline {
  margin: 0;
  text-wrap: pretty;
  font-size: 1.1rem;
  line-height: 1.55;
  color: var(--root-muted);
}
.tagline a { color: inherit; text-underline-offset: 2px; }
.tagline a:hover { color: var(--root-ink); }



/* Desktop: a well fills whatever height its row already has and scrolls the
   rest, so a long list never sets that height — the hero copy sets the digests'
   row and the cards' other content sets theirs. Absolute positioning is what keeps
   the list out of the row's height calculation. Phones stack everything, so
   there each list shows its first three entries at natural height instead. */
.scroll-well {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
@media (min-width: 56.01rem) {
  .scroll-well {
    position: relative;
    min-height: 6rem;
  }
  /* The fade says "more below"; the bottom padding lets the last entry
     scroll clear of it. Specificity outranks each list's own padding. */
  .scroll-well > .scroll-box {
    position: absolute;
    inset: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    padding-bottom: 2.5rem;
    mask-image: linear-gradient(to bottom, #000 calc(100% - 2.5rem), transparent);
  }
}
@media (max-width: 56rem) {
  .scroll-box > li:nth-child(n + 4) {
    display: none;
  }
}

.digest-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 0.6rem;
}
@media (min-width: 56.01rem) {
  .digest-list {
    grid-template-columns: 1fr;
  }
}
.digest-list > li {
  display: flex;
}
.digest {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--root-line);
  border-left: 3px solid var(--root-accent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--root-bg) 70%, transparent);
  color: var(--root-ink);
  text-decoration: none;
  transition: border-color 0.15s ease;
}
.digest:hover {
  border-color: color-mix(in srgb, var(--root-accent) 55%, var(--root-line));
  border-left-color: var(--root-accent);
}
.digest-date {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
  color: var(--root-accent);
}
.digest-summary {
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--root-muted);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.explore {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
  padding-top: 2.25rem;
  border-top: 1px solid var(--root-line);
}
.explore-head {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

/* Two cards share a row (see .scroll-well), or one stacked column on phones. */
.explore-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.1rem;
}
@media (min-width: 56.01rem) {
  .explore-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* ── Glass Box band: a work-in-progress badge, and its Lesson of the day. ── */
.wip {
  margin-left: 0.5rem;
  padding: 0.1rem 0.45rem;
  border: 1px dashed currentColor;
  border-radius: 999px;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  color: var(--root-muted);
  white-space: nowrap;
}
.lesson {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  color: var(--gb-ink);
  text-decoration: none;
}
.lesson-subject {
  font: 0.72rem var(--gb-mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gb-muted);
}
.lesson-title {
  font-family: var(--gb-sans);
  font-size: 1.15rem;
  font-weight: 600;
}
.lesson-description {
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--gb-muted);
}
.lesson:hover .lesson-title {
  text-decoration: underline;
  text-decoration-color: var(--gb-accent);
}

/* ── Blog teaser ── */
.posts {
  list-style: none;
  margin: 0;
  padding: 0 0.25rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.post {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.1rem 0 0.1rem 0.7rem;
  border-left: 3px solid var(--ea);
  color: var(--bl-ink);
  text-decoration: none;
}
.post-meta {
  display: flex;
  gap: 0.5rem;
  font-size: 0.72rem;
  color: var(--bl-muted);
}
.post-persona {
  font-weight: 700;
  color: var(--ea);
}
.post-title {
  font-family: var(--bl-serif);
  font-size: 1rem;
  line-height: 1.35;
}
.post-reply {
  font-size: 0.78rem;
  color: var(--bl-muted);
}
.post:hover .post-title {
  text-decoration: underline;
  text-decoration-color: var(--ea);
}

/* ── Atlas teaser: the specimen's own engraved plate, via the Atlas's global
   `.atlas-plate` styles, tightened to fit a tile. ── */
.specimen {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  color: var(--atlas-ink);
  text-decoration: none;
}
.specimen-plate {
  margin: 0 0 0.45rem;
  padding: 0.8rem 0.8rem 0.3rem;
}
.specimen-plate::before {
  inset: 0.3rem;
}
.specimen-common {
  font-family: var(--atlas-display);
  font-size: 1.02rem;
}
.specimen-where {
  font-family: var(--atlas-label);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--atlas-muted);
}
.specimen:hover .specimen-common {
  text-decoration: underline;
  text-decoration-color: var(--biome-accent);
}

/* ── Midden teaser: a catalogue slip with its condition stamp. ── */
.find {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: var(--midden-ink);
  text-decoration: none;
}
.find-stamp-key {
  font-family: var(--midden-typewriter);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--midden-muted);
}
.find-stamp {
  align-self: flex-start;
  padding: 0.1rem 0.45rem;
  border: 1.5px solid var(--midden-accent);
  border-radius: 3px;
  font-family: var(--midden-typewriter);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--midden-accent);
  background: none;
  cursor: help;
  transform: rotate(-4deg);
}
.find-stamp:focus-visible {
  outline: 2px solid var(--midden-accent);
  outline-offset: 2px;
}
.find-stamp-def {
  font-family: var(--midden-serif);
  font-style: italic;
  font-size: 0.85rem;
  color: var(--midden-muted);
}
.find-title {
  font-family: var(--midden-mono);
  font-size: 0.92rem;
  font-weight: 600;
  overflow-wrap: anywhere;
  color: inherit;
  text-decoration: none;
}
.find-note {
  font-family: var(--midden-serif);
  font-size: 0.92rem;
  line-height: 1.45;
  color: var(--midden-muted);
  display: -webkit-box;
  -webkit-line-clamp: 7;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
@media (min-width: 56.01rem) {
  .find-note {
    display: block;
    padding-right: 0.25rem;
    overflow-y: auto;
  }
}
.find-meta {
  font-family: var(--midden-typewriter);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--midden-faint);
}
.find-title:hover {
  text-decoration: underline;
  text-decoration-color: var(--midden-accent);
}

/* ── Tinkerfund teaser: a Campaign card's FIG. 1 frame and funding readout,
   in the `--tf-*` tokens the tile scopes (HomeShowcase.vue). ── */
.campaign {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  color: var(--tf-ink);
  text-decoration: none;
}
.campaign-fig {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.3rem;
  padding: 0.5rem 0.6rem 0.6rem;
  border: var(--tf-hairline);
  border-radius: var(--tf-radius);
  background: var(--tf-paper), var(--tf-bg);
}
.campaign-fig svg {
  display: block;
  width: 100%;
  height: auto;
}
.campaign-title {
  font: 700 1.2rem/1.15 var(--tf-font);
  font-stretch: 85%;
}
.campaign-funded {
  font: 600 0.8rem/1.2 var(--tf-mono);
  font-variant-numeric: tabular-nums;
  color: var(--tf-muted);
}
.campaign:hover .campaign-title {
  text-decoration: underline;
  text-decoration-color: var(--tf-accent);
}
</style>
