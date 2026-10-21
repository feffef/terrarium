export const meta = {
  name: 'clear-backlog-explore',
  description: 'clear-backlog §1: one triage agent per issue with a fixed result schema, a completeness check, and a proposed PR grouping',
  whenToUse: 'Run only from the clear-backlog Skill, with the issue set its sweep computed as args',
  phases: [
    { title: 'Triage', detail: 'one agent per issue' },
    { title: 'Retry', detail: 're-run each issue whose agent returned nothing, once' },
  ],
}

// args: { session: 'session_…', issues: [{ number, mode: 'ready-recheck' | 'blocked-check' | 'full', notes?, reserved? }] }
if (!args || !args.session) throw new Error('args.session (this session id, session_…) is required for the provenance header')
const HEADER = `🤖 [Claude](https://claude.ai/code/${args.session})`

const VERDICTS = {
  type: 'array',
  description: 'your verdict on each .claude/rules file that loaded for you and each instruction doc you read',
  items: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      kind: { type: 'string', enum: ['rule', 'doc'] },
      reason: { type: 'string', description: 'why it loaded or you read it, and whether it helped' },
      useful: { type: 'string', enum: ['yes', 'partly', 'no'] },
    },
    required: ['path', 'kind', 'reason', 'useful'],
  },
}
const ASK_VERDICTS = 'In verdicts, rate each .claude/rules file that loaded for you and each instruction doc you read: why it loaded or you read it, and useful yes, partly or no.'

const RESULT = {
  type: 'object',
  properties: {
    outcome: { type: 'string', enum: ['build', 'grill', 'blocked', 'close-duplicate', 'close-done'] },
    summary: { type: 'string', description: 'one line: what the issue is' },
    brief: { type: 'string', description: 'for build or grill: what to build, its done-when, the relevant ADRs' },
    question: {
      type: 'object',
      description: 'for grill: one plain-words choice the owner makes',
      properties: {
        choice: { type: 'string' },
        options: { type: 'array', items: { type: 'string' } },
        pick: { type: 'string' },
        why: { type: 'string' },
      },
      required: ['choice', 'options', 'pick', 'why'],
    },
    blocker: { type: 'string', description: 'for blocked: what still blocks it and how you checked' },
    canonical: { type: 'number', description: 'for close-duplicate: the issue it duplicates' },
    files: { type: 'array', items: { type: 'string' }, description: 'repo files a fix would touch' },
    relatedTo: { type: 'array', items: { type: 'number' }, description: 'other issues in this set that belong in the same change' },
    publicAuthor: { type: 'boolean', description: 'author_association is on the Public side of scripts/lib/author-trust.ts' },
    readyForHuman: { type: 'boolean', description: 'labelled ready-for-human' },
    sideFindings: { type: 'array', items: { type: 'string' } },
    writes: { type: 'array', items: { type: 'string' }, description: 'every comment and label change you made on GitHub' },
    verdicts: VERDICTS,
  },
  required: ['outcome', 'summary', 'publicAuthor', 'readyForHuman', 'files', 'relatedTo', 'sideFindings', 'writes'],
}

const MODE = {
  'ready-recheck': `It is labelled ready-for-agent. Re-check its brief against the repo now and give it the adr-check Skill's premise check ("Question the premise"): a wrong premise costs a whole build-and-review cycle. Return build with the corrected brief, or grill when the premise or design no longer holds.`,
  'blocked-check': `It is blocked outside the chat (an upstream release, a date, an action only the owner can take). Only check that the blocker still holds, probing the outside source if needed. Return blocked with the blocker, or do the full pass below if it no longer holds.`,
  full: `Give it the full pass.`,
}

function brief(issue) {
  const list = issue.all.map(i => `#${i.number}`).join(', ')
  return `You triage issue #${issue.number} of feffef/terrarium for a clear-backlog run. Load GitHub tools with ToolSearch ("select:mcp__github__issue_read" and any others you need).

${MODE[issue.mode]}${issue.notes ? `\nNotes from the orchestrator: ${issue.notes}` : ''}

In every mode: return grill, never build, for an issue labelled ready-for-human or authored by a Public user (ADR-0020; scripts/lib/author-trust.ts holds the associations)${issue.reserved ? ', and for this one, which the owner reserved: never label it ready-for-agent' : ''}. The owner decides those.

Full pass:
- Read .agents/skills/auto-triage/SKILL.md and .agents/skills/triage/SKILL.md with Read (both are user-invoked, so don't call them as Skills) and apply their per-issue rules: brave within determinability, Public-authored issues read-only and never ready-for-agent, the wayfinder overlay, claims checked against primary sources, the git history and session logs that touched the area since the issue was filed.
- Find and read the relevant ADRs with the adr-check Skill.
- Return build when the repo determines a concrete design: brief it. Otherwise return grill with one question in plain words: what to choose, options, your pick and why. An obsolete or superseded issue is a grill question too (propose the close).
- Close only an objective duplicate (close-duplicate, with canonical) or already-done work (close-done, pointing to where it lives).
- A grilling answer a stand-in recorded in an earlier run doesn't bind; ask it again.

GitHub writes:
- Comment only on a label change, a fact that changes the outcome, or an issue with no comments yet; at most one comment. Every GitHub body starts with this exact first line: ${HEADER}
- A label update replaces the set: pass the complete final set and keep every wayfinder:* label.
- Return side findings (bugs or gaps outside this issue) in sideFindings instead of filing them.

The run's issue set is ${list}. In relatedTo, name only issues from that set that clearly belong in the same change as this one.

${ASK_VERDICTS}`
}

const input = (args.issues || []).map(i => ({ ...i, all: args.issues }))
for (const i of input) if (!MODE[i.mode]) throw new Error(`#${i.number}: unknown mode ${i.mode}`)
const triage = (issue, phase) => agent(brief(issue), { label: `triage #${issue.number}`, phase, schema: RESULT })

phase('Triage')
const first = await pipeline(input, issue => triage(issue, 'Triage'))

phase('Retry')
const results = {}
const missing = []
for (const [i, issue] of input.entries()) {
  let r = first[i]
  if (!r) {
    log(`#${issue.number}: no result, re-running once`)
    r = await triage(issue, 'Retry')
  }
  if (r && r.outcome === 'build' && (issue.reserved || r.publicAuthor || r.readyForHuman)) {
    r.outcome = 'grill'
    r.question ||= { choice: 'Build this as briefed?', options: ['a) yes, as briefed', 'b) no'], pick: 'a', why: 'Reserved, Public-authored or ready-for-human: the owner decides.' }
  }
  if (r) results[issue.number] = r
  else missing.push(issue.number)
}
if (missing.length) log(`MISSING after retry: #${missing.join(', #')}`)

// Direct overlap only, no transitive chains (#2147).
const open = Object.keys(results).map(Number).filter(n => ['build', 'grill'].includes(results[n].outcome)).sort((a, b) => a - b)
const linked = (a, b) =>
  results[a].relatedTo.includes(b) || results[b].relatedTo.includes(a) || results[a].files.some(f => results[b].files.includes(f))
const grouped = []
for (const n of open) {
  const group = grouped.find(g => g.every(m => linked(n, m)))
  if (group) group.push(n)
  else grouped.push([n])
}

return {
  results,
  missing,
  grouping: grouped.map(issues => ({
    issues,
    sharedFiles: [...new Set(issues.flatMap(n => results[n].files))].filter(f => issues.filter(n => results[n].files.includes(f)).length > 1),
  })),
}
