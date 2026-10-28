// Subject order and display names live here, not in content (issue #1985, Part 3).
export const glassboxSubjects = [
  { slug: 'claude-code', name: 'Claude Code', blurb: 'The agent harness: what a session reads, runs and may start.' },
  { slug: 'skill-pack', name: 'Skill pack', blurb: 'Outside Skills the agents plan and build with.' },
  { slug: 'nuxt-vue', name: 'Nuxt & Vue', blurb: 'One app, one page file, many sites.' },
  { slug: 'nuxt-content', name: 'Nuxt Content', blurb: 'Files to tables: collections, isolation, the database.' },
  { slug: 'verification', name: 'Verification', blurb: 'The merge gate and its checks: types, content, tests.' },
  { slug: 'deploy', name: 'Deploy', blurb: 'One container that builds and swaps main.' },
  { slug: 'git-github', name: 'Git & GitHub', blurb: 'Pull requests, worktrees and who may direct an agent.' },
  { slug: 'terrarium-practice', name: 'House rules', blurb: 'Decision records, session logs, required reviewers.' },
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

/** Walkthroughs, by title. */
export function glassboxWalkthroughs<T extends GlassboxPageLink>(pages: T[]) {
  return pages
    .filter((page) => glassboxWalkthroughOf(page.path))
    .sort((a, b) => a.title.localeCompare(b.title))
}
