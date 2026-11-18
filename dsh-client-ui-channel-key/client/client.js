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

      '[data-chk-pop]{position:fixed;z-index:1300;display:flex;flex-direction:column;gap:12px;width:380px;',
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
      '[data-chk-input]{flex:1;min-width:0;height:30px;box-sizing:border-box;padding:0 86px 0 8px;',
      'border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm,6px);',
      'background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;',
      'font-family:inherit;outline:none}',
      '[data-chk-input]:focus{border-color:var(--dsw-alias-state-business-primary)}',
      '[data-chk-input]:disabled{color:var(--dsw-alias-label-dimmed)}',
      '[data-chk-fieldtools]{position:absolute;top:0;right:0;display:flex;align-items:center;gap:2px;',
      'height:30px;padding-right:4px}',
      '[data-chk-fieldtools] button{height:22px;padding:0 6px;border:none;border-radius:var(--dsw-radius-sm,6px);',
      'background:transparent;color:var(--dsw-alias-label-tertiary);font-size:12px;font-family:inherit;cursor:pointer}',
      '[data-chk-fieldtools] button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);',
      'color:var(--dsw-alias-label-primary)}',
      '[data-chk-fieldtools] button:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}',
      '[data-chk-fieldtools] button:disabled{opacity:.4;cursor:default}',

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

      '[data-chk-list]{display:flex;flex-direction:column;gap:2px;max-height:240px;overflow:auto;padding-right:2px}',
      '[data-chk-list]::-webkit-scrollbar{width:6px}',
      '[data-chk-list]::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l1);border-radius:999px}',
      '[data-chk-row]{position:relative;display:flex;align-items:center;gap:8px;min-width:0;height:30px;',
      'padding:0 6px 0 8px;border-radius:var(--dsw-radius-sm,6px);cursor:grab;',
      'transition:background-color .12s,opacity .12s}',
      '[data-chk-row]:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '[data-chk-row][data-active]{background:var(--dsw-alias-interactive-bg-hover);',
      'box-shadow:inset 2px 0 0 var(--dsw-alias-state-business-primary)}',
      '[data-chk-row][data-dragging]{opacity:.4}',
      '[data-chk-row][data-drop]{box-shadow:inset 0 2px 0 var(--dsw-alias-state-business-primary)}',
      '[data-chk-row][data-invalid] [data-chk-rowmask]{color:var(--dsw-alias-label-dimmed);text-decoration:line-through}',
      '[data-chk-slotnum]{flex:none;width:20px;font-size:12px;color:var(--dsw-alias-label-tertiary);',
      'font-variant-numeric:tabular-nums}',
      '[data-chk-rowmask]{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
      'font-family:var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:12px;',
      'color:var(--dsw-alias-label-secondary)}',
      '[data-chk-badge]{flex:none;padding:0 6px;border-radius:999px;font-size:11px;line-height:17px;white-space:nowrap}',
      '[data-chk-badge="active"]{color:var(--dsw-alias-state-business-primary)}',
      '[data-chk-badge="invalid"]{color:var(--dsw-alias-state-error-primary)}',
      '[data-chk-balance]{flex:none;font-size:11px;font-variant-numeric:tabular-nums;white-space:nowrap;',
      'color:var(--dsw-alias-label-tertiary)}',
      '[data-chk-balance][data-tone="low"]{color:var(--dsw-alias-state-warning-primary,var(--dsw-alias-label-secondary))}',
      '[data-chk-balance][data-tone="zero"]{color:var(--dsw-alias-state-error-primary)}',
      '[data-chk-actions-cluster]{display:flex;align-items:center;gap:2px;flex:none;opacity:0;transition:opacity .12s}',
      '[data-chk-row]:hover [data-chk-actions-cluster],',
      '[data-chk-row]:focus-within [data-chk-actions-cluster]{opacity:1}',
      '[data-chk-rowaction]{display:grid;place-items:center;width:22px;height:22px;padding:0;border:none;',
      'border-radius:999px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}',
      '[data-chk-rowaction] svg{width:12px;height:12px;display:block}',
      '[data-chk-rowaction]:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);',
      'color:var(--dsw-alias-label-primary)}',
      '[data-chk-rowaction]:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}',
      '[data-chk-rowaction]:disabled{opacity:.3;cursor:default}',
      '[data-chk-rowaction][data-tone="danger"]:hover:not(:disabled){color:var(--dsw-alias-state-error-primary)}',
      '[data-chk-empty]{padding:6px 2px;font-size:12px;color:var(--dsw-alias-label-tertiary)}',
      '[data-chk-summary]{display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-size:11px;color:var(--dsw-alias-label-tertiary)}',
      '[data-chk-total]{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}',
      '[data-chk-refresh]{flex:none;padding:0 4px;border:none;border-radius:var(--dsw-radius-sm,6px);',
      'background:transparent;color:var(--dsw-alias-label-tertiary);font-size:11px;font-family:inherit;cursor:pointer}',
      '[data-chk-refresh]:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '[data-chk-refresh]:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}',
      '[data-chk-refresh]:disabled{opacity:.5;cursor:default}',
      '[data-chk-hint]{font-size:11px;color:var(--dsw-alias-label-tertiary)}',
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
      'state.clearing': '清除中…',
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
      'field.placeholder.multi': '粘贴密钥，可一次粘贴多行',
      'action.add': '添加',
      'action.clearAll': '清除全部',
      'pool.active': '当前使用',
      'pool.invalid': '已失效',
      'pool.empty': '（空）',
      'pool.none': '还没有密钥，粘贴一个开始',
      'pool.restore': '恢复',
      'pool.activate': '使用',
      'pool.remove': '删除',
      'pool.up': '上移',
      'pool.down': '下移',
      'notice.pool': '按顺序使用；某个密钥报「API 密钥无效」时自动换下一个，失效的密钥会跳过。',
      'state.added': '已添加，下一次请求按顺序使用',
      'state.pasted': '已粘贴，确认后点「添加」',
      'state.updated': '已更新',
      'error.pool': '读取密钥池失败',
      'error.poolUnsupported': '当前后台还不支持密钥池，请重启桌面端后再试',
      'error.oneAtATime': '当前后台只支持单个密钥，请一次只填一个',
      'action.export': '导出清单',
      'action.probe': '自检',
      'state.probing': '自检中…',
      'state.probed': '自检完成：',
      'action.balance': '刷新余额',
      'state.balancing': '查询余额…',
      'balance.none': '—',
      'balance.total': '总余额',
      'balance.today': '今日',
      'pool.usable': '可用',
      'pool.unknown': '未测出',
      'action.paste': '粘贴',
      'error.paste': '无法读取剪贴板，请用 Ctrl+V 粘贴',
      'error.clipboardEmpty': '剪贴板里没有密钥',
      'pool.keys': '个密钥',
      'pool.drag': '拖动可排序',
      'pool.invalidAt': '失效于',
      'state.exported': '清单已复制（不含密钥本身）',
      'state.removed': '已删除',
      'state.restored': '已恢复',
      'state.moved': '顺序已更新',
      'state.activated': '已切换',
      'error.clipboard': '无法写入剪贴板',
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
      'state.clearing': 'Clearing…',
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
      'field.placeholder.multi': 'Paste keys — several lines at once is fine',
      'action.add': 'Add',
      'action.clearAll': 'Clear all',
      'pool.active': 'In use',
      'pool.invalid': 'Rejected',
      'pool.empty': '(empty)',
      'pool.none': 'No keys yet — paste one to start',
      'pool.restore': 'Restore',
      'pool.activate': 'Use',
      'pool.remove': 'Delete',
      'pool.up': 'Move up',
      'pool.down': 'Move down',
      'notice.pool': 'Used in order. A key rejected as an invalid API key hands the request to the next one; rejected keys are skipped.',
      'state.added': 'Added — the next request uses them in order',
      'state.pasted': 'Pasted — press Add to store it',
      'state.updated': 'Updated',
      'error.pool': 'Could not read the key pool',
      'error.poolUnsupported': 'This Host predates the key pool — restart the desktop app and try again',
      'error.oneAtATime': 'This Host accepts one key at a time; enter a single key',
      'action.export': 'Export list',
      'action.probe': 'Check keys',
      'state.probing': 'Checking…',
      'state.probed': 'Self-check:',
      'action.balance': 'Refresh balance',
      'state.balancing': 'Reading…',
      'balance.none': '—',
      'balance.total': 'Total',
      'balance.today': 'today',
      'pool.usable': 'usable',
      'pool.unknown': 'inconclusive',
      'action.paste': 'Paste',
      'error.paste': 'Could not read the clipboard — paste with Ctrl+V instead',
      'error.clipboardEmpty': 'The clipboard holds no key',
      'pool.keys': 'keys',
      'pool.drag': 'Drag to reorder',
      'pool.invalidAt': 'Rejected at',
      'state.exported': 'Inventory copied (without the keys themselves)',
      'state.removed': 'Deleted',
      'state.restored': 'Restored',
      'state.moved': 'Order updated',
      'state.activated': 'Switched to',
      'error.clipboard': 'Could not write to the clipboard',
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

    /**
     * The `move` delta that lifts a row from one position to another. The Host
     * clamps it to the list, so one op is enough for any drop.
     * @param {number} fromIndex - the dragged row's position.
     * @param {number} toIndex - the row it was dropped on.
     * @returns {number} the delta to send.
     */
    function deltaFor(fromIndex, toIndex) {
      return toIndex - fromIndex
    }

    /**
     * The pool as a plain text inventory: order, masked preview, and state.
     * Key values never reach the browser, so neither does this export.
     * @param {object} pool - the Host pool.
     * @param {{active: string, invalid: string}} labels - the two state labels.
     * @returns {string} one line per key.
     */
    function inventoryText(pool, labels) {
      if (pool === undefined || pool === null || pool.entries === undefined) return ''
      var activeLabel = labels !== undefined && labels.active !== undefined ? labels.active : 'active'
      var invalidLabel = labels !== undefined && labels.invalid !== undefined ? labels.invalid : 'invalid'
      return pool.entries.map(function (entry) {
        var state = entry.slot === pool.active ? activeLabel : (entry.invalidAt !== undefined ? invalidLabel : '')
        var mask = entry.masked === undefined ? '' : entry.masked
        return '#' + entry.slot + '  ' + mask + (state === '' ? '' : '  ' + state)
      }).join('\n')
    }

    /** A local timestamp for the failure tooltip, tolerant of junk. */
    function formatTime(at) {
      if (typeof at !== 'number' || !Number.isFinite(at)) return ''
      try {
        return new Date(at).toLocaleString()
      } catch (error) {
        return ''
      }
    }

    /* ------------------------------------------------------------------ *
     * Balances
     *
     * The Host reads each key's remaining balance from the channel's own
     * gateway; this half only prints it. A reading that failed is not a zero:
     * the row keeps an em dash so "not looked up" and "out of credit" stay
     * distinguishable at a glance.
     * ------------------------------------------------------------------ */

    /** A balance at or below this reads as running out. */
    var LOW_BALANCE = 0.5

    /**
     * The symbol a balance unit prints as.
     * @param {string} unit - e.g. `USD`.
     * @returns {string} a currency symbol, or the unit followed by a space.
     */
    function unitSymbol(unit) {
      if (unit === 'USD') return '$'
      if (unit === 'CNY' || unit === 'RMB') return '¥'
      if (unit === 'EUR') return '€'
      return typeof unit === 'string' && unit.length > 0 ? unit + ' ' : ''
    }

    /**
     * One balance as a row prints it.
     * @param {{balance: number, unit: string}} reading - one successful reading.
     * @returns {string} e.g. `$4.85`.
     */
    function formatBalance(reading) {
      var value = reading !== null && reading !== undefined && typeof reading.balance === 'number' ? reading.balance : 0
      return unitSymbol(reading !== null && reading !== undefined ? reading.unit : undefined) + value.toFixed(2)
    }

    /**
     * Split one paste into the keys it carried. A pasted block usually holds one
     * key per line, and blank lines are not keys.
     * @param {string} text - raw field content.
     * @returns {string[]} trimmed, non-empty lines.
     */
    function splitKeyLines(text) {
      if (typeof text !== 'string' || text.length === 0) return []
      var lines = text.split(/\r\n|\r|\n/)
      var keys = []
      for (var index = 0; index < lines.length; index += 1) {
        var line = lines[index].trim()
        if (line.length > 0) keys.push(line)
      }
      return keys
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
     * Make the channel's profile name its credential reference. A channel that
     * names none resolves a conventional `<PROVIDER>_API_KEY`, and nothing can
     * store a key under that reference until the profile names it.
     * @param {any} ctx - client root context.
     * @param {object} channel - the resolved channel; `derived` clears on success.
     * @returns {Promise<{ok: boolean, message?: string}>} the outcome.
     */
    async function declareReference(ctx, channel) {
      if (!channel.derived || channel.ns === undefined) return { ok: true }
      try {
        var ops = [{ op: 'set', path: channel.path.concat(['apiKeyEnv']), value: channel.ref }]
        var written = await ctx.remote.settings.mutate(channel.ns, ops, channel.revision)
        if (!written.ok) return { ok: false, message: written.error.message }
        channel.revision = written.value.revision
        /* The profile names the reference now, so the card stops explaining the write. */
        channel.derived = false
        return { ok: true }
      } catch (error) {
        return { ok: false, message: messageOf(error) }
      }
    }

    /**
     * Store one key for a channel (the single-key path, kept for a Host that
     * predates the pool).
     * @param {any} ctx - client root context.
     * @param {object} channel - the resolved channel.
     * @param {string} value - the key to store.
     * @returns {Promise<{ok: boolean, message?: string}>} the outcome.
     */
    async function saveCredential(ctx, channel, value) {
      var declared = await declareReference(ctx, channel)
      if (!declared.ok) return declared
      try {
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
     * Key pool
     *
     * A channel may hold several keys, tried in order. The Host owns the pool
     * and the rotation that follows a rejected key; this half only edits it.
     * A Host that predates the route answers 404, and the card falls back to
     * the single-key editor it shipped before.
     * ------------------------------------------------------------------ */

    var POOL_ENDPOINT = '/api/dsh-channel-key/pool'

    /** The route URL for one resolved channel. */
    function poolQuery(channel) {
      return POOL_ENDPOINT
        + '?provider=' + encodeURIComponent(String(channel.provider))
        + '&ref=' + encodeURIComponent(String(channel.ref))
    }

    /**
     * Read one pool response into the shape the card renders.
     * @param {Response} response - the Host's answer.
     * @returns {Promise<object>} `{ supported, ok, pool?, message? }`.
     */
    async function readPoolResponse(response) {
      var payload = null
      try {
        payload = await response.json()
      } catch (error) {
        payload = null
      }
      if (payload !== null && typeof payload === 'object') {
        return {
          supported: true,
          ok: payload.ok === true,
          pool: payload.pool,
          probe: payload.probe,
          balance: payload.balance,
          message: payload.error !== null && typeof payload.error === 'object' ? payload.error.message : undefined,
        }
      }
      return { supported: true, ok: false, message: 'HTTP ' + response.status }
    }

    /**
     * Read the channel's pool.
     * @param {object} channel - the resolved channel.
     * @returns {Promise<object>} the pool result; `supported: false` when the
     *   Host has no such route, which is what selects the legacy card.
     */
    async function loadPool(channel) {
      if (channel === null || channel === undefined || channel.provider === undefined || channel.ref === undefined) {
        return { supported: false }
      }
      try {
        var response = await fetch(poolQuery(channel), {
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { accept: 'application/json' },
        })
        if (response.status === 404 || response.status === 405) return { supported: false }
        return await readPoolResponse(response)
      } catch (error) {
        return { supported: false, message: messageOf(error) }
      }
    }

    /**
     * Apply one pool operation on the Host.
     * @param {object} channel - the resolved channel.
     * @param {object} op - e.g. `{ op: 'add', keys: [...] }`.
     * @returns {Promise<object>} the new pool result.
     */
    async function applyPoolOp(channel, op) {
      if (channel === null || channel === undefined || channel.provider === undefined || channel.ref === undefined) {
        return { supported: false }
      }
      try {
        var response = await fetch(poolQuery(channel), {
          method: 'POST',
          credentials: 'same-origin',
          headers: { accept: 'application/json', 'content-type': 'application/json' },
          body: JSON.stringify(Object.assign({ provider: channel.provider, ref: channel.ref }, op)),
        })
        if (response.status === 404 || response.status === 405) return { supported: false }
        return await readPoolResponse(response)
      } catch (error) {
        return { supported: true, ok: false, message: messageOf(error) }
      }
    }

    /**
     * Append keys to a channel's pool.
     * @param {any} ctx - client root context.
     * @param {object} channel - the resolved channel.
     * @param {string[]} keys - keys to append, in order.
     * @returns {Promise<object>} `{ ok, pool?, unsupported?, message? }`.
     */
    async function addKeysToPool(ctx, channel, keys) {
      var declared = await declareReference(ctx, channel)
      if (!declared.ok) return declared
      var result = await applyPoolOp(channel, { op: 'add', keys: keys })
      if (result.supported === false) return { ok: false, unsupported: true, message: result.message }
      return result.ok ? { ok: true, pool: result.pool } : { ok: false, message: result.message }
    }

    /* ------------------------------------------------------------------ *
     * Placement
     * ------------------------------------------------------------------ */
    var POPOVER_WIDTH = 380

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

    /** A row-sized glyph wrapper, so every control in a row matches. */
    function RowGlyph(props) {
      return h('svg', {
        viewBox: '0 0 12 12',
        width: 12,
        height: 12,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.3,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
      }, props.children)
    }

    /** A chevron for moving one row up or down. */
    function ChevronIcon(props) {
      return h(RowGlyph, null, h('path', { d: props.down === true ? 'M2.5 4.5 6 8l3.5-3.5' : 'M2.5 7.5 6 4l3.5 3.5' }))
    }

    /** A trash can for removing one key. */
    function TrashIcon() {
      return h(RowGlyph, null,
        h('path', { d: 'M2.5 3.5h7' }),
        h('path', { d: 'M4.8 3.5V2.3h2.4v1.2' }),
        h('path', { d: 'M3.6 3.5 4 9.4h4l.4-5.9' }))
    }

    /** A turning arrow for reviving a key that was marked rejected. */
    function RestoreIcon() {
      return h(RowGlyph, null,
        h('path', { d: 'M3 5.2h4.2a2 2 0 0 1 0 4H5' }),
        h('path', { d: 'M3 5.2 5 3.2M3 5.2l2 2' }))
    }

    /** A check for making one key the current one. */
    function UseIcon() {
      return h(RowGlyph, null, h('path', { d: 'M2.4 6.3 4.9 8.8 9.6 3.6' }))
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

      /* `{ from, over }` while a row is being dragged; null the rest of the time. */
      var dragState = React.useState(null)
      var drag = dragState[0]
      var setDrag = dragState[1]

      /* Which action owns the pending state. Both buttons go busy together, but
         only the one that was pressed may say so: a save must not relabel the
         clear button as "保存中…" and vice versa. Declared last so the earlier
         hook positions stay stable for the smoke test's state plan. */
      var clearingState = React.useState(false)
      var clearing = clearingState[0]
      var setClearing = clearingState[1]

      /* Whether the running operation is the self-check. */
      var probingState = React.useState(false)
      var probing = probingState[0]
      var setProbing = probingState[1]

      /* Whether the self-check is the running operation. */
      var probingState = React.useState(false)
      var probing = probingState[0]
      var setProbing = probingState[1]

      /* The Host's last balance reading, one row per slot, and whether a lookup
         is running. Declared after the positions the smoke test pins. */
      var balanceState = React.useState(null)
      var balance = balanceState[0]
      var setBalance = balanceState[1]

      var balancingState = React.useState(false)
      var balancing = balancingState[0]
      var setBalancing = balancingState[1]

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
        setClearing(false)
        setProbing(false)
        setBalancing(false)
        setBalance(null)
      }, [])

      var load = React.useCallback(function () {
        if (face === undefined) {
          setView({ phase: 'error', channel: null, pool: undefined, message: t('error.load') })
          return
        }
        var mine = generation.current + 1
        generation.current = mine
        setView({ phase: 'loading', channel: null, pool: undefined, message: null })
        Promise.resolve()
          .then(function () { return face.resolve(sessionId) })
          .then(function (channel) {
            if (generation.current !== mine) return
            setView({ phase: 'ready', channel: channel, pool: undefined, message: null })
            if (channel === null || channel.provider === undefined || channel.ref === undefined) return
            if (typeof face.pool !== 'function') return
            return Promise.resolve()
              .then(function () { return face.pool(channel) })
              .then(function (pool) {
                if (generation.current !== mine) return
                setView(function (previous) { return Object.assign({}, previous, { pool: pool }) })
                if (pool.ok !== true || pool.pool === undefined || pool.pool.entries === undefined) return
                if (pool.pool.entries.length === 0) return
                return loadBalance(channel, false)
              }, function (error) {
                if (generation.current !== mine) return
                setView(function (previous) {
                  return Object.assign({}, previous, { pool: { supported: true, ok: false, message: messageOf(error) } })
                })
              })
          }, function (error) {
            if (generation.current !== mine) return
            setView({ phase: 'error', channel: null, pool: undefined, message: messageOf(error) })
          })
      }, [face, sessionId, t])

      /**
       * Read every key's balance from the Host.
       *
       * The card renders its rows first and fills the numbers in when they
       * arrive, so a slow gateway never holds the list back. A failed lookup is
       * not a status: the row keeps its em dash and the list stays editable.
       * @param {object} channel - the resolved channel.
       * @param {boolean} refresh - true to bypass the Host's short-lived cache.
       * @returns {Promise<void>} resolves when the reading lands.
       */
      function loadBalance(channel, refresh) {
        if (face === undefined || channel === null || channel.ref === undefined) return Promise.resolve()
        if (typeof face.balance !== 'function') return Promise.resolve()
        setBalancing(true)
        return Promise.resolve()
          .then(function () { return face.balance(channel, refresh === true ? { refresh: true } : {}) })
          .then(function (outcome) {
            setBalancing(false)
            if (outcome === undefined || outcome === null || outcome.ok !== true) return
            if (outcome.balance === undefined) return
            setBalance(outcome.balance)
          }, function () {
            setBalancing(false)
          })
      }

      var openDialog = React.useCallback(function () {
        var anchor = anchorRef.current
        setPosition(anchor === null ? { top: 96, left: 24 } : anchorPosition(anchor.getBoundingClientRect()))
        setDraft('')
        setReveal(false)
        setNotice(null)
        setBusy(false)
        setClearing(false)
        setProbing(false)
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

      /**
       * Adopt the pool the Host answered with, and clear the "derived
       * reference" note once a write has declared it.
       * @param {object} outcome - a successful pool result.
       * @param {string} text - the status line to show.
       */
      function adoptPool(outcome, text) {
        setBusy(false)
        setClearing(false)
        setProbing(false)
        setNotice({ kind: 'saved', text: text })
        setView(function (previous) {
          if (previous.channel === null) return previous
          var channel = Object.assign({}, previous.channel, { derived: false })
          return Object.assign({}, previous, {
            channel: channel,
            pool: { supported: true, ok: true, pool: outcome.pool },
          })
        })
        pruneBalances(outcome.pool)
      }

      /**
       * Drop balance rows for slots the pool no longer holds.
       *
       * A removed key's reading would otherwise outlive it, and a re-added slot
       * number would inherit a stranger's balance.
       * @param {object} pool - the pool the Host just answered with.
       */
      function pruneBalances(pool) {
        setBalance(function (previous) {
          if (previous === null || previous === undefined || !Array.isArray(previous.results)) return previous
          if (pool === undefined || pool === null || !Array.isArray(pool.entries)) return null
          var kept = pool.entries.map(function (entry) { return entry.slot })
          var results = previous.results.filter(function (item) { return kept.indexOf(item.slot) !== -1 })
          if (results.length === previous.results.length) return previous
          return Object.assign({}, previous, { results: results })
        })
      }

      /**
       * The status line one pool operation reports.
       * @param {object} op - the operation that just succeeded.
       * @returns {string} the copy for it.
       */
      function opNotice(op) {
        if (op.op === 'add') return t('state.added')
        if (op.op === 'clear') return t('state.cleared')
        if (op.op === 'move') return t('state.moved')
        if (op.op === 'restore') return t('state.restored') + ' #' + op.slot
        if (op.op === 'activate') return t('state.activated') + ' #' + op.slot
        if (op.op === 'remove') return t('state.removed') + ' #' + op.slot
        return t('state.updated')
      }

      /**
       * Report a failed pool operation.
       * @param {object} outcome - the failed result.
       */
      function reportPoolFailure(outcome) {
        setBusy(false)
        setClearing(false)
        setProbing(false)
        if (outcome.unsupported === true) {
          setNotice({ kind: 'error', text: t('error.poolUnsupported') })
          return
        }
        setNotice({ kind: 'error', text: outcome.message === undefined ? t('error.pool') : outcome.message })
      }

      /**
       * Append keys to the channel's pool.
       * @param {object} channel - the resolved channel.
       * @param {string[]} keys - validated keys, in order.
       */
      function addToPool(channel, keys) {
        setBusy(true)
        setNotice(null)
        return Promise.resolve()
          .then(function () { return face.addKeys(channel, keys) })
          .then(function (outcome) {
            if (!outcome.ok) {
              reportPoolFailure(outcome)
              return
            }
            setDraft('')
            adoptPool(outcome, t('state.added'))
          }, function (error) {
            setBusy(false)
            setNotice({ kind: 'error', text: messageOf(error) })
          })
      }

      /**
       * Run one pool operation (reorder, restore, activate, remove, clear).
       * @param {object} op - the operation payload.
       */
      function runPoolOp(op) {
        var channel = view.channel
        if (channel === null || channel.ref === undefined || busy) return
        setBusy(true)
        setClearing(op.op === 'clear')
        setNotice(null)
        Promise.resolve()
          .then(function () { return face.mutate(channel, op) })
          .then(function (outcome) {
            if (!outcome.ok) {
              reportPoolFailure(outcome)
              return
            }
            adoptPool(outcome, opNotice(op))
          }, function (error) {
            setBusy(false)
            setNotice({ kind: 'error', text: messageOf(error) })
          })
      }

      /**
       * One line summarising a self-check round.
       * @param {object} probe - the Host's `probe` payload.
       * @returns {string} e.g. `2 可用 · 1 已失效 · 1 未测出`.
       */
      function probeSummary(probe) {
        var results = probe !== undefined && probe !== null && Array.isArray(probe.results) ? probe.results : []
        var usable = 0
        var rejected = 0
        var unknown = 0
        for (var index = 0; index < results.length; index += 1) {
          if (results[index].ok === true) usable += 1
          else if (results[index].code !== undefined) rejected += 1
          else unknown += 1
        }
        var text = usable + ' ' + t('pool.usable') + ' · ' + rejected + ' ' + t('pool.invalid')
        if (unknown > 0) text += ' · ' + unknown + ' ' + t('pool.unknown')
        return text
      }

      /** Check every key with one minimal request each, and show what came back. */
      function runProbe() {
        var channel = view.channel
        if (channel === null || channel.ref === undefined || busy) return Promise.resolve()
        setBusy(true)
        setProbing(true)
        setNotice(null)
        return Promise.resolve()
          .then(function () { return face.probe(channel) })
          .then(function (outcome) {
            if (!outcome.ok) {
              setProbing(false)
              reportPoolFailure(outcome)
              return
            }
            setProbing(false)
            setBusy(false)
            setView(function (previous) {
              if (previous.channel === null) return previous
              return Object.assign({}, previous, {
                channel: Object.assign({}, previous.channel, { derived: false }),
                pool: { supported: true, ok: true, pool: outcome.pool },
              })
            })
            setNotice({ kind: 'saved', text: probeSummary(outcome.probe) })
          }, function (error) {
            setProbing(false)
            setBusy(false)
            setNotice({ kind: 'error', text: messageOf(error) })
          })
      }

      /** Whether the card is editing a Host that supports the key pool. */
      function poolMode() {
        return view.pool !== undefined && view.pool !== null && view.pool.supported === true
      }

      /**
       * Start dragging one row.
       * @param {object} event - the dragstart event.
       * @param {object} entry - the row being dragged.
       */
      function onRowDragStart(event, entry) {
        if (busy) {
          event.preventDefault()
          return
        }
        setDrag({ from: entry.slot, over: undefined })
        if (event.dataTransfer !== undefined && event.dataTransfer !== null) {
          try {
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/plain', '#' + entry.slot)
          } catch (error) {
            /* A browser that refuses the transfer still gets the visual cue. */
          }
        }
      }

      /**
       * Mark the row a drag is hovering.
       * @param {object} event - the dragover event.
       * @param {object} entry - the row under the pointer.
       */
      function onRowDragOver(event, entry) {
        if (drag === null || busy || entry.slot === drag.from) return
        event.preventDefault()
        if (event.dataTransfer !== undefined && event.dataTransfer !== null) event.dataTransfer.dropEffect = 'move'
        if (drag.over !== entry.slot) setDrag({ from: drag.from, over: entry.slot })
      }

      /**
       * Drop a row on another: one `move` op carries the distance between them.
       * @param {object} event - the drop event.
       * @param {object} entry - the row it landed on.
       */
      function onRowDrop(event, entry) {
        event.preventDefault()
        if (drag === null || busy) return
        var from = drag.from
        setDrag(null)
        var pool = view.pool === undefined || view.pool === null ? undefined : view.pool.pool
        if (pool === undefined || pool.entries === undefined) return
        var order = pool.entries.map(function (item) { return item.slot })
        var fromIndex = order.indexOf(from)
        var toIndex = order.indexOf(entry.slot)
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return
        runPoolOp({ op: 'move', slot: from, delta: deltaFor(fromIndex, toIndex) })
      }

      /** Copy the masked inventory; the browser never holds the keys themselves. */
      function copyInventory() {
        var pool = view.pool === undefined || view.pool === null ? undefined : view.pool.pool
        if (pool === undefined || pool.entries === undefined) return
        var text = inventoryText(pool, { active: t('pool.active'), invalid: t('pool.invalid') })
        var clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard
        if (clipboard === undefined || clipboard === null || typeof clipboard.writeText !== 'function') {
          setNotice({ kind: 'error', text: t('error.clipboard') })
          return
        }
        Promise.resolve()
          .then(function () { return clipboard.writeText(text) })
          .then(function () {
            setNotice({ kind: 'saved', text: t('state.exported') })
          }, function () {
            setNotice({ kind: 'error', text: t('error.clipboard') })
          })
      }

      /**
       * Read the clipboard and add the keys it holds. A refused read is
       * reported rather than swallowed: the browser may deny `readText`, and the
       * field's own Ctrl+V still works in that case.
       * @returns {Promise<void>} resolves once the attempt has been reported.
       */
      function pasteFromClipboard() {
        var channel = view.channel
        if (channel === null || channel.ref === undefined || busy) return Promise.resolve()
        var clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard
        if (clipboard === undefined || clipboard === null || typeof clipboard.readText !== 'function') {
          setNotice({ kind: 'error', text: t('error.paste') })
          return Promise.resolve()
        }
        return Promise.resolve()
          .then(function () { return clipboard.readText() })
          .then(function (text) {
            var keys = splitKeyLines(text)
            if (keys.length === 0) {
              setNotice({ kind: 'error', text: t('error.clipboardEmpty') })
              return
            }
            for (var index = 0; index < keys.length; index += 1) {
              var failure = keyFailure(keys[index])
              if (failure !== null) {
                setNotice({ kind: 'error', text: t(failure) })
                return
              }
            }
            if (poolMode() && view.pool.ok === true) return addToPool(channel, keys)
            if (keys.length > 1) {
              setNotice({ kind: 'error', text: t('error.oneAtATime') })
              return
            }
            setDraft(keys[0])
            setNotice({ kind: 'saved', text: t('state.pasted') })
          }, function () {
            setNotice({ kind: 'error', text: t('error.paste') })
          })
      }

      function submit() {
        var channel = view.channel
        if (channel === null || channel.ref === undefined || busy) return
        var keys = splitKeyLines(draft)
        if (keys.length === 0) {
          setNotice({ kind: 'error', text: t('error.empty') })
          return
        }
        for (var index = 0; index < keys.length; index += 1) {
          var failure = keyFailure(keys[index])
          if (failure !== null) {
            setNotice({ kind: 'error', text: t(failure) })
            return
          }
        }
        if (poolMode()) {
          if (view.pool.ok !== true) {
            setNotice({ kind: 'error', text: t('error.pool') })
            return
          }
          addToPool(channel, keys)
          return
        }
        if (keys.length > 1) {
          setNotice({ kind: 'error', text: t('error.oneAtATime') })
          return
        }
        saveOne(channel, keys[0])
      }

      /**
       * A paste carrying several lines is added at once: the field is
       * single-line, so the clipboard text is the only place those keys exist.
       * @param {object} event - the input's paste event.
       */
      function onPaste(event) {
        var clipboard = event.clipboardData
        if (clipboard === null || clipboard === undefined || typeof clipboard.getData !== 'function') return
        var keys = splitKeyLines(clipboard.getData('text'))
        if (keys.length < 2) return
        event.preventDefault()
        var channel = view.channel
        if (channel === null || channel.ref === undefined || busy) return
        for (var index = 0; index < keys.length; index += 1) {
          var failure = keyFailure(keys[index])
          if (failure !== null) {
            setNotice({ kind: 'error', text: t(failure) })
            return
          }
        }
        if (!poolMode()) {
          setNotice({ kind: 'error', text: t('error.oneAtATime') })
          return
        }
        addToPool(channel, keys)
      }

      /**
       * Store one key the pre-pool way.
       * @param {object} channel - the resolved channel.
       * @param {string} value - the validated key.
       */
      function saveOne(channel, value) {
        setBusy(true)
        setNotice(null)
        Promise.resolve()
          .then(function () { return face.save(channel, value) })
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
                  return {
                    phase: previous.phase,
                    channel: Object.assign({}, previous.channel, { info: info }),
                    pool: previous.pool,
                    message: previous.message,
                  }
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
        setClearing(true)
        setNotice(null)
        Promise.resolve()
          .then(function () { return face.clear(channel) })
          .then(function (outcome) {
            if (!outcome.ok) {
              setNotice({ kind: 'error', text: outcome.message })
              setBusy(false)
              setClearing(false)
              return
            }
            setDraft('')
            setNotice({ kind: 'saved', text: t('state.cleared') })
            return Promise.resolve()
              .then(function () { return face.describe(channel) })
              .then(function (info) {
                setBusy(false)
                setClearing(false)
                setView(function (previous) {
                  if (previous.channel === null) return previous
                  return { phase: previous.phase, message: previous.message, channel: Object.assign({}, previous.channel, { info: info }) }
                })
              }, function () { setBusy(false); setClearing(false) })
          }, function (error) {
            setBusy(false)
            setClearing(false)
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
            h('div', { 'data-chk-fieldtools': '' },
              h('button', {
                type: 'button',
                'data-chk-paste': '',
                disabled: busy,
                title: t('action.paste'),
                onClick: pasteFromClipboard,
              }, t('action.paste')),
              h('button', {
                type: 'button',
                'data-chk-reveal': '',
                tabIndex: -1,
                'aria-label': t(reveal ? 'field.hide' : 'field.show'),
                onClick: function () { setReveal(function (value) { return !value }) },
              }, t(reveal ? 'field.hide' : 'field.show')))),
        ]
        if (channel.derived) {
          rows.push(h('div', { key: 'derived', 'data-chk-note': '' }, t(channel.ns === undefined ? 'notice.undeclared' : 'notice.derived')))
        }
        return rows
      }

      /**
       * The tooltip for one rejected key: when it failed and what the provider said.
       * @param {object} entry - one Host pool entry.
       * @returns {string} the title text.
       */
      function invalidTitle(entry) {
        var parts = [t('pool.invalidAt') + ' ' + formatTime(entry.invalidAt)]
        if (entry.code !== undefined) parts.push(entry.code)
        if (entry.message !== undefined) parts.push(entry.message)
        return parts.join(' · ')
      }

      /**
       * The tooltip for one balance: where the number comes from and what it
       * spent today, when the gateway said.
       * @param {object} reading - one successful Host reading.
       * @returns {string} the title text.
       */
      function balanceTitle(reading) {
        var parts = []
        if (reading.planName !== undefined) parts.push(reading.planName)
        if (typeof reading.todayCost === 'number') {
          parts.push(t('balance.today') + ' ' + unitSymbol(reading.unit) + reading.todayCost.toFixed(2))
        }
        return parts.join(' · ')
      }

      /**
       * The balance of one key.
       *
       * Nothing is shown until a reading exists — the rows render first and the
       * numbers land after — and a reading the gateway refused stays an em dash,
       * so "not looked up yet" never masquerades as "out of credit".
       * @param {object|undefined} reading - the Host's row for this slot.
       * @returns {object|null} the element, or null while nothing was read.
       */
      function renderBalance(reading) {
        if (reading === undefined || reading === null) return null
        if (reading.ok !== true) {
          return h('span', {
            key: 'balance',
            'data-chk-balance': '',
            title: reading.message === undefined ? '' : reading.message,
          }, t('balance.none'))
        }
        var tone = reading.valid === false || reading.balance <= 0 ? 'zero' : (reading.balance <= LOW_BALANCE ? 'low' : undefined)
        return h('span', {
          key: 'balance',
          'data-chk-balance': '',
          'data-tone': tone,
          title: balanceTitle(reading),
        }, formatBalance(reading))
      }

      /**
       * One pool row: number, mask, state, and the controls that edit it.
       *
       * The controls stay invisible until the row is hovered or focused, so the
       * list reads as data and the actions appear where the pointer already is.
       * @param {object} entry - one Host pool entry.
       * @param {number} index - its position in the sweep.
       * @param {object} pool - the whole pool, for the endpoints of the order.
       * @param {object|undefined} reading - the Host's balance reading for this slot.
       */
      function renderPoolRow(entry, index, pool, reading) {
        var active = entry.slot === pool.active
        var rejected = entry.invalidAt !== undefined
        var dragging = drag !== null && drag.from === entry.slot
        var over = drag !== null && drag.over === entry.slot

        function action(kind, label, glyph, options) {
          var extra = options === undefined ? {} : options
          return h('button', {
            key: kind,
            type: 'button',
            'data-chk-rowaction': kind,
            'data-tone': extra.danger === true ? 'danger' : undefined,
            disabled: busy || extra.disabled === true,
            title: label,
            'aria-label': label,
            onClick: extra.onClick,
          }, glyph)
        }

        return h('div', {
          key: 'slot-' + entry.slot,
          'data-chk-row': '',
          'data-slot': entry.slot,
          'data-active': active ? '' : undefined,
          'data-invalid': rejected ? '' : undefined,
          'data-dragging': dragging ? '' : undefined,
          'data-drop': over ? '' : undefined,
          draggable: true,
          title: t('pool.drag'),
          onDragStart: function (event) { onRowDragStart(event, entry) },
          onDragOver: function (event) { onRowDragOver(event, entry) },
          onDrop: function (event) { onRowDrop(event, entry) },
          onDragEnd: function () { setDrag(null) },
        }, [
          h('span', { key: 'num', 'data-chk-slotnum': '' }, '#' + entry.slot),
          h('span', { key: 'mask', 'data-chk-rowmask': '', title: entry.masked === undefined ? '' : entry.masked },
            entry.masked === undefined || entry.masked.length === 0 ? t('pool.empty') : entry.masked),
          renderBalance(reading),
          active ? h('span', { key: 'active', 'data-chk-badge': 'active' }, t('pool.active')) : null,
          rejected
            ? h('span', {
              key: 'invalid',
              'data-chk-badge': 'invalid',
              title: invalidTitle(entry),
            }, t('pool.invalid'))
            : null,
          h('span', { key: 'actions', 'data-chk-actions-cluster': '' }, [
            rejected
              ? action('restore', t('pool.restore'), h(RestoreIcon), {
                onClick: function () { runPoolOp({ op: 'restore', slot: entry.slot }) },
              })
              : null,
            action('up', t('pool.up'), h(ChevronIcon), {
              disabled: index === 0,
              onClick: function () { runPoolOp({ op: 'move', slot: entry.slot, delta: -1 }) },
            }),
            action('down', t('pool.down'), h(ChevronIcon, { down: true }), {
              disabled: index === pool.entries.length - 1,
              onClick: function () { runPoolOp({ op: 'move', slot: entry.slot, delta: 1 }) },
            }),
            active || rejected
              ? null
              : action('activate', t('pool.activate'), h(UseIcon), {
                onClick: function () { runPoolOp({ op: 'activate', slot: entry.slot }) },
              }),
            action('remove', t('pool.remove'), h(TrashIcon), {
              danger: true,
              onClick: function () { runPoolOp({ op: 'remove', slot: entry.slot }) },
            }),
          ]),
        ])
      }

      /**
       * The balance readings, keyed by slot, so a row can find its own.
       * @returns {object} slot → reading.
       */
      function balanceBySlot() {
        var readings = {}
        if (balance === null || balance === undefined || !Array.isArray(balance.results)) return readings
        for (var index = 0; index < balance.results.length; index += 1) {
          var item = balance.results[index]
          if (item !== null && typeof item === 'object') readings[item.slot] = item
        }
        return readings
      }

      /**
       * The pool list, in the order requests walk it.
       * @param {object} pool - the Host pool.
       */
      function renderPoolList(pool) {
        if (pool === undefined || pool === null || pool.entries === undefined) return null
        if (pool.entries.length === 0) return h('div', { 'data-chk-empty': '' }, t('pool.none'))
        var readings = balanceBySlot()
        return h('div', { 'data-chk-list': '' }, pool.entries.map(function (entry, index) {
          return renderPoolRow(entry, index, pool, readings[entry.slot])
        }))
      }

      /**
       * One line under the list: how many keys there are, how many were rejected,
       * and what the pool holds in total, with the control that re-reads it.
       * An empty pool says so once, in the list itself.
       * @param {object} pool - the Host pool.
       */
      function renderPoolSummary(pool) {
        if (pool === undefined || pool === null || pool.entries === undefined) return null
        if (pool.entries.length === 0) return null
        var total = pool.entries.length
        var rejected = pool.entries.filter(function (entry) { return entry.invalidAt !== undefined }).length
        var known = []
        if (balance !== null && balance !== undefined && Array.isArray(balance.results)) {
          known = balance.results.filter(function (item) { return item.ok === true })
        }
        var sum = 0
        for (var index = 0; index < known.length; index += 1) sum += known[index].balance
        var unit = known.length > 0 ? known[0].unit : undefined
        return h('div', { 'data-chk-summary': '' },
          h('span', null, total + ' ' + t('pool.keys')),
          rejected > 0 ? h('span', null, '·') : null,
          rejected > 0 ? h('span', null, rejected + ' ' + t('pool.invalid')) : null,
          known.length > 0 ? h('span', null, '·') : null,
          known.length > 0
            ? h('span', { 'data-chk-total': '' }, t('balance.total') + ' ' + unitSymbol(unit) + sum.toFixed(2))
            : null,
          h('span', { 'data-chk-spacer': '' }),
          h('button', {
            type: 'button',
            'data-chk-refresh': '',
            disabled: balancing,
            title: t('action.balance'),
            onClick: function () { loadBalance(view.channel, true) },
          }, balancing ? t('state.balancing') : t('action.balance')),
          h('span', { 'data-chk-hint': '' }, t('pool.drag')))
      }

      /**
       * The pool's editor: one field that accepts one key or a pasted block.
       * @param {object} channel - the resolved channel.
       */
      function renderPoolEditor(channel) {
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
              placeholder: t('field.placeholder.multi'),
              autoComplete: 'new-password',
              spellCheck: false,
              disabled: busy,
              onChange: function (event) { setDraft(event.target.value) },
              onPaste: onPaste,
              onKeyDown: function (event) {
                if (event.key !== 'Enter') return
                event.preventDefault()
                submit()
              },
            }),
            h('div', { 'data-chk-fieldtools': '' },
              h('button', {
                type: 'button',
                'data-chk-paste': '',
                disabled: busy,
                title: t('action.paste'),
                onClick: pasteFromClipboard,
              }, t('action.paste')),
              h('button', {
                type: 'button',
                'data-chk-reveal': '',
                tabIndex: -1,
                'aria-label': t(reveal ? 'field.hide' : 'field.show'),
                onClick: function () { setReveal(function (value) { return !value }) },
              }, t(reveal ? 'field.hide' : 'field.show')))),
        ]
        if (channel.derived) {
          rows.push(h('div', { key: 'derived', 'data-chk-note': '' }, t(channel.ns === undefined ? 'notice.undeclared' : 'notice.derived')))
        }
        return rows
      }

      /**
       * The pool's action row.
       * @param {object} pool - the Host pool.
       */
      function renderPoolActions(pool) {
        var empty = pool === undefined || pool === null || pool.entries === undefined || pool.entries.length === 0
        return h('div', { 'data-chk-actions': '' },
          h('button', {
            type: 'button',
            'data-chk-action': '',
            'data-chk-probe': '',
            disabled: empty || busy,
            onClick: runProbe,
          }, probing ? t('state.probing') : t('action.probe')),
          h('button', {
            type: 'button',
            'data-chk-action': '',
            disabled: empty,
            onClick: copyInventory,
          }, t('action.export')),
          h('button', {
            type: 'button',
            'data-chk-action': '',
            disabled: empty || busy,
            onClick: function () { runPoolOp({ op: 'clear' }) },
          }, clearing ? t('state.clearing') : t('action.clearAll')),
          h('span', { 'data-chk-spacer': '' }),
          h('button', { type: 'button', 'data-chk-action': '', onClick: close }, t('action.cancel')),
          h('button', {
            type: 'button',
            'data-chk-action': '',
            'data-variant': 'primary',
            disabled: busy,
            onClick: submit,
          }, busy && !clearing ? t('state.saving') : t('action.add')))
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
          }, clearing ? t('state.clearing') : t('action.clear')),
          h('span', { 'data-chk-spacer': '' }),
          h('button', { type: 'button', 'data-chk-action': '', onClick: close }, t('action.cancel')),
          h('button', {
            type: 'button',
            'data-chk-action': '',
            'data-variant': 'primary',
            disabled: !editable || busy,
            onClick: submit,
          }, busy && !clearing ? t('state.saving') : t('action.save')))
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
        if (poolMode()) {
          var result = view.pool
          if (result.ok !== true) {
            body.push(h('div', { key: 'poolError', 'data-chk-error': '', role: 'alert' },
              result.message === undefined ? t('error.pool') : result.message))
            body.push(h('div', { key: 'actions', 'data-chk-actions': '' },
              h('button', { type: 'button', 'data-chk-action': '', onClick: load }, t('action.retry')),
              h('span', { 'data-chk-spacer': '' }),
              h('button', { type: 'button', 'data-chk-action': '', onClick: close }, t('action.cancel'))))
            return body
          }
          body.push(h('div', { key: 'list' }, renderPoolList(result.pool)))
          body.push(h('div', { key: 'summary' }, renderPoolSummary(result.pool)))
          body.push(h('div', { key: 'editor', style: { display: 'flex', flexDirection: 'column', gap: '4px' } }, renderPoolEditor(channel)))
          body.push(h('div', { key: 'notice' }, renderNotice()))
          body.push(h('div', { key: 'hint', 'data-chk-note': '' }, t('notice.pool')))
          body.push(h('div', { key: 'actions' }, renderPoolActions(result.pool)))
          return body
        }
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
        pool: function (channel) { return loadPool(channel) },
        mutate: function (channel, op) { return applyPoolOp(channel, op) },
        addKeys: function (channel, keys) { return addKeysToPool(ctx, channel, keys) },
        probe: function (channel) { return applyPoolOp(channel, { op: 'probe' }) },
        balance: function (channel, options) {
          return applyPoolOp(channel, Object.assign({ op: 'balance' }, options === undefined ? {} : options))
        },
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
      splitKeyLines: splitKeyLines,
      deltaFor: deltaFor,
      inventoryText: inventoryText,
      formatBalance: formatBalance,
      deriveKeyRef: deriveKeyRef,
      valueAt: valueAt,
      anchorPosition: anchorPosition,
      resolveChannel: resolveChannel,
      saveCredential: saveCredential,
      clearCredential: clearCredential,
      loadPool: loadPool,
      applyPoolOp: applyPoolOp,
      addKeysToPool: addKeysToPool,
      declareReference: declareReference,
    }
    return module.exports
  },
})
