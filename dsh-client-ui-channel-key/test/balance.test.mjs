/**
 * Balance unit tests: the request one key's balance is read with, and how a
 * gateway's answer is judged.
 *
 * The relay behind the channels this plugin manages serves `/usage` beside the
 * API base and answers with a number. Everything else — a 404, an HTML page, a
 * body without a balance — must stay "unmeasured" rather than become a zero,
 * because a zero draws a healthy key as an empty one.
 *
 * Run: node --test test/balance.test.mjs
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { balanceRequest, parseBalance } from '../index.js'

test('the balance request asks the channel endpoint for one key', () => {
  const built = balanceRequest({ api: 'openai-completions', baseURL: 'https://api.example.test/v1' }, 'sk-abc')
  assert.equal(built.url, 'https://api.example.test/v1/usage')
  assert.equal(built.init.method, 'GET')
  assert.equal(built.init.headers.authorization, 'Bearer sk-abc')

  const trailing = balanceRequest({ api: 'openai-responses', baseURL: 'https://api.example.test/v1/' }, 'sk-abc')
  assert.equal(trailing.url, 'https://api.example.test/v1/usage', 'a trailing slash does not double up')
})

test('a protocol without a balance endpoint asks nothing', () => {
  assert.equal(balanceRequest({ api: 'anthropic-messages', baseURL: 'https://api.example.test' }, 'sk-abc'), undefined)
  assert.equal(balanceRequest({ api: 'openai-completions', baseURL: '' }, 'sk-abc'), undefined)
  assert.equal(balanceRequest(undefined, 'sk-abc'), undefined)
})

test('a reading carries the balance, its unit, and today\'s spend', () => {
  const reading = parseBalance(200, JSON.stringify({
    balance: 4.8468893,
    remaining: 4.8,
    unit: 'USD',
    planName: '钱包余额',
    isValid: true,
    usage: { today: { actual_cost: 0.51311072 } },
  }))
  assert.equal(reading.ok, true)
  assert.equal(reading.balance, 4.8468893)
  assert.equal(reading.unit, 'USD')
  assert.equal(reading.planName, '钱包余额')
  assert.equal(reading.todayCost, 0.51311072)
  assert.equal(reading.valid, true)
})

test('a reading falls back to `remaining` and to a default unit', () => {
  const reading = parseBalance(200, '{"remaining":0.1}')
  assert.equal(reading.ok, true)
  assert.equal(reading.balance, 0.1)
  assert.equal(reading.unit, 'USD')
  assert.equal(reading.todayCost, undefined)
  assert.equal(reading.planName, undefined)
})

test('an exhausted key reads as a zero that is not valid', () => {
  const reading = parseBalance(200, '{"balance":0,"isValid":false}')
  assert.equal(reading.ok, true)
  assert.equal(reading.balance, 0)
  assert.equal(reading.valid, false)
})

test('an unreadable answer is not a balance', () => {
  assert.equal(parseBalance(404, '{"error":{"code":"PATH_NOT_SUPPORTED"}}').ok, false)
  assert.equal(parseBalance(500, '{}').ok, false)
  assert.equal(parseBalance(200, '<!doctype html>').ok, false)
  assert.equal(parseBalance(200, 'null').ok, false)
  assert.equal(parseBalance(200, '{"isValid":true}').ok, false)
  assert.equal(parseBalance(200, '{"balance":"4.85"}').ok, false, 'a string is not a number')
  assert.equal(parseBalance(200, '{"balance":null}').ok, false)
})
