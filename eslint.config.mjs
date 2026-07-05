// Flat config powered by @nuxt/eslint (project-aware rules from .nuxt).
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  ignores: [
    // The one remaining GENERATED artifact (ADR-0013) — never hand-edited, so never
    // linted. `content.config.ts` is now an ordinary, hand-editable module and IS linted.
    'shared/routing.generated.ts',
  ],
})
