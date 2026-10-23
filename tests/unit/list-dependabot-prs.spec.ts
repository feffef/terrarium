import { describe, expect, it } from 'vitest'
import { dependabotPrs } from '../../.agents/skills/dependabot-sweep/scripts/list-dependabot-prs.ts'

describe('dependabotPrs()', () => {
  const pull = (number: number, login: string, ref: string) => ({
    number,
    title: `PR ${number}`,
    html_url: `https://github.com/feffef/terrarium/pull/${number}`,
    user: { login },
    head: { ref, sha: `sha${number}` },
  })

  it('keeps only dependabot[bot] PRs and names each one\'s ecosystem', () => {
    expect(
      dependabotPrs([
        pull(1, 'dependabot[bot]', 'dependabot/npm_and_yarn/npm-minor-patch-1a2b'),
        pull(2, 'feffef', 'dependabot/npm_and_yarn/fake'),
        pull(3, 'dependabot[bot]', 'dependabot/github_actions/github-actions-3c4d'),
      ]),
    ).toEqual([
      { number: 1, title: 'PR 1', ecosystem: 'npm_and_yarn', headSha: 'sha1', htmlUrl: 'https://github.com/feffef/terrarium/pull/1' },
      { number: 3, title: 'PR 3', ecosystem: 'github_actions', headSha: 'sha3', htmlUrl: 'https://github.com/feffef/terrarium/pull/3' },
    ])
  })

  it('is empty when there are none', () => {
    expect(dependabotPrs([pull(2, 'feffef', 'claude/x')])).toEqual([])
  })
})
