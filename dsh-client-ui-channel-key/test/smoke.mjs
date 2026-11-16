/**
 * Smoke test for the browser half, run without a browser.
 *
 * It loads `client/client.js` in a VM context whose `window.__ModuleLoader__`
 * captures the lazy factory, swaps React for a hook shim that can be driven
 * into any state, and then exercises the pure rules, the Host reads against a
 * fake `ctx`, and one render per phase. A render that throws is exactly what
 * blanks a slot entry in the page, so the phases are the point of the test.
 *
 * Run: node test/smoke.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createContext, runInContext } from 'node:vm'

const source = readFileSync(fileURLToPath(new URL('../client/client.js', import.meta.url)), 'utf8')

/* ---------------------------------------------------------------- harness */

/** A React stand-in: elements are plain objects, hooks read a supplied plan. */
function makeReact(plan) {
  let cursor = 0
  const react = {
    createElement(type, props, ...children) {
      return { type, props: props === null || props === undefined ? {} : props, children: children.flat(Infinity) }
    },
    Fragment: 'Fragment',
    memo: (fn) => fn,
    useRef(initial) {
      const index = cursor++
      return { current: plan.refs !== undefined && index in plan.refs ? plan.refs[index] : initial }
    },
    useState(initial) {
      const index = cursor++
      return [plan.states !== undefined && index in plan.states ? plan.states[index] : initial, () => {}]
    },
    useMemo(factory) {
      cursor++
      return factory()
    },
    useCallback(fn) {
      cursor++
      return fn
    },
    useEffect() {
      cursor++
    },
  }
  return react
}

/** Load the bundle and return its exports, with a fresh React per call. */
function loadPlugin(plan = {}) {
  let captured = null
  const sandbox = {
    window: { __ModuleLoader__: { load: (mod) => { captured = mod } }, innerWidth: 1280, innerHeight: 800, addEventListener() {}, removeEventListener() {} },
    document: { body: {}, addEventListener() {}, removeEventListener() {} },
    navigator: { language: 'zh-CN' },
    console,
  }
  runInContext(source, createContext(sandbox))
  assert.ok(captured !== null, 'the bundle registered no module')
  assert.equal(captured.id, 'dsh-client-ui-channel-key')
  const react = makeReact(plan)
  const exports = captured.factory((id) => {
    if (id === 'react') return react
    if (id === 'react-dom') return { createPortal: (node) => node }
    throw new Error(`unexpected module: ${id}`)
  })
  return { exports, sandbox }
}

/** Walk a rendered tree, collecting every element that has one of the attributes. */
function findByAttr(tree, attribute) {
  const found = []
  const visit = (node) => {
    if (node === null || typeof node !== 'object') return
    if (Array.isArray(node)) { node.forEach(visit); return }
    if (node.props !== undefined && attribute in node.props) found.push(node)
    ;(node.children || []).forEach(visit)
  }
  visit(tree)
  return found
}

/** Flatten an element's text content. */
function textOf(tree) {
  const parts = []
  const visit = (node) => {
    if (node === null || node === undefined || typeof node === 'boolean') return
    if (typeof node === 'string' || typeof node === 'number') { parts.push(String(node)); return }
    if (Array.isArray(node)) { node.forEach(visit); return }
    ;(node.children || []).forEach(visit)
  }
  visit(tree)
  return parts.join(' ')
}

const channel = {
  provider: 'kk',
  providerName: 'KK',
  model: 'deepseek-v4.1-flash',
  ref: 'KK_API_KEY',
  derived: false,
  ns: 'llm-pi-ai',
  path: ['providers', 'kk'],
  revision: 7,
  info: { configured: true, writable: true, masked: 'sk-…a1b2' },
  account: false,
}

/* ------------------------------------------------------------------- pure */

