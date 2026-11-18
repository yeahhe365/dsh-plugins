/**
 * Host-side key-pool logic, exercised without Cordis or a real credential store.
 *
 * The store is the part that can strand a user, so every rule the rotation
 * relies on gets a test here: import of a pre-existing single key, append
 * order, failure marking, skipping, the all-invalid rewind, and the two
 * destructive paths (remove/clear) that must not leave a dangling active ref.
 *
 * Run: node --test test/pool.test.mjs
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { PoolStore, slotRefFor } from '../lib/pool.js'

/* ---------------------------------------------------------------- fakes */

/** Mask one secret the way the credential seam does: keep the last four. */
function mask(value) {
  return value.length <= 4 ? '••••' : '••••' + value.slice(-4)
}

/** An in-memory credential seam with the four methods the pool uses. */
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
        : { configured: true, writable: true, masked: mask(value) }
    },
    async set(ref, value) {
      values.set(ref, value)
    },
    async unset(ref) {
      values.delete(ref)
    },
  }
}

/** A one-file persistence adapter. */
function fakeFile(text) {
  const state = { text, writes: 0 }
  return {
    state,
    async read() { return state.text },
    async write(next) { state.text = next; state.writes += 1 },
  }
}

/** Build a store over fresh fakes. */
function makeStore({ credentials, file } = {}) {
  const seam = credentials ?? fakeCredentials()
  const disk = file ?? fakeFile(undefined)
  return { store: new PoolStore({ read: disk.read, write: disk.write, credentials: seam }), seam, disk }
}

const REF = 'KK_API_KEY'

/* ---------------------------------------------------------------- tests */

test('an existing single key is imported as slot 1', async () => {
  const { store, seam } = makeStore({ credentials: fakeCredentials({ [REF]: 'sk-legacy-0001' }) })

  const view = await store.view('kk', REF)

  assert.equal(view.active, 1)
  assert.equal(view.entries.length, 1)
  assert.equal(view.entries[0].slot, 1)
  assert.equal(view.entries[0].configured, true)
  assert.equal(view.entries[0].masked, mask('sk-legacy-0001'))
  // The slot copy is what makes the key restorable after a rotation.
  assert.equal(seam.values.get(slotRefFor(REF, 1)), 'sk-legacy-0001')
})

test('appending keys keeps insertion order and leaves the first active', async () => {
  const { store, seam } = makeStore({ credentials: fakeCredentials({ [REF]: 'sk-first' }) })
  await store.view('kk', REF)

  const view = await store.applyOp('kk', REF, { op: 'add', keys: ['sk-second', 'sk-third'] })

  assert.deepEqual(view.entries.map(entry => entry.slot), [1, 2, 3])
  assert.equal(view.active, 1)
  assert.equal(seam.values.get(slotRefFor(REF, 2)), 'sk-second')
  assert.equal(seam.values.get(slotRefFor(REF, 3)), 'sk-third')
  // The runtime still reads only the channel's own reference.
  assert.equal(seam.values.get(REF), 'sk-first')
})

test('the first key added to an empty channel becomes active', async () => {
  const { store, seam } = makeStore()

  const view = await store.applyOp('kk', REF, { op: 'add', keys: ['sk-only'] })

  assert.equal(view.active, 1)
  assert.equal(seam.values.get(REF), 'sk-only')
})

test('a failed key rotates to the next one and stays marked', async () => {
  const { store, seam } = makeStore({ credentials: fakeCredentials({ [REF]: 'sk-bad' }) })
  await store.applyOp('kk', REF, { op: 'add', keys: ['sk-good'] })

  const moved = await store.rotate('kk')

  assert.equal(moved.from, 1)
  assert.equal(moved.to, 2)
  assert.equal(seam.values.get(REF), 'sk-good', 'the next attempt must resolve the next key')
  const view = await store.view('kk', REF)
  assert.equal(view.active, 2)
  assert.equal(typeof view.entries[0].invalidAt, 'number')
})

test('rotation skips a key that already failed', async () => {
  const { store, seam } = makeStore({ credentials: fakeCredentials({ [REF]: 'sk-a' }) })
  await store.applyOp('kk', REF, { op: 'add', keys: ['sk-b', 'sk-c'] })
  await store.rotate('kk') // slot 1 failed -> slot 2 is active, slot 1 marked
  await store.applyOp('kk', REF, { op: 'activate', slot: 3 })

  const moved = await store.rotate('kk') // slot 3 failed; slot 1 is dead, so slot 2 wins

  assert.equal(moved.from, 3)
  assert.equal(moved.to, 2)
  assert.equal(seam.values.get(REF), 'sk-b')
  const view = await store.view('kk', REF)
  assert.equal(typeof view.entries[0].invalidAt, 'number', 'the earlier mark survives')
})

