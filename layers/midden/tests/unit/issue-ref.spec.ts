// Unit tests for linking `#N` in curator prose (layers/midden/app/utils/issue-ref.ts, issue #2719).
import { describe, expect, it } from 'vitest'
import { middenIssueRefParts } from '../../app/utils/issue-ref.ts'

const ref = (n: number) => ({ ref: `#${n}`, href: `https://github.com/feffef/terrarium/issues/${n}` })

describe('middenIssueRefParts', () => {
  it('links a plain #N', () => {
    expect(middenIssueRefParts('closed in #1637 unmerged')).toEqual(['closed in ', ref(1637), ' unmerged'])
  })

  it('links two refs', () => {
    expect(middenIssueRefParts('pull requests #1636 and #1637.')).toEqual(['pull requests ', ref(1636), ' and ', ref(1637), '.'])
  })

  it('links #N at the start or end of a sentence', () => {
    expect(middenIssueRefParts('#12 came first. Then #13')).toEqual([ref(12), ' came first. Then ', ref(13)])
  })

  it.each(['C# and C#7', 'see https://example.com/page#12 or /#3', 'tag #abc and #12abc'])('leaves %s alone', (text) => {
    expect(middenIssueRefParts(text)).toEqual([text])
  })
})
