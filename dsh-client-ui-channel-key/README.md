# dsh-client-ui-channel-key

A key button in the conversation header that edits the **key pool** of the model
channel behind the current model selection, plus the Host-side rotation that
follows a rejected key. · 对话顶栏的钥匙按钮：编辑当前模型渠道的密钥池；密钥被
判失效时宿主自动换下一个。

## What it adds

One 28px key control joins the header's right-aligned utilities row, immediately
left of the Session's `⋯` (More) menu, in every Session that has a model
selected. Clicking it opens a small card anchored under the button:

| Row | Meaning |
|---|---|
| 当前渠道 | The provider and model the composer's model seat currently points at |
| 凭证引用 | The credential reference that channel resolves, e.g. `KK_API_KEY` |
| 密钥列表 | One row per key: `#n`, masked preview, `当前使用` / `已失效`, and on hover 恢复 · 上移 · 下移 · 使用 · 删除 |
| 余额 | Each key's remaining balance, read from the channel's own gateway; `刷新余额` re-reads it |
| 汇总 | `3 个密钥 · 1 已失效 · 总余额 $4.95`, with the drag hint on the right |
| API 密钥 | A write-only field with `粘贴` / `显示`; one key per `Enter`, or paste a whole block at once |

The active row carries a left accent bar; a rejected row is struck through and
its badge tooltip says when it failed. Rows are dragged to reorder (one `move`
op on drop), and the hover controls stay reachable by keyboard through
`focus-within`. `添加` appends the field's keys to the pool, `自检` probes every
key with one minimal request, `粘贴` reads the clipboard and adds what it holds
(a refused read says so and points at `Ctrl+V`), `导出清单` copies a masked
inventory (order, preview, state — never the keys), `清除全部` removes the whole
pool, and `取消` / `Esc` / a click outside closes the card. The
`显示` / `隐藏` toggle is the same one the single-key card had.

## The pool

**Order is the contract.** Requests resolve the channel's credential reference
(`<REF>`), which always holds the *current* key. Each pool slot has a credential
reference of its own — `<REF>__1`, `<REF>__2`, … — and making a slot current
copies its value into `<REF>`. That is why the pool never needs to touch the
provider profile, the Models settings page, or `dsh-llm-pi-ai`: they keep
reading the one reference they always read.

**A rejection advances the sweep.** When a request fails with DSH's `AUTH` code —
what the conversation renders as 「API 密钥无效」, covering an invalid key, a banned
channel, and an exhausted relay channel alike — the Host marks the current slot
and copies the next usable slot's key into `<REF>`. The failed key is skipped for
the rest of the sweep. Once every slot has been skipped, the next failure clears
the marks and the sweep restarts at the following slot: a brief relay outage must
not strand the channel forever, and a genuinely dead key then costs one request
per sweep instead of one per request.