{
  const { exports } = loadPlugin()
  const { keyFailure, deriveKeyRef, valueAt } = exports.__internals

  assert.equal(keyFailure(''), 'error.empty')
  assert.equal(keyFailure('   '), 'error.empty')
  assert.equal(keyFailure('sk-abc123'), null)
  assert.equal(keyFailure(' sk-abc123 '), null)
  assert.equal(keyFailure('NAME=value'), 'error.illegal')
  assert.equal(keyFailure('"sk-abc"'), 'error.illegal')
  assert.equal(keyFailure('sk abc'), 'error.illegal')
  assert.equal(keyFailure('sk-密钥'), 'error.illegal')

  assert.equal(deriveKeyRef('kk'), 'KK_API_KEY')
  assert.equal(deriveKeyRef('minimax-cn'), 'MINIMAX_CN_API_KEY')
  assert.equal(deriveKeyRef('a.b c'), 'A_B_C_API_KEY')

  assert.equal(valueAt({ providers: { kk: { apiKeyEnv: 'KK_API_KEY' } } }, ['providers', 'kk', 'apiKeyEnv']), 'KK_API_KEY')
  assert.equal(valueAt({ providers: {} }, ['providers', 'kk', 'apiKeyEnv']), undefined)
  assert.equal(valueAt(undefined, ['providers']), undefined)
  assert.equal(valueAt({ a: [1, 2] }, ['a', 1]), 2)
  assert.equal(valueAt({ a: 1 }, []).a, 1)

  const position = exports.__internals.anchorPosition({ right: 1800, bottom: 100 })
  assert.equal(position.left, 1280 - 360 - 12)
  assert.equal(position.top, 108)
  const narrow = exports.__internals.anchorPosition({ right: 100, bottom: 900 })
  assert.equal(narrow.left, 12)
  assert.equal(narrow.top, 800 - 340)
  console.log('ok  pure rules')
}

/* ------------------------------------------------------------ host reads */

function fakeContext(options = {}) {
  const calls = []
  const ctx = {
    modelDirectories: {
      directoryFor() {
        if (options.noDirectory === true) throw new Error('no directory')
        return {
          load: async () => {},
          store: { getSnapshot: () => options.snapshot ?? { current: { provider: 'kk', model: 'deepseek-v4.1-flash' }, groups: [{ id: 'kk', name: 'KK', models: [] }] } },
        }
      },
    },
    remote: {
      llm: {
        listConfigurableProviders: async () => options.providers ?? {
          ok: true,
          value: [{ provider: 'kk', displayName: 'KK', settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'kk'] }],
        },
      },
      settings: {
        describe: async () => options.settings ?? {
          ok: true,
          value: { writable: true, namespaces: [{ ns: 'llm-pi-ai', revision: 7, value: { providers: { kk: { apiKeyEnv: 'KK_API_KEY' } } } }] },
        },
        mutate: async (ns, ops, revision) => {
          calls.push(['settings.mutate', ns, ops, revision])
          return options.mutateResult ?? { ok: true, value: { revision: 8 } }
        },
      },
      credentials: {
        describe: async (refs) => {
          calls.push(['credentials.describe', refs])
          return options.describeResult ?? { ok: true, value: { [refs[0]]: { configured: true, writable: true, masked: 'sk-…a1b2' } } }
        },
        set: async (ref, value) => {
          calls.push(['credentials.set', ref, value])
          return options.setResult ?? { ok: true, value: undefined }
        },
        unset: async (ref) => {
          calls.push(['credentials.unset', ref])
          return options.unsetResult ?? { ok: true, value: undefined }
        },
      },
    },
  }
  return { ctx, calls }
}

