/**
 * dsh-composer-kit — host half (the call meter, merged into the composer kit).
 *
 * Counts the model calls this Host dispatches and serves a small rolling
 * snapshot to the browser half:
 *
 *   GET /api/dsh-call-meter/stats
 *   → { count, windowMs, buckets, failedBuckets, ok, failed, inFlight,
 *       lastAgeMs, fiveMinuteCount, providers, total, startedAt, now }
 *
 * A call is counted when it is **dispatched**, not when it finishes: a quota is
 * consumed at dispatch, and a long answer that streams for a minute must not
 * leave the meter reading zero. Each record then settles exactly once into
 * `ok`, `failed` or `abandoned`; only the first terminal `finish` chunk can
 * settle it, so a replayed or duplicated finish cannot double-count.
 *
 * The listener is deliberately passive: it forwards every chunk untouched and
 * rethrows whatever the inner stream throws, so it can never delay, rewrite or
 * fail a model request. No tokens, no content, no session identity are kept —
 * only timestamps plus the provider/model labels already present on the request.
 *
 * @module dsh-call-meter
 */

/** Cordis plugin name used by Loader diagnostics. */
export const name = 'dsh-composer-kit'

/** Rolling window the meter reports on. */
const WINDOW_MS = 60_000

/** Timestamps older than this are dropped; keeps the 5-minute figure and bounds memory. */
const KEEP_MS = 5 * 60_000

/** One sparkline bucket spans five seconds. */
const BUCKET_MS = 5_000

/** Number of buckets in one window. */
const BUCKET_COUNT = WINDOW_MS / BUCKET_MS

/** Route labels kept in the per-route breakdown. */
const ROUTE_ROWS = 4

/**
 * A record still `inflight` this long after dispatch is treated as abandoned:
 * some consumer walked away without closing its iterator.
 */
const INFLIGHT_TIMEOUT_MS = 10 * 60_000

/** Exact route mounted on Connection's shared `/api` channel. */
const ROUTE_PATH = '/api/dsh-call-meter/stats'

/**
 * @type {{ at: number, settledAt: number, outcome: 'inflight' | 'ok' | 'failed' | 'abandoned',
 *          provider: string, model: string }[]}
 */
const attempts = []

/** Attempts recorded since this Host started. */
let total = 0

/** Epoch milliseconds at which this Host mounted the meter. */
let startedAt = 0

/**
 * Drop records that fell out of the keep window. A record is aged by its
 * settlement when it has one, so a call that started long ago but finished just
 * now still counts toward the five-minute figure.
 *
 * @param now - current epoch milliseconds.
 */
function prune(now) {
  for (const attempt of attempts) {
    if (attempt.outcome !== 'inflight') continue
    if (now - attempt.at <= INFLIGHT_TIMEOUT_MS) continue
    /* Nobody is going to settle this one; age it out instead of leaking it.
     * Stamping it at dispatch keeps the keep-window honest: an abandoned
     * record nobody observed must not outlive the calls around it. */
    attempt.outcome = 'abandoned'
    attempt.settledAt = attempt.at
  }

  let drop = 0
  while (drop < attempts.length) {
    const attempt = attempts[drop]
    const stamp = attempt.outcome === 'inflight' ? now : attempt.settledAt
    if (now - stamp <= KEEP_MS) break
    drop += 1
  }
  if (drop > 0) attempts.splice(0, drop)
}

/**
 * Take the labels of one dispatch and enter it into the window immediately.
 *
 * @param options - a `GenerateOptions` payload from the waterfall.
 * @returns the freshly recorded attempt, still `inflight`.
 */
function record(options) {
  const attempt = {
    at: Date.now(),
    settledAt: 0,
    outcome: 'inflight',
    provider: typeof options?.provider === 'string' ? options.provider : '',
    model: typeof options?.model === 'string' ? options.model : '',
  }
  attempts.push(attempt)
  total += 1
  prune(attempt.at)
  return attempt
}

/**
 * Settle one attempt. The first settlement wins, so a terminal `finish` that a
 * wrapper replays cannot count the same call twice.
 *
 * @param attempt - the record returned by {@link record}.
 * @param outcome - the terminal state.
 */
function settle(attempt, outcome) {
  if (attempt.outcome !== 'inflight') return
  attempt.outcome = outcome
  attempt.settledAt = Date.now()
}

/**
 * Whether a finish reason means the call produced no answer.
 *
 * @param reason - the terminal finish chunk's reason.
 * @returns true for `error` and `aborted`.
 */
