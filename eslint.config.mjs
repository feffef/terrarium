// Flat config powered by @nuxt/eslint (project-aware rules from .nuxt).
import withNuxt from './.nuxt/eslint.config.mjs'

// A workflow script's top-level `return` is no valid module; a unit test checks it instead (#1870).
export default withNuxt({ ignores: ['.claude/workflows/**'] })
