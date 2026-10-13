export const meta = {
  name: 'clear-backlog-build',
  description: 'clear-backlog §3–4: per planned branch, build in a worktree, then Standards + Spec review and fix until only judgement calls remain; returns branches ready to push',
  whenToUse: 'Run only from the clear-backlog Skill, with the planned branches as args',
  phases: [
    { title: 'Build', detail: 'one worktree per branch; at most 2 gate-running agents at once' },
    { title: 'Review', detail: 'Standards and Spec reviewers in parallel, then a fix agent, until clean' },
  ],
}

// args: { session: 'session_…', branches: [{ name, issues: [n], brief, picks?: [string],
//   model?: 'sonnet', cherryPick?: prNumber, worktree?: path, question?: string, answer?: string }] }
// worktree + answer re-run a branch that came back needs-owner.
if (!args || !args.session) throw new Error('args.session (this session id, session_…) is required for the provenance header')
const HEADER = `🤖 [Claude](https://claude.ai/code/${args.session})`
const MAX_ROUNDS = 3

// At most 2 full gates in one container (dispatch-subagents §3), so build and fix agents, which run the gate, take a slot.
let free = 2
const queue = []
async function gateSlot(fn) {
  if (free > 0) free--
  else await new Promise(resolve => queue.push(resolve))
  try {
    return await fn()
  } finally {
    const next = queue.shift()
    if (next) next()
    else free++
  }
}

const WORK = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['done', 'needs-owner', 'failed'] },
    worktree: { type: 'string', description: 'absolute path of the worktree root' },
    commits: { type: 'array', items: { type: 'string' }, description: 'git log origin/main..HEAD --format=%H' },
    gatePassed: { type: 'boolean' },
    decisions: { type: 'array', items: { type: 'string' } },
    humanOnly: { type: 'array', items: { type: 'string' }, description: 'touched paths that match .claude/rules/adr-0004-human-merge.md paths' },
    question: { type: 'string', description: 'for needs-owner: the owner question, with options and your pick' },
    fixed: { type: 'array', items: { type: 'string' } },
    refused: { type: 'array', items: { type: 'string' }, description: 'each refused finding with its proof' },
    reason: { type: 'string' },
  },
  required: ['status', 'worktree', 'commits', 'gatePassed', 'decisions', 'humanOnly'],
}

const REVIEW = {
  type: 'object',
  properties: {
    reviewedSha: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          detail: { type: 'string' },
          file: { type: 'string' },
          worthFixing: { type: 'boolean', description: 'false for a judgement call not worth a fix round' },
        },
        required: ['title', 'detail', 'worthFixing'],
      },
    },
    summary: { type: 'string' },
  },
  required: ['reviewedSha', 'findings', 'summary'],
}

const modelOf = b => (b.model ? { model: b.model } : {})
const slug = b => b.name.replace(/[^a-z0-9]+/gi, '-')

function common(b) {
  return `Repo feffef/terrarium. Branch \`${b.name}\` implements ${b.issues.map(n => `#${n}`).join(', ')}.

## Brief
${b.brief}
${b.picks && b.picks.length ? `\n## Owner's agreed picks (binding)\n${b.picks.map(p => `- ${p}`).join('\n')}\n` : ''}${b.answer ? `\n## Owner's answer to "${b.question}"\n${b.answer}\n` : ''}`
}

function rules(b) {
  return `## Rules
- Bash resets cwd: prefix every command with \`cd <worktree> &&\`, one git command per Bash call.
- Run checks in the foreground, logging to your scratchpad with a name unique to you, e.g. \`cd <worktree> && pnpm gate:scoped > <scratchpad>/${slug(b)}-<stage>-gate.log 2>&1; echo EXIT=$? >> <same log>\` with Bash timeout 600000.
- Commit before you stop, even mid-work. Never push, open a PR, merge, or run close-session/log-session: the orchestrator does those.
- Every GitHub body you post starts with this exact first line: ${HEADER}
- Stop and return needs-owner, with the question, its options and your pick, before you add a new dependency, change stored data or the content schema, make a decision big enough for an ADR, delete content visitors can see, change which Tenant's data a request can reach, or reverse an owner's pick above. Decide everything else yourself and list it in decisions.
- List in humanOnly every touched path matching the \`paths\` of .claude/rules/adr-0004-human-merge.md.`
}

