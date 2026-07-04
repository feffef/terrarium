// Flat config powered by @nuxt/eslint (project-aware rules from .nuxt).
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  ignores: [
    // GENERATED artifacts (ADR-0002) — never hand-edited, so never linted.
    'content.config.ts',
    'shared/routing.generated.ts',
  ],
})
