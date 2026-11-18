/**
 * Host half of dsh-client-ui-channel-key: the channel's key pool.
 *
 * The button and its editor live in the browser bundle; this module owns the
 * part that has to survive a page reload:
 *
 *   - `GET|POST /api/dsh-channel-key/pool` — read and edit one channel's pool,
 *     and read every key's remaining balance.
 *   - the rotation: when a request is rejected as `AUTH` (the failure the
 *     conversation renders as 「API 密钥无效」), the next key in the pool becomes
 *     the one the channel resolves, and the failed key is skipped for the rest
 *     of the sweep.
 *
 * Two seams carry the rotation, and they compose instead of competing:
 *
 *   1. `agent/request-error` (prepended) claims the `AUTH` failures nobody else
 *      wants to retry, rotates, and asks for one retry itself.
 *   2. `session/event` observes `llm/retry` events other retry plugins decided
 *      (`dsh-llm-route-retry`, the provider policy). Rotating there — before
 *      that retry's delay elapses — makes *their* retry use the next key too,
 *      so a relay-level `AUTH` sweeps the pool instead of hammering one key.
 *
 * The keys themselves never pass through this file: `lib/pool.js` keeps every
 * slot in the credential seam, and the pool document holds only references,
 * order, and failure marks.
 *
 * @module dsh-client-ui-channel-key
 */

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

import { PoolStore } from './lib/pool.js'

/** Cordis plugin name used by Loader diagnostics. */
export const name = 'dsh-client-ui-channel-key'

/** Synthetic retry-policy key; marks the retries this plugin decides itself. */
export const ROTATE_POLICY_KEY = 'channel-key-rotate'

/** Exact route on Connection's shared `/api` channel. */
const ROUTE_PATH = '/api/dsh-channel-key/pool'

/** Pool document, under the harness home beside `.credentials.yaml`. */
const POOL_FILENAME = 'pools.json'

/** Wait before re-issuing a request on the next key. */
const RETRY_DELAY_MS = 300

/** Credential references this route will accept, matching the seam's grammar. */
const REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

/** How long one self-check request may take before it counts as inconclusive. */
const PROBE_TIMEOUT_MS = 15_000

/** The smallest completion worth sending: enough to prove the key can serve. */
const PROBE_PROMPT = 'ping'

/**
 * Walk a settings value along a provider's settings path.
 * @param {unknown} value - the namespace's value.
 * @param {readonly string[]} path - path from the section root to the profile.
 * @returns {unknown} the node, or undefined when the path does not resolve.
 */
function valueAt(value, path) {
  let node = value
  for (const key of path) {
    if (node === null || typeof node !== 'object') return undefined
    node = node[key]
  }
  return node
}

/**
 * Build the minimal chat request that proves one key can serve this route.
 *
 * The key travels only to the endpoint the user's own provider profile names —
 * never to a URL a browser handed over — and the request asks for a single token.
 * @param {{api: string, baseURL: string, model: string}} route - the channel's wire facts.
 * @param {string} key - the key to test.
 * @returns {{url: string, init: object}|undefined} the request, or undefined for a
 *   protocol this build cannot probe.
 */
export function probeRequest(route, key) {
  const base = String(route.baseURL).replace(/\/+$/, '')
  const json = { 'content-type': 'application/json', accept: 'application/json' }
  if (route.api === 'openai-completions') {
    return {
      url: base + '/chat/completions',
      init: {
        method: 'POST',
        headers: { ...json, authorization: 'Bearer ' + key },
        body: JSON.stringify({
          model: route.model,
          messages: [{ role: 'user', content: PROBE_PROMPT }],
          max_tokens: 1,
          stream: false,
        }),
      },
    }
  }
  if (route.api === 'openai-responses') {
    return {
      url: base + '/responses',
      init: {
        method: 'POST',
        headers: { ...json, authorization: 'Bearer ' + key },
        body: JSON.stringify({ model: route.model, input: PROBE_PROMPT, max_output_tokens: 16 }),
      },
    }
  }
  if (route.api === 'anthropic-messages') {
    return {
      url: base + (base.endsWith('/v1') ? '/messages' : '/v1/messages'),
      init: {
        method: 'POST',
        headers: { ...json, 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: route.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: PROBE_PROMPT }],
        }),
      },
    }
  }
  return undefined
}

