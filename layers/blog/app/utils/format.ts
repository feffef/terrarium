// Date formatting for the blog layer (auto-imported, like the rest of utils/).
// Single home for the "Jul 4, 2026" post-date rendering the Persona landing and
// the single-post page both use.
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Format an ISO-8601 instant as e.g. "Jul 4, 2026" (UTC). Tolerates a missing
 *  value (→ '') so callers needn't cast optional front-matter fields. */
export function formatBlogDate(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}
