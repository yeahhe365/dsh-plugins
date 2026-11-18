/**
 * The durable side of the multi-key channel: one ordered key pool per model
 * channel, and the sweep that picks the next key when the current one is
 * rejected.
 *
 * **Where the secrets live.** Not here. Every slot is a credential reference of
 * its own — `<REF>__1`, `<REF>__2`, … — so keys stay in the profile's credential
 * store (0600, atomic writes, one lock) exactly like the single key this plugin
 * wrote before. This module's file carries only the ordering, the active slot,
 * and which slots a request has already rejected.
 *
 * **What the runtime reads.** Unchanged: the channel's own reference (`<REF>`)
 * still holds the key the next request resolves. A sweep copies the next slot's
 * value into it, so `dsh-llm-pi-ai`, the Models page, and every other reader
 * need to know nothing about slots.
 *
 * **Failure marks are a sweep, not a verdict.** A rejected key is skipped for
 * the rest of the sweep. Once every slot has been skipped, the next failure
 * clears the marks and the sweep starts again at the following slot: a relay
 * that is briefly down must not strand the channel, and a genuinely dead key
 * costs one request per sweep rather than one per request.
 *
 * @module dsh-client-ui-channel-key/pool
 */

/** Current on-disk shape. A different version is treated as an empty file. */
const FILE_VERSION = 1

/**
 * The credential reference holding one pool slot.
 * @param {string} ref - the channel's own reference, e.g. `KK_API_KEY`.
 * @param {number} slot - stable slot number, 1-based.
 * @returns {string} e.g. `KK_API_KEY__2`.
 */
export function slotRefFor(ref, slot) {
  return ref + '__' + slot
}

/** One empty pool for a channel. */
function emptyPool(ref) {
  return { ref, order: [], active: null, nextSlot: 1, invalid: {} }
}

/**
 * The stored shape of one failure mark.
 * @param {number} at - when the key was rejected.
 * @param {{code?: string, message?: string}} reason - what the provider said, if anything.
 * @returns {{at: number, code?: string, message?: string}} the mark to persist.
 */
function markOf(at, reason = {}) {
  const mark = { at }
  if (typeof reason.code === 'string' && reason.code.length > 0) mark.code = reason.code
  const message = typeof reason.message === 'string' ? reason.message.replace(/\s+/g, ' ').trim().slice(0, 160) : ''
  if (message.length > 0) mark.message = message
  return mark
}

/** A positive integer, or the fallback. */
function intOr(value, fallback) {
  return Number.isSafeInteger(value) && value > 0 ? value : fallback
}

/**
 * Admit one parsed pool entry, repairing what it can and rejecting what it
 * cannot. The file is local state that a user may have edited, so a malformed
 * entry degrades to an empty pool instead of failing every request.
 */
function parsePool(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  if (typeof value.ref !== 'string' || value.ref.length === 0) return undefined
  const order = Array.isArray(value.order) ? value.order.filter(slot => Number.isSafeInteger(slot) && slot > 0) : []
  const unique = [...new Set(order)]
  const active = Number.isSafeInteger(value.active) && unique.includes(value.active) ? value.active : (unique[0] ?? null)
  const invalid = {}
  if (value.invalid !== null && typeof value.invalid === 'object' && !Array.isArray(value.invalid)) {
    for (const [slot, mark] of Object.entries(value.invalid)) {
      const number = Number(slot)
      if (!Number.isSafeInteger(number) || !unique.includes(number)) continue
      // A pre-1.2 mark was the bare timestamp; newer ones carry the verdict too.
      if (Number.isFinite(mark)) {
        invalid[number] = { at: mark }
        continue
      }
      if (mark === null || typeof mark !== 'object') continue
      invalid[number] = {
        at: Number.isFinite(mark.at) ? mark.at : 0,
        ...typeof mark.code === 'string' && mark.code.length > 0 ? { code: mark.code } : {},
        ...typeof mark.message === 'string' && mark.message.length > 0 ? { message: mark.message } : {},
      }
    }
  }
  const maxSlot = unique.length > 0 ? Math.max(...unique) : 0
  const nextSlot = Math.max(intOr(value.nextSlot, 1), maxSlot + 1)
  return { ref: value.ref, order: unique, active, nextSlot, invalid }
}

