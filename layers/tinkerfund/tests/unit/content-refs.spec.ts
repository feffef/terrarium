// Cross-Document references `pnpm validate:content` checks for Tinkerfund
// (issue #1366), against a throwaway fixture Space rather than real content.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { validateReferences } from '../../../../scripts/validate-content-refs.ts'
import type { ExpandedCollection } from '../../../../shared/expand.ts'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tinkerfund-refs-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

const COLLECTIONS = ['pages', 'inventors', 'categories', 'comments', 'promotions', 'backer', 'shop']

function collections(): ExpandedCollection[] {
  return COLLECTIONS.map((collection) => ({
    key: `tinkerfund_qa_${collection}`,
    tenant: 'tinkerfund',
    space: 'qa',
    collection,
    include: collection === 'pages' ? '**/*.md' : '*.yml',
    cwdRel: collection,
    ...(collection === 'pages' ? { type: 'page' as const } : { type: 'data' as const, schema: z.object({}) }),
  }))
}

function write(rel: string, text: string): void {
  mkdirSync(dirname(join(dir, rel)), { recursive: true })
  writeFileSync(join(dir, rel), text)
}

function campaignPage(opts: { registry?: string; inventor?: string; category?: string } = {}): string {
  return [
    '---',
    'title: Counterclockwise Mug',
    'campaign:',
    `  registry: ${opts.registry ?? 'TF-0001'}`,
    `  inventor: ${opts.inventor ?? 'ada'}`,
    `  category: ${opts.category ?? 'kitchen'}`,
    '  rewards:',
    '    - id: mug',
    '      options:',
    '        - { id: colour, choices: [{ id: red }, { id: blue }] }',
    '  addons:',
    '    - id: coaster',
    '---',
    'The pitch.',
  ].join('\n')
}

function writeValidSpace(): void {
  write('pages/index.md', '---\ntitle: Home\n---\n')
  write('pages/campaigns/mug.md', campaignPage())
  write('pages/campaigns/mug/updates/1.md', '---\ntitle: We shipped\nupdate: { published: "-1d" }\n---\n')
  write('inventors/ada.yml', 'name: Ada\n')
  write('categories/kitchen.yml', 'name: Kitchen\n')
  write('comments/mug.yml', 'campaign: mug\ncomments: []\n')
  write('promotions/launch.yml', 'title: Launch\ncampaign: mug\n')
  write('promotions/shopwide.yml', 'title: Everything\n')
  write('backer/backer.yml', [
    'pledges:',
    '  - campaign: mug',
    '    lines: [{ reward: mug, options: { colour: red }, quantity: 1 }]',
    '    addons: [{ id: coaster, quantity: 1 }]',
  ].join('\n'))
}

function violations(): string[] {
  return validateReferences(collections(), dir).violations.flatMap((v) => v.messages.map((m) => `${v.file}: ${m}`))
}

describe('Tinkerfund cross-references', () => {
  it('accepts a Space whose references all resolve', () => {
    writeValidSpace()
    expect(violations()).toEqual([])
  })

  it('rejects a Campaign naming an unknown Inventor or category', () => {
    writeValidSpace()
    write('pages/campaigns/mug.md', campaignPage({ inventor: 'nobody', category: 'garage' }))
    expect(violations()).toEqual([
      expect.stringMatching(/campaigns\/mug\.md: campaign\.inventor: "nobody"/),
      expect.stringMatching(/campaigns\/mug\.md: campaign\.category: "garage"/),
    ])
  })

  it('rejects a registry number two Campaigns share', () => {
    writeValidSpace()
    write('pages/campaigns/rock.md', campaignPage())
    expect(violations()).toEqual([expect.stringMatching(/campaigns\/rock\.md: campaign\.registry: "TF-0001" .*mug/)])
  })

  it('rejects a Campaign outside campaigns/, and a campaigns/ page that is not one', () => {
    writeValidSpace()
    write('pages/mug.md', campaignPage({ registry: 'TF-0002' }))
    write('pages/campaigns/about.md', '---\ntitle: About\n---\n')
    expect(violations()).toEqual([
      expect.stringMatching(/campaigns\/about\.md: .*campaign/),
      expect.stringMatching(/pages\/mug\.md: .*campaigns\//),
    ])
  })

  it('rejects an Update of an unknown Campaign, or one with no publish offset', () => {
    writeValidSpace()
    write('pages/campaigns/rock/updates/1.md', '---\ntitle: Orphan\nupdate: { published: "-1d" }\n---\n')
    write('pages/campaigns/mug/updates/2.md', '---\ntitle: Undated\n---\n')
    expect(violations()).toEqual([
      expect.stringMatching(/mug\/updates\/2\.md: .*update/),
      expect.stringMatching(/rock\/updates\/1\.md: .*"rock"/),
    ])
  })

  it('rejects a Promotion or comment thread naming an unknown Campaign', () => {
    writeValidSpace()
    write('promotions/launch.yml', 'title: Launch\ncampaign: rock\n')
    write('comments/mug.yml', 'campaign: rock\ncomments: []\n')
    expect(violations()).toEqual([
      expect.stringMatching(/comments\/mug\.yml: campaign: "rock"/),
      expect.stringMatching(/promotions\/launch\.yml: campaign: "rock"/),
    ])
  })

  it('rejects a past Pledge naming an unknown Campaign, Reward, option or Add-on', () => {
    writeValidSpace()
    write('backer/backer.yml', [
      'pledges:',
      '  - campaign: rock',
      '    lines: []',
      '  - campaign: mug',
      '    lines: [{ reward: cup, quantity: 1 }, { reward: mug, options: { colour: green, size: xl }, quantity: 1 }]',
      '    addons: [{ id: saucer, quantity: 1 }]',
    ].join('\n'))
    expect(violations()).toEqual([
      'backer/backer.yml: pledges.0.campaign: "rock" is not a Campaign in this Space',
      'backer/backer.yml: pledges.1.lines.0.reward: "cup" is not a Reward of "mug"',
      'backer/backer.yml: pledges.1.lines.1.options.colour: "green" is not an option of Reward "mug"',
      'backer/backer.yml: pledges.1.lines.1.options.size: "xl" is not an option of Reward "mug"',
      'backer/backer.yml: pledges.1.addons.0.id: "saucer" is not an Add-on of "mug"',
    ])
  })
})