**Two seams, so the retry plugins cooperate.** `agent/request-error` (prepended)
claims the `AUTH` failures nobody else would retry and asks for one retry itself.
`session/event` observes `llm/retry` events that other plugins decided
(`dsh-llm-route-retry`, the provider's own policy) and rotates *before* their
delay elapses — so their retry also carries the next key. The two never rotate
twice for one failure: the retries this plugin emits carry
`policyKey: 'channel-key-rotate'` and are ignored by the observer.

**A channel with one key never rotates** — the pool simply answers "no next
key", and the failure goes wherever it went before.

**A step spends one rotation per spare key.** With two keys that is a single
retry this plugin decides; the rest of the failures go downstream, so two dead
keys can never hand the request back and forth forever.

## Self-check

`自检` asks the Host to send one minimal chat completion per key
(`max_tokens: 1`), so it costs a token or two per key and answers the question
the rotation can only answer by failing a real turn: **which key is dead?**

- The endpoint and model come from the user's own provider profile; a browser
  never supplies a URL, so a key cannot be posted anywhere else.
- Only a rejected key is a verdict about the key. `401`/`403` marks it and
  records why; a rate limit, a relay outage, a wrong model, or a missing
  endpoint leaves the mark alone — those say nothing about the key.
- A key that answers revives: its mark is cleared, and the next rotation can
  choose it again.
- A protocol this build cannot speak (`google-generative-ai`, Bedrock, …) is
  reported instead of probed.

The status line summarises the round: `2 可用 · 1 已失效 · 1 未测出`.

## Balances

`余额` asks the Host for one number per key: the balance the key's own gateway
reports. The relay behind an [OI]-shaped channel serves it beside the API base —
`GET https://host/v1/usage` for a `.../v1` base — and answers with
`{ balance, unit, planName, isValid, usage: { today: { actual_cost } } }`.

- **Nothing is invented.** A gateway with no such endpoint (a 404), an HTML
  page, or JSON without a number leaves the row as `—` with the reason on
  hover. A zero is printed only when the gateway said zero.
- **The reading is cached for 60 seconds** per key, so re-opening the card costs
  no request; `刷新余额` bypasses the cache.
- **Tone, not decoration:** a balance at or below `0.5` reads as running out, a
  zero or `isValid: false` reads as an error.
- **The URL comes from the profile, never from the browser**, and the key rides
  in the same bearer header a completion already uses. A protocol this build
  cannot ask (`anthropic-messages`, …) reports "no balance endpoint" instead of
  probing.
- **A failed lookup is not a verdict:** unlike `自检`, a balance read never marks
  a key, because an account endpoint says nothing about whether a key can serve.

## Failure reasons

A rejected key keeps the verdict that rejected it, not just a timestamp:
`{ at, code, message }`, with the provider's text trimmed to one line. The
`已失效` badge shows it on hover — `401 USER_INACTIVE · 11-18 11:20` — which is
the difference between a dead key and a dead relay. Pre-1.2 marks (a bare
timestamp) still read.

## The Host route

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/dsh-channel-key/pool?provider=kk&ref=KK_API_KEY` | The pool, masks included |
| `POST` | same path | One operation: `{ op: 'add', keys }`, `{ op: 'remove' \| 'restore' \| 'activate', slot }`, `{ op: 'move', slot, delta }`, `{ op: 'clear' }`, `{ op: 'probe' }`, `{ op: 'balance', refresh? }` |

A Host that predates this route answers 404; the card then falls back to the
single-key editor it shipped before, so a stale Host never breaks the button.

## Storage

- Keys: the profile's credential store, one reference per slot — 0600, atomic
  writes, one lock, the same store the Models page writes.
- Pool document: `$DSH_HOME/.dsh-channel-key/pools.json` (or `~/.dsh/...`),
  holding only references, order, the active slot, and failure marks. **No key
  value is ever written there** — a test asserts it.
- A channel that already had a single key is imported as slot 1 the first time
  the card is opened, so upgrading loses nothing.

## Behavior and limits

- Reads are redacted: the field starts empty; stored values only ever appear as
  the Host's masked preview.
- Validation mirrors the Models page: after trimming, a key must be non-empty
  printable ASCII with no wrapping quotes and no `NAME=value` shape.
- `deepseek-account` channels have no editable key and the card says so. A
  session with no selected model shows that instead of a field.
- Editing the same reference from the Models page changes `<REF>` directly; the
  pool keeps its own slots, so the card's `当前使用` marker stays the Host's
  truth until the next rotation.
- The pool is shared by the whole profile: subtasks, title generation, and every
  other request on that provider resolve the same reference.
- Turning the plugin off removes only the button; slots and the pool document
  stay, and `<REF>` keeps working exactly as it did before the pool existed.

## Files

| File | Role |
|---|---|
| `index.js` | Host half — pool route, rotation listeners, pool document IO |
| `lib/pool.js` | Pool model and persistence adapter, no Cordis or filesystem of its own |
| `client/client.js` | Browser half — header slot registration, card, pool edits |
| `cordis.patch.yml` | Inserts the bundle row |
| `locale/*.json` | Plugin Manager title and description |
| `test/pool.test.mjs` | Pool model: import, order, marks, sweep, remove/clear, no secrets on disk |
| `test/rotate.test.mjs` | Trigger rules and the per-step rotation budget |
| `test/probe.test.mjs` | Probe request shape and the verdict rules |
| `test/balance.test.mjs` | Balance request shape and the reading rules |
| `test/wiring.test.mjs` | `apply()` against a fake Host: route, rotation, budget, self-check, no secrets on disk |
| `test/smoke.mjs` | Browser half without a browser (pure rules, Host reads, renders) |

## Trying it

```sh
npm test          # both node --test files, then the browser smoke test
```

Real failover needs two keys on one channel: add a deliberately wrong key first
and a working one second, then send a message. The conversation shows a retry
row, and the card's `#1` turns 已失效 while `#2` becomes 当前使用.
