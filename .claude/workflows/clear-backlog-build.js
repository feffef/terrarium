export const meta = {
  name: 'clear-backlog-build',
  description: 'clear-backlog §3: per planned branch, build in a worktree, then Standards + Spec review and fix until only judgement calls remain; returns branches ready to push',
  whenToUse: 'Run only from the clear-backlog Skill, with the planned branches as args',
  phases: [
    { title: 'Build', detail: 'one worktree per branch, based on origin/main' },
    { title: 'Review', detail: 'Standards and Spec reviewers in parallel, then a fix agent, until clean' },
  ],
}

// args: { session: 'session_…', branches: [{ name, issues: [n], brief, picks?: [string] | string,
//   model?: 'sonnet', cherryPick?: prNumber, worktree?: path, question?: string, answer?: string }] }
if (!args || !args.session) throw new Error('args.session (this session id, session_…) is required for the provenance header')
const HEADER = `🤖 [Claude](https://claude.ai/code/${args.session})`
const MAX_ROUNDS = 3

// The worktree guard refuses every command that names a branch containing "git".
const guarded = (args.branches || []).filter(b => /git/i.test(b.name)).map(b => b.name)
if (guarded.length) throw new Error(`Branch name contains "git": ${guarded.join(', ')}. Orchestrator: rename it (clear-backlog §3 name) and run again.`)

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

const WORK = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['done', 'needs-owner', 'failed'] },
    worktree: { type: 'string', description: 'absolute path of the worktree root; omit when the branch has no commits' },
    commits: { type: 'array', items: { type: 'string' }, description: 'git log origin/main..HEAD --format=%H' },
    gatePassed: { type: 'boolean' },
    decisions: { type: 'array', items: { type: 'string' } },
    question: { type: 'string', description: 'for needs-owner: the owner question, with options and your pick' },
    fixed: { type: 'array', items: { type: 'string' } },
    refused: { type: 'array', items: { type: 'string' }, description: 'each refused finding with its proof' },
    reason: { type: 'string' },
    verdicts: VERDICTS,
  },
  required: ['status', 'commits', 'gatePassed', 'decisions'],
}

const REVIEW = {
  type: 'object',
  properties: {
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
    verdicts: VERDICTS,
  },
  required: ['findings', 'summary'],
}

const modelOf = b => (b.model ? { model: b.model } : {})
const tagged = (r, agent) => ((r && r.verdicts) || []).map(v => ({ ...v, agent }))
const slug = b => b.name.replace(/[^a-z0-9]+/gi, '-')

function common(b) {
  const picks = [].concat(b.picks || [])
  return `Repo feffef/terrarium. Branch \`${b.name}\` implements ${b.issues.map(n => `#${n}`).join(', ')}.

## Brief
${b.brief}
${picks.length ? `\n## Owner's agreed picks (binding)\n${picks.map(p => `- ${p}`).join('\n')}\n` : ''}${b.answer ? `\n## Owner's answer to "${b.question}"\n${b.answer}\n` : ''}`
}

function rules(b) {
  return `## Rules
- Bash resets cwd: prefix every command with \`cd <worktree> &&\`, one git command per Bash call.
- Run checks in the foreground, logging to your scratchpad with a name unique to you, e.g. \`cd <worktree> && pnpm gate:scoped > <scratchpad>/${slug(b)}-<stage>-gate.log 2>&1; echo EXIT=$? >> <same log>\` with Bash timeout 600000.
- Commit before you stop, even mid-work. Never push, open a PR, merge, or run close-session/log-session: the orchestrator does those.
- Every GitHub body you post starts with this exact first line: ${HEADER}
- Stop and return needs-owner, with the question, its options and your pick, before you add a new dependency, change stored data or the content schema, make a decision big enough for an ADR, delete content visitors can see, change which Tenant's data a request can reach, or reverse an owner's pick above. Decide everything else yourself and list it in decisions.
- Return worktree, the absolute path of the worktree that holds your commits, only when the branch has commits.
- ${ASK_VERDICTS}`
}

function buildPrompt(b) {
  const start = b.worktree
    ? `If ${b.worktree} exists, continue there on branch \`${b.name}\`: run \`git status\` and \`git log origin/main..HEAD\` there first. If it doesn't, start fresh: ${fresh(b)}`
    : fresh(b)
  return `You are the BUILD agent. ${common(b)}
## Task
1. ${start}
2. Read .agents/skills/implement/SKILL.md with Read (it can't be invoked) and follow it, test-first with the tdd Skill (invoke it with the Skill tool). Skip its code-review step: this workflow's reviewers do that next.
3. Keep the change as small and plain as the brief allows.
4. Run \`pnpm gate:scoped\` until it passes, and commit.
Return done only with a passing gate; failed with the reason otherwise.

${rules(b)}`
}

