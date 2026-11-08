import { describe, expect, it } from 'vitest'
import { networkStartMessage, PROBED_HOSTS, type Reach } from '../../scripts/hooks/network-start.ts'

const proxied = { HTTPS_PROXY: 'http://proxy.invalid:1' }

describe('networkStartMessage', () => {
  it('lists readable and blocked hosts for a mixed result', async () => {
    const probe = async (host: string): Promise<Reach> => (host === 'raw.githubusercontent.com' ? 'readable' : 'blocked')
    const msg = await networkStartMessage(proxied, probe)
    expect(msg).toContain('readable: raw.githubusercontent.com;')
    expect(msg).toContain('blocked: docs.github.com, git-scm.com')
    expect(msg).toContain('docs/agents/environment-caveats.md')
  })

  it('says all hosts are readable when none is blocked or unknown', async () => {
    const msg = await networkStartMessage(proxied, async () => 'readable')
    expect(msg).toBe('Network reach (probed): all probed hosts readable.')
  })

  it('prints nothing without a proxy', async () => {
    let called = false
    const msg = await networkStartMessage({}, async () => {
      called = true
      return 'readable'
    })
    expect(msg).toBeNull()
    expect(called).toBe(false)
  })

  it('counts a thrown probe as unknown and does not throw', async () => {
    const probe = async (host: string): Promise<Reach> => {
      if (host === PROBED_HOSTS[0]) throw new Error('timeout')
      return 'readable'
    }
    const msg = await networkStartMessage(proxied, probe)
    expect(msg).toContain(`unknown: ${PROBED_HOSTS[0]}`)
    expect(msg).not.toContain('blocked:')
  })
})
