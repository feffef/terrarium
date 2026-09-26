// The demo Backer's stored actions (issue #1359): what is kept per Space, and
// the Cart and Pledges they replay to over the baked shop.
import { describe, expect, it } from 'vitest'
import { readTinkerfundActions, reduceTinkerfundActions, writeTinkerfundActions } from '../../app/utils/backer.ts'
import type { TinkerfundAction } from '../../app/utils/backer.ts'
import { baked, HOUR, memoryStorage, NOW, promotion, shop } from './support.ts'

const addMug: TinkerfundAction = { type: 'cart', at: NOW, request: { campaign: 'mug', reward: 'mug', options: {}, quantity: 2 } }

describe('the stored actions', () => {
  it('start empty', () => {
    expect(readTinkerfundActions(memoryStorage(), 'qa')).toEqual([])
  })

  it('keep each Space’s actions apart, under its own key', () => {
    const storage = memoryStorage()
    writeTinkerfundActions(storage, 'qa', [addMug])
    expect(readTinkerfundActions(storage, 'qa')).toEqual([addMug])
    expect(readTinkerfundActions(storage, 'prod')).toEqual([])
    expect(storage.key(0)).toBe('tinkerfund:qa:actions')
  })

  it('read tampered or malformed state as empty', () => {
    for (const raw of ['{', '"cart"', '[{"type":"cart","at":1,"request":{"campaign":"mug","reward":"mug","options":{},"quantity":1.5}}]', '[{"type":"steal"}]']) {
      expect(readTinkerfundActions(memoryStorage({ 'tinkerfund:qa:actions': raw }), 'qa')).toEqual([])
    }
  })
})

describe('replaying the actions', () => {
  const replay = (actions: TinkerfundAction[]) => reduceTinkerfundActions(actions, shop({ baked }))

  it('starts from the baked Pledges, and drops one whose Campaign is gone', () => {
    expect(replay([]).pledges.map((p) => p.ref)).toEqual(['TF-P-0001', 'TF-P-0002', 'TF-P-0003', 'TF-P-0004'])
  })

  it('adds, places, changes and cancels, each at the moment it was taken', () => {
    const state = replay([
      addMug,
      { type: 'place', at: NOW + HOUR, zone: 'europe', payment: 'handshake' },
      { type: 'change', at: NOW + 2 * HOUR, ref: 'TF-P-0006', change: { lines: [{ reward: 'mug', options: {}, quantity: 1 }], addons: [] } },
    ])
    expect(state.cart).toEqual([])
    expect(state.pledges.at(-1)).toEqual({
      ref: 'TF-P-0006', campaign: 'mug', placed: NOW + HOUR, zone: 'europe', payment: 'handshake',
      lines: [{ reward: 'mug', options: {}, quantity: 1 }], addons: [], discount: 0, shipping: 4,
    })
    const cancelled = replay([addMug, { type: 'place', at: NOW, zone: 'domestic', payment: 'handshake' }, { type: 'cancel', at: NOW + HOUR, ref: 'TF-P-0006' }])
    expect(cancelled.pledges.at(-1)!.cancelled).toBe(NOW + HOUR)
  })

  it('skips, quietly, an action the content no longer allows', () => {
    const state = replay([
      { type: 'cart', at: NOW, request: { campaign: 'gone', reward: 'x', options: {}, quantity: 1 } },
      { type: 'change', at: NOW, ref: 'TF-P-0404', change: { lines: [], addons: [], bonus: 5 } },
      { type: 'cancel', at: NOW, ref: 'TF-P-0001' },
      addMug,
    ])
    expect(state.cart).toEqual([{ campaign: 'mug', lines: [{ reward: 'mug', options: {}, quantity: 2 }], addons: [] }])
    expect(state.pledges.find((p) => p.ref === 'TF-P-0001')!.cancelled).toBeUndefined()
  })

  it('places with the code entered at checkout', () => {
    const tenth = promotion({ title: 'Ten percent off everything', code: 'TINKER10', discount: { percent: 10 } })
    const state = reduceTinkerfundActions([addMug, { type: 'place', at: NOW, zone: 'domestic', payment: 'handshake', code: 'TINKER10' }], shop({ promotions: [tenth] }))
    expect(state.pledges[0]).toMatchObject({ ref: 'TF-P-0001', discount: 0.6, shipping: 2 })
  })
})