/**
 * Read a pool document, tolerating junk.
 * @param {string|undefined} text - the file's contents.
 * @returns {{version: number, pools: Record<string, ReturnType<typeof emptyPool>>}} the parsed state.
 */
export function parseDocument(text) {
  if (typeof text !== 'string' || text.length === 0) return { version: FILE_VERSION, pools: {} }
  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    return { version: FILE_VERSION, pools: {} }
  }
  if (raw === null || typeof raw !== 'object' || raw.version !== FILE_VERSION) return { version: FILE_VERSION, pools: {} }
  const pools = {}
  const source = raw.pools !== null && typeof raw.pools === 'object' && !Array.isArray(raw.pools) ? raw.pools : {}
  for (const [provider, value] of Object.entries(source)) {
    const pool = parsePool(value)
    if (pool !== undefined) pools[provider] = pool
  }
  return { version: FILE_VERSION, pools }
}

/**
 * One pool store over an injected persistence adapter and credential seam.
 *
 * Every operation is serialized: two requests that fail at the same instant must
 * advance the sweep one slot at a time, not race each other past a key.
 */
export class PoolStore {
  /**
   * @param {object} options
   * @param {() => Promise<string|undefined>} options.read - read the pool document.
   * @param {(text: string) => Promise<void>} options.write - replace the pool document.
   * @param {object} options.credentials - the credential seam (`resolve`, `describe`, `set`, `unset`).
   * @param {() => number} [options.now] - clock, injectable for tests.
   */
  constructor({ read, write, credentials, now = Date.now }) {
    this.read = read
    this.write = write
    this.credentials = credentials
    this.now = now
    this.queue = Promise.resolve()
  }

  /**
   * Run one operation after every operation already queued.
   * @param {() => Promise<any>} operation - the critical section.
   * @returns {Promise<any>} the operation's result.
   */
  run(operation) {
    const started = this.queue.then(operation, operation)
    this.queue = started.then(() => undefined, () => undefined)
    return started
  }

  /** Read and admit the pool document. */
  async load() {
    let text
    try {
      text = await this.read()
    } catch {
      text = undefined
    }
    return parseDocument(text)
  }

  /** Persist the pool document. */
  async save(state) {
    await this.write(JSON.stringify(state, null, 2) + '\n')
  }

  /**
   * Describe one pool for the editor, importing a pre-existing single key as
   * slot 1 the first time the channel is looked at.
   * @param {string} provider - the model channel's route key.
   * @param {string} ref - the credential reference the channel resolves.
   * @returns {Promise<object>} the pool view.
   */
  async view(provider, ref) {
    return this.run(async () => {
      const state = await this.load()
      const pool = await this.#poolFor(state, provider, ref)
      await this.save(state)
      return this.#describe(provider, pool)
    })
  }