{
  const { exports } = loadPlugin()
  const { resolveChannel, saveCredential, clearCredential } = exports.__internals

  const named = fakeContext()
  const resolved = await resolveChannel(named.ctx, 's1')
  assert.equal(resolved.provider, 'kk')
  assert.equal(resolved.providerName, 'KK')
  assert.equal(resolved.model, 'deepseek-v4.1-flash')
  assert.equal(resolved.ref, 'KK_API_KEY')
  assert.equal(resolved.derived, false)
  assert.equal(resolved.ns, 'llm-pi-ai')
  assert.equal(resolved.revision, 7)
  assert.equal(resolved.path.join('/'), 'providers/kk')
  assert.equal(resolved.info.masked, 'sk-…a1b2')

  const unnamed = fakeContext({
    settings: { ok: true, value: { writable: true, namespaces: [{ ns: 'llm-pi-ai', revision: 3, value: { providers: { kk: { baseURL: 'https://example.test' } } } }] } },
    describeResult: { ok: true, value: { KK_API_KEY: { configured: false, writable: true } } },
  })
  const derived = await resolveChannel(unnamed.ctx, 's1')
  assert.equal(derived.ref, 'KK_API_KEY')
  assert.equal(derived.derived, true)
  assert.equal(derived.info.configured, false)

  const saved = await saveCredential(unnamed.ctx, derived, 'sk-new')
  assert.equal(saved.ok, true)
  assert.equal(derived.derived, false, 'the reference is declared now, so the note goes away')
  const mutateCall = unnamed.calls.find((call) => call[0] === 'settings.mutate')
  assert.ok(mutateCall !== undefined, 'a derived reference writes apiKeyEnv')
  assert.equal(mutateCall[1], 'llm-pi-ai')
  assert.equal(mutateCall[2].length, 1)
  assert.equal(mutateCall[2][0].op, 'set')
  assert.equal(mutateCall[2][0].path.join('/'), 'providers/kk/apiKeyEnv')
  assert.equal(mutateCall[2][0].value, 'KK_API_KEY')
  assert.equal(mutateCall[3], 3)
  const setCall = unnamed.calls.find((call) => call[0] === 'credentials.set')
  assert.ok(setCall !== undefined, 'the key is stored')
  assert.equal(setCall[1], 'KK_API_KEY')
  assert.equal(setCall[2], 'sk-new')
  assert.ok(unnamed.calls.indexOf(mutateCall) < unnamed.calls.indexOf(setCall), 'the reference is written before the key')

  const namedSave = fakeContext()
  await saveCredential(namedSave.ctx, await resolveChannel(namedSave.ctx, 's1'), 'sk-2')
  assert.equal(namedSave.calls.some((call) => call[0] === 'settings.mutate'), false, 'a named reference needs no settings write')

  const refused = fakeContext({ mutateResult: { ok: false, error: { code: 'settings/conflict', message: 'stale' } } })
  const refusedChannel = await resolveChannel(fakeContext({ settings: { ok: true, value: { writable: true, namespaces: [{ ns: 'llm-pi-ai', revision: 1, value: { providers: { kk: {} } } }] } } }).ctx, 's1')
  const refusedSave = await saveCredential(refused.ctx, refusedChannel, 'sk-3')
  assert.equal(refusedSave.ok, false)
  assert.equal(refusedSave.message, 'stale')
  assert.equal(refused.calls.some((call) => call[0] === 'credentials.set'), false)

  const setFailed = fakeContext({ setResult: { ok: false, error: { code: 'credential/rejected', message: 'read-only store' } } })
  const failedSave = await saveCredential(setFailed.ctx, channel, 'sk-4')
  assert.equal(failedSave.ok, false)
  assert.equal(failedSave.message, 'read-only store')

  const cleared = await clearCredential(fakeContext().ctx, channel)
  assert.equal(cleared.ok, true)

  const account = await resolveChannel(fakeContext({ snapshot: { current: { provider: 'deepseek-account', model: 'x' }, groups: [] } }).ctx, 's1')
  assert.equal(account.account, true)
  assert.equal(account.ref, undefined)

  const missing = await resolveChannel(fakeContext({ noDirectory: true }).ctx, 's1')
  assert.equal(missing.provider, undefined)

  const noSettings = await resolveChannel(fakeContext({ settings: { ok: false, error: { code: 'gateway/internal', message: 'absent' } } }).ctx, 's1')
  assert.equal(noSettings.ref, 'KK_API_KEY')
  assert.equal(noSettings.derived, true)
  assert.equal(noSettings.ns, undefined)
  console.log('ok  host reads and writes')
}

/* ---------------------------------------------------------------- renders */

function render(statePlan, extra = {}) {
  const plan = { states: { 0: statePlan.open === true, 1: statePlan.view, 2: '', 3: false, 4: false, 5: statePlan.notice ?? null, 6: { top: 100, left: 200 } } }
  const { exports, sandbox } = loadPlugin(plan)
  const face = {
    translate: (key) => key,
    resolve: async () => statePlan.channel,
    describe: async () => statePlan.channel === null ? undefined : statePlan.channel.info,
    save: async () => ({ ok: true }),
    clear: async () => ({ ok: true }),
  }
  return exports.__internals.ChannelKeyButton({ sessionId: 's1', channelKey: extra.noFace === true ? undefined : face, ...extra.props })
}

