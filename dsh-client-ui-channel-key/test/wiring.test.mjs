/**
 * Wiring test: `apply()` against a fake Host, with the real route and the real
 * rotation handlers. This is the part unit tests of `lib/pool.js` cannot reach —
 * whether the route answers, whether an `AUTH` failure rotates and asks for a
 * retry, whether the step budget stops the sweep, and whether the pool document
 * under the harness home stays free of secrets.
 *
 * Run: node --test test/wiring.test.mjs
 */
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, beforeEach, test } from 'node:test'

import { apply } from '../index.js'

const home = mkdtempSync(join(tmpdir(), 'channel-key-'))
const previousHome = process.env.DSH_HOME
process.env.DSH_HOME = home

/** Every test starts from an empty pool document. */
beforeEach(() => {
  rmSync(join(home, '.dsh-channel-key'), { recursive: true, force: true })
})

after(() => {
  if (previousHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = previousHome
  rmSync(home, { recursive: true, force: true })
})

/** An in-memory credential seam. */
function fakeCredentials(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    values,
    async resolve(ref) {
      const value = values.get(ref)
      return value === undefined ? undefined : { value, source: 'file' }
    },
    async describe(ref) {
      const value = values.get(ref)
      return value === undefined
        ? { configured: false, writable: true }
        : { configured: true, writable: true, masked: '••••' + value.slice(-4) }
    },
    async set(ref, value) { values.set(ref, value) },
    async unset(ref) { values.delete(ref) },
  }
}

/**
 * A Cordis-shaped context: services resolve immediately, `inject` hands the
 * ready ones to its callback, and listeners are captured for the test to fire.
 */
function fakeHost(services) {
  const routes = []
  const listeners = new Map()
  const make = available => Object.assign({
    logger: { warn() {}, debug() {}, info() {} },
    get: name => available[name],
    inject(names, callback) {
      // The child context keeps the whole service map, exactly as Cordis scopes do.
      callback(make(available))
    },
    on(name, listener) {
      const list = listeners.get(name) ?? []
      list.push(listener)
      listeners.set(name, list)
      return () => {}
    },
  }, available)
  const ctx = make(services)
  return { ctx, routes, listeners }
}

/** A Host with a credential seam and a Connection fetch registry. */
function boot(credentials, extra = {}) {
  const host = fakeHost({
    credentials,
    connection: { fetch: { register(route) { host.routes.push(route); return async () => {} } } },
    ...extra,
  })
  apply(host.ctx)
  return host
}

/** A settings/llm pair describing one openai-compatible route. */
function channelServices(overrides = {}) {
  const profile = {
    api: 'openai-completions',
    baseURL: 'https://relay.test/v1',
    models: [{ id: 'deepseek-v4.1-flash' }],
    ...overrides,
  }
  return {
    llm: {
      listConfigurableProviders: () => [{
        provider: 'kk',
        displayName: 'KK',
        settingsNs: 'llm-pi-ai',
        settingsPath: ['providers', 'kk'],
        defaultBaseURL: 'https://relay.test/v1',
      }],
    },
    settings: {
      describe: () => [{ ns: 'llm-pi-ai', revision: 1, value: { providers: { kk: profile } } }],
    },
  }
}

/** A request against the pool route. */
function poolUrl(provider = 'kk', ref = 'KK_API_KEY') {
  return 'http://127.0.0.1/api/dsh-channel-key/pool?provider=' + encodeURIComponent(provider) + '&ref=' + encodeURIComponent(ref)
}

/** One `agent/request-error` payload. */
function failurePayload(code, appended) {
  return {
    provider: 'kk',
    turn: 1,
    step: 1,
    failure: { code, message: 'API 密钥无效' },
    signal: undefined,
    agent: { session: { id: 's1', append: (type, data) => appended.push([type, data]) } },
  }
}

