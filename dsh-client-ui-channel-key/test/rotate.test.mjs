/**
 * Trigger rules for the rotation, kept separate from the Cordis wiring so they
 * can be proven without a Host: which failures this plugin takes over, and
 * which `llm/retry` events mean "the next attempt must use another key".
 *
 * Run: node --test test/rotate.test.mjs
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { isAuthFailure, rotationOfRetry, spendRotation, ROTATE_POLICY_KEY } from '../index.js'

test('only AUTH failures are taken over', () => {
  assert.equal(isAuthFailure({ code: 'AUTH', message: 'API key rejected' }), true)
  assert.equal(isAuthFailure({ code: 'RATE_LIMIT', message: 'AUTH 429' }), false)
  assert.equal(isAuthFailure({ code: 'TIMEOUT', message: '401' }), false)
  assert.equal(isAuthFailure(undefined), false)
  assert.equal(isAuthFailure(null), false)
  assert.equal(isAuthFailure('AUTH'), false)
})

test('a retry another plugin decided rotates only for AUTH failures', () => {
  const auth = { provider: 'kk', policyKey: 'provider-policy', failure: { code: 'AUTH', message: 'x' } }
  assert.equal(rotationOfRetry(auth), true)
  const server = { provider: 'kk', policyKey: 'provider-policy', failure: { code: 'SERVER', message: 'x' } }
  assert.equal(rotationOfRetry(server), false)
})

test('the retry this plugin emits is not rotated a second time', () => {
  const own = { provider: 'kk', policyKey: ROTATE_POLICY_KEY, failure: { code: 'AUTH', message: 'x' } }
  assert.equal(rotationOfRetry(own), false)
})

test('an event without a provider never rotates', () => {
  assert.equal(rotationOfRetry({ policyKey: 'provider-policy', failure: { code: 'AUTH' } }), false)
  assert.equal(rotationOfRetry(null), false)
})

test('one step spends at most one rotation per spare key', () => {
  const attempts = new Map()
  // Two keys: the first request starts on key 1, so exactly one retry is ours.
  assert.equal(spendRotation(attempts, 's|1|1', 2), true)
  assert.equal(spendRotation(attempts, 's|1|1', 2), false)
  // Three keys: two retries.
  assert.equal(spendRotation(attempts, 's|1|2', 3), true)
  assert.equal(spendRotation(attempts, 's|1|2', 3), true)
  assert.equal(spendRotation(attempts, 's|1|2', 3), false)
  // A single-key channel never spends one.
  assert.equal(spendRotation(attempts, 's|1|3', 1), false)
  // Another step starts fresh.
  assert.equal(spendRotation(attempts, 's|2|1', 2), true)
})
