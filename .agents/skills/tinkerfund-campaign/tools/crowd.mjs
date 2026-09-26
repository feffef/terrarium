// Usage (from the repo root):
//   node .agents/skills/tinkerfund-campaign/tools/crowd.mjs layers/tinkerfund/content/prod/pages/campaigns/*.md
// Checks the crowd numbers a Campaign's frontmatter invents, which the schema
// can't relate: Reward claims add up to the Backers, and `pledged` covers what
// was claimed (Reward and Add-on prices; bonus support explains any excess).
// Prints % funded and the timeline so the intended state can be eyeballed.
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'

let failed = false
for (const file of process.argv.slice(2)) {
  const c = parse(readFileSync(file, 'utf8').split(/^---$/m)[1])?.campaign
  if (!c) continue
  const claims = c.rewards.reduce((n, r) => n + r.claimed, 0)
  const goods = c.rewards.reduce((n, r) => n + r.claimed * r.price, 0)
    + (c.addons ?? []).reduce((n, a) => n + a.claimed * a.price, 0)
  const problems = []
  if (claims !== c.backers) problems.push(`Reward claims (${claims}) ≠ backers (${c.backers})`)
  if (c.pledged < goods) problems.push(`pledged (${c.pledged}) < claimed goods (${goods})`)
  if (c.backers === 0 && c.pledged > 0) problems.push('pledged without Backers')
  for (const r of c.rewards) if (r.stock !== undefined && r.claimed > r.stock) problems.push(`${r.id}: claimed > stock`)
  for (const s of c.stretchGoals ?? []) if (s.amount <= c.goal) problems.push(`stretch goal ${s.id} is not above the goal`)
  const pct = Math.round((c.pledged / c.goal) * 100)
  console.log(`${c.registry} ${file.split('/').pop()}  ${pct}% funded  launch ${c.launch} → end ${c.end}  ${problems.length ? 'PROBLEMS: ' + problems.join('; ') : 'ok'}`)
  failed ||= problems.length > 0
}
process.exitCode = failed ? 1 : 0
