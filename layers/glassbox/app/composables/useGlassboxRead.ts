// PROTOTYPE (#3130), throwaway: in-memory read state, no storage. Seeds fake reads to judge the look.
export function useGlassboxRead() {
  const read = useState<string[]>('glassbox-read-prototype', () => [])
  const variant = computed(() => String(useRoute().query.variant ?? 'A'))
  return {
    read,
    variant,
    isRead: (path: string) => read.value.includes(path),
    seed(subjects: { lessons: { path: string }[] }[], current: string) {
      const fake = subjects.flatMap((s) => s.lessons.slice(0, Math.ceil(s.lessons.length / 3)).map((l) => l.path))
      read.value = [...new Set([...fake, current])]
    },
    reset: () => { read.value = [] },
  }
}