function failed(reason) {
  return reason?.kind === 'error' || reason?.kind === 'aborted'
}

/**
 * Forward one stream chunk by chunk, settling its record on the first terminal
 * `finish` chunk. A stream that ends without one — or that the consumer abandons
 * early — settles as `abandoned`: the call happened, but nobody knows how it
 * ended.
 *
 * @param attempt - the record returned by {@link record}.
 * @param stream - the stream produced by the next waterfall listener.
 */
async function* track(attempt, stream) {
  let settled = false
  try {
    for await (const chunk of stream) {
      if (!settled && chunk?.type === 'finish') {
        settled = true
        settle(attempt, failed(chunk.reason) ? 'failed' : 'ok')
      }
      yield chunk
    }
  } finally {
    /* Early break, consumer throw, or a stream that never produced a finish. */
    if (!settled) settle(attempt, 'abandoned')
  }
}

/**
 * Build the rolling snapshot the browser polls.
 *
 * @returns the JSON-safe meter state.
 */
export function snapshot() {
  const now = Date.now()
  prune(now)

  const from = now - WINDOW_MS
  const keepFrom = now - KEEP_MS
  const buckets = new Array(BUCKET_COUNT).fill(0)
  const failedBuckets = new Array(BUCKET_COUNT).fill(0)
  const byRoute = new Map()
  let count = 0
  let fiveMinute = 0
  let ok = 0
  let failures = 0
  let inFlight = 0
  let lastAt = 0

  for (const attempt of attempts) {
    /* Recency spans everything still retained, so the popover can say "last
       call 3 minutes ago" after the window itself has emptied. */
    if (attempt.at > lastAt) lastAt = attempt.at
    if (attempt.at > keepFrom) fiveMinute += 1
    if (attempt.at <= from) continue

    const age = now - attempt.at
    let index = BUCKET_COUNT - 1 - Math.floor(age / BUCKET_MS)
    if (index < 0) index = 0
    if (index > BUCKET_COUNT - 1) index = BUCKET_COUNT - 1

    buckets[index] += 1
    count += 1

    if (attempt.outcome === 'failed') {
      failedBuckets[index] += 1
      failures += 1
    } else if (attempt.outcome === 'ok') {
      ok += 1
    } else if (attempt.outcome === 'inflight') {
      inFlight += 1
    }

    const key = attempt.provider + '\u0000' + attempt.model
    const row = byRoute.get(key)
    if (row === undefined) {
      byRoute.set(key, {
        provider: attempt.provider,
        model: attempt.model,
        count: 1,
        failed: attempt.outcome === 'failed' ? 1 : 0,
      })
    } else {
      row.count += 1
      if (attempt.outcome === 'failed') row.failed += 1
    }
  }

  const providers = [...byRoute.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, ROUTE_ROWS)

  return {
    count,
    windowMs: WINDOW_MS,
    buckets,
    failedBuckets,
    ok,
    failed: failures,
    inFlight,
    lastAgeMs: lastAt === 0 ? null : Math.max(0, now - lastAt),
    fiveMinuteCount: fiveMinute,
    providers,
    total,
    startedAt,
    now,
  }
}

/** Answer one poll without exposing anything beyond the counts above. */
function statsResponse() {
  return Response.json(snapshot(), {
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
    },
  })
}

/**
 * Mount the counter and its exact Fetch route.
 *
 * @param ctx - host plugin context.
 */
export function apply(ctx) {
  attempts.length = 0
  total = 0
  startedAt = Date.now()

  /* Passive observation: `next()` runs the downstream listeners exactly as
   * before. `global` keeps the meter counting every isolate this Host runs
   * (subagents, background work), not only the row's own context. Recording
   * cannot fail the request it observes: a throw here returns the untouched
   * stream instead. */
  ctx.on('llm/stream', (options, next) => {
    const stream = next()
    let attempt
    try {
      attempt = record(options)
    } catch {
      /* A counting failure must not fail the request it only observes. */
      return stream
    }
    return track(attempt, stream)
  }, { global: true })

  /* The `connection` service appears asynchronously in a bundle composition. */
  ctx.inject(['connection'], (scope) => {
    const connection = scope.connection
    if (connection === undefined || connection === null) return
    const registry = connection.fetch
    if (registry === undefined || typeof registry.register !== 'function') return

    registry.register({
      path: ROUTE_PATH,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: () => Promise.resolve(statsResponse()),
    })
  })
}
