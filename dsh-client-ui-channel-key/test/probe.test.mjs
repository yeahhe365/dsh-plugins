/**
 * The self-check's pure half: what request proves a key, and which response is
 * actually a verdict about the key rather than about the relay.
 *
 * Run: node --test test/probe.test.mjs
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { probeRequest, probeVerdict, reasonOf } from '../index.js'

test('an openai-compatible probe asks for a single token', () => {
  const request = probeRequest(
    { api: 'openai-completions', baseURL: 'https://relay.test/v1/', model: 'deepseek-v4.1-flash' },
    'sk-test-key',
  )

  assert.equal(request.url, 'https://relay.test/v1/chat/completions')
  assert.equal(request.init.headers.authorization, 'Bearer sk-test-key')
  const body = JSON.parse(request.init.body)
  assert.equal(body.model, 'deepseek-v4.1-flash')
  assert.equal(body.max_tokens, 1)
  assert.equal(body.stream, false)
  assert.equal(body.messages.length, 1)
})

test('an anthropic probe authenticates with x-api-key', () => {
  const request = probeRequest(
    { api: 'anthropic-messages', baseURL: 'https://api.anthropic.com', model: 'claude-test' },
    'sk-ant',
  )

  assert.equal(request.url, 'https://api.anthropic.com/v1/messages')
  assert.equal(request.init.headers['x-api-key'], 'sk-ant')
  assert.equal(request.init.headers['anthropic-version'], '2023-06-01')
})

test('a protocol this build cannot probe answers undefined', () => {
  assert.equal(probeRequest({ api: 'google-generative-ai', baseURL: 'https://x.test', model: 'm' }, 'k'), undefined)
})

test('only a rejected key is a verdict about the key', () => {
  assert.deepEqual(probeVerdict(200, ''), { ok: true })

  const rejected = probeVerdict(401, '{"error":{"message":"invalid token"}}')
  assert.equal(rejected.ok, false)
  assert.equal(rejected.code, 'AUTH')
  assert.match(rejected.message, /invalid token/)

  const limited = probeVerdict(429, 'slow down')
  assert.equal(limited.ok, false)
  assert.equal(limited.code, undefined, 'a rate limit says nothing about the key')

  const broken = probeVerdict(502, 'bad gateway')
  assert.equal(broken.code, undefined, 'a relay outage says nothing about the key')
})

test('a failure reason keeps the code and the provider message', () => {
  const reason = reasonOf({ code: 'AUTH', message: '401 USER_INACTIVE' })
  assert.equal(reason.code, 'AUTH')
  assert.match(reason.message, /USER_INACTIVE/)
  assert.deepEqual(reasonOf(undefined), {})
  assert.deepEqual(reasonOf({ code: '' }), {})
})