  /**
   * Apply one editor operation and return the new view.
   * @param {string} provider - the model channel's route key.
   * @param {string} ref - the credential reference the channel resolves.
   * @param {object} op - `{ op, keys?, slot?, delta? }`.
   * @returns {Promise<object>} the pool view after the operation.
   */
  async applyOp(provider, ref, op) {
    return this.run(async () => {
      const state = await this.load()
      const pool = await this.#poolFor(state, provider, ref)
      const kind = op !== null && typeof op === 'object' ? op.op : undefined

      if (kind === 'add') {
        const keys = Array.isArray(op.keys) ? op.keys : []
        const accepted = keys.filter(key => typeof key === 'string' && key.trim().length > 0).map(key => key.trim())
        if (accepted.length === 0) throw new Error('pool: no key to add')
        for (const key of accepted) {
          const slot = pool.nextSlot++
          await this.credentials.set(slotRefFor(pool.ref, slot), key)
          pool.order.push(slot)
          if (pool.active === null) {
            pool.active = slot
            await this.credentials.set(pool.ref, key)
          }
        }
      } else if (kind === 'remove') {
        const slot = intOr(op.slot, 0)
        if (!pool.order.includes(slot)) throw new Error('pool: slot ' + String(op.slot) + ' is not in this pool')
        await this.credentials.unset(slotRefFor(pool.ref, slot))
        pool.order = pool.order.filter(entry => entry !== slot)
        delete pool.invalid[slot]
        if (pool.active === slot) {
          const next = await this.#firstUsable(pool)
          pool.active = next === undefined ? null : next.slot
          await this.#show(pool, next)
        }
      } else if (kind === 'move') {
        const slot = intOr(op.slot, 0)
        const from = pool.order.indexOf(slot)
        if (from === -1) throw new Error('pool: slot ' + String(op.slot) + ' is not in this pool')
        const delta = Number.isSafeInteger(op.delta) ? op.delta : 0
        const to = Math.min(Math.max(from + delta, 0), pool.order.length - 1)
        pool.order.splice(from, 1)
        pool.order.splice(to, 0, slot)
      } else if (kind === 'restore') {
        const slot = intOr(op.slot, 0)
        if (!pool.order.includes(slot)) throw new Error('pool: slot ' + String(op.slot) + ' is not in this pool')
        delete pool.invalid[slot]
      } else if (kind === 'activate') {
        const slot = intOr(op.slot, 0)
        if (!pool.order.includes(slot)) throw new Error('pool: slot ' + String(op.slot) + ' is not in this pool')
        const value = await this.#valueOf(pool, slot)
        pool.active = slot
        delete pool.invalid[slot]
        await this.#show(pool, value === undefined ? undefined : { slot, value })
      } else if (kind === 'clear') {
        for (const slot of pool.order) await this.credentials.unset(slotRefFor(pool.ref, slot))
        await this.credentials.unset(pool.ref)
        delete state.pools[provider]
        await this.save(state)
        return this.#describe(provider, emptyPool(pool.ref))
      } else {
        throw new Error('pool: unknown operation ' + String(kind))
      }

      await this.save(state)
      return this.#describe(provider, pool)
    })
  }

  /**
   * The active key was rejected: advance the sweep to the next usable slot.
   * @param {string} provider - the model channel's route key.
   * @param {(size: number) => boolean} [canSpend] - the caller's budget for this
   *   step, asked before anything is written; a false answer leaves the pool alone.
   * @param {{code?: string, message?: string}} [reason] - why the key failed, kept
   *   with the mark so the editor can tell a dead key from a dead relay.
   * @returns {Promise<{from: number, to: number, ref: string, size: number}|undefined>} the move, or
   *   undefined when this channel cannot rotate (no pool, a single key, or no budget).
   */
  async rotate(provider, canSpend = () => true, reason = {}) {
    return this.run(async () => {
      const state = await this.load()
      const pool = state.pools[provider]
      if (pool === undefined || pool.order.length < 2) return undefined
      if (!canSpend(pool.order.length)) return undefined
      const from = pool.active !== null && pool.order.includes(pool.active) ? pool.active : pool.order[0]

      let target = await this.#nextUsable(pool, from)
      if (target === undefined) {
        // Every key failed once: the run is over, so the next sweep starts clean
        // instead of leaving the channel with no usable key at all.
        pool.invalid = {}
        target = await this.#nextUsable(pool, from)
      }
      if (target === undefined) return undefined

      pool.invalid[from] = markOf(this.now(), reason)
      pool.active = target.slot
      await this.credentials.set(pool.ref, target.value)
      await this.save(state)
      return { from, to: target.slot, ref: pool.ref, size: pool.order.length }
    })
  }

  /**
   * The slots to probe, in sweep order, with their references resolved lazily by
   * the caller (this store never hands out key values it does not have to).
   * @param {string} provider - the model channel's route key.
   * @returns {Promise<{ref: string, slots: {slot: number, ref: string}[]}>} the pool's
   *   channel reference and one entry per slot.
   */
  async slots(provider) {
    return this.run(async () => {
      const state = await this.load()
      const pool = state.pools[provider]
      if (pool === undefined) return { ref: undefined, slots: [] }
      return {
        ref: pool.ref,
        slots: pool.order.map(slot => ({ slot, ref: slotRefFor(pool.ref, slot) })),
      }
    })
  }

