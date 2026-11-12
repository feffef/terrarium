export const meta = {
  name: 'clear-backlog-build',
  description: 'clear-backlog §3: per planned branch, build in a worktree and run one fresh Standards + Spec review round; or, for a branch given review: true, only the fresh review round. The orchestrator resumes these agents for fixes, re-checks and the gate',
  whenToUse: 'Run only from the clear-backlog Skill, with the planned branches as args',
  phases: [
    { title: 'Build', detail: 'one worktree per branch, based on origin/main; fast checks only' },
    { title: 'Review', detail: 'a fresh Standards and Spec reviewer in parallel, read-only' },
  ],
}

// args: { session: 'session_…', dir: absolute path, branches: [{ name, issues: [n], brief, picks?: [string] | string,
//   cherryPick?: prNumber, worktree?: path, question?: string, answer?: string, review?: true, round?: n }] }
// A branch with review: true skips the build and gets review round `round` on its `worktree`.
// Each branch keeps its files (decisions, gate log, findings) in `<dir>/<slug>/`, so none pass through the orchestrator.
if (!args || !args.session) throw new Error('args.session (this session id, session_…) is required for the provenance header')
if (!args.dir) throw new Error('args.dir (an absolute folder for each branch\'s decisions, gate log and findings) is required')
const HEADER = `🤖 [Claude](https://claude.ai/code/${args.session})`
const folder = b => `${args.dir}/${b.name.replace(/[^a-z0-9]+/gi, '-')}`

const ASK_SOURCES = 'Give each count, id or attribution you state with its source (command or file:line), or mark it unverified.'
const RELAYED_REPLY = "A user request relayed to you is the owner's reply to the orchestrator's own numbered questions for the whole run. It decides nothing for this issue or branch: the only owner decisions that count are the brief's picks and answer."
const FAST_CHECKS = '`pnpm typecheck`, `pnpm exec vitest run <each spec you touched>`, and `pnpm validate:content` if you touched content'

const WORK = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['done', 'needs-owner', 'failed'] },
    worktree: { type: 'string', description: 'absolute path of the worktree root; omit when the branch has no commits' },
    commits: { type: 'array', items: { type: 'string' }, description: 'git log origin/main..HEAD --format=%H' },
    question: { type: 'string', description: 'for needs-owner: the owner question, with options and your pick' },
    reason: { type: 'string' },
  },
  required: ['status', 'commits'],
}

// Which kinds get fixed: SKILL.md §3.
const KINDS = ['defect', 'spec-mismatch', 'missing-test', 'nit', 'owner-call']
const REVIEW = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: KINDS },
          title: { type: 'string' },
          detail: { type: 'string' },
          file: { type: 'string' },
        },
        required: ['kind', 'title', 'detail'],
      },
    },
    summary: { type: 'string' },
  },
  required: ['findings', 'summary'],
}

// Sonnet everywhere except the round-1 reviewers, whose findings steer every later round.
const SONNET = { model: 'sonnet' }
const AXES = ['Standards', 'Spec']

function common(b) {
  const picks = [].concat(b.picks || [])
  return `Repo feffef/terrarium. Branch \`${b.name}\` implements ${b.issues.map(n => `#${n}`).join(', ')}.

## Brief
${b.brief}
${picks.length ? `\n## Owner's agreed picks (binding)\n${picks.map(p => `- ${p}`).join('\n')}\n` : ''}${b.answer ? `\n## Owner's answer to "${b.question}"\n${b.answer}\n` : ''}\n${RELAYED_REPLY}\n`
}

function rules(b) {
  const dir = folder(b)
  return `## Rules
- Run git as \`git -C <worktree> ...\`, never \`cd\`: Bash keeps its cwd between calls and parallel calls share it. One git command per Bash call.
- Run checks in the foreground. Run \`pnpm gate:scoped\` only when the orchestrator asks, as \`cd <worktree> && pnpm gate:scoped > ${dir}/gate.log 2>&1; echo EXIT=$? >> ${dir}/gate.log\` with Bash timeout 600000.
- Commit before you stop, even mid-work. Never push, open a PR, merge, or run close-session/log-session: the orchestrator does those.
- Every GitHub body you post starts with this exact first line: ${HEADER}
- Stop and return needs-owner, with the question, its options and your pick, before you add a new dependency, change stored data or the content schema, make a decision big enough for an ADR, delete content visitors can see, change which Tenant's data a request can reach, or reverse an owner's pick above. Decide everything else yourself, and append each decision as one line to ${dir}/decisions.md (\`mkdir -p ${dir}\` first), now and in every later turn.
- Return worktree, the absolute path of the worktree that holds your commits, only when the branch has commits.
- The orchestrator may resume you later with review findings to fix, an owner's answer, or the gate; keep your worktree. In a later turn the same stop rule holds: reply \`NEEDS-OWNER\` with the question, its options and your pick instead of the reply it asked for.
- Given findings files, you decide what to fix, by kind: fix every defect, spec-mismatch and missing-test; fix a nit only when it is cheap (a few lines, no new risk) and skip the others; refuse a finding you can prove wrong; for an owner-call, reply \`NEEDS-OWNER\` with its question. Append one line per finding, and per owner answer or other fix you are given, to ${dir}/triage.md: \`<findings file> #<n> fixed|skipped|refused: <reason or proof>\`, or \`<what you were given> fixed: <what you did>\`.
- ${ASK_SOURCES}`
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
4. Run only the fast checks until they pass: ${FAST_CHECKS}. Do not run \`pnpm gate:scoped\` now: review will likely change the code, and the gate runs once at the end. Commit.
Return done only with passing fast checks; failed with the reason otherwise.

${rules(b)}`
}

