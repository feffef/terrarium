// Date formatting for the Marquee layer (auto-imported, like the rest of
// utils/). Single home for the "Jul 17, 2026" post-date rendering the landing
// and the single-post page both use. Copied locally rather than shared with
// the Blog's identical helper: Tenants share no code (CONTEXT.md isolation
// stance).
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Format an ISO-8601 instant as e.g. "Jul 17, 2026" (UTC). Tolerates a
 *  missing value (→ '') so callers needn't cast an optional front-matter
 *  field. */
export function formatMarqueeDate(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}
