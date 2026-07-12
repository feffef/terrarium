// Seam so ProsePre.vue's mermaid branch is testable as pure TS, without a full
// Nuxt/@vue/test-utils mount (issue #364).
export function isMermaidLanguage(language: string | null | undefined): boolean {
  return language === 'mermaid'
}