/**
 * Classify one self-check response.
 *
 * Only a rejected key is a verdict about the key. A wrong model, a missing
 * endpoint, a rate limit, or a relay outage says nothing about it, and marking
 * the key for those would take a working channel out of service.
 * @param {number} status - the HTTP status.
 * @param {string} bodyText - the response body, for the recorded reason.
 * @returns {{ok: true} | {ok: false, code: string, message: string} | {ok: false, message: string}} the verdict.
 */
export function probeVerdict(status, bodyText) {
  const message = typeof bodyText === 'string' ? bodyText.replace(/\s+/g, ' ').trim().slice(0, 160) : ''
  if (status >= 200 && status < 300) return { ok: true }
  if (status === 401 || status === 403) return { ok: false, code: 'AUTH', message: message || 'HTTP ' + String(status) }
  return { ok: false, message: message || 'HTTP ' + String(status) }
}

/** How long one key's balance stays fresh enough to skip a new request. */
const BALANCE_TTL_MS = 60_000

/** How long one balance request may take before it counts as inconclusive. */
const BALANCE_TIMEOUT_MS = 10_000

/**
 * Build the request that asks a gateway for one key's remaining balance.
 *
 * The relay behind an OpenAI-shaped channel serves its own account endpoint
 * beside the API base — `https://host/v1/usage` for a `.../v1` base — and
 * answers with the balance that key's account holds. Only those protocols have
 * it: the key travels in a bearer header, exactly as it already does for a
 * completion, so a browser still never chooses the URL.
 * @param {{api: string, baseURL: string}} route - the channel's wire facts.
 * @param {string} key - the key to look up.
 * @returns {{url: string, init: object}|undefined} the request, or undefined for a
 *   protocol whose gateway has no such endpoint.
 */
export function balanceRequest(route, key) {
  if (route === undefined || route === null) return undefined
  if (route.api !== 'openai-completions' && route.api !== 'openai-responses') return undefined
  const base = String(route.baseURL).replace(/\/+$/, '')
  if (base.length === 0) return undefined
  return {
    url: base + '/usage',
    init: {
      method: 'GET',
      headers: { accept: 'application/json', authorization: 'Bearer ' + key },
    },
  }
}

/**
 * Read one number without accepting strings, `null`, or a NaN.
 * @param {unknown} value - the candidate.
 * @returns {number|undefined} the number, or undefined when it is not one.
 */
