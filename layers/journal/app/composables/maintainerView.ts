// Whether the maintainer view is on (see ../utils/maintainerView.ts). Starts
// false and is resolved on mount, so SSR and first hydration agree and a
// visitor without the flag never sees a flash of maintainer-only UI.
import { onMounted } from 'vue'
import { resolveMaintainerView } from '../utils/maintainerView'

export function useMaintainerView() {
  const on = useState('journal-maintainer-view', () => false)
  onMounted(() => {
    on.value = resolveMaintainerView(location.search, () => sessionStorage)
  })
  return on
}
