/**
 * dsh-llm-route-retry — host half.
 *
 * The bundled provider adapters classify a rejected request by status first:
 * `403`/`401` become `AUTH` before anyone looks at the body. On a pooled relay
 * (new-api / kakou) that is the wrong reading — `403 INSUFFICIENT_BALANCE` and
 * `401 USER_INACTIVE` describe *the channel this one request landed on*, not
 * the account. The next request may be routed to a funded channel and succeed,
 * which is exactly what a manual re-send does.
 *
 * `AUTH` is deliberately outside every `retryableCodes` list, so `llm-retry`
 * never spends an attempt on those failures. This plugin prepends a listener on
 * the same `agent/request-error` waterfall and takes over just that class:
 *
 *   - it fires only for `AUTH` failures whose text carries a route marker
 *     (`INSUFFICIENT_BALANCE`, `USER_INACTIVE`, …), so a genuinely malformed or
 *     revoked credential still fails immediately;
 *   - it keeps its own small, durable budget (`maxAttempts`, default 4) instead
 *     of the provider's 30, because a dead account must not pin the turn for
 *     ten minutes of backoff;
 *   - it emits the standard `llm/retry` / `llm/retry-started` events, so the
 *     conversation renders the usual "模型请求重试" row and the streaming state
 *     resets exactly as it does for provider-policy retries.
 *
 * Everything else — the provider's own policy, its retryable codes, its
 * counters — is untouched: when this plugin does not claim a failure it simply
 * calls `next()`, and `llm-retry` decides as before.
 *
 * @module dsh-llm-route-retry
 */

import { randomUUID } from 'node:crypto'

/** Cordis plugin name used by Loader diagnostics. */
export const name = 'dsh-llm-route-retry'

/** Services the listener and its projection need. */
export const inject = ['agents', 'sessionProjections']

/** Synthetic policy key: keeps this budget out of the provider policy's own key space. */
const POLICY_KEY = 'route-unavailable'

/** Projection key that durably remembers how many route attempts this step spent. */
const PROJECTION_KEY = 'llmRouteRetry'

/**
 * Failure text that marks a per-request route problem rather than a dead
 * credential. Matched case-insensitively against `failure.message`.
 */
const DEFAULT_PATTERNS = Object.freeze([
  // new-api / kakou: the channel behind this request has no balance left.
  'INSUFFICIENT_BALANCE',
  // new-api: the key in this request's channel is disabled, expired, or parked.
  'USER_INACTIVE',
  // new-api: the channel group is out of usable accounts right now.
  'no usable account',
])

/** Attempts before the failure is handed back to the caller unchanged. */
const DEFAULT_MAX_ATTEMPTS = 4

/** First wait; each attempt doubles it up to `maxDelayMs`. */
const DEFAULT_INITIAL_DELAY_MS = 1_500

/** Ceiling for one wait, so a dead route cannot stall a turn for minutes. */
const DEFAULT_MAX_DELAY_MS = 8_000

/** Symmetric jitter, as a fraction of the computed delay. */
const DEFAULT_JITTER_RATIO = 0.2

/**
 * Validate one raw plugin config value.
 * @param raw - the value from the profile's patch layer; omitted means defaults.
 * @returns the effective options; never throws on unknown keys so an older or
 *   newer profile layer stays loadable.
 */
export function resolveOptions(raw) {
  const config = raw !== null && typeof raw === 'object' ? raw : {}
  const pick = (value, fallback) => (Number.isFinite(value) ? value : fallback)

  const attempts = Math.floor(pick(config.maxAttempts, DEFAULT_MAX_ATTEMPTS))
  const initial = pick(config.initialDelayMs, DEFAULT_INITIAL_DELAY_MS)
  const ceiling = pick(config.maxDelayMs, DEFAULT_MAX_DELAY_MS)
  const jitter = pick(config.jitterRatio, DEFAULT_JITTER_RATIO)

  // Normalize the delays as a pair: a non-positive start falls back to the
  // default, and the ceiling never sits below the start.
  const initialDelayMs = initial <= 0 ? DEFAULT_INITIAL_DELAY_MS : initial
  const maxDelayMs = ceiling < initialDelayMs ? initialDelayMs : ceiling

  const patterns = Array.isArray(config.patterns) && config.patterns.length > 0
    ? config.patterns
        .filter(marker => typeof marker === 'string')
        .map(marker => marker.trim())
        .filter(marker => marker.length > 0)
    : DEFAULT_PATTERNS
  const effectivePatterns = patterns.length > 0 ? patterns : DEFAULT_PATTERNS

  return {
    maxAttempts: attempts < 0 ? 0 : attempts,
    initialDelayMs,
    maxDelayMs,
    jitterRatio: jitter < 0 ? 0 : jitter > 1 ? 1 : jitter,
    patterns: Object.freeze([...effectivePatterns]),
  }
}

/**
 * Decide whether a failure is a route/channel problem wearing an `AUTH` label.
 * Non-`AUTH` codes are never claimed: those keep their provider-policy
 * treatment (`RATE_LIMIT`, `SERVER`, …) or their designed no-retry outcome
 * (`INVALID_REQUEST`, `CONTEXT_WINDOW_EXCEEDED`, …).
 * @param failure - the terminal failure the adapter reported.
 * @param patterns - case-insensitive markers that identify a pooled route.
 * @returns true when this plugin should spend an attempt on the failure.
 */