test('the route reads a pool and imports the existing key', async () => {
  const credentials = fakeCredentials({ KK_API_KEY: 'sk-first-0001' })
  const { routes } = boot(credentials)
  assert.equal(routes.length, 1, 'the pool route is registered')

  const response = await routes[0].fetch(new Request(poolUrl()))
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.pool.ref, 'KK_API_KEY')
  assert.equal(body.pool.active, 1)
  assert.equal(body.pool.entries.length, 1)
  assert.equal(body.pool.entries[0].masked, '••••0001')
})

test('the route appends keys and rejects a malformed reference', async () => {
  const credentials = fakeCredentials({ KK_API_KEY: 'sk-first-0001' })
  const { routes } = boot(credentials)

  const response = await routes[0].fetch(new Request(poolUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'kk', ref: 'KK_API_KEY', op: 'add', keys: ['sk-second-0002'] }),
  }))
  const body = await response.json()
  assert.equal(body.ok, true)
  assert.deepEqual(body.pool.entries.map(entry => entry.slot).join(','), '1,2')

  const refused = await routes[0].fetch(new Request(poolUrl('kk', 'not a ref')))
  assert.equal(refused.status, 400)
})

test('an AUTH failure rotates the key and asks for one retry', async () => {
  const credentials = fakeCredentials({ KK_API_KEY: 'sk-first-0001' })
  const { routes, listeners } = boot(credentials)
  await routes[0].fetch(new Request(poolUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'kk', ref: 'KK_API_KEY', op: 'add', keys: ['sk-second-0002'] }),
  }))

  const appended = []
  const handler = listeners.get('agent/request-error')[0]
  const decision = await handler(failurePayload('AUTH', appended), async () => 'downstream')

  assert.equal(decision.kind, 'retry')
  assert.equal(credentials.values.get('KK_API_KEY'), 'sk-second-0002', 'the retry resolves the next key')
  assert.equal(appended[0][0], 'llm/retry', 'the conversation shows the retry')
  assert.equal(appended[0][1].policyKey, 'channel-key-rotate')
})

test('the step budget stops the sweep and hands the failure on', async () => {
  const credentials = fakeCredentials({ KK_API_KEY: 'sk-first-0001' })
  const { routes, listeners } = boot(credentials)
  await routes[0].fetch(new Request(poolUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'kk', ref: 'KK_API_KEY', op: 'add', keys: ['sk-second-0002'] }),
  }))

  const handler = listeners.get('agent/request-error')[0]
  const appended = []
  assert.equal((await handler(failurePayload('AUTH', appended), async () => 'downstream')).kind, 'retry')
  // Two keys: one retry is ours, so the next failure in the same step falls through.
  assert.equal(await handler(failurePayload('AUTH', appended), async () => 'downstream'), 'downstream')
})

test('a non-AUTH failure is never claimed', async () => {
  const credentials = fakeCredentials({ KK_API_KEY: 'sk-first-0001' })
  const { listeners } = boot(credentials)
  const handler = listeners.get('agent/request-error')[0]
  const appended = []
  assert.equal(await handler(failurePayload('SERVER', appended), async () => 'downstream'), 'downstream')
  assert.equal(appended.length, 0)
})

test('the pool document holds references and marks, never a key', async () => {
  const credentials = fakeCredentials({ KK_API_KEY: 'sk-first-0001' })
  const { routes } = boot(credentials)
  await routes[0].fetch(new Request(poolUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'kk', ref: 'KK_API_KEY', op: 'add', keys: ['sk-second-0002'] }),
  }))

  const file = join(home, '.dsh-channel-key', 'pools.json')
  assert.ok(existsSync(file), 'the pool document exists')
  const text = readFileSync(file, 'utf8')
  assert.ok(text.includes('KK_API_KEY'))
  assert.ok(!text.includes('sk-first') && !text.includes('sk-second'), 'no key value reaches the document')
})