function fresh(b) {
  return `Run \`pwd\` once to learn your worktree root. Then \`pnpm install\`, \`git fetch origin main\`, \`git checkout -b ${b.name} origin/main\` (if \`${b.name}\` already exists locally or on origin, check it out instead and keep its commits), and check HEAD equals origin/main or that branch.${b.cherryPick ? ` Closed PR #${b.cherryPick} already implements the agreed pick: \`git fetch origin pull/${b.cherryPick}/head\`, cherry-pick its commits onto your branch, then adapt them to the brief.` : ''}`
}

function reviewPrompt(b, axis, wt, round, decisions) {
  const what = axis === 'Standards'
    ? `the Standards axis: the repo's documented standards plus the smell baseline in that Skill, and one check: every count and every subagent claim in the commit messages or the build decisions listed below cites its source (a file, a command, a commit); flag an uncited one as a finding`
    : `the Spec axis, with the brief and picks above as the spec, plus the issues themselves (read them with mcp__github__issue_read via ToolSearch)`
  return `You are the ${axis.toUpperCase()} reviewer, round ${round}. ${common(b)}
## Task
Review read-only in ${wt} (\`cd ${wt} && …\`): the diff \`git diff origin/main...HEAD\`. Read .agents/skills/code-review/SKILL.md with Read and apply ${what} yourself; you can't spawn subagents (the environment sets CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1). Focus on simplicity: what could be smaller, plainer or deleted. Edit no file and run no git command that changes state.
Mark worthFixing false for a judgement call not worth another fix round. ${ASK_VERDICTS}
## Build decisions
${JSON.stringify(decisions)}`
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
  // Isolated even on a re-run: if b.worktree was auto-removed, the agent starts fresh in its own.
  const r = await agent(buildPrompt(b), { label: `build ${b.name}`, phase: 'Build', schema: WORK, isolation: 'worktree', ...modelOf(b) })
  return r || { status: 'failed', reason: 'build agent returned nothing; its worktree may hold commits, and `pnpm check:worktrees` lists it', commits: [], decisions: [], worktree: b.worktree }
}

async function reviewBranch(built, b) {
  const out = { branch: b.name, issues: b.issues, worktree: built.worktree, commits: built.commits, decisions: [...built.decisions], rounds: 0, verdicts: tagged(built, `build ${b.name}`) }
  if (built.status !== 'done') return { ...out, status: built.status, question: built.question, reason: built.reason }
  if (!built.gatePassed || !built.worktree) return { ...out, status: 'failed', reason: 'build reported done without a passing gate:scoped or a worktree with commits' }
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    out.rounds = round
    const axes = ['Standards', 'Spec']
    const reviews = await parallel(axes.map(axis => () =>
      agent(reviewPrompt(b, axis, out.worktree, round, out.decisions), { label: `${axis} ${b.name} r${round}`, phase: 'Review', schema: REVIEW })))
    reviews.forEach((r, i) => out.verdicts.push(...tagged(r, `${axes[i]} ${b.name} r${round}`)))
    if (reviews.some(r => !r)) return { ...out, status: 'failed', reason: `round ${round}: a reviewer returned nothing` }
    const all = reviews.flatMap(r => r.findings)
    const toFix = all.filter(f => f.worthFixing)
    out.judgementCalls = all.filter(f => !f.worthFixing)
    if (!toFix.length) return { ...out, status: 'ready-to-push' }
    if (round === MAX_ROUNDS) {
      log(`${b.name}: review capped at ${MAX_ROUNDS} rounds`)
      return { ...out, status: 'failed', reason: `review capped at ${MAX_ROUNDS} rounds`, openFindings: toFix }
    }
    const fix = await agent(fixPrompt(b, out.worktree, toFix, round), { label: `fix ${b.name} r${round}`, phase: 'Review', schema: WORK, ...modelOf(b) })
    if (!fix) return { ...out, status: 'failed', reason: `round ${round}: fix agent returned nothing` }
    out.verdicts.push(...tagged(fix, `fix ${b.name} r${round}`))
    out.commits = fix.commits
    out.decisions.push(...fix.decisions)
    if (fix.status !== 'done') return { ...out, status: fix.status, question: fix.question, reason: fix.reason }
    if (!fix.gatePassed) return { ...out, status: 'failed', reason: `round ${round}: fix reported done without a passing gate:scoped` }
  }
}

const results = await pipeline(args.branches, buildBranch, reviewBranch)
return results.map((r, i) => r || { branch: args.branches[i].name, issues: args.branches[i].issues, status: 'failed', reason: 'stage threw' })
