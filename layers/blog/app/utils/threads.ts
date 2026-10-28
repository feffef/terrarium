interface ThreadPost {
  persona: string
  path: string
  publishedAt?: string
  reactsTo?: { persona: string; path: string }
}

const keyOf = (persona: string, path: string) => `${persona}${path}`

/**
 * Groups posts into conversations by following `reactsTo` up to the first post
 * with no published parent. Only conversations with a reply are returned, each
 * oldest-first, the most recently active first.
 */
export function groupBlogThreads<T extends ThreadPost>(posts: T[]): T[][] {
  const byKey = new Map(posts.map((p) => [keyOf(p.persona, p.path), p]))
  const groups = new Map<string, T[]>()
  for (const post of posts) {
    let root = post
    const seen = new Set([keyOf(post.persona, post.path)])
    while (root.reactsTo) {
      const parentKey = keyOf(root.reactsTo.persona, root.reactsTo.path)
      const parent = byKey.get(parentKey)
      if (!parent || seen.has(parentKey)) break
      seen.add(parentKey)
      root = parent
    }
    const rootKey = keyOf(root.persona, root.path)
    groups.set(rootKey, [...(groups.get(rootKey) ?? []), post])
  }
  const byDate = (a: T, b: T) => (a.publishedAt ?? '').localeCompare(b.publishedAt ?? '')
  return [...groups.values()]
    .filter((members) => members.length > 1)
    .map((members) => members.sort(byDate))
    .sort((a, b) => byDate(b.at(-1)!, a.at(-1)!))
}
