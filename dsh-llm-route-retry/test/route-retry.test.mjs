/**
 * Logic tests for dsh-llm-route-retry.
 *
 * The harness emulates the two things the plugin touches: the projection that
 * replays `llm/retry` events into a durable attempt counter, and the
 * `agent/request-error` waterfall whose `next` is owned by `llm-retry`.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  apply,
  isRouteUnavailable,
  localDelay,
  name,
  resolveOptions,
} from '../index.js'

/** Minimal stand-in for the projection registry + waterfall. */
function createHarness(config = {}) {
  const appends = []
  const chain = []
  let definition
  let state = {}

  const replay = event => {
    state = definition.apply(state, event)
  }

  const ctx = {
    logger: { info() {}, warn() {}, error() {} },
    on(event, listener, options) {
      chain.push({ event, listener, options })
    },
    effect(fn) {
      fn()
    },
    sessionProjections: {
      register(def) {
        definition = def
        return Promise.resolve({
          stateOf: () => state,
          dispose: async () => {},
        })
      },
    },
  }

  const agent = {
    session: {
      append(eventName, data) {
        appends.push({ eventName, data })
        replay({ type: eventName, data })
      },
    },
  }

  return {
    ctx,
    agent,
    appends,
    chain,
    reset: () => {
      state = {}
    },
    /** Run one `agent/request-error` delivery through the registered listener. */
    async deliver(payload, downstream = async () => undefined) {
      const registered = chain.find(entry => entry.event === 'agent/request-error')
      assert.ok(registered, 'listener registered')
      return registered.listener(payload, downstream)
    },
  }
}

const balanceFailure = {
  code: 'AUTH',
  message:
    '403: {"code":"INSUFFICIENT_BALANCE","message":"当前余额已用完；如需继续使用，请充值额度后使用。","type":"permission_error"}',
}

const payloadFor = (failure, signal = new AbortController().signal) => ({
  turn: 1,
  step: 1,
  provider: 'kk1',
  failure,
  retryPolicy: undefined,
  signal,
  agent: null,
})

/** Build a payload bound to a specific harness agent. */
const boundPayload = (harness, failure, signal) => ({
  ...payloadFor(failure, signal),
  agent: harness.agent,
})

test('plugin exports the loader contract', () => {
  assert.equal(name, 'dsh-llm-route-retry')
  assert.equal(typeof apply, 'function')
})

test('only AUTH failures carrying a route marker are claimed', () => {
  const patterns = resolveOptions({}).patterns
  assert.equal(isRouteUnavailable(balanceFailure, patterns), true)
  assert.equal(
    isRouteUnavailable({ code: 'AUTH', message: '401: {"code":"USER_INACTIVE"}' }, patterns),
    true,
  )
  assert.equal(
    isRouteUnavailable({ code: 'AUTH', message: '403: {"code":"ModelArts.81006"}' }, patterns),
    false,
    'a frozen resource stays a plain auth failure',
  )
  assert.equal(
    isRouteUnavailable({ code: 'AUTH', message: '403 <html>403 Forbidden</html>' }, patterns),
    false,
    'an opaque proxy rejection is not claimed on a guess',
  )
  assert.equal(
    isRouteUnavailable({ code: 'SERVER', message: 'INSUFFICIENT_BALANCE' }, patterns),
    false,
    'other codes keep their provider policy',
  )
  assert.equal(isRouteUnavailable(undefined, patterns), false)
})

test('a claimed failure spends a retry and resets streaming through llm/retry', async () => {
  const harness = createHarness()
  await apply(harness.ctx, { maxAttempts: 2, initialDelayMs: 1, maxDelayMs: 5 })
  harness.chain[0].options.prepend === true || assert.fail('listener must prepend')

  const decision = await harness.deliver(boundPayload(harness, balanceFailure))

  assert.deepEqual(decision, { kind: 'retry' })
  assert.equal(harness.appends.length, 2)
  assert.equal(harness.appends[0].eventName, 'llm/retry')
  assert.equal(harness.appends[0].data.policyKey, 'route-unavailable')
  assert.equal(harness.appends[0].data.retry, 1)
  assert.equal(harness.appends[0].data.maxRetries, 2)
  assert.equal(harness.appends[0].data.provider, 'kk1')
  assert.equal(harness.appends[1].eventName, 'llm/retry-started')
})

