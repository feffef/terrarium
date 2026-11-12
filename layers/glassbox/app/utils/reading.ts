// A visitor's read Lessons live in their own browser only (GLOSSARY.md, Reading progress).
// Storage is one origin shared by every Tenant, so the key is ours and reset removes only it.
export const glassboxReadKey = 'glassbox:read'

export type GlassboxStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

// Storage can be missing or throw (private window, blocked site data), so every access is guarded.
const browserStorage = (): GlassboxStorage | undefined => {
  try { return globalThis.localStorage } catch { return undefined }
}

/** The paths of the Lessons this browser has opened. */
export function readGlassboxProgress(storage: GlassboxStorage | undefined = browserStorage()): string[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(glassboxReadKey) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : []
  } catch { return [] }
}

/** Add a Lesson path to the read list and return it. */
export function markGlassboxRead(path: string, storage: GlassboxStorage | undefined = browserStorage()): string[] {
  const read = readGlassboxProgress(storage)
  if (read.includes(path)) return read
  const next = [...read, path]
  try { storage?.setItem(glassboxReadKey, JSON.stringify(next)) } catch { /* kept in memory only */ }
  return next
}

/** Forget every read Lesson, touching only Glass Box's own key. */
export function resetGlassboxProgress(storage: GlassboxStorage | undefined = browserStorage()): string[] {
  try { storage?.removeItem(glassboxReadKey) } catch { /* nothing stored to forget */ }
  return []
}

/** A Subject's count in the sidebar: the total until a Lesson is read, then `read/total`. */
export function glassboxCountLabel(readCount: number, total: number) {
  return { text: readCount ? `${readCount}/${total}` : String(total), done: total > 0 && readCount === total }
}
