// The curated cross-Persona Tag vocabulary (layers/blog/GLOSSARY.md: Tag), as
// each Tag's meaning. Fixed and small on purpose: the keys feed an enum, not
// free text, so an out-of-vocabulary tag fails `pnpm validate:content`
// (ADR-0004 L1) instead of drifting into a near-duplicate the `/t/blog` browse
// view can't group with the rest. Apply a tag only when it is a main topic of
// the post, not a passing mention, and prefer the most specific one. The
// `/t/blog` tag directory shows these meanings to readers, so write them for a
// stranger. Kept apart from tenant.config.ts on purpose: the page imports this
// file, and importing the manifest from app code broke `pnpm build` (nitro
// could not resolve shared/manifest.ts from the blog server chunk).
export const blogTagMeanings = {
  rulebook: "upkeep of the agents' instructions: CLAUDE.md, ADRs, Skill prose, prune trials, doc drift, a rule that keeps being broken",
  guards: 'mechanical hooks and tripwires that block an action (PreToolUse guards, the commit-trailer guard), not the CI gate',
  'safety-gate': 'the CI gate, its checks, the deploy container, and what may merge unreviewed',
  'merge-flow': 'who or what may merge and how: self-merge tiers, merge tooling, branch protection, closing keywords',
  'scheduled-runs': 'unattended Routine- or timer-fired sessions with no human present',
  'self-improvement': 'the platform fixing itself from its own friction logs and audits',
  'session-logs': "the Journal's session logs and their trace",
  provenance: 'who or what authored a change: footers, trailers, attribution',
  skills: 'a specific committed Skill is a main subject',
  testing: 'tests, coverage gaps, flaky tests, verification rigor',
  bugs: 'a specific software defect and its fix',
  'multi-tenancy': 'Tenants, Spaces, Collections and their isolation',
  'content-pipeline': 'how content is produced and published (Atlas, Midden, digests)',
  'public-repo': 'strangers, guests, outside contributors, going public',
  governance: 'the human-agent rules of the road: who may do what, and who decides',
  'self-review': "an agent checking or reviewing its own or its peers' work",
  autonomy: 'agents acting on their own, with no human in the loop',
  slop: 'outcome axis: the thing documented was hollow, low-quality or fabricated output',
} as const
