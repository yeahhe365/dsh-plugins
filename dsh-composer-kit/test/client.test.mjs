/**
 * dsh-composer-kit — client half tests.
 *
 * The merged browser bundle cannot be checked by a bundler (there is none): the
 * client roster only evaluates `window.__ModuleLoader__.load({ id, factory })`.
 * These tests do what the page does — register the module, call the factory with
 * a mock `require`, apply the returned plugin against a mock client context —
 * and assert that all five merged controls still land in the slots they used to
 * own, with the same ids and order values.
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const here = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(here, '..')
const bundlePath = join(pkgRoot, 'client', 'client.js')
const code = readFileSync(bundlePath, 'utf8')

/**
 * Where the five pre-merge source packages live: `../sources` in the repo
 * layout, otherwise the profile's `.vendor` directory.
 */
const SOURCES_ROOT = (() => {
  const override = process.env.DSH_COMPOSER_SOURCES
  if (override) return resolve(override)
  const repoSources = resolve(pkgRoot, '..', 'sources')
  if (existsSync(repoSources)) return repoSources
  const profile = process.env.DSH_PROFILE_DIR ?? 'C:/Users/yeahhe/.dsh/profiles/desktop'
  return join(profile, '.vendor')
})()

/** The five sources, in the order the build script merges them. */
const SOURCES = [
  join(SOURCES_ROOT, 'dsh-client-ui-new-session/lib/client.js'),
  join(SOURCES_ROOT, 'dsh-client-ui-compact-button/lib/client.js'),
  join(SOURCES_ROOT, 'dsh-client-ui-brief-send/lib/client.js'),
  join(SOURCES_ROOT, 'dsh-client-ui-composer-dock-wrap/lib/client.js'),
  join(SOURCES_ROOT, 'dsh-call-meter/client/client.js'),
]

/** Any property access, call or construction resolves to itself. */
const anyProxy = new Proxy(function () {}, {
  get: () => anyProxy,
  apply: () => anyProxy,
  construct: () => anyProxy,
})

/** The slice of `document` the pieces touch while loading and applying. */
function makeDocument() {
  const created = []
  const head = {
    appendChild(tag) {
      tag.parentNode = head
      created.push(tag)
      return tag
    },
  }
  const doc = {
    head,
    getElementById: () => null,
    querySelector: () => null,
    createElement: (tagName) => ({
      tagName,
      id: '',
      dataset: {},
      textContent: '',
      parentNode: null,
      remove() {
        this.parentNode = null
      },
    }),
  }
  return { doc, created }
}

/**
 * Evaluate the bundle exactly like the page does.
 *
 * @returns {{ module: object, doc: object, created: object[] }}
 */
function loadBundle() {
  let module
  const window = {
    __ModuleLoader__: {
      load(mod) {
        module = mod
      },
    },
  }
  const { doc, created } = makeDocument()
  const require = () => anyProxy
  // eslint-disable-next-line no-new-func -- the page evaluates this file as a script.
  new Function('window', 'document', 'require', code)(window, doc, require)
  return { module, doc, created }
}

/** Mock client root context: records every registration the pieces make. */
function makeContext() {
  const slots = []
  const locales = []
  const effects = []
  const ctx = {
    effect(fn, label) {
      effects.push(label)
      return fn()
    },
    get() {
      return undefined
    },
    locale: {
      register(namespace) {
        locales.push(namespace)
        return () => {}
      },
      bind() {
        return (key) => key
      },
    },
    slots: {
      inject(_name, register) {
        return register()
      },
      register(options) {
        slots.push(options)
        return () => {}
      },
    },
    sessions: {
      binding() {
        return undefined
      },
    },
    uiWorkspace: {
      startSession() {},
    },
  }
  return { ctx, slots, locales, effects }
}

test('registers exactly one module under the package name', () => {
  const { module } = loadBundle()
  assert.ok(module, 'the bundle must call window.__ModuleLoader__.load')
  assert.equal(module.id, 'dsh-composer-kit')
  assert.equal(typeof module.factory, 'function')
})

test('factory returns the union of the five client service dependencies', () => {
  const { module } = loadBundle()
  const plugin = module.factory(() => anyProxy)
  assert.deepEqual(plugin.inject, ['slots', 'locale', 'sessions', 'uiWorkspace'])
  assert.equal(typeof plugin.apply, 'function')
})

test('each UI piece installs its own stylesheet when the factory runs', () => {
  const { module, created } = loadBundle()
  assert.equal(created.length, 0, 'registering the module does not touch the document')
  module.factory(() => anyProxy)
  assert.equal(created.length, 4, 'new-session, compact, brief-send and dock-wrap ship CSS')
  for (const tag of created) assert.equal(tag.tagName, 'style')
  assert.ok(
    created.some((tag) => tag.textContent.includes('flex-wrap:wrap!important')),
    'the dock wrap rules are the ones shipped',
  )
})

test('apply registers the four composer slots with their original ids and orders', () => {
  const { module } = loadBundle()
  const plugin = module.factory(() => anyProxy)
  const { ctx, slots } = makeContext()
  plugin.apply(ctx)

  const byId = Object.fromEntries(slots.map((slot) => [slot.id, slot]))
  assert.deepEqual(Object.keys(byId).sort(), [
    'brief-send',
    'call-meter',
    'compact-context',
    'new-session',
  ])

  assert.equal(byId['new-session'].name, 'conversation.input.left')
  assert.equal(byId['new-session'].order, -100)

  assert.equal(byId['compact-context'].name, 'conversation.input.right')
  assert.equal(byId['compact-context'].order, 0)

  assert.equal(byId['brief-send'].name, 'conversation.input.right')
  assert.equal(byId['brief-send'].order, 1)

  assert.equal(byId['call-meter'].name, 'conversation.composer.dock')
  assert.equal(byId['call-meter'].order, 3)
})

test('apply registers every locale dictionary and the meter stylesheet', () => {
  const { module, created } = loadBundle()
  const plugin = module.factory(() => anyProxy)
  const { ctx, locales, effects } = makeContext()
  plugin.apply(ctx)

  assert.deepEqual(locales.sort(), ['brief-send', 'call-meter', 'compact-button', 'new-session'])
  assert.equal(created.length, 5, 'the meter adds its own stylesheet on apply')
  assert.ok(
    effects.some((label) => label === 'composer-dock-wrap: stylesheet'),
    'the dock stylesheet keeps its teardown',
  )
  assert.ok(
    effects.some((label) => label === 'call-meter: styles'),
    'the meter keeps its teardown',
  )
})

test('every piece body is byte-identical to its source factory', () => {
  /* The merge must not edit behaviour: each banner in the bundle is followed by
   * the source factory body verbatim. */
  for (const source of SOURCES) {
    if (!existsSync(source)) {
      assert.fail(`source package missing: ${source}`)
    }
    const text = readFileSync(source, 'utf8').split('\n')
    while (text.length > 0 && text[text.length - 1].trim() === '') text.pop()
    text.pop() // loader close
    text.pop() // factory brace
    const open = text.findIndex((line) => /\bfactory\b/.test(line))
    const body = text.slice(open + 1).join('\n')
    assert.ok(code.includes(body), `merged bundle lost the body of ${source}`)
  }
})
