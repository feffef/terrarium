// Whether the maintainer view is on (see ../utils/maintainerView.ts). `null`
// until resolved: it starts unresolved so SSR and first hydration agree and a
// visitor never sees a flash of maintainer-only UI. Every card calls this, so
// the first one mounted reads the URL and storage and the rest reuse the answer.
import { onMounted } from 'vue'
import { resolveMaintainerView } from '../utils/maintainerView'

export function useMaintainerView() {
  const on = useState<boolean | null>('journal-maintainer-view', () => null)
  onMounted(() => {
    if (on.value === null) on.value = resolveMaintainerView(location.search, () => sessionStorage)
  })
  return on
}
