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

interface GlassboxPageLink {
  path: string
  title: string
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

export function glassboxWalkthroughs(pages: GlassboxPageLink[]) {
  return pages.filter((page) => page.path.startsWith('/walkthroughs/'))
}
