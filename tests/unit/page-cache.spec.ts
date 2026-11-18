// The ADR-0028 page cache must stay size-bounded however many distinct URLs
// are requested (issue #1446). Drives the exact unstorage driver Nitro mounts,
// with the options from the real nuxt.config.ts.
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, it, vi } from 'vitest'

async function loadConfig() {
  vi.stubGlobal('defineNuxtConfig', (c: unknown) => c)
  // A computed specifier keeps nuxt.config.ts (Nuxt-typed) out of the node tsconfig program.
  const { default: config } = await import(pathToFileURL(resolve('nuxt.config.ts')).href)
  return config
}

async function nitroCacheMount() {
  return (await loadConfig()).nitro.storage.cache
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

// In dev the cache would hold an edited page for its maxAge, hiding content edits.
it('turns off every Platform page-cache rule in development', async () => {
  const config = await loadConfig()
  const off = Object.fromEntries(Object.keys(config.routeRules).map(route => [route, { cache: false }]))
  expect(off).not.toEqual({})
  expect(config.$development.routeRules).toEqual(off)
})
