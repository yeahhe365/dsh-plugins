window.__ModuleLoader__.load({
  id: 'dsh-client-ui-channel-key',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    var React = require('react')
    var ReactDOM = require('react-dom')
    var h = React.createElement

    /** Dictionary namespace owned by this plugin. */
    var NS = 'channel-key'

    /** The header list seat this button joins. */
    var SLOT = 'conversation.session.header.utilities'

    /* ------------------------------------------------------------------ *
     * Styles
     *
     * Rendered as part of the component tree, so unmounting the header takes
     * the sheet with it. Every colour is a `--dsw-*` token, which keeps the
     * control correct in both themes and lets a renamed token degrade the look
     * without breaking rendering.
     * ------------------------------------------------------------------ */
    var CSS = [
      '[data-chk-btn]{display:grid;place-items:center;width:28px;height:28px;flex:none;padding:0;',
      'border:none;border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);',
      'cursor:pointer;transition:background-color .12s,color .12s}',
      '[data-chk-btn]:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '[data-chk-btn]:active{background:var(--dsw-alias-interactive-bg-hover-solid,var(--dsw-alias-interactive-bg-hover))}',
      '[data-chk-btn]:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}',
      '[data-chk-btn][data-open]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '[data-chk-btn] svg{width:16px;height:16px;display:block}',

      '[data-chk-pop]{position:fixed;z-index:1300;display:flex;flex-direction:column;gap:10px;width:360px;',
      'max-width:calc(100vw - 24px);box-sizing:border-box;padding:14px;border:.5px solid var(--dsw-alias-border-l1);',
      'border-radius:var(--dsw-radius-md,12px);background:var(--dsw-menu-surface-fill,var(--dsw-alias-bg-layer-1));',
      '-webkit-backdrop-filter:var(--dsw-menu-backdrop-filter);backdrop-filter:var(--dsw-menu-backdrop-filter);',
      'box-shadow:var(--dsw-elevation-prominent,var(--dsw-shadow-lv2));color:var(--dsw-alias-label-primary);',
      'font-size:13px;line-height:1.45}',

      '[data-chk-head]{display:flex;align-items:flex-start;gap:8px}',
      '[data-chk-title]{flex:1;min-width:0;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '[data-chk-iconbtn]{display:grid;place-items:center;width:22px;height:22px;flex:none;padding:0;border:none;',
      'border-radius:999px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}',
      '[data-chk-iconbtn]:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '[data-chk-iconbtn]:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}',

      '[data-chk-channel]{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:0}',
      '[data-chk-chip]{padding:1px 6px;border-radius:var(--dsw-radius-sm,6px);',
      'background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-size:12px;',
      'max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '[data-chk-muted]{color:var(--dsw-alias-label-tertiary);font-size:12px}',
      '[data-chk-code]{font-family:var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:12px;',
      'color:var(--dsw-alias-label-secondary);word-break:break-all}',

      '[data-chk-status]{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary);min-width:0}',
      '[data-chk-dot]{width:6px;height:6px;flex:none;border-radius:50%;background:var(--dsw-alias-label-dimmed)}',
      '[data-chk-status="configured"] [data-chk-dot]{background:var(--dsw-alias-state-success-primary,var(--dsw-alias-state-business-primary))}',
      '[data-chk-status="missing"] [data-chk-dot]{background:var(--dsw-alias-state-error-primary)}',
      '[data-chk-mask]{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
      'font-family:var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace)}',

      '[data-chk-field]{position:relative;display:flex;align-items:center}',
      '[data-chk-input]{flex:1;min-width:0;height:30px;box-sizing:border-box;padding:0 52px 0 8px;',
      'border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm,6px);',
      'background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;',
      'font-family:inherit;outline:none}',
      '[data-chk-input]:focus{border-color:var(--dsw-alias-state-business-primary)}',
      '[data-chk-input]:disabled{color:var(--dsw-alias-label-dimmed)}',
      '[data-chk-reveal]{position:absolute;top:0;right:0;height:30px;padding:0 8px;border:none;background:transparent;',
      'color:var(--dsw-alias-label-tertiary);font-size:12px;cursor:pointer}',
      '[data-chk-reveal]:hover{color:var(--dsw-alias-label-primary)}',

      '[data-chk-note]{font-size:12px;color:var(--dsw-alias-label-tertiary)}',
      '[data-chk-error]{font-size:12px;color:var(--dsw-alias-state-error-primary)}',
      '[data-chk-saved]{font-size:12px;color:var(--dsw-alias-state-success-primary,var(--dsw-alias-state-business-primary))}',

      '[data-chk-actions]{display:flex;align-items:center;gap:8px}',
      '[data-chk-spacer]{flex:1}',
      '[data-chk-action]{height:28px;padding:0 10px;border:.5px solid transparent;border-radius:var(--dsw-radius-sm,6px);',
      'background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;font-family:inherit;cursor:pointer}',
      '[data-chk-action]:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '[data-chk-action]:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}',
      '[data-chk-action]:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}',
      '[data-chk-action][data-variant="primary"]{border-color:var(--dsw-alias-border-l1);',
      'color:var(--dsw-alias-state-business-primary);font-weight:600}',
      '[data-chk-action][data-variant="primary"]:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
    ].join('')

    /* ------------------------------------------------------------------ *
     * Copy
     * ------------------------------------------------------------------ */
    var zh = {
      'action.open': '编辑模型渠道密钥',
      'dialog.title': '模型渠道密钥',
      'dialog.channel': '当前渠道',
      'dialog.credential': '凭证引用',
      'field.label': 'API 密钥',
      'field.placeholder.empty': '粘贴密钥',
      'field.placeholder.saved': '已保存，输入新密钥可替换',
      'field.show': '显示',
      'field.hide': '隐藏',
      'status.configured': '已配置',
      'status.missing': '未配置',
      'status.unknown': '状态未知',
      'action.save': '保存',
      'action.clear': '清除密钥',
      'action.cancel': '取消',
      'action.close': '关闭',
      'action.retry': '重试',
      'state.loading': '读取渠道配置…',
      'state.saving': '保存中…',
      'state.saved': '已保存，下一次请求生效',
      'state.cleared': '已清除该渠道的密钥',
      'error.empty': '密钥不能为空',
      'error.illegal': '密钥只能是可见 ASCII 字符，不能带引号，也不能是 NAME=value 形式',
      'error.load': '读取渠道配置失败',
      'notice.noProvider': '当前会话还没有选中的模型渠道',
      'notice.account': '该渠道通过 DeepSeek 账号登录，没有可编辑的 API 密钥',
      'notice.derived': '该渠道配置里还没有 apiKeyEnv，保存时会一并写入这条凭证引用。',
      'notice.undeclared': '设置里找不到这条渠道的配置项，密钥只按引用保存，可能不会被使用。',
      'notice.scope': '密钥写入本机 profile 的凭证存储，不会写进对话记录。',
    }

    var en = {
      'action.open': 'Edit channel API key',
      'dialog.title': 'Channel API key',
      'dialog.channel': 'Channel',
      'dialog.credential': 'Credential',
      'field.label': 'API key',
      'field.placeholder.empty': 'Paste the key',
      'field.placeholder.saved': 'Saved — type a new key to replace it',
      'field.show': 'Show',
      'field.hide': 'Hide',
      'status.configured': 'Configured',
      'status.missing': 'Not configured',
      'status.unknown': 'Unknown',
      'action.save': 'Save',
      'action.clear': 'Clear key',
      'action.cancel': 'Cancel',
      'action.close': 'Close',
      'action.retry': 'Retry',
      'state.loading': 'Reading channel configuration…',
      'state.saving': 'Saving…',
      'state.saved': 'Saved — the next request uses it',
      'state.cleared': 'The channel key was cleared',
      'error.empty': 'The key cannot be empty',
      'error.illegal': 'A key holds printable ASCII only, with no quotes and no NAME=value form',
      'error.load': 'Could not read the channel configuration',
      'notice.noProvider': 'This session has no model channel selected yet',
      'notice.account': 'This channel signs in with a DeepSeek account and has no editable API key',
      'notice.derived': 'This channel names no apiKeyEnv yet; saving writes that credential reference too.',
      'notice.undeclared': 'No settings entry describes this channel, so the key is stored by reference only and may go unused.',
      'notice.scope': 'The key is stored in this profile\'s credential store, never in the transcript.',
    }

    /** Translation fallback for the (unexpected) case where no bound translate arrives. */
    function fallbackTranslate(key) {
      var dictionary = (typeof navigator !== 'undefined' && (navigator.language || 'en').toLowerCase().indexOf('zh') === 0) ? zh : en
      return dictionary[key] === undefined ? key : dictionary[key]
    }

    /* ------------------------------------------------------------------ *
     * Key rules
     *
     * Mirrors the judgement the Models settings page makes, so a key this
     * editor accepts is one that page would accept too: after trimming it must
     * be non-empty printable ASCII without a wrapping quote pair, because that
     * is exactly what an HTTP header value can carry.
     * ------------------------------------------------------------------ */
    var LEGAL_API_KEY = /^[\x21-\x7E]+$/
    var ENV_LINE = /^[A-Z][A-Z0-9_]*=[^=]/

    function isQuoted(value) {
      var first = value.charAt(0)
      if (first !== '"' && first !== '\'' && first !== '`') return false
      return value.length > 1 && value.charAt(value.length - 1) === first
    }

    /**
     * Judge the key input's current value.
     * @param {string} draft - the field's value, untrimmed.
     * @returns {string|null} a copy key for a field-level failure, or null.
     */
    function keyFailure(draft) {
      if (draft.length === 0) return 'error.empty'
      var value = draft.trim()
      if (value.length === 0) return 'error.empty'
      if (ENV_LINE.test(value) || isQuoted(value)) return 'error.illegal'
      if (!LEGAL_API_KEY.test(value)) return 'error.illegal'
      return null
    }

    /* ------------------------------------------------------------------ *
     * Host reads and writes
     * ------------------------------------------------------------------ */

    /** @param {unknown} error @returns {string} */
    function messageOf(error) {
      return error instanceof Error ? error.message : String(error)
    }

    /**
     * The conventional credential reference a route derives when its profile
     * names none — the same rule the Models settings page applies.
     * @param {string} provider - route id, e.g. `kk` or `minimax-cn`.
     * @returns {string} e.g. `KK_API_KEY`.
     */
    function deriveKeyRef(provider) {
      return String(provider).toUpperCase().replace(/[^A-Z0-9]+/g, '_') + '_API_KEY'
    }

    /**
     * Walk a redacted settings value along a provider's settings path.
     * @param {unknown} value - the namespace's layered value.
     * @param {readonly string[]} path - path from the section root to the profile.
     * @returns {unknown} the node, or undefined when the path does not resolve.
     */
    function valueAt(value, path) {
      var node = value
      for (var index = 0; index < path.length; index += 1) {
        if (node === null || typeof node !== 'object') return undefined
        node = node[path[index]]
      }
      return node
    }

    /**
     * Describe one credential reference.
     * @param {any} ctx - client root context.
     * @param {string|undefined} ref - credential reference.
     * @returns {Promise<object|undefined>} the redacted credential facts.
     */
    async function describeCredential(ctx, ref) {
      if (ref === undefined) return undefined
      try {
        var response = await ctx.remote.credentials.describe([ref])
        return response.ok ? response.value[ref] : undefined
      } catch (error) {
        return undefined
      }
    }

    /**
     * Resolve the channel behind the current model selection: which provider
     * the composer's model seat has selected, the credential reference its
     * profile names (or the conventional one it would derive), and the current
     * redacted credential state.
     * @param {any} ctx - client root context.
     * @param {string} sessionId - the header's session.
     * @returns {Promise<object>} the channel facts the editor renders from.
     */
    async function resolveChannel(ctx, sessionId) {
      var channel = {
        provider: undefined,
        providerName: undefined,
        model: undefined,
        ref: undefined,
        derived: false,
        ns: undefined,
        path: [],
        revision: undefined,
        info: undefined,
        account: false,
      }

      try {
        var directory = ctx.modelDirectories.directoryFor(sessionId)
        try {
          await directory.load()
        } catch (error) {
          /* A failed catalog load keeps the last snapshot; the selection may still be known. */
        }
        var snapshot = directory.store.getSnapshot()
        var current = snapshot.current
        if (current !== null && current !== undefined) {
          channel.provider = current.provider
          channel.model = current.model
          var groups = snapshot.groups || []
          for (var index = 0; index < groups.length; index += 1) {
            if (groups[index].id === current.provider) channel.providerName = groups[index].name
          }
          if (channel.providerName === undefined) channel.providerName = current.provider
        }
      } catch (error) {
        /* An addressed subagent session has no model directory; the editor says so. */
      }

      if (channel.provider === undefined) return channel
      if (channel.provider === 'deepseek-account') {
        channel.account = true
        return channel
      }

      var listed = await ctx.remote.llm.listConfigurableProviders()
      var entry
      if (listed.ok) {
        for (var row = 0; row < listed.value.length; row += 1) {
          if (listed.value[row].provider === channel.provider) entry = listed.value[row]
        }
      }

      var profile
      if (entry !== undefined && entry.settingsNs !== '') {
        var described = await ctx.remote.settings.describe()
        if (described.ok) {
          var view
          for (var item = 0; item < described.value.namespaces.length; item += 1) {
            if (described.value.namespaces[item].ns === entry.settingsNs) view = described.value.namespaces[item]
          }
          if (view !== undefined) {
            channel.ns = view.ns
            channel.path = (entry.settingsPath || []).slice()
            channel.revision = view.revision
            profile = valueAt(view.value, channel.path)
          }
        }
      }

      var named = profile !== null && typeof profile === 'object' ? profile.apiKeyEnv : undefined
      if (typeof named === 'string' && named.length > 0) {
        channel.ref = named
      } else {
        channel.ref = deriveKeyRef(channel.provider)
        channel.derived = true
      }
      channel.info = await describeCredential(ctx, channel.ref)
      return channel
    }

    /**
     * Store one key for a channel. A channel whose profile names no reference
     * gets that reference written into its provider profile first, so the key
     * the user types is the key the next request resolves.
     * @param {any} ctx - client root context.
     * @param {object} channel - the resolved channel.
     * @param {string} value - the key to store.
     * @returns {Promise<{ok: boolean, message?: string}>} the outcome.
     */
    async function saveCredential(ctx, channel, value) {
      try {
        if (channel.derived && channel.ns !== undefined) {
          var ops = [{ op: 'set', path: channel.path.concat(['apiKeyEnv']), value: channel.ref }]
          var written = await ctx.remote.settings.mutate(channel.ns, ops, channel.revision)
          if (!written.ok) return { ok: false, message: written.error.message }
          channel.revision = written.value.revision
          /* The profile names the reference now, so the card stops explaining the write. */
          channel.derived = false
        }
        var stored = await ctx.remote.credentials.set(channel.ref, value)
        return stored.ok ? { ok: true } : { ok: false, message: stored.error.message }
      } catch (error) {
        return { ok: false, message: messageOf(error) }
      }
    }

    /**
     * Remove one channel's stored key.
     * @param {any} ctx - client root context.
     * @param {object} channel - the resolved channel.
     * @returns {Promise<{ok: boolean, message?: string}>} the outcome.
     */
    async function clearCredential(ctx, channel) {
      try {
        var removed = await ctx.remote.credentials.unset(channel.ref)
        return removed.ok ? { ok: true } : { ok: false, message: removed.error.message }
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : String(error) }
      }
    }

    /* ------------------------------------------------------------------ *
     * Placement
     * ------------------------------------------------------------------ */
    var POPOVER_WIDTH = 360

    /**
     * Anchor the card under the button, right-aligned, kept inside the viewport.
     * @param {DOMRect} rect - the button's box.
     * @returns {{top: number, left: number}} fixed coordinates.
     */
    function anchorPosition(rect) {
      var viewportWidth = window.innerWidth || 1280
      var viewportHeight = window.innerHeight || 800
      var left = Math.min(rect.right - POPOVER_WIDTH, viewportWidth - POPOVER_WIDTH - 12)
      if (left < 12) left = 12
      var top = Math.min(rect.bottom + 8, Math.max(12, viewportHeight - 340))
      return { top: top, left: left }
    }

    /* ------------------------------------------------------------------ *
     * Components
     * ------------------------------------------------------------------ */

    /** A key glyph drawn on the same 16px grid as the neighbouring header icons. */
    function KeyIcon() {
      return h('svg', {
        viewBox: '0 0 16 16',
        width: 16,
        height: 16,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
      },
      h('circle', { cx: 5.6, cy: 5.6, r: 2.9 }),
      h('path', { d: 'M7.7 7.7 13 13' }),
      h('path', { d: 'M9.9 9.9 11.6 8.2' }),
      h('path', { d: 'M11.5 11.5 13.2 9.8' }))
    }

    /** A close glyph sized for the card's corner control. */
    function CloseIcon() {
      return h('svg', {
        viewBox: '0 0 16 16',
        width: 14,
        height: 14,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.2,
        strokeLinecap: 'round',
        'aria-hidden': true,
      }, h('path', { d: 'M4 4 12 12M12 4 4 12' }))
    }

    var FIELD_SEQ = 0

    /**
     * The header control: one key button that opens the editor for the model
     * channel the composer currently points at.
     * @param {object} props - slot runtime props plus this plugin's injected face.
     * @returns {object} the button and, while open, its portaled card.
     */
    function ChannelKeyButton(props) {
      var face = props.channelKey
      var t = face !== undefined && typeof face.translate === 'function' ? face.translate : fallbackTranslate
      var sessionId = props.sessionId

      var openState = React.useState(false)
      var open = openState[0]
      var setOpen = openState[1]

      var viewState = React.useState({ phase: 'loading', channel: null, message: null })
      var view = viewState[0]
      var setView = viewState[1]

      var draftState = React.useState('')
      var draft = draftState[0]
      var setDraft = draftState[1]

      var revealState = React.useState(false)
      var reveal = revealState[0]
      var setReveal = revealState[1]

      var busyState = React.useState(false)
      var busy = busyState[0]
      var setBusy = busyState[1]

      var noticeState = React.useState(null)
      var notice = noticeState[0]
      var setNotice = noticeState[1]

      var positionState = React.useState(null)
      var position = positionState[0]
      var setPosition = positionState[1]

      var anchorRef = React.useRef(null)
      var cardRef = React.useRef(null)
      var inputRef = React.useRef(null)
      var generation = React.useRef(0)
      var fieldId = React.useMemo(function () {
        FIELD_SEQ += 1
        return 'chk-key-field-' + FIELD_SEQ
      }, [])

      var close = React.useCallback(function () {
        generation.current += 1
        setOpen(false)
        setDraft('')
        setReveal(false)
        setNotice(null)
        setBusy(false)
      }, [])

      var load = React.useCallback(function () {
        if (face === undefined) {
          setView({ phase: 'error', channel: null, message: t('error.load') })
          return
        }
        var mine = generation.current + 1
        generation.current = mine
        setView({ phase: 'loading', channel: null, message: null })
        Promise.resolve()
          .then(function () { return face.resolve(sessionId) })
          .then(function (channel) {
            if (generation.current !== mine) return
            setView({ phase: 'ready', channel: channel, message: null })
          }, function (error) {
            if (generation.current !== mine) return
            setView({ phase: 'error', channel: null, message: messageOf(error) })
          })
      }, [face, sessionId, t])

      var openDialog = React.useCallback(function () {
        var anchor = anchorRef.current
        setPosition(anchor === null ? { top: 96, left: 24 } : anchorPosition(anchor.getBoundingClientRect()))
        setDraft('')
        setReveal(false)
        setNotice(null)
        setBusy(false)
        setOpen(true)
        load()
      }, [load])

      /* Escape and an outside press both dismiss the card. */
      React.useEffect(function () {
        if (!open) return undefined
        function onKeyDown(event) {
          if (event.key !== 'Escape') return
          event.stopPropagation()
          event.preventDefault()
          close()
        }
        function onPointerDown(event) {
          var card = cardRef.current
          var anchor = anchorRef.current
          if (card !== null && card.contains(event.target)) return
          if (anchor !== null && anchor.contains(event.target)) return
          close()
        }
        document.addEventListener('keydown', onKeyDown, true)
        document.addEventListener('mousedown', onPointerDown, true)
        return function () {
          document.removeEventListener('keydown', onKeyDown, true)
          document.removeEventListener('mousedown', onPointerDown, true)
        }
      }, [open, close])

      /* The card keeps its anchor across a resize instead of drifting away from it. */
      React.useEffect(function () {
        if (!open) return undefined
        function onResize() {
          var anchor = anchorRef.current
          if (anchor !== null) setPosition(anchorPosition(anchor.getBoundingClientRect()))
        }
        window.addEventListener('resize', onResize)
        return function () { window.removeEventListener('resize', onResize) }
      }, [open])

      /* Focus lands in the field once the channel facts have arrived. */
      React.useEffect(function () {
        if (!open || view.phase !== 'ready') return
        var input = inputRef.current
        if (input !== null) input.focus()
      }, [open, view.phase])

      function submit() {
        var channel = view.channel
        if (channel === null || channel.ref === undefined || busy) return
        var failure = keyFailure(draft)
        if (failure !== null) {
          setNotice({ kind: 'error', text: t(failure) })
          return
        }
        setBusy(true)
        setNotice(null)
        Promise.resolve()
          .then(function () { return face.save(channel, draft.trim()) })
          .then(function (outcome) {
            if (!outcome.ok) {
              setNotice({ kind: 'error', text: outcome.message })
              setBusy(false)
              return
            }
            setDraft('')
            setNotice({ kind: 'saved', text: t('state.saved') })
            return Promise.resolve()
              .then(function () { return face.describe(channel) })
              .then(function (info) {
                setBusy(false)
                if (info === undefined) return
                setView(function (previous) {
                  if (previous.channel === null) return previous
                  return { phase: previous.phase, message: previous.message, channel: Object.assign({}, previous.channel, { info: info }) }
                })
              }, function () { setBusy(false) })
          }, function (error) {
            setBusy(false)
            setNotice({ kind: 'error', text: messageOf(error) })
          })
      }

      function clear() {
        var channel = view.channel
        if (channel === null || channel.ref === undefined || busy) return
        setBusy(true)
        setNotice(null)
        Promise.resolve()
          .then(function () { return face.clear(channel) })
          .then(function (outcome) {
            if (!outcome.ok) {
              setNotice({ kind: 'error', text: outcome.message })
              setBusy(false)
              return
            }
            setDraft('')
            setNotice({ kind: 'saved', text: t('state.cleared') })
            return Promise.resolve()
              .then(function () { return face.describe(channel) })
              .then(function (info) {
                setBusy(false)
                setView(function (previous) {
                  if (previous.channel === null) return previous
                  return { phase: previous.phase, message: previous.message, channel: Object.assign({}, previous.channel, { info: info }) }
                })
              }, function () { setBusy(false) })
          }, function (error) {
            setBusy(false)
            setNotice({ kind: 'error', text: messageOf(error) })
          })
      }

      function renderHead() {
        return h('div', { 'data-chk-head': '' },
          h('span', { 'data-chk-title': '' }, t('dialog.title')),
          h('button', {
            type: 'button',
            'data-chk-iconbtn': '',
            'aria-label': t('action.close'),
            title: t('action.close'),
            onClick: close,
          }, h(CloseIcon)))
      }

      function renderChannelLine(channel) {
        if (channel === null || channel.provider === undefined) {
          return h('div', { 'data-chk-muted': '' }, t('notice.noProvider'))
        }
        var name = channel.providerName === undefined ? channel.provider : channel.providerName
        return h('div', { 'data-chk-channel': '' },
          h('span', { 'data-chk-muted': '' }, t('dialog.channel')),
          h('span', { 'data-chk-chip': '', title: name }, name),
          channel.model === undefined ? null : h('span', { 'data-chk-muted': '' }, '·'),
          channel.model === undefined ? null : h('span', { 'data-chk-chip': '', title: channel.model }, channel.model))
      }

      function renderCredentialLine(channel) {
        if (channel === null || channel.ref === undefined) return null
        return h('div', { 'data-chk-channel': '' },
          h('span', { 'data-chk-muted': '' }, t('dialog.credential')),
          h('span', { 'data-chk-code': '' }, channel.ref))
      }

      function renderStatus(channel) {
        var info = channel.info
        var kind = info === undefined ? 'unknown' : (info.configured ? 'configured' : 'missing')
        var label = kind === 'configured' ? t('status.configured') : kind === 'missing' ? t('status.missing') : t('status.unknown')
        var masked = kind === 'configured' && info !== undefined && typeof info.masked === 'string' && info.masked.length > 0
        return h('div', { 'data-chk-status': kind },
          h('span', { 'data-chk-dot': '' }),
          h('span', null, label),
          masked ? h('span', { 'data-chk-mask': '', title: info.masked }, info.masked) : null)
      }

      function renderEditor(channel) {
        var placeholder = channel.info !== undefined && channel.info.configured === true
          ? t('field.placeholder.saved')
          : t('field.placeholder.empty')
        var rows = [
          h('label', {
            key: 'label',
            htmlFor: fieldId,
            'data-chk-muted': '',
            style: { fontSize: '12px' },
          }, t('field.label')),
          h('div', { key: 'field', 'data-chk-field': '' },
            h('input', {
              id: fieldId,
              ref: inputRef,
              'data-chk-input': '',
              type: reveal ? 'text' : 'password',
              value: draft,
              placeholder: placeholder,
              autoComplete: 'new-password',
              spellCheck: false,
              disabled: busy,
              onChange: function (event) { setDraft(event.target.value) },
              onKeyDown: function (event) {
                if (event.key !== 'Enter') return
                event.preventDefault()
                submit()
              },
            }),
            h('button', {
              type: 'button',
              'data-chk-reveal': '',
              tabIndex: -1,
              'aria-label': t(reveal ? 'field.hide' : 'field.show'),
              onClick: function () { setReveal(function (value) { return !value }) },
            }, t(reveal ? 'field.hide' : 'field.show'))),
        ]
        if (channel.derived) {
          rows.push(h('div', { key: 'derived', 'data-chk-note': '' }, t(channel.ns === undefined ? 'notice.undeclared' : 'notice.derived')))
        }
        return rows
      }

      function renderNotice() {
        if (notice === null) return null
        if (notice.kind === 'saved') return h('div', { 'data-chk-saved': '', role: 'status' }, notice.text)
        return h('div', { 'data-chk-error': '', role: 'alert' }, notice.text)
      }

      function renderActions(channel) {
        var editable = channel !== null && channel.ref !== undefined
        var configured = editable && channel.info !== undefined && channel.info.configured === true
        return h('div', { 'data-chk-actions': '' },
          h('button', {
            type: 'button',
            'data-chk-action': '',
            disabled: !configured || busy,
            onClick: clear,
          }, busy ? t('state.saving') : t('action.clear')),
          h('span', { 'data-chk-spacer': '' }),
          h('button', { type: 'button', 'data-chk-action': '', onClick: close }, t('action.cancel')),
          h('button', {
            type: 'button',
            'data-chk-action': '',
            'data-variant': 'primary',
            disabled: !editable || busy,
            onClick: submit,
          }, busy ? t('state.saving') : t('action.save')))
      }

      function renderCardBody() {
        if (view.phase === 'loading') return [h('div', { key: 'loading', 'data-chk-muted': '' }, t('state.loading'))]
        if (view.phase === 'error') {
          return [
            h('div', { key: 'error', 'data-chk-error': '', role: 'alert' }, view.message === null ? t('error.load') : view.message),
            h('div', { key: 'actions', 'data-chk-actions': '' },
              h('button', { type: 'button', 'data-chk-action': '', onClick: load }, t('action.retry')),
              h('span', { 'data-chk-spacer': '' }),
              h('button', { type: 'button', 'data-chk-action': '', onClick: close }, t('action.cancel'))),
          ]
        }
        var channel = view.channel
        var body = [h('div', { key: 'channel' }, renderChannelLine(channel))]
        if (channel === null || channel.provider === undefined) {
          body.push(h('div', { key: 'actions', 'data-chk-actions': '' },
            h('span', { 'data-chk-spacer': '' }),
            h('button', { type: 'button', 'data-chk-action': '', onClick: close }, t('action.cancel'))))
          return body
        }
        if (channel.account) {
          body.push(h('div', { key: 'account', 'data-chk-muted': '' }, t('notice.account')))
          body.push(h('div', { key: 'actions', 'data-chk-actions': '' },
            h('span', { 'data-chk-spacer': '' }),
            h('button', { type: 'button', 'data-chk-action': '', onClick: close }, t('action.cancel'))))
          return body
        }
        body.push(h('div', { key: 'credential' }, renderCredentialLine(channel)))
        body.push(h('div', { key: 'status' }, renderStatus(channel)))
        body.push(h('div', { key: 'editor', style: { display: 'flex', flexDirection: 'column', gap: '4px' } }, renderEditor(channel)))
        body.push(h('div', { key: 'notice' }, renderNotice()))
        body.push(h('div', { key: 'scope', 'data-chk-note': '' }, t('notice.scope')))
        body.push(h('div', { key: 'actions' }, renderActions(channel)))
        return body
      }

      var card = null
      if (open && position !== null && typeof document !== 'undefined' && document.body !== null) {
        card = ReactDOM.createPortal(h('div', {
          ref: cardRef,
          'data-chk-pop': '',
          role: 'dialog',
          'aria-modal': false,
          'aria-label': t('dialog.title'),
          style: { top: position.top + 'px', left: position.left + 'px' },
        }, [h('div', { key: 'head' }, renderHead())].concat(renderCardBody())), document.body)
      }

      return h(React.Fragment, null,
        h('style', { 'data-chk-style': '' }, CSS),
        h('button', {
          type: 'button',
          ref: anchorRef,
          'data-chk-btn': '',
          'data-open': open ? '' : undefined,
          title: t('action.open'),
          'aria-label': t('action.open'),
          'aria-haspopup': 'dialog',
          'aria-expanded': open ? 'true' : 'false',
          onMouseDown: function (event) { event.preventDefault() },
          onClick: function () { if (open) close(); else openDialog() },
        }, h(KeyIcon)),
        card)
    }

    /* ------------------------------------------------------------------ *
     * Plugin body
     * ------------------------------------------------------------------ */

    /** Services this browser half needs before `apply` may touch them. */
    var inject = ['slots', 'locale', 'modelDirectories', 'remote', 'remote.credentials', 'remote.llm', 'remote.settings']

    /**
     * Client plugin body: mount one control in the header's right-aligned
     * utilities row, immediately left of the Session's More menu.
     * @param {any} ctx - client root context.
     */
    function apply(ctx) {
      ctx.effect(function () {
        return ctx.locale.register(NS, { zh: zh, en: en })
      }, 'channel-key: dictionaries')

      var face = {
        translate: ctx.locale.bind(NS),
        resolve: function (sessionId) { return resolveChannel(ctx, sessionId) },
        describe: function (channel) { return describeCredential(ctx, channel.ref) },
        save: function (channel, value) { return saveCredential(ctx, channel, value) },
        clear: function (channel) { return clearCredential(ctx, channel) },
      }

      ctx.effect(function () {
        return ctx.slots.inject(SLOT, function () {
          return ctx.slots.register({
            name: SLOT,
            id: 'channel-key',
            order: 10,
            locale: NS,
            inject: function () { return { channelKey: face } },
          }, ChannelKeyButton)
        })
      }, 'channel-key: header action')
    }

    exports.name = 'dsh-client-ui-channel-key'
    exports.inject = inject
    exports.apply = apply
    /* Test-only seams: the pure rules, the Host reads, and the component are
       exercised without a browser by the package's smoke test. */
    exports.__internals = {
      ChannelKeyButton: ChannelKeyButton,
      keyFailure: keyFailure,
      deriveKeyRef: deriveKeyRef,
      valueAt: valueAt,
      anchorPosition: anchorPosition,
      resolveChannel: resolveChannel,
      saveCredential: saveCredential,
      clearCredential: clearCredential,
    }
    return module.exports
  },
})