export function isRouteUnavailable(failure, patterns = DEFAULT_PATTERNS) {
  if (failure === null || typeof failure !== 'object') return false
  if (failure.code !== 'AUTH') return false
  const message = typeof failure.message === 'string' ? failure.message.toLowerCase() : ''
  if (message === '') return false
  return patterns.some(marker => message.includes(marker.toLowerCase()))
}

/**
 * Exponential backoff with symmetric jitter, clamped to the ceiling.
 * @param options - resolved plugin options.
 * @param attempt - 1-based attempt number being waited for.
 * @param random - uniform source in [0, 1).
 * @returns the wait in milliseconds.
 */
export function localDelay(options, attempt, random = Math.random) {
  const exponent = Math.min(attempt - 1, 30)
  const exponential = Math.min(options.initialDelayMs * 2 ** exponent, options.maxDelayMs)
  const jitter = 1 - options.jitterRatio + 2 * options.jitterRatio * random()
  return Math.min(Math.max(exponential * jitter, 0), options.maxDelayMs)
}

/**
 * Wait for `delayMs`, resolving `false` when the signal aborts first.
 * @param delayMs - milliseconds to wait.
 * @param signal - composed turn/disposal signal.
 * @returns true when the wait completed, false when it was cancelled.
 */
function cancellableDelay(delayMs, signal) {
  if (signal.aborted) return Promise.resolve(false)
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve(true)
    }, delayMs)
    function onAbort() {
      clearTimeout(timer)
      resolve(false)
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Structural validator for the persisted counters. It runs only when the
 * projection cache is rehydrated, so it repairs junk instead of throwing.
 */
const stateSchema = {
  parse(value) {
    const out = {}
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return out
    for (const [key, entry] of Object.entries(value)) {
      if (entry === null || typeof entry !== 'object') continue
      if (!Number.isSafeInteger(entry.attempt) || entry.attempt < 0) continue
      if (typeof entry.retryId !== 'string') continue
      out[key] = { attempt: entry.attempt, retryId: entry.retryId }
    }
    return out
  },
}

/**
 * Mount the recovery listener and its durable budget.
 * @param ctx - plugin context owning the listener, the projection, and active waits.
 * @param config - optional `{ maxAttempts, initialDelayMs, maxDelayMs, jitterRatio, patterns }`.
 * @returns when the projection registration and listeners are in place.
 */
export async function apply(ctx, config = {}) {
  const options = resolveOptions(config)
  const ready = ctx.sessionProjections.register({
    key: PROJECTION_KEY,
    stateVersion: 1,
    stateSchema,
    init: () => ({}),
    apply: (state, event) => {
      // A spent budget belongs to one step: a new step or the end of a turn
      // starts from zero, exactly like the provider-policy projection.
      if (event.type === 'step/start' || event.type === 'turn/end') return {}
      if (event.type !== 'llm/retry') return state
      if (event.data.policyKey !== POLICY_KEY) return state
      const key = JSON.stringify([event.data.provider, POLICY_KEY])
      const previous = state[key]
      if (previous?.attempt === event.data.retry && previous.retryId === event.data.retryId) return state
      return { ...state, [key]: { attempt: event.data.retry, retryId: event.data.retryId } }
    },
  })

  const lifetime = new AbortController()
  const active = new Set()

  function track(operation) {
    const tracked = operation.finally(() => active.delete(tracked))
    active.add(tracked)
    return tracked
  }

  /**
   * Claim one route failure, or hand it back untouched.
   * @param payload - the `agent/request-error` payload.
   * @param next - the remaining listeners, owned by `llm-retry`.
   * @returns a retry decision, or whatever the downstream chain decides.
   */
  async function recover({ agent, turn, step, provider, failure, signal }, next) {
    if (!isRouteUnavailable(failure, options.patterns)) return next()
    const handle = await ready
    if (signal.aborted || lifetime.signal.aborted) return undefined

    const state = handle.stateOf(agent.session)[JSON.stringify([provider, POLICY_KEY])]
    const spent = state?.attempt ?? 0
    if (spent >= options.maxAttempts) {
      ctx.logger.warn(
        'llm-route-retry: provider "%s" exhausted %d route attempts; surfacing the original failure: %s',
        provider,
        spent,
        failure.message,
      )
      return next()
    }

    const fusedSignal = AbortSignal.any([signal, lifetime.signal])
    const attempt = spent + 1
    const retryId = state?.retryId ?? randomUUID()
    const delayMs = localDelay(options, attempt)
    try {
      agent.session.append('llm/retry', {
        retryId,
        turn,
        step,
        provider,
        mode: 'normal',
        policyKey: POLICY_KEY,
        retry: attempt,
        maxRetries: options.maxAttempts,
        delayMs,
        failure,
      })
    } catch (error) {
      ctx.logger.warn('llm-route-retry: could not record the retry; failing the request: %s', String(error))
      return undefined
    }
    if (!await cancellableDelay(delayMs, fusedSignal)) return undefined
    agent.session.append('llm/retry-started', { retryId, turn, step, retry: attempt })
    return { kind: 'retry' }
  }

  // Prepend: `llm-retry` must see the decision rather than the original `AUTH`
  // code, which it would otherwise pass straight through as non-retryable.
  ctx.on(
    'agent/request-error',
    (payload, next) => {
      if (lifetime.signal.aborted) return Promise.resolve(undefined)
      return track(recover(payload, next))
    },
    { prepend: true },
  )

  ctx.effect(() => async () => {
    lifetime.abort(new Error('llm-route-retry disposed'))
    await Promise.allSettled([...active])
  }, 'llm-route-retry: abort and drain active waits')

  await ready
}
