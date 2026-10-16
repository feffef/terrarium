// Subject order and display names live here, not in content (issue #1985, Part 3).
export const glassboxSubjects = [
  { slug: 'claude-code', name: 'Claude Code', blurb: 'The agent harness: what a session reads, runs and may start.' },
  { slug: 'skill-pack', name: 'Skill pack', blurb: 'Outside Skills the agents plan and build with.' },
  { slug: 'nuxt-vue', name: 'Nuxt & Vue', blurb: 'One app, one page file, one composable, many sites.' },
  { slug: 'nuxt-content', name: 'Nuxt Content', blurb: 'Files to tables: collections, isolation, the database.' },
  { slug: 'zod', name: 'Zod', blurb: 'Schemas that check manifests and content.' },
  { slug: 'typescript', name: 'TypeScript', blurb: 'The type checks the Gate runs.' },
  { slug: 'testing', name: 'Testing', blurb: 'Unit and browser tests, each Tenant its own.' },
  { slug: 'deploy', name: 'Deploy', blurb: 'One container that builds and swaps main.' },
  { slug: 'git-github', name: 'Git & GitHub', blurb: 'Pull requests and who may direct an agent.' },
  { slug: 'terrarium-practice', name: 'House rules', blurb: 'The Gate, ADRs, session logs, the Human-only list.' },
] as const

export const glassboxStartHere = '/walkthroughs/from-file-to-browser'

/** The landing's story tiles, Start here first; a test checks each is a guide Walkthrough. */
export const glassboxStories = [
  { verb: 'Read', path: glassboxStartHere },
  { verb: 'Change', path: '/walkthroughs/asking-for-a-change' },
  { verb: 'Ship', path: '/walkthroughs/a-change-goes-live' },
] as const

/** The landing's term strip: `terms` entries a newcomer meets first, picked from what guide Lessons expand most. */
export const glassboxLandingTerms = ['gate', 'tenant', 'human-only', 'collection', 'space', 'skill', 'rule', 'manifest'] as const

export interface GlassboxPageLink {
  path: string
  title: string
  description?: string
}

/** A Lesson's Subject, read from its folder; undefined for any other page. */
export function glassboxSubjectOf(path: string) {
  return glassboxSubjects.find((subject) => path.startsWith(`/${subject.slug}/`))
}

/** Whether `path` is a Walkthrough. */
export function glassboxWalkthroughOf(path: string) {
  return path.startsWith('/walkthroughs/')
}

/** Group Lessons under their Subject, in Subject order, dropping Subjects with
 *  no Lesson. Lessons keep the order they arrive in. */
export function glassboxDirectory<T extends GlassboxPageLink>(pages: T[]) {
  return glassboxSubjects
    .map((subject) => ({
      ...subject,
      lessons: pages.filter((page) => page.path.startsWith(`/${subject.slug}/`)),
    }))
    .filter((subject) => subject.lessons.length)
}

/** Walkthroughs, Start here first, then by title. */
export function glassboxWalkthroughs<T extends GlassboxPageLink>(pages: T[]) {
  const rank = (page: T) => (page.path === glassboxStartHere ? 0 : 1)
  return pages
    .filter((page) => glassboxWalkthroughOf(page.path))
    .sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title))
}
