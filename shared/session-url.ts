// Single home for a Claude Code session's web-UI URL — shared by the Journal's
// session card (browser, via `#shared`) and the provenance tooling in `scripts/`
// (ADR-0017), so the template can't drift between the two (issue #346).
export function sessionUrl(sessionId: string): string {
  return `https://claude.ai/code/${sessionId}`
}
