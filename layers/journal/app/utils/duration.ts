/** The one duration spelling on the Journal: seconds below an hour ('3m 12s'),
 *  whole minutes from an hour up ('120h 3m', no days unit). */
export function formatJournalDuration(seconds: number): string {
  const s = Math.round(seconds)
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  const m = Math.floor(s / 60)
  return m ? `${m}m ${s % 60}s` : `${s}s`
}