function numberOf(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/**
 * Classify one balance response.
 *
 * Only a body carrying a number is a reading. A 404 (a channel with no such
 * endpoint), an HTML page, or JSON without a balance leaves the row unmeasured:
 * guessing a zero would draw a healthy key as an empty one.
 * @param {number} status - the HTTP status.
 * @param {string} bodyText - the response body.
 * @returns {{ok: true, balance: number, unit: string, planName?: string, todayCost?: number, valid: boolean}|{ok: false, message: string}} the reading.
 */
export function parseBalance(status, bodyText) {
  if (status < 200 || status >= 300) return { ok: false, message: 'HTTP ' + String(status) }
  let payload
  try {
    payload = JSON.parse(bodyText)
  } catch {
    return { ok: false, message: 'the balance response is not JSON' }
  }
  if (payload === null || typeof payload !== 'object') {
    return { ok: false, message: 'the balance response is not an object' }
  }
  const balance = numberOf(payload.balance) ?? numberOf(payload.remaining)
  if (balance === undefined) return { ok: false, message: 'the balance response carries no balance' }
  const today = payload.usage !== null && typeof payload.usage === 'object'
    && payload.usage.today !== null && typeof payload.usage.today === 'object'
    ? numberOf(payload.usage.today.actual_cost)
    : undefined
  return {
    ok: true,
    balance,
    unit: typeof payload.unit === 'string' && payload.unit.length > 0 ? payload.unit : 'USD',
    planName: typeof payload.planName === 'string' && payload.planName.length > 0 ? payload.planName : undefined,
    todayCost: today,
    valid: payload.isValid !== false,
  }
}

/**
 * Whether a failure is the `AUTH` class the conversation renders as
 * 「API 密钥无效」. The message is irrelevant: a relay reports an invalid key,
 * a banned channel, or an exhausted balance under the same code, and every one
 * of them means "this key cannot serve, try the next one".
 * @param {unknown} failure - the terminal failure the adapter reported.
 * @returns {boolean} true when the pool should rotate.
 */
export function isAuthFailure(failure) {
  return failure !== null && typeof failure === 'object' && failure.code === 'AUTH'
}

/**
 * The reason stored with a rejected key, taken from the failure that rejected it.
 * @param {unknown} failure - the terminal failure the adapter reported.
 * @returns {{code?: string, message?: string}} the verdict to persist.
 */
export function reasonOf(failure) {
  if (failure === null || typeof failure !== 'object') return {}
  return {
    ...typeof failure.code === 'string' && failure.code.length > 0 ? { code: failure.code } : {},
    ...typeof failure.message === 'string' && failure.message.length > 0 ? { message: failure.message } : {},
  }
}

/**
 * Whether an `llm/retry` event means the retrying attempt must use another key.
 * @param {unknown} data - the event's data.
 * @returns {boolean} true for an `AUTH` retry this plugin did not decide itself.
 */
export function rotationOfRetry(data) {
  if (data === null || typeof data !== 'object') return false
  if (data.policyKey === ROTATE_POLICY_KEY) return false
  if (typeof data.provider !== 'string' || data.provider.length === 0) return false
  return isAuthFailure(data.failure)
}

/**
 * Spend one rotation from this step's budget.
 *
 * A step starts on one key, so a pool of `size` keys can serve at most `size - 1`
 * of *our* retries. Without this, the sweep's rewind would let two dead keys
 * hand the request back and forth forever.
 * @param {Map<string, number>} attempts - rotations already spent, keyed by step.
 * @param {string} key - this step's identity.
 * @param {number} size - keys in the pool.
 * @returns {boolean} true when this failure may rotate.
 */
export function spendRotation(attempts, key, size) {
  if (!Number.isSafeInteger(size) || size < 2) return false
  const spent = attempts.get(key) ?? 0
  if (spent >= size - 1) return false
  attempts.set(key, spent + 1)
  return true
}

/** The harness home this Host writes its pool document under. */
function harnessHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

/** Absolute path of the pool document. */
function poolPath() {
  return join(harnessHome(), '.dsh-channel-key', POOL_FILENAME)
}

/** Read the pool document; an absent file is an empty one. */
async function readPoolText() {
  try {
    return await readFile(poolPath(), 'utf8')
  } catch (error) {
    if (error !== null && typeof error === 'object' && error.code === 'ENOENT') return undefined
    throw error
  }
}

/**
 * Replace the pool document atomically: a crash mid-write must never leave the
 * host reading half a document.
 * @param {string} text - the new contents.
 */
async function writePoolText(text) {
  const file = poolPath()
  await mkdir(dirname(file), { recursive: true })
  const temporary = file + '.' + String(process.pid) + '.tmp'
  await writeFile(temporary, text, { mode: 0o600 })
  await rename(temporary, file)
}

/** Wait for `delayMs`, or give up when the turn aborts. */
function cancellableDelay(delayMs, signal) {
  if (signal !== undefined && signal.aborted) return Promise.resolve(false)
  if (delayMs <= 0) return Promise.resolve(true)
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      if (signal !== undefined) signal.removeEventListener('abort', onAbort)
      resolve(true)
    }, delayMs)
    function onAbort() {
      clearTimeout(timer)
      resolve(false)
    }
    if (signal !== undefined) signal.addEventListener('abort', onAbort, { once: true })
  })
}

