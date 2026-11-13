// Subject order and display names live here, not in content (issue #1985, Part 3).
export const glassboxSubjects = [
  { slug: 'claude-code', name: 'Claude Code' },
  { slug: 'hooks', name: 'Hooks' },
  { slug: 'agents', name: 'Agents & automation' },
  { slug: 'skill-pack', name: 'Installed Skills' },
  { slug: 'nuxt-vue', name: 'Nuxt & Vue' },
  { slug: 'nuxt-content', name: 'Nuxt Content' },
  { slug: 'verification', name: 'Verification' },
  { slug: 'web-standards', name: 'Web standards' },
  { slug: 'git-github', name: 'Git & GitHub' },
  { slug: 'deploy', name: 'Deploy' },
  { slug: 'terrarium-practice', name: 'House rules' },
] as const

export interface GlassboxPageLink {
  path: string
  title: string
  description?: string
}

/** A Lesson's Subject, read from its folder; undefined for any other page. */
export function glassboxSubjectOf(path: string) {
  return glassboxSubjects.find((subject) => path.startsWith(`/${subject.slug}/`))
}

/** The Subject whose bare folder path this is (`/nuxt-vue`), which has a page of its own. */
export function glassboxSubjectAt(path: string) {
  return glassboxSubjects.find((subject) => path === `/${subject.slug}`)
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

/** Walkthroughs, in the order they arrive: file-prefix order, the most useful to a newcomer first. */
export function glassboxWalkthroughs<T extends GlassboxPageLink>(pages: T[]) {
  return pages.filter((page) => glassboxWalkthroughOf(page.path))
}