  /**
   * Record the outcome of one self-check round.
   *
   * `ok` revives a slot (a working key is no longer suspect); a failure carrying a
   * code marks it with the verdict; a failure without one — a timeout, a 429, a
   * relay error — says nothing about the key and leaves its mark untouched.
   * @param {string} provider - the model channel's route key.
   * @param {{slot: number, ok: boolean, code?: string, message?: string}[]} outcomes - one per probed slot.
   * @returns {Promise<object|undefined>} the pool view, or undefined for an unknown channel.
   */
  async applyProbe(provider, outcomes) {
    return this.run(async () => {
      const state = await this.load()
      const pool = state.pools[provider]
      if (pool === undefined) return undefined
      for (const outcome of outcomes) {
        if (!pool.order.includes(outcome.slot)) continue
        if (outcome.ok === true) {
          delete pool.invalid[outcome.slot]
          continue
        }
        if (typeof outcome.code !== 'string' || outcome.code.length === 0) continue
        pool.invalid[outcome.slot] = markOf(this.now(), { code: outcome.code, message: outcome.message })
      }
      await this.save(state)
      return this.#describe(provider, pool)
    })
  }

  /** The pool for one channel, importing the channel's existing key on first use. */
  async #poolFor(state, provider, ref) {
    const existing = state.pools[provider]
    if (existing !== undefined && existing.ref === ref) return existing
    if (existing !== undefined) delete state.pools[provider]

    const value = await this.#resolve(ref)
    const pool = emptyPool(ref)
    if (value !== undefined) {
      await this.credentials.set(slotRefFor(ref, 1), value)
      pool.order.push(1)
      pool.active = 1
      pool.nextSlot = 2
    }
    state.pools[provider] = pool
    return pool
  }

  /** Resolve one reference to its value, or undefined when it is unset. */
  async #resolve(ref) {
    try {
      const hit = await this.credentials.resolve(ref)
      return hit === undefined ? undefined : hit.value
    } catch {
      return undefined
    }
  }

  /** The credential value behind one slot. */
  #valueOf(pool, slot) {
    return this.#resolve(slotRefFor(pool.ref, slot))
  }

  /** The first slot in order that still resolves to a value. */
  async #firstUsable(pool) {
    for (const slot of pool.order) {
      const value = await this.#valueOf(pool, slot)
      if (value !== undefined) return { slot, value }
    }
    return undefined
  }

  /** The next slot after `from`, wrapping, skipping failed and empty slots. */
  async #nextUsable(pool, from) {
    const index = pool.order.indexOf(from)
    if (index === -1) return this.#firstUsable(pool)
    for (let step = 1; step < pool.order.length; step += 1) {
      const slot = pool.order[(index + step) % pool.order.length]
      if (pool.invalid[slot] !== undefined) continue
      const value = await this.#valueOf(pool, slot)
      if (value !== undefined) return { slot, value }
    }
    return undefined
  }

  /** Make one slot's key the one the channel resolves. */
  async #show(pool, target) {
    if (target === undefined) {
      await this.credentials.unset(pool.ref)
      return
    }
    await this.credentials.set(pool.ref, target.value)
  }

  /** The editor's view of one pool. */
  async #describe(provider, pool) {
    const entries = []
    for (const slot of pool.order) {
      const ref = slotRefFor(pool.ref, slot)
      let info = { configured: false, writable: false }
      try {
        info = await this.credentials.describe(ref)
      } catch {
        /* A describe failure reads as "unknown", which the editor renders as unconfigured. */
      }
      const mark = pool.invalid[slot]
      entries.push({
        slot,
        ref,
        configured: info.configured === true,
        masked: typeof info.masked === 'string' ? info.masked : undefined,
        invalidAt: mark === undefined ? undefined : mark.at,
        ...mark !== undefined && mark.code !== undefined ? { code: mark.code } : {},
        ...mark !== undefined && mark.message !== undefined ? { message: mark.message } : {},
      })
    }
    return { provider, ref: pool.ref, active: pool.active, entries }
  }
}
