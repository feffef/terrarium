// The ADR-0028 page cache must stay size-bounded however many distinct URLs
// are requested (issue #1446). Drives the exact unstorage driver Nitro mounts,
// with the options from the real nuxt.config.ts.
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, it, vi } from 'vitest'

async function nitroCacheMount() {
  vi.stubGlobal('defineNuxtConfig', (c: unknown) => c)
  const { default: config } = await import('../../nuxt.config')
  return config.nitro!.storage!.cache!
}

async function nitroDriver(name: string) {
  let req = createRequire(pathToFileURL(resolve('package.json')))
  for (const pkg of ['nuxt', '@nuxt/nitro-server', 'nitropack']) {
    req = createRequire(req.resolve(`${pkg}/package.json`))
  }
  const mod = await import(pathToFileURL(req.resolve(`unstorage/drivers/${name}`)).href)
  return mod.default.default ?? mod.default
}

it('evicts least-recently-used page entries beyond the configured cap', async () => {
  const mount = await nitroCacheMount()
  const storage = (await nitroDriver(mount.driver))(mount)
  const cap = mount.max as number
  expect(cap).toBe(200)

  await storage.setItem('nitro:routes:/t/blog/current:first.json', '{}')
  for (let i = 0; i < cap + 50; i++) {
    await storage.setItem(`nitro:routes:/t/blog/current?junk=${i}.json`, '{}')
  }

  expect((await storage.getKeys()).length).toBe(cap)
  expect(await storage.hasItem('nitro:routes:/t/blog/current:first.json')).toBe(false)
})