{
  // Closed: only the button is on the page.
  const closed = render({ open: false, view: { phase: 'loading', channel: null, message: null } })
  assert.equal(findByAttr(closed, 'data-chk-btn').length, 1)
  assert.equal(findByAttr(closed, 'data-chk-pop').length, 0)
  assert.equal(findByAttr(closed, 'data-chk-style').length, 1)
  const button = findByAttr(closed, 'data-chk-btn')[0]
  assert.equal(button.props['aria-label'], 'action.open')
  assert.equal(button.props['aria-haspopup'], 'dialog')
  assert.equal(button.props['aria-expanded'], 'false')

  // Open on a resolvable channel: the card carries the channel, the reference and the field.
  const ready = render({ open: true, view: { phase: 'ready', channel, message: null } })
  const card = findByAttr(ready, 'data-chk-pop')
  assert.equal(card.length, 1)
  assert.equal(card[0].props.role, 'dialog')
  assert.equal(card[0].props.style.top, '100px')
  assert.equal(card[0].props.style.left, '200px')
  const text = textOf(ready)
  assert.match(text, /dialog\.title/)
  assert.match(text, /KK/)
  assert.match(text, /deepseek-v4\.1-flash/)
  assert.match(text, /KK_API_KEY/)
  assert.match(text, /status\.configured/)
  assert.match(text, /sk-…a1b2/)
  assert.equal(findByAttr(ready, 'data-chk-input').length, 1)
  assert.equal(findByAttr(ready, 'data-chk-input')[0].props.type, 'password')
  assert.equal(findByAttr(ready, 'data-chk-input')[0].props.placeholder, 'field.placeholder.saved')
  assert.equal(findByAttr(ready, 'data-chk-action').length, 3)
  assert.equal(findByAttr(ready, 'data-chk-reveal').length, 1)

  // A channel with no stored key shows the empty placeholder and a missing status.
  const empty = render({ open: true, view: { phase: 'ready', channel: { ...channel, info: { configured: false, writable: true } }, message: null } })
  assert.equal(findByAttr(empty, 'data-chk-input')[0].props.placeholder, 'field.placeholder.empty')
  assert.match(textOf(empty), /status\.missing/)

  // A derived reference explains the settings write; the undeclared case says otherwise.
  const derivedCard = render({ open: true, view: { phase: 'ready', channel: { ...channel, derived: true }, message: null } })
  assert.match(textOf(derivedCard), /notice\.derived/)
  const undeclared = render({ open: true, view: { phase: 'ready', channel: { ...channel, derived: true, ns: undefined }, message: null } })
  assert.match(textOf(undeclared), /notice\.undeclared/)

  // Account channels and empty sessions explain themselves instead of showing a field.
  const accountCard = render({ open: true, view: { phase: 'ready', channel: { ...channel, provider: 'deepseek-account', account: true, ref: undefined }, message: null } })
  assert.match(textOf(accountCard), /notice\.account/)
  assert.equal(findByAttr(accountCard, 'data-chk-input').length, 0)
  const noProvider = render({ open: true, view: { phase: 'ready', channel: { provider: undefined, ref: undefined, account: false, derived: false, path: [] }, message: null } })
  assert.match(textOf(noProvider), /notice\.noProvider/)
  assert.equal(findByAttr(noProvider, 'data-chk-input').length, 0)

  // Loading and failure states keep the card usable.
  const loading = render({ open: true, view: { phase: 'loading', channel: null, message: null } })
  assert.match(textOf(loading), /state\.loading/)
  const failed = render({ open: true, view: { phase: 'error', channel: null, message: 'boom' } })
  assert.match(textOf(failed), /boom/)
  assert.equal(findByAttr(failed, 'data-chk-action').length, 2)

  // A notice replaces neither the card nor its actions.
  const saved = render({ open: true, view: { phase: 'ready', channel, message: null }, notice: { kind: 'saved', text: 'state.saved' } })
  assert.match(textOf(saved), /state\.saved/)
  const refusedNotice = render({ open: true, view: { phase: 'ready', channel, message: null }, notice: { kind: 'error', text: 'nope' } })
  assert.match(textOf(refusedNotice), /nope/)

  // Without the injected face the component still renders (and reports the load failure).
  const noFace = render({ open: false, view: { phase: 'loading', channel: null, message: null } }, { noFace: true })
  assert.equal(findByAttr(noFace, 'data-chk-btn').length, 1)
  console.log('ok  renders')
}

console.log('\nall smoke checks passed')



