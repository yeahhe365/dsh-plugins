/**
 * Host half of dsh-client-ui-channel-key: the channel's key pool.
 *
 * The button and its editor live in the browser bundle; this module owns the
 * part that has to survive a page reload:
 *
 *   - `GET|POST /api/dsh-channel-key/pool` — read and edit one channel's pool.
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
    const store = new PoolStore({
      read: readPoolText,
      write: writePoolText,
      credentials: scope.credentials,
    })

    /** Rotate, reporting rather than throwing: a rotation failure must not fail the request. */
    const rotate = async (provider, canSpend) => {
      try {
        return await store.rotate(provider, canSpend)
      } catch (error) {
        ctx.logger.warn('channel-key: could not rotate the key pool for "%s": %s', provider, String(error))
        return undefined
      }
    }

    /** Rotations this Host has spent, keyed by `session|turn|step`. */
    const attempts = new Map()

    // Give every retry another plugin decides a fresh key before it fires. The
    // retry's own delay is what makes this land in time; when it is zero the
    // rotation still reaches the attempt after it. `global` so a subtask's own
    // isolate rotates the same shared credential.
    scope.on('session/event', (session, event) => {
      if (event === null || typeof event !== 'object' || event.type !== 'llm/retry') return
      if (!rotationOfRetry(event.data)) return
      void rotate(event.data.provider)
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
      const moved = await rotate(provider, size => spendRotation(attempts, budgetKey, size))
      if (moved === undefined) return next()
      const retryId = randomUUID()
      const attempt = 1
      try {
        payload.agent.session.append('llm/retry', {
          retryId,
          turn: payload.turn,
          step: payload.step,
          provider,
          mode: 'normal',
          policyKey: ROTATE_POLICY_KEY,
          retry: attempt,
          maxRetries: moved.size - 1,
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

    // One store for both halves of this plugin: the route's edits and the
    // rotation must queue behind each other, or a save racing a failed request
    // could leave the channel pointing at a slot the user just removed.
    scope.inject(['connection'], own => {
      const registry = own.connection === undefined ? undefined : own.connection.fetch
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