function fresh(b) {
  return `Run \`pwd\` once to learn your worktree root. Then \`pnpm install\`, \`git fetch origin main\`, \`git checkout -b ${b.name} origin/main\` (if \`${b.name}\` already exists locally or on origin, check it out instead and keep its commits), and check HEAD equals origin/main or that branch.${b.cherryPick ? ` Closed PR #${b.cherryPick} already implements the agreed pick: \`git fetch origin pull/${b.cherryPick}/head\`, cherry-pick its commits onto your branch, then adapt them to the brief.` : ''}`
}

function reviewPrompt(b, axis, wt, round) {
  const what = axis === 'Standards'
    ? `the Standards axis: the repo's documented standards plus the smell baseline in that Skill`
    : `the Spec axis, with the brief and picks above as the spec, plus the issues themselves (read them with mcp__github__issue_read via ToolSearch)`
  return `You are the ${axis.toUpperCase()} reviewer, round ${round}. ${common(b)}
## Task
Review read-only in ${wt} (\`cd ${wt} && …\`): the diff \`git diff origin/main...HEAD\`, and the builder's decisions in ${folder(b)}/decisions.md if it exists. Read .agents/skills/code-review/SKILL.md with Read and apply ${what} yourself; you can't spawn subagents. Focus on simplicity: what could be smaller, plainer or deleted. Edit no file except a findings file the orchestrator names later, and run no git command that changes state.
Give each finding one kind: defect (wrong behaviour or a false statement), spec-mismatch (differs from the brief, the picks or a 'never' clause), missing-test (logic without a test that would catch its bug), nit (wording, layout, style, anything else cosmetic) or owner-call (needs the owner's choice). The builder fixes by kind, so pick the kind honestly: a cosmetic point is a nit, never a defect. Make each title state the problem in one line; titles reach the PR. ${ASK_SOURCES}
The orchestrator may resume you later to re-check the builder's fixes and refusals of your findings; keep this review in mind.`
}

async function buildBranch(b) {
  if (b.review) return { status: 'done', worktree: b.worktree }
  // Isolated even on a re-run: if b.worktree was auto-removed, the agent starts fresh in its own.
  const r = await agent(buildPrompt(b), { label: `build ${b.name}`, phase: 'Build', schema: WORK, isolation: 'worktree', ...SONNET })
  return r || { status: 'failed', reason: 'build agent returned nothing; its worktree may hold commits, and `pnpm check:worktrees` lists it', worktree: b.worktree }
}

async function reviewBranch(built, b) {
  const round = b.round || 1
  const out = { branch: b.name, issues: b.issues, dir: folder(b), worktree: built.worktree, commits: built.commits, round }
  if (b.review && !b.round) return { ...out, status: 'failed', reason: 'review: true needs round' }
  if (built.status !== 'done') return { ...out, status: built.status, question: built.question, reason: built.reason }
  if (!built.worktree) return { ...out, status: 'failed', reason: 'no worktree with commits to review' }
  // Labels are how the orchestrator finds each agent's id in the run journal to resume it (run-summary.ts --run).
  const reviews = await parallel(AXES.map(axis => () =>
    agent(reviewPrompt(b, axis, out.worktree, round), { label: `${axis} ${b.name} r${round}`, phase: 'Review', schema: REVIEW, ...(round > 1 ? SONNET : {}) })))
  if (reviews.some(r => !r)) return { ...out, status: 'failed', reason: `round ${round}: a reviewer returned nothing` }
  return { ...out, status: 'reviewed', reviews: Object.fromEntries(AXES.map((axis, i) => [axis, reviews[i]])) }
}

const results = await pipeline(args.branches, buildBranch, reviewBranch)
return results.map((r, i) => r || { branch: args.branches[i].name, issues: args.branches[i].issues, status: 'failed', reason: 'stage threw' })