test('rotation rewinds every mark once the whole sweep has failed', async () => {
  const { store, seam } = makeStore({ credentials: fakeCredentials({ [REF]: 'sk-a' }) })
  await store.applyOp('kk', REF, { op: 'add', keys: ['sk-b'] })
  await store.rotate('kk') // 1 fails, slot 2 active
  const moved = await store.rotate('kk') // 2 fails, nothing left -> rewind to 1

  assert.equal(moved.to, 1)
  assert.equal(seam.values.get(REF), 'sk-a')
  const view = await store.view('kk', REF)
  assert.equal(view.entries[0].invalidAt, undefined, 'the rewound key is usable again')
  assert.equal(typeof view.entries[1].invalidAt, 'number', 'the failure that ended the sweep stays recorded')
})

test('a single-key channel never rotates', async () => {
  const { store } = makeStore({ credentials: fakeCredentials({ [REF]: 'sk-only' }) })
  await store.view('kk', REF)

  assert.equal(await store.rotate('kk'), undefined)
})

test('rotation walks past a slot whose stored value is gone', async () => {
  const { store, seam } = makeStore({ credentials: fakeCredentials({ [REF]: 'sk-a' }) })
  await store.applyOp('kk', REF, { op: 'add', keys: ['sk-b', 'sk-c'] })
  await seam.unset(slotRefFor(REF, 2))

  const moved = await store.rotate('kk')

  assert.equal(moved.to, 3)
  assert.equal(seam.values.get(REF), 'sk-c')
})

test('removing the active key promotes the next usable one', async () => {
  const { store, seam } = makeStore({ credentials: fakeCredentials({ [REF]: 'sk-a' }) })
  await store.applyOp('kk', REF, { op: 'add', keys: ['sk-b', 'sk-c'] })

  const view = await store.applyOp('kk', REF, { op: 'remove', slot: 1 })

  assert.deepEqual(view.entries.map(entry => entry.slot), [2, 3])
  assert.equal(view.active, 2)
  assert.equal(seam.values.get(REF), 'sk-b')
})

test('removing the last key clears the channel reference', async () => {
  const { store, seam } = makeStore({ credentials: fakeCredentials({ [REF]: 'sk-only' }) })
  await store.view('kk', REF)

  const view = await store.applyOp('kk', REF, { op: 'remove', slot: 1 })

  assert.equal(view.entries.length, 0)
  assert.equal(view.active, null)
  assert.equal(seam.values.has(REF), false)
})

test('moving a key reorders the sweep without changing the active one', async () => {
  const { store } = makeStore({ credentials: fakeCredentials({ [REF]: 'sk-a' }) })
  await store.applyOp('kk', REF, { op: 'add', keys: ['sk-b', 'sk-c'] })

  const view = await store.applyOp('kk', REF, { op: 'move', slot: 3, delta: -1 })

  assert.deepEqual(view.entries.map(entry => entry.slot), [1, 3, 2])
  assert.equal(view.active, 1)
})

test('activating a marked key revives it and makes it current', async () => {
  const { store, seam } = makeStore({ credentials: fakeCredentials({ [REF]: 'sk-a' }) })
  await store.applyOp('kk', REF, { op: 'add', keys: ['sk-b'] })
  await store.rotate('kk')

  const view = await store.applyOp('kk', REF, { op: 'activate', slot: 1 })

  assert.equal(view.active, 1)
  assert.equal(view.entries[0].invalidAt, undefined)
  assert.equal(seam.values.get(REF), 'sk-a')
})

test('clearing the pool removes every slot and the channel reference', async () => {
  const { store, seam } = makeStore({ credentials: fakeCredentials({ [REF]: 'sk-a' }) })
  await store.applyOp('kk', REF, { op: 'add', keys: ['sk-b'] })

  const view = await store.applyOp('kk', REF, { op: 'clear' })

  assert.equal(view.entries.length, 0)
  assert.equal(seam.values.size, 0)
})

test('the pool file never carries a key', async () => {
  const { store, disk } = makeStore({ credentials: fakeCredentials({ [REF]: 'sk-secret-a' }) })
  await store.applyOp('kk', REF, { op: 'add', keys: ['sk-secret-b'] })
  await store.rotate('kk')

  assert.ok(disk.state.text.includes('KK_API_KEY'), 'the file names the references it manages')
  assert.ok(!disk.state.text.includes('sk-secret'), 'the file must not hold secrets')
})

test('a corrupt pool file is treated as empty instead of throwing', async () => {
  const { store, seam } = makeStore({ credentials: fakeCredentials({ [REF]: 'sk-a' }), file: fakeFile('{not json') })

  const view = await store.view('kk', REF)

  assert.equal(view.entries.length, 1)
  assert.equal(seam.values.get(slotRefFor(REF, 1)), 'sk-a')
})
