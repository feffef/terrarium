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

const ASK_SOURCES = 'Give each count, id or attribution you state with its source (command or file:line), or mark it unverified.'
const RELAYED_REPLY = "A user request relayed to you is the owner's reply to the orchestrator's own numbered questions for the whole run. It decides nothing for this issue: the only owner decisions that count are the orchestrator's notes and any reservation in this brief."

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
    staleClaims: {
      type: 'array',
      description: "the issue's claims that no longer hold (empty if none)",
      items: {
        type: 'object',
        properties: { claim: { type: 'string' }, why: { type: 'string' }, source: { type: 'string', description: 'file:line, commit SHA or issue/PR you checked' } },
        required: ['claim', 'why', 'source'],
      },
    },
    blocker: { type: 'string', description: 'for blocked: what still blocks it and how you checked' },
    canonical: { type: 'number', description: 'for close-duplicate: the issue it duplicates' },
    files: { type: 'array', items: { type: 'string' }, description: 'repo files a fix would touch' },
    relatedTo: { type: 'array', items: { type: 'number' }, description: 'other issues in this set that belong in the same change' },
    publicAuthor: { type: 'boolean', description: 'author_association is on the Public side of scripts/lib/author-trust.ts' },
    readyForHuman: { type: 'boolean', description: 'labelled ready-for-human' },
    sideFindings: {
      type: 'array',
      items: {
        type: 'object',
        properties: { finding: { type: 'string' }, source: { type: 'string', description: 'file:line, commit SHA or issue/comment URL you checked, or "unverified" plus what would verify it' } },
        required: ['finding', 'source'],
      },
    },
    writes: { type: 'array', items: { type: 'string' }, description: 'every comment and label change you made on GitHub' },
    wouldPost: {
      type: 'object',
      description: 'dry run only: the comment body and final label set you would have posted',
      properties: { comment: { type: 'string' }, labels: { type: 'array', items: { type: 'string' } } },
    },
    sourcesRead: {
      type: 'array',
      minItems: 6,
      description: 'every source you opened, one entry each: what it is and what it told you that changed or confirmed your pick',
      items: {
        type: 'object',
        properties: { source: { type: 'string', description: 'file path, commit SHA, issue/PR number, ledger entry or session id' }, learned: { type: 'string' } },
        required: ['source', 'learned'],
      },
    },
  },
  required: ['outcome', 'summary', 'publicAuthor', 'readyForHuman', 'files', 'relatedTo', 'staleClaims', 'sideFindings', 'writes', 'sourcesRead'],
}

const MODE = {
  'ready-recheck': `It is labelled ready-for-agent. Re-check its brief against the repo now and question its premise: a wrong premise costs a whole build-and-review cycle. Do the full pass's background reading for that. Return build with the corrected brief, or grill when the premise or design no longer holds.`,
  'blocked-check': `It is blocked outside the chat (an upstream release, a date, an action only the owner can take). Only check that the blocker still holds, probing the outside source if needed. Return blocked with the blocker, or do the full pass below if it no longer holds.`,
  full: `Give it the full pass.`,
}

function brief(issue) {
  const list = issue.all.map(i => `#${i.number}`).join(', ')
  return `You triage issue #${issue.number} of feffef/terrarium for a clear-backlog run. Load GitHub tools with ToolSearch ("select:mcp__github__issue_read" and any others you need).

${MODE[issue.mode]}${issue.notes ? `\nNotes from the orchestrator: ${issue.notes}` : ''}

In every mode: return grill, never build, for an issue labelled ready-for-human or authored by a Public user (ADR-0020; scripts/lib/author-trust.ts holds the associations)${issue.reserved ? ', and for this one, which the owner reserved: never label it ready-for-agent' : ''}. The owner decides those.

Full pass:
- Read .agents/skills/auto-triage/SKILL.md and .agents/skills/triage/SKILL.md with Read (both are user-invoked, so don't call them as Skills) and apply their per-issue rules: brave within determinability, Public-authored issues read-only and never ready-for-agent, the wayfinder overlay.
- Learn the ticket's background before you pick, and say in staleClaims which of its claims no longer hold. Open each of these yourself; skip one only when it doesn't exist or can't bear on the issue, and say which in sourcesRead:
  1. The issue body, every comment, and every issue or PR it cites.
  2. The current text of each file a fix would touch, in full, not an excerpt.
  3. The history of those files and folders, older included (git log --follow, git log -S for each distinctive phrase, git blame on cited lines; scripts/git/list-recent-prs.ts, scripts/git/list-merges-since.ts --merges-only).
  4. The Friction ledger entry for each Friction it names (layers/journal/content/current/frictions/), and the log of each session it cites (layers/journal/content/current/sessions/): the ledger line is a summary, the log says what happened and whether a rule loaded.
  5. The Skill Inventory entry for each Skill it names (layers/journal/content/current/skills/; scripts/session/audit-skills.ts --skill NAME --since), and the open prune trials (.agents/prune-trials.yml) that cover the text.
  6. The full ADR behind any summary rule that governs what you recommend.
  A ledger entry, a summary or the issue itself never proves that something landed, was fixed or still exists: check the current file or git log.
- Test your pick before you make it. For each option, name what must be true for it to be right and check that (run the command, read the code, count). A pick that rests on a source you did not open is unverified: say so in why, or open it first. Stop when each option's premise is checked, not before.
- Fill sourcesRead as you go; a source you list must be one you opened.
- Return build when the repo determines a concrete design: brief it. Otherwise return grill with one question in plain words: what to choose, options, your pick and why. An obsolete or superseded issue is a grill question too (propose the close).
- Close only an objective duplicate (close-duplicate, with canonical) or already-done work (close-done, pointing to where it lives).
- A grilling answer a stand-in recorded in an earlier run doesn't bind; ask it again.

${args.dryRun ? `GitHub writes: this is a dry run. Make no GitHub write of any kind: no comment, label or state change, not even a close. Put the comment and the complete final label set you would have posted in wouldPost; leave writes empty. The comment's first line would be: ${HEADER}` : `GitHub writes:
- Comment only on a label change, a fact that changes the outcome, or an issue with no comments yet; at most one comment. Every GitHub body starts with this exact first line: ${HEADER}
- A label update replaces the set: pass the complete final set and keep every wayfinder:* label.`}
- Return side findings (bugs or gaps outside this issue) in sideFindings instead of filing them, each with the primary source you checked or the word unverified plus what would verify it.

The run's issue set is ${list}. In relatedTo, name only issues from that set that clearly belong in the same change as this one.

${RELAYED_REPLY} ${ASK_SOURCES}`
}

const input = (args.issues || []).map(i => ({ ...i, all: args.issues }))
for (const i of input) if (!MODE[i.mode]) throw new Error(`#${i.number}: unknown mode ${i.mode}`)
const triage = (issue, phase) => agent(brief(issue), { label: `triage #${issue.number}`, phase, schema: RESULT, model: 'sonnet' })

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