test('a balance lookup reads every key, caches it, and re-reads on refresh', async () => {
  const credentials = fakeCredentials({ KK_API_KEY: 'sk-first-0001' })
  const { routes } = boot(credentials, channelServices())
  await routes[0].fetch(new Request(poolUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'kk', ref: 'KK_API_KEY', op: 'add', keys: ['sk-second-0002'] }),
  }))

  const seen = []
  const original = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    seen.push({ url: String(url), init })
    const key = String(init.headers.authorization).replace('Bearer ', '')
    const balance = key === 'sk-first-0001' ? 4.85 : 0.1
    return new Response(JSON.stringify({
      balance,
      unit: 'USD',
      planName: '钱包余额',
      isValid: true,
      usage: { today: { actual_cost: 0.5 } },
    }), { status: 200 })
  }

  const askBalance = () => routes[0].fetch(new Request(poolUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'kk', ref: 'KK_API_KEY', op: 'balance' }),
  }))

  try {
    const response = await askBalance()
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.ok, true)
    assert.equal(body.balance.results.length, 2)
    assert.equal(body.balance.results[0].balance, 4.85)
    assert.equal(body.balance.results[1].balance, 0.1)
    assert.equal(body.balance.results[0].planName, '钱包余额')

    // The key travelled to the channel's own endpoint only.
    assert.equal(seen.length, 2)
    assert.equal(seen[0].url, 'https://relay.test/v1/usage')
    assert.equal(seen[0].init.headers.authorization, 'Bearer sk-first-0001')

    // A second read inside the cache window costs no request.
    await askBalance()
    assert.equal(seen.length, 2, 'a fresh reading is reused')

    // An explicit refresh bypasses the cache.
    await routes[0].fetch(new Request(poolUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'kk', ref: 'KK_API_KEY', op: 'balance', refresh: true }),
    }))
    assert.equal(seen.length, 4, 'refresh reads the gateway again')
  } finally {
    globalThis.fetch = original
  }
})

test('a balance lookup reports a channel whose gateway has no endpoint', async () => {
  const credentials = fakeCredentials({ KK_API_KEY: 'sk-first-0001' })
  const { routes } = boot(credentials, channelServices({ api: 'anthropic-messages' }))
  await routes[0].fetch(new Request(poolUrl()))
  const response = await routes[0].fetch(new Request(poolUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'kk', ref: 'KK_API_KEY', op: 'balance' }),
  }))
  const body = await response.json()
  assert.equal(body.ok, true)
  assert.equal(body.balance.results.length, 1)
  assert.equal(body.balance.results[0].ok, false)
  assert.match(body.balance.results[0].message, /no balance endpoint/)
})

test('a self-check probes every key and records the verdicts', async () => {
  const credentials = fakeCredentials({ KK_API_KEY: 'sk-good-0001' })
  const { routes } = boot(credentials, channelServices())
  await routes[0].fetch(new Request(poolUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'kk', ref: 'KK_API_KEY', op: 'add', keys: ['sk-bad-0002'] }),
  }))

  const seen = []
  const original = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    seen.push({ url: String(url), init })
    const key = String(init.headers.authorization).replace('Bearer ', '')
    return key === 'sk-bad-0002'
      ? new Response('{"error":{"message":"invalid token"}}', { status: 401 })
      : new Response('{"choices":[]}', { status: 200 })
  }
  try {
    const response = await routes[0].fetch(new Request(poolUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'kk', ref: 'KK_API_KEY', op: 'probe' }),
    }))
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.ok, true)
    assert.equal(body.probe.results.length, 2)
    assert.equal(body.pool.entries[0].invalidAt, undefined, 'the working key stays usable')
    assert.equal(body.pool.entries[1].code, 'AUTH', 'the rejected key is marked')
    assert.match(body.pool.entries[1].message, /invalid token/)

    // The key travelled to the configured endpoint only, in a one-token request.
    assert.equal(seen.length, 2)
    assert.equal(seen[0].url, 'https://relay.test/v1/chat/completions')
    assert.equal(JSON.parse(seen[0].init.body).max_tokens, 1)
  } finally {
    globalThis.fetch = original
  }
})
