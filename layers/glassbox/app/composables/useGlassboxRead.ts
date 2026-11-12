/** The Lessons this browser has opened. Empty until `load` runs after mount, so the cached server render is the same for every visitor (ADR-0028). */
export function useGlassboxRead() {
  const read = useState<string[]>('glassbox-read', () => [])
  return {
    read,
    load: () => { read.value = readGlassboxProgress() },
    mark: (path: string) => { read.value = markGlassboxRead(path) },
    reset: () => { read.value = resetGlassboxProgress() },
  }
}
