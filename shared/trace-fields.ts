// The trace fields `foldSubagentTrace` (scripts/session-trace.ts) unions in from
// each subagent's own trace, paired with the label SessionCard.vue's explainer
// renders for each — single-sourced so the two can't silently drift apart the
// way hand-typed prose did once before (issue #975). Lives here, not in
// scripts/session-trace.ts itself, because that module also pulls in Node's
// fs/path/url for its CLI/file-IO half — imports SessionCard.vue (bundled for
// the browser via the `#shared` alias) can't resolve.
export type FoldedTraceField = 'filesRead' | 'filesEdited' | 'skillsUsed' | 'docsReadViaShell'

export const FOLDED_TRACE_FIELDS: { field: FoldedTraceField; label: string }[] = [
  { field: 'filesRead', label: 'Files read' },
  { field: 'filesEdited', label: 'files edited' },
  { field: 'skillsUsed', label: 'Skills used' },
  { field: 'docsReadViaShell', label: 'docs read via shell' },
]