function buildPrompt(b) {
  const start = b.worktree
    ? `Continue in the existing worktree ${b.worktree} on branch \`${b.name}\`. Run \`git status\` and \`git log origin/main..HEAD\` there first.`
    : `Run \`pwd\` once to learn your worktree root. Then \`pnpm install\`, \`git fetch origin main\`, \`git checkout -b ${b.name} origin/main\`, and check HEAD equals origin/main.${b.cherryPick ? ` Closed PR #${b.cherryPick} already implements the agreed pick: \`git fetch origin pull/${b.cherryPick}/head\`, cherry-pick its commits onto your branch, then adapt them to the brief.` : ''}`
  return `You are the BUILD agent. ${common(b)}
## Task
1. ${start}
2. Read .agents/skills/implement/SKILL.md with Read (it can't be invoked) and follow it, test-first with the tdd Skill (invoke it with the Skill tool). Skip its code-review step: this workflow's reviewers do that next.
3. Keep the change as small and plain as the brief allows.
4. Run \`pnpm gate:scoped\` until it passes, and commit.
Return done only with a passing gate; failed with the reason otherwise.

${rules(b)}`
}

function reviewPrompt(b, axis, wt, round) {
  const what = axis === 'Standards'
    ? `the Standards axis: the repo's documented standards plus the smell baseline in that Skill`
    : `the Spec axis, with the brief and picks above as the spec, plus the issues themselves (read them with mcp__github__issue_read via ToolSearch)`
  return `You are the ${axis.toUpperCase()} reviewer, round ${round}. ${common(b)}
## Task
Review read-only in ${wt} (\`cd ${wt} && …\`): the diff \`git diff origin/main...HEAD\`. Read .agents/skills/code-review/SKILL.md with Read and apply ${what} yourself; you can't spawn subagents. Focus on simplicity: what could be smaller, plainer or deleted. Edit no file and run no git command that changes state.
Mark worthFixing false for a judgement call not worth another fix round. Return the HEAD SHA you reviewed.`
}

function fixPrompt(b, wt, findings, round) {
  return `You are the FIX agent, round ${round}, in worktree ${wt} on branch \`${b.name}\`. ${common(b)}
## Findings to fix
${JSON.stringify(findings, null, 2)}
## Task
Fix each finding in ${wt}, test-first with the tdd Skill where there is logic. You may refuse a finding you can prove wrong; put the proof in refused. Run \`pnpm gate:scoped\` until it passes, and commit.

${rules(b)}`
}

async function buildBranch(b) {
  const opts = { label: `build ${b.name}`, phase: 'Build', schema: WORK, ...modelOf(b) }
  if (!b.worktree) opts.isolation = 'worktree'
  const r = await gateSlot(() => agent(buildPrompt(b), opts))
  return r || { status: 'failed', reason: 'build agent returned nothing', commits: [], decisions: [], humanOnly: [], worktree: b.worktree }
}

async function reviewBranch(built, b) {
  const out = { branch: b.name, issues: b.issues, worktree: built.worktree, commits: built.commits, decisions: [...built.decisions], humanOnly: built.humanOnly, rounds: 0 }
  if (built.status !== 'done') return { ...out, status: built.status, question: built.question, reason: built.reason }
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    out.rounds = round
    const reviews = await parallel(['Standards', 'Spec'].map(axis => () =>
      agent(reviewPrompt(b, axis, out.worktree, round), { label: `${axis} ${b.name} r${round}`, phase: 'Review', schema: REVIEW })))
    if (reviews.some(r => !r)) return { ...out, status: 'failed', reason: `round ${round}: a reviewer returned nothing` }
    const all = reviews.flatMap(r => r.findings)
    const toFix = all.filter(f => f.worthFixing)
    out.judgementCalls = all.filter(f => !f.worthFixing)
    if (!toFix.length) return { ...out, status: 'ready-to-push' }
    if (round === MAX_ROUNDS) {
      log(`${b.name}: review capped at ${MAX_ROUNDS} rounds`)
      return { ...out, status: 'failed', reason: `review capped at ${MAX_ROUNDS} rounds`, openFindings: toFix }
    }
    const fix = await gateSlot(() => agent(fixPrompt(b, out.worktree, toFix, round), { label: `fix ${b.name} r${round}`, phase: 'Review', schema: WORK, ...modelOf(b) }))
    if (!fix) return { ...out, status: 'failed', reason: `round ${round}: fix agent returned nothing` }
    out.commits = fix.commits
    out.decisions.push(...fix.decisions)
    out.humanOnly = [...new Set([...out.humanOnly, ...fix.humanOnly])]
    if (fix.status !== 'done') return { ...out, status: fix.status, question: fix.question, reason: fix.reason }
  }
}

const results = await pipeline(args.branches, buildBranch, reviewBranch)
return results.map((r, i) => r || { branch: args.branches[i].name, issues: args.branches[i].issues, status: 'failed', reason: 'stage threw' })