test('the budget is durable and hands the original failure back when spent', async () => {
  const harness = createHarness()
  await apply(harness.ctx, { maxAttempts: 2, initialDelayMs: 1, maxDelayMs: 5 })

  assert.deepEqual(await harness.deliver(boundPayload(harness, balanceFailure)), { kind: 'retry' })
  assert.deepEqual(await harness.deliver(boundPayload(harness, balanceFailure)), { kind: 'retry' })

  let fellThrough = false
  const decision = await harness.deliver(boundPayload(harness, balanceFailure), async () => {
    fellThrough = true
    return { kind: 'untouched' }
  })
  assert.equal(fellThrough, true, 'the rest of the chain decides once the budget is gone')
  assert.deepEqual(decision, { kind: 'untouched' })
  assert.equal(harness.appends.filter(entry => entry.eventName === 'llm/retry').length, 2)
})

test('a new step restores the budget', async () => {
  const harness = createHarness()
  await apply(harness.ctx, { maxAttempts: 1, initialDelayMs: 1, maxDelayMs: 5 })

  assert.deepEqual(await harness.deliver(boundPayload(harness, balanceFailure)), { kind: 'retry' })
  harness.agent.session.append('step/start', {})
  assert.deepEqual(await harness.deliver(boundPayload(harness, balanceFailure)), { kind: 'retry' })
})

test('unclaimed failures reach the downstream chain untouched', async () => {
  const harness = createHarness()
  await apply(harness.ctx, { maxAttempts: 4, initialDelayMs: 1, maxDelayMs: 5 })

  let seen
  const downstream = async () => {
    seen = 'llm-retry'
    return { kind: 'policy' }
  }
  const decision = await harness.deliver(
    boundPayload(harness, { code: 'AUTH', message: '403 Access to model denied' }),
    downstream,
  )
  assert.equal(seen, 'llm-retry')
  assert.deepEqual(decision, { kind: 'policy' })
  assert.equal(harness.appends.length, 0, 'no events for an unclaimed failure')
})

test('an abort during the wait cancels the retry', async () => {
  const harness = createHarness()
  await apply(harness.ctx, { maxAttempts: 4, initialDelayMs: 40, maxDelayMs: 40 })

  const controller = new AbortController()
  const pending = harness.deliver(boundPayload(harness, balanceFailure, controller.signal))
  controller.abort()
  assert.equal(await pending, undefined)
  assert.equal(harness.appends.filter(entry => entry.eventName === 'llm/retry-started').length, 0)
})

test('options clamp instead of rejecting bad values', () => {
  const options = resolveOptions({
    maxAttempts: -3,
    initialDelayMs: 0,
    maxDelayMs: 1,
    jitterRatio: 5,
    patterns: ['  ', 'BALANCE'],
  })
  assert.equal(options.maxAttempts, 0)
  assert.equal(options.initialDelayMs, 1_500)
  assert.ok(options.maxDelayMs >= options.initialDelayMs)
  assert.equal(options.jitterRatio, 1)
  assert.deepEqual(options.patterns, ['BALANCE'])
})

test('backoff doubles and respects the ceiling', () => {
  const options = resolveOptions({ initialDelayMs: 100, maxDelayMs: 1_000, jitterRatio: 0 })
  assert.equal(localDelay(options, 1, () => 0.5), 100)
  assert.equal(localDelay(options, 2, () => 0.5), 200)
  assert.equal(localDelay(options, 9, () => 0.5), 1_000)
})
