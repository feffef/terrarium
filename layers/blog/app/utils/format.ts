// Date formatting for the blog layer (auto-imported, like the rest of utils/).
const POST_DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

/** "Jul 4, 2026" (UTC); '' for a missing value so callers needn't cast optional front-matter fields. */
export const formatBlogDate = (iso?: string) => (iso ? POST_DATE.format(new Date(iso)) : '')
