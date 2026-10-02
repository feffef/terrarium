// The Journal Tenant's Nuxt layer (CONTEXT.md: "a Tenant is implemented as a
// Nuxt layer"). This is the Tenant's own fit-out — components and a Space-landing
// page that render its content nicely, overriding the Platform's generic catch-all
// renderer for `/t/journal/<space>` only.
//
// Purely presentational: it reads the per-Space keyed collections through the
// shared routing map. It defines NO content collections of its own — those stay
// governed solely by the root content.config.ts (ADR-0002/0013) — and touches
// none of the isolation-critical routing/expansion logic (ADR-0004).
import { existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Skills with a SKILL.md in the repo — only these get a GitHub link, so a
// harness built-in named in a session log never links to a 404.
const skillsDir = fileURLToPath(new URL('../../.agents/skills/', import.meta.url))
const repoSkills = readdirSync(skillsDir).filter((n) => existsSync(`${skillsDir}${n}/SKILL.md`))

export default defineNuxtConfig({
  // The `.jd` theme tokens + base layout / breadcrumb / prose, shared by the
  // Space landing and the standalone document page so neither copy-pastes them.
  // Resolved from this config's own URL so it's unambiguous regardless of layer
  // alias resolution.
  css: [fileURLToPath(new URL('./app/assets/theme.css', import.meta.url))],
  appConfig: { journal: { repoSkills } },
})
