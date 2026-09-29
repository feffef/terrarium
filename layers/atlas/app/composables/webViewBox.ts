// A web diagram's viewBox. At phone width its text is hidden (theme.css,
// `.atlas-web-list`), so the margins that held the names are cropped away and
// the medallions fill the width.
import type { Ref } from 'vue'

/** A medallion: its centre and the radius it (with its seat or ring) takes up. */
interface Disc { x: number; y: number; r: number }

export function useWebViewBox(full: () => { w: number; h: number }, discs: () => Disc[]): Ref<string> {
  const narrow = ref(false)
  let mq: MediaQueryList | undefined
  const sync = () => (narrow.value = !!mq?.matches)
  onMounted(() => {
    mq = window.matchMedia('(max-width: 30rem)')
    sync()
    mq.addEventListener('change', sync)
  })
  onBeforeUnmount(() => mq?.removeEventListener('change', sync))
  return computed(() => {
    const { w, h } = full()
    const ds = discs()
    if (!narrow.value || !ds.length) return `0 0 ${w} ${h}`
    const x = Math.min(...ds.map((d) => d.x - d.r))
    const y = Math.min(...ds.map((d) => d.y - d.r))
    const X = Math.max(...ds.map((d) => d.x + d.r))
    const Y = Math.max(...ds.map((d) => d.y + d.r))
    return `${x} ${y} ${X - x} ${Y - y}`
  })
}
