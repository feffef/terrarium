const POST_MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/**
 * Pairs each newest-first post with its month ("October 2026", UTC), set only
 * on the first post of a month so the list can head each month once.
 */
export function withBlogMonths<T extends { publishedAt: string }>(posts: T[]): { post: T; month?: string }[] {
  let previous: string | undefined
  return posts.map((post) => {
    const month = POST_MONTH.format(new Date(post.publishedAt))
    const heading = month === previous ? undefined : month
    previous = month
    return { post, month: heading }
  })
}