/** JSON response helper. */
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/** Validate the (provider, ref) pair both route methods need. */
function channelOf(value) {
  const provider = value !== null && typeof value === 'object' ? value.provider : undefined
  const ref = value !== null && typeof value === 'object' ? value.ref : undefined
  if (typeof provider !== 'string' || provider.length === 0) return { error: 'provider is required' }
  if (typeof ref !== 'string' || !REF_PATTERN.test(ref)) return { error: 'ref must be a credential reference name' }
  return { provider, ref }
}

/**
 * Mount the pool editor route and the rotation.
 * @param {object} ctx - host plugin context.
 */
export function apply(ctx) {
  ctx.inject(['credentials'], scope => {
    const credentials = scope.credentials
    const store = new PoolStore({
      read: readPoolText,
      write: writePoolText,
      credentials,
    })

    /** Rotate, reporting rather than throwing: a rotation failure must not fail the request. */
    const rotate = async (provider, canSpend, reason) => {
      try {
        return await store.rotate(provider, canSpend, reason)
      } catch (error) {
        ctx.logger.warn('channel-key: could not rotate the key pool for "%s": %s', provider, String(error))
        return undefined
      }
    }

    /** Rotations this Host has spent, keyed by `session|turn|step`. */
    const attempts = new Map()

    /**
     * This Host's own retry chain per `session|turn|step`.
     *
     * The session format allows exactly one retry chain per (turn, step,
     * provider, policyKey): its `retry` counter must climb 1, 2, 3, … and every
     * row of that chain must carry the same `retryId`. A fresh id per rotation
     * made a re-opened session fail validation with "llm/retry skips its policy
     * attempt sequence", so the chain identity is kept per step instead.
     */
    const chains = new Map()

    // Give every retry another plugin decides a fresh key before it fires. The
    // retry's own delay is what makes this land in time; when it is zero the
    // rotation still reaches the attempt after it. `global` so a subtask's own
    // isolate rotates the same shared credential.
    scope.on('session/event', (session, event) => {
      if (event === null || typeof event !== 'object' || event.type !== 'llm/retry') return
      if (!rotationOfRetry(event.data)) return
      void rotate(event.data.provider, undefined, reasonOf(event.data.failure))
    }, { global: true })

    /**
     * Claim an `AUTH` failure no one would retry: rotate and ask for one retry.
     * Anything else — a single-key channel, a provider with no pool — falls
     * through to the retry plugins untouched.
     */
    scope.on('agent/request-error', async (payload, next) => {
      if (!isAuthFailure(payload.failure)) return next()
      const provider = payload.provider
      if (typeof provider !== 'string' || provider.length === 0) return next()
      const session = payload.agent === undefined ? undefined : payload.agent.session
      const sessionId = session === undefined ? '' : String(session.id)
      if (attempts.size > 512) attempts.clear()
      const budgetKey = sessionId + '|' + String(payload.turn) + '|' + String(payload.step)
      const moved = await rotate(provider, size => spendRotation(attempts, budgetKey, size), reasonOf(payload.failure))
      if (moved === undefined) return next()
      if (chains.size > 512) chains.clear()
      let chain = chains.get(budgetKey)
      if (chain === undefined) {
        chain = { retryId: randomUUID(), attempt: 0 }
        chains.set(budgetKey, chain)
      }
      chain.attempt += 1
      const retryId = chain.retryId
      const attempt = chain.attempt
      try {
        payload.agent.session.append('llm/retry', {
          retryId,
          turn: payload.turn,
          step: payload.step,
          provider,
          mode: 'normal',
          policyKey: ROTATE_POLICY_KEY,
          retry: attempt,
          maxRetries: Math.max(attempt, moved.size - 1),
          delayMs: RETRY_DELAY_MS,
          failure: payload.failure,
        })
      } catch (error) {
        ctx.logger.warn('channel-key: could not record the rotation retry; failing the request: %s', String(error))
        return undefined
      }
      if (!await cancellableDelay(RETRY_DELAY_MS, payload.signal)) return undefined
      try {
        payload.agent.session.append('llm/retry-started', {
          retryId,
          turn: payload.turn,
          step: payload.step,
          retry: attempt,
        })
      } catch {
        /* The row is cosmetic; the retry itself is already decided. */
      }
      return { kind: 'retry' }
    }, { prepend: true, global: true })

    /**
     * The wire facts a self-check needs for one channel, read from the user's own
     * provider profile. A browser never supplies this: the key would otherwise be
     * posted to whatever URL a page named.
     * @param {string} provider - the model channel's route key.
     * @returns {{api: string, baseURL: string, model: string}|undefined} the route, or
     *   undefined when the profile cannot answer.
     */
    const routeOf = provider => {
      const llm = ctx.get('llm')
      const settings = ctx.get('settings')
      if (llm === undefined || settings === undefined) return undefined
      const entry = llm.listConfigurableProviders().find(row => row.provider === provider)
      if (entry === undefined) return undefined
      const descriptor = settings.describe().find(row => row.ns === entry.settingsNs)
      if (descriptor === undefined) return undefined
      const profile = valueAt(descriptor.value, entry.settingsPath)
      if (profile === null || typeof profile !== 'object') return undefined
      const api = typeof profile.api === 'string' && profile.api.length > 0 ? profile.api : 'openai-completions'
      const configured = typeof profile.baseURL === 'string' && profile.baseURL.length > 0 ? profile.baseURL : undefined
      const baseURL = configured ?? entry.defaultBaseURL
      const models = Array.isArray(profile.models) ? profile.models : []
      const first = models[0]
      const model = first !== null && typeof first === 'object' && typeof first.id === 'string' ? first.id : undefined
      if (typeof baseURL !== 'string' || baseURL.length === 0 || model === undefined) return undefined
      return { api, baseURL, model }
    }

    /**
     * Check every key in the pool with one minimal request each, and record the
     * verdicts. Requests run together: the pool is small and a serial sweep would
     * make the button feel broken.
     * @param {string} provider - the model channel's route key.
     * @returns {Promise<{pool: object, results: object[]}>} the new view and the raw verdicts.
     */
    const probe = async provider => {
      const pool = await store.slots(provider)
      if (pool.slots.length === 0) throw new Error('this channel has no key to check yet')
      const route = routeOf(provider)
      if (route === undefined) {
        throw new Error('could not read this channel\'s endpoint and model from the settings')
      }
      if (probeRequest(route, 'probe') === undefined) {
        throw new Error('self-check does not support the "' + route.api + '" protocol')
      }
      const results = await Promise.all(pool.slots.map(async entry => {
        const key = await credentials.resolve(entry.ref)
        if (key === undefined || key.value.length === 0) {
          return { slot: entry.slot, ok: false, message: 'the stored key is missing' }
        }
        const built = probeRequest(route, key.value)
        try {
          const response = await fetch(built.url, { ...built.init, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) })
          const text = await response.text().catch(() => '')
          return { slot: entry.slot, ...probeVerdict(response.status, text) }
        } catch (error) {
          return { slot: entry.slot, ok: false, message: error instanceof Error ? error.message : String(error) }
        }
      }))
      return { pool: await store.applyProbe(provider, results), results }
    }

    /** Balance readings this Host has already paid a request for, keyed `provider|slot`. */
    const balancesSeen = new Map()

    /**
     * Read one slot's balance, reusing a reading younger than the cache window.
     * @param {string} provider - the model channel's route key.
     * @param {{slot: number, ref: string}} entry - one pool slot.
     * @param {object|undefined} route - the channel's wire facts.
     * @param {boolean} force - true to ignore the cache (an explicit refresh).
     * @returns {Promise<object>} one result row for the card.
     */
    const balanceOfSlot = async (provider, entry, route, force) => {
      const cacheKey = provider + '|' + String(entry.slot)
      const cached = balancesSeen.get(cacheKey)
      if (force !== true && cached !== undefined && Date.now() - cached.at < BALANCE_TTL_MS) return cached.value
      if (route === undefined) return { slot: entry.slot, ok: false, message: 'could not read this channel\'s endpoint from the settings' }
      const key = await credentials.resolve(entry.ref)
      if (key === undefined || key.value.length === 0) {
        return { slot: entry.slot, ok: false, message: 'the stored key is missing' }
      }
      const built = balanceRequest(route, key.value)
      if (built === undefined) {
        return { slot: entry.slot, ok: false, message: 'this channel\'s protocol has no balance endpoint' }
      }
      try {
        const response = await fetch(built.url, { ...built.init, signal: AbortSignal.timeout(BALANCE_TIMEOUT_MS) })
        const text = await response.text().catch(() => '')
        const value = { slot: entry.slot, ...parseBalance(response.status, text) }
        balancesSeen.set(cacheKey, { at: Date.now(), value })
        return value
      } catch (error) {
        return { slot: entry.slot, ok: false, message: error instanceof Error ? error.message : String(error) }
      }
    }

    /**
     * Read every key's balance, together: the pool is small and a serial sweep
     * would leave the card half filled for seconds.
     * @param {string} provider - the model channel's route key.
     * @param {boolean} force - true to bypass the cache.
     * @returns {Promise<{results: object[], at: number}>} one row per slot.
     */
    const balances = async (provider, force) => {
      const pool = await store.slots(provider)
      if (pool.slots.length === 0) return { results: [], at: Date.now() }
      const route = routeOf(provider)
      const results = await Promise.all(pool.slots.map(entry => balanceOfSlot(provider, entry, route, force)))
      return { results, at: Date.now() }
    }

    // One store for both halves of this plugin: the route's edits and the
    // rotation must queue behind each other, or a save racing a failed request
    // could leave the channel pointing at a slot the user just removed.
    scope.inject(['connection'], own => {      const registry = own.connection === undefined ? undefined : own.connection.fetch
      if (registry === undefined || typeof registry.register !== 'function') return

      registry.register({
        path: ROUTE_PATH,
        methods: ['GET', 'POST'],
        requestBody: 'buffered',
        fetch: async request => {
          try {
            if (request.method === 'GET') {
              const url = new URL(request.url)
              const channel = channelOf({
                provider: url.searchParams.get('provider'),
                ref: url.searchParams.get('ref'),
              })
              if (channel.error !== undefined) return json(400, { ok: false, error: { message: channel.error } })
              return json(200, { ok: true, pool: await store.view(channel.provider, channel.ref) })
            }
            const body = await request.json()
            const channel = channelOf(body)
            if (channel.error !== undefined) return json(400, { ok: false, error: { message: channel.error } })
            if (body.op === 'probe') {
              const outcome = await probe(channel.provider)
              return json(200, { ok: true, pool: outcome.pool, probe: { results: outcome.results } })
            }
            if (body.op === 'balance') {
              return json(200, { ok: true, balance: await balances(channel.provider, body.refresh === true) })
            }
            return json(200, { ok: true, pool: await store.applyOp(channel.provider, channel.ref, body) })
          } catch (error) {
            ctx.logger.warn('channel-key: key pool route failed: %s', String(error))
            return json(500, { ok: false, error: { message: error instanceof Error ? error.message : String(error) } })
          }
        },
      })
    })
  })
}
