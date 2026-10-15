// Subject order and display names live here, not in content (issue #1985, Part 3).
export const glassboxSubjects = [
  { slug: 'claude-code', name: 'Claude Code' },
  { slug: 'skill-pack', name: 'Skill pack' },
  { slug: 'nuxt-vue', name: 'Nuxt & Vue' },
  { slug: 'nuxt-content', name: 'Nuxt Content' },
  { slug: 'zod', name: 'Zod' },
  { slug: 'typescript', name: 'TypeScript' },
  { slug: 'testing', name: 'Testing' },
  { slug: 'deploy', name: 'Deploy' },
  { slug: 'git-github', name: 'Git & GitHub' },
  { slug: 'terrarium-practice', name: 'Terrarium practice' },
] as const

export const glassboxStartHere = '/walkthroughs/opening-a-page'

export interface GlassboxPageLink {
  path: string
  title: string
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
export function glassboxDirectory(pages: GlassboxPageLink[]) {
  return glassboxSubjects
    .map((subject) => ({
      ...subject,
      lessons: pages.filter((page) => page.path.startsWith(`/${subject.slug}/`)),
    }))
    .filter((subject) => subject.lessons.length)
}

/** Walkthroughs, Start here first, then by title. */
export function glassboxWalkthroughs(pages: GlassboxPageLink[]) {
  const rank = (page: GlassboxPageLink) => (page.path === glassboxStartHere ? 0 : 1)
  return pages
    .filter((page) => glassboxWalkthroughOf(page.path))
    .sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title))
}
