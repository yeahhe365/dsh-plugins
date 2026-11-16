window.__ModuleLoader__.load({
  id: 'dsh-call-meter',
  factory: (require) => {
    var React = require('react')
    var ReactDOM = require('react-dom')

    var NS = 'call-meter'
    var STYLE_ID = 'dsh-call-meter-style'
    var DESC_PREFIX = 'dsh-call-meter-desc'
    var ENDPOINT = '/api/dsh-call-meter/stats'

    /**
     * One poll a second. The figure changes only when a call is dispatched, and
     * a sparkline bucket spans five seconds, so a faster timer buys nothing but
     * request volume. Background tabs stop polling entirely.
     */
    var REFRESH_MS = 1000
    /** First retry delay after a failed poll; doubles up to RETRY_MAX_MS. */
    var RETRY_MS = 800
    /** Ceiling for the retry backoff, so a dead route does not stay chatty. */
    var RETRY_MAX_MS = 10000
    /** A poll that has not answered by now counts as failed, not pending. */
    var FETCH_TIMEOUT_MS = 3000
    /** Suppress the count animation when calls arrive faster than it can play. */
    var BUMP_GAP_MS = 500

    var CSS = [
      /* One in-flow entry in the dock row, beside the shipped activity and
         usage controls: the host owns that row's geometry, so the meter never
         repositions itself or pads the dock. */
      '[data-dsh-cm]{display:inline-flex;align-items:center;gap:6px;height:22px;min-width:0;',
      'padding:0 6px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;',
      'color:var(--dsw-alias-label-caption);font:inherit;font-size:11px;line-height:16px;',
      'font-variant-numeric:tabular-nums;white-space:nowrap;user-select:none;cursor:default;',
      'transition:opacity 160ms ease,background-color 160ms ease}',
      '[data-dsh-cm]:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '[data-dsh-cm]:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));',
      'outline-offset:1px}',
      '[data-dsh-cm][data-dsh-cm-state="stale"],[data-dsh-cm][data-dsh-cm-state="offline"]{opacity:.62}',
      /* Activity dot: live while a call is streaming, warning once the reading
         is stale. Either way it disappears the moment nothing needs saying. */
      '[data-dsh-cm-dot]{width:5px;height:5px;border-radius:50%;flex:none;',
      'background:var(--dsw-alias-state-business-primary)}',
      '[data-dsh-cm-dot][data-tone="warn"]{background:var(--dsw-alias-state-warn-primary)}',
      '@keyframes dsh-cm-pulse{0%,100%{opacity:1}50%{opacity:.35}}',
      '[data-dsh-cm-dot][data-tone="live"]{animation:dsh-cm-pulse 1.6s ease-in-out infinite}',
      '[data-dsh-cm-bars]{display:inline-flex;align-items:flex-end;gap:2px;height:12px;flex:none}',
      '[data-dsh-cm-bar]{width:2px;min-height:2px;border-radius:1px;',
      'background:var(--dsw-alias-border-l2);transition:height 160ms ease,background-color 160ms ease}',
      '[data-dsh-cm-bar][data-on]{background:var(--dsw-alias-state-business-primary)}',
      '[data-dsh-cm-bar][data-fail]{background:var(--dsw-alias-state-warn-primary)}',
      '[data-dsh-cm-text]{display:inline-flex;align-items:baseline;gap:4px;min-width:0}',
      '[data-dsh-cm-label]{overflow:hidden;text-overflow:ellipsis;color:var(--dsw-alias-label-caption)}',
      '[data-dsh-cm-num]{display:inline-block;min-width:2ch;text-align:center;',
      'color:var(--dsw-alias-label-primary);font-size:12px;line-height:16px;font-weight:500}',
      '[data-dsh-cm-num][data-bump]{animation:dsh-cm-pop 480ms ease}',
      '@keyframes dsh-cm-pop{0%{color:var(--dsw-alias-state-business-primary);transform:translateY(-1px)}',
      '60%{color:var(--dsw-alias-state-business-primary);transform:translateY(0)}',
      '100%{color:var(--dsw-alias-label-primary)}}',
      '[data-dsh-cm-unit]{color:var(--dsw-alias-label-caption)}',
      /* Detail popover: portaled to the document body, because the docked
         composer is the containing block for fixed descendants. */
      '[data-dsh-cm-tip]{position:fixed;z-index:2147483000;max-width:280px;padding:8px 10px;',
      'display:flex;flex-direction:column;gap:3px;pointer-events:none;',
      'border-radius:var(--dsw-radius-md);border:.5px solid var(--dsw-alias-border-l3);',
      'background:var(--dsw-alias-bg-layer-3);box-shadow:var(--dsw-elevation-panel);',
      'color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px}',
      '[data-dsh-cm-tip-title]{color:var(--dsw-alias-label-caption)}',
      '[data-dsh-cm-row]{display:flex;justify-content:space-between;gap:16px}',
      '[data-dsh-cm-row][data-tone="warn"]{color:var(--dsw-alias-state-warn-primary)}',
      '[data-dsh-cm-row-value]{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}',
      '[data-dsh-cm-row][data-tone="warn"] [data-dsh-cm-row-value]{color:inherit}',
      '[data-dsh-cm-sep]{height:1px;margin:3px 0;background:var(--dsw-alias-border-l2)}',
      '[data-dsh-cm-sr]{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;',
      'clip:rect(0 0 0 0);white-space:nowrap;border:0}',
      '@media (max-width:560px){[data-dsh-cm-bars]{display:none}}',
      '@media (prefers-reduced-motion:reduce){[data-dsh-cm-num][data-bump]{animation:none}',
      '[data-dsh-cm-bar],[data-dsh-cm]{transition:none}',
      '[data-dsh-cm-dot][data-tone="live"]{animation:none}}',
    ].join('')

    var ZH = {
      window: '近 1 分钟',
      unit: '次',
      calls: '{n} 次',
      inFlight: '进行中',
      fiveMinutes: '近 5 分钟',
      failed: '失败',
      lastCall: '最近一次',
      justNow: '刚刚',
      secondsAgo: '{n} 秒前',
      sinceStart: '本次运行总计',
      tipTitle: '最近 60 秒内发起的模型调用',
      staleFor: '计数已 {n} 秒未更新',
      offline: '暂时读不到计数',
      unknownRoute: '未知来源',
    }

    var EN = {
      window: 'last 1 min',
      unit: 'calls',
      calls: '{n} calls',
      inFlight: 'in flight',
      fiveMinutes: 'Last 5 minutes',
      failed: 'Failed',
      lastCall: 'Last call',
      justNow: 'just now',
      secondsAgo: '{n}s ago',
      sinceStart: 'Since host start',
      tipTitle: 'Model calls dispatched in the last 60 seconds',
      staleFor: 'Reading is {n}s old',
      offline: 'Counter temporarily unavailable',
      unknownRoute: 'unknown route',
    }

    /** Locale-backed translator, replaced on every activation. */
    var tr = function (key) { return key }

    /** Inject the pill stylesheet once and keep it in sync across reloads. */
    function ensureStyle() {
      if (typeof document === 'undefined') return function () {}
      var existing = document.getElementById(STYLE_ID)
      if (existing !== null) {
        if (existing.textContent !== CSS) existing.textContent = CSS
        return function () {}
      }
      var style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = CSS
      document.head.appendChild(style)
      return function () {
        if (style.parentNode !== null) style.parentNode.removeChild(style)
      }
    }

    /**
     * A stable fingerprint of everything the pill and the popover display.
     * Unchanged fingerprints keep the previous React state object, so an idle
     * poll costs no render at all.
     */
    function signatureOf(state) {
      var data = state.data
      if (data === null) return state.status
      var routes = Array.isArray(data.providers) ? data.providers : []
      var parts = [
        state.status,
        data.count,
        data.inFlight,
        data.ok,
        data.failed,
        data.fiveMinuteCount,
        data.total,
        data.startedAt,
        /* Recency only needs the precision the popover prints. */
        data.lastAgeMs === null ? '-' : Math.floor(data.lastAgeMs / 1000),
        Array.isArray(data.buckets) ? data.buckets.join(',') : '',
        Array.isArray(data.failedBuckets) ? data.failedBuckets.join(',') : '',
      ]
      for (var i = 0; i < routes.length; i++) {
        parts.push(routes[i].provider + '/' + routes[i].model + '=' + routes[i].count + '+' + routes[i].failed)
      }
      return parts.join('|')
    }

    /**
     * Column height for one bucket. The scale is absolute, not normalized
     * against the window peak: a peak that ages out must not resize every other
     * column under the reader's eyes.
     */
    function barHeight(count) {
      if (count <= 0) return 2
      return Math.min(12, 3 + Math.round(3 * Math.log2(count + 1)))
    }

    /** One 5-second bucket column in the sparkline. */
    function bar(count, failCount, index) {
      return React.createElement('span', {
        key: index,
        'data-dsh-cm-bar': true,
        'data-on': count > 0 ? '' : undefined,
        'data-fail': failCount > 0 ? '' : undefined,
        style: { height: barHeight(count) + 'px' },
      })
    }

    /** Route label: `provider/model`, or the provider alone when no model id. */
    function routeLabel(row) {
      var provider = row.provider || tr('unknownRoute')
      return row.model ? provider + '/' + row.model : provider
    }

    /** The popover rows, and the same reading as one plain-text sentence. */
    function readingFor(state) {
      var data = state.data
      var rows = []
      if (data === null) {
        rows.push({ label: tr('offline'), value: '—', tone: 'warn' })
        return { rows: rows, text: tr('offline') }
      }

      rows.push({ label: tr('window'), value: tr('calls', { n: data.count }) })
      if (data.inFlight > 0) rows.push({ label: tr('inFlight'), value: String(data.inFlight) })
      rows.push({ label: tr('fiveMinutes'), value: tr('calls', { n: data.fiveMinuteCount }) })
      if (data.failed > 0) rows.push({ label: tr('failed'), value: tr('calls', { n: data.failed }), tone: 'warn' })

      if (typeof data.lastAgeMs === 'number') {
        var seconds = Math.max(0, Math.round(data.lastAgeMs / 1000))
        rows.push({
          label: tr('lastCall'),
          value: seconds < 2 ? tr('justNow') : tr('secondsAgo', { n: seconds }),
        })
      }

      var routes = Array.isArray(data.providers) ? data.providers : []
      if (routes.length > 0) rows.push({ separator: true })
      for (var i = 0; i < routes.length; i++) {
        var row = routes[i]
        var value = row.failed > 0
          ? tr('calls', { n: row.count }) + ' · ' + tr('failed') + ' ' + row.failed
          : tr('calls', { n: row.count })
        rows.push({ label: routeLabel(row), value: value, tone: row.failed > 0 ? 'warn' : undefined })
      }

      rows.push({ separator: true })
      rows.push({ label: tr('sinceStart'), value: tr('calls', { n: data.total }) })

      if (state.status !== 'ready') {
        rows.push({ label: tr('staleFor', { n: Math.round((state.ageMs || 0) / 1000) }), tone: 'warn' })
      }

      var text = [tr('tipTitle')]
      for (var k = 0; k < rows.length; k++) {
        if (rows[k].separator === true) continue
        text.push(rows[k].label + '：' + rows[k].value)
      }
      return { rows: rows, text: text.join('；') }
    }

    /**
     * The detail popover. It is portaled to the document body and never takes
     * pointer events: the pill alone owns hover, focus and click, so the panel
     * cannot keep itself open after the pointer leaves.
     */
    function MeterTip(props) {
      var ref = React.useRef(null)
      var pair = React.useState(null)
      var pos = pair[0]
      var setPos = pair[1]

      React.useLayoutEffect(function () {
        if (props.open !== true) return undefined

        function place() {
          var anchor = props.anchorRef.current
          var element = ref.current
          if (anchor === null || element === null) return
          var box = anchor.getBoundingClientRect()
          var width = element.offsetWidth
          var height = element.offsetHeight
          var pad = 8
          var left = Math.round(box.left + box.width / 2 - width / 2)
          left = Math.min(Math.max(pad, left), Math.max(pad, window.innerWidth - width - pad))
          var top = Math.round(box.top - height - 6)
          if (top < pad) top = Math.round(box.bottom + 6)
          setPos(function (prev) {
            if (prev !== null && prev.left === left && prev.top === top) return prev
            return { left: left, top: top }
          })
        }

        place()
        window.addEventListener('resize', place)
        window.addEventListener('scroll', place, true)
        return function () {
          window.removeEventListener('resize', place)
          window.removeEventListener('scroll', place, true)
        }
      }, [props.open, props.anchorRef, props.revision])

      if (props.open !== true) return null

      /* Measured off-screen for one frame, then placed. */
      var style = pos === null
        ? { left: '-9999px', top: '-9999px' }
        : { left: pos.left + 'px', top: pos.top + 'px' }

      return ReactDOM.createPortal(
        React.createElement('div', {
          'data-dsh-cm-tip': true,
          ref: ref,
          style: style,
          'aria-hidden': 'true',
        }, props.children),
        document.body,
      )
    }

    /**
     * The dock pill. Polling is visibility-aware, has a hard per-request
     * deadline, and backs off when the route stops answering; an unchanged
     * snapshot never re-renders.
     */
    function CallMeter() {
      /* One dock entry per session, but the composer can render in more than one
         occurrence; the description id has to stay unique per instance. */
      var uid = typeof React.useId === 'function' ? String(React.useId()).replace(/[^a-zA-Z0-9_-]/g, '') : 'one'
      var descId = DESC_PREFIX + '-' + uid

      var statePair = React.useState({ status: 'loading', data: null, ageMs: 0 })
      var state = statePair[0]
      var setState = statePair[1]

      var openPair = React.useState(false)
      var open = openPair[0]
      var setOpen = openPair[1]

      var bumpPair = React.useState(0)
      var bump = bumpPair[0]
      var setBump = bumpPair[1]

      var buttonRef = React.useRef(null)
      var previous = React.useRef(null)
      var lastBumpAt = React.useRef(0)
      var hoverTimer = React.useRef(0)

      React.useEffect(function () {
        var alive = true
        var timer = 0
        var controller = null
        var backoff = RETRY_MS
        var lastOkAt = 0

        function clearTimer() {
          if (timer !== 0) {
            window.clearTimeout(timer)
            timer = 0
          }
        }

        function schedule(delay) {
          clearTimer()
          if (!alive || document.hidden) return
          timer = window.setTimeout(tick, delay)
        }

        function settleFailure() {
          var now = Date.now()
          setState(function (prev) {
            if (prev.data === null) return { status: 'offline', data: null, ageMs: 0 }
            return { status: 'stale', data: prev.data, ageMs: now - lastOkAt }
          })
          backoff = Math.min(Math.round(backoff * 1.7), RETRY_MAX_MS)
          schedule(backoff)
        }

        function tick() {
          if (!alive || document.hidden) return

          controller = typeof AbortController === 'function' ? new AbortController() : null
          var timedOut = false
          var deadline = 0
          if (controller !== null) {
            deadline = window.setTimeout(function () {
              timedOut = true
              controller.abort()
            }, FETCH_TIMEOUT_MS)
          }

          var options = { cache: 'no-store', credentials: 'same-origin', headers: { accept: 'application/json' } }
          if (controller !== null) options.signal = controller.signal

          fetch(ENDPOINT, options)
            .then(function (response) {
              var type = response.headers.get('content-type') || ''
              if (!response.ok || type.indexOf('application/json') === -1) {
                throw new Error('HTTP ' + response.status)
              }
              return response.json()
            })
            .then(function (data) {
              if (!alive) return
              lastOkAt = Date.now()
              backoff = RETRY_MS
              setState(function (prev) {
                var next = { status: 'ready', data: data, ageMs: 0 }
                /* Identical snapshot: keep the previous object so React bails
                   out instead of re-rendering the pill every second. */
                return signatureOf(prev) === signatureOf(next) ? prev : next
              })
              schedule(REFRESH_MS)
            })
            .catch(function (error) {
              if (!alive) return
              /* An AbortError that we did not time out is our own teardown. */
              if (error && error.name === 'AbortError' && !timedOut) return
              settleFailure()
            })
            .finally(function () {
              if (deadline !== 0) window.clearTimeout(deadline)
            })
        }

        function onVisibility() {
          if (document.hidden) {
            clearTimer()
            if (controller !== null) controller.abort()
            return
          }
          backoff = RETRY_MS
          schedule(0)
        }

        document.addEventListener('visibilitychange', onVisibility)
        schedule(0)

        return function () {
          alive = false
          clearTimer()
          document.removeEventListener('visibilitychange', onVisibility)
          if (controller !== null) controller.abort()
        }
      }, [])

      /* Bump only when the figure actually rises, and never faster than the
         animation can play: a burst used to restart it on every poll. */
      React.useEffect(function () {
        var data = state.data
        if (data === null) return
        var before = previous.current
        previous.current = data.count
        if (before === null || data.count <= before) return
        var now = Date.now()
        if (now - lastBumpAt.current < BUMP_GAP_MS) return
        lastBumpAt.current = now
        setBump(function (value) { return value + 1 })
      }, [state.data === null ? null : state.data.count])

      /* Escape and outside presses dismiss the popover; the button keeps focus
         so the keyboard never loses its place. */
      React.useEffect(function () {
        if (!open) return undefined

        function onKeyDown(event) {
          if (event.key !== 'Escape') return
          event.stopPropagation()
          setOpen(false)
        }

        function onPointerDown(event) {
          if (buttonRef.current !== null && buttonRef.current.contains(event.target)) return
          setOpen(false)
        }

        document.addEventListener('keydown', onKeyDown, true)
        document.addEventListener('pointerdown', onPointerDown, true)
        return function () {
          document.removeEventListener('keydown', onKeyDown, true)
          document.removeEventListener('pointerdown', onPointerDown, true)
        }
      }, [open])

      /* A hover intent timer must not outlive the pill that armed it. */
      React.useEffect(function () {
        return function () {
          if (hoverTimer.current !== 0) {
            window.clearTimeout(hoverTimer.current)
            hoverTimer.current = 0
          }
        }
      }, [])

      if (state.status === 'loading') return null

      var data = state.data
      var buckets = data !== null && Array.isArray(data.buckets) ? data.buckets : new Array(12).fill(0)
      var failures = data !== null && Array.isArray(data.failedBuckets) ? data.failedBuckets : []
      var reading = readingFor(state)
      var revision = signatureOf(state)

      var dotTone = state.status !== 'ready' ? 'warn' : data !== null && data.inFlight > 0 ? 'live' : ''
      var dot = dotTone === ''
        ? null
        : React.createElement('span', { 'data-dsh-cm-dot': true, 'data-tone': dotTone, 'aria-hidden': 'true' })

      var staleNote = state.status !== 'ready'
        ? React.createElement('span', { 'data-dsh-cm-sr': true }, tr('offline'))
        : null

      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          'button',
          {
            type: 'button',
            ref: buttonRef,
            'data-dsh-cm': true,
            'data-composer-stat': 'call-meter',
            'data-dsh-cm-state': state.status,
            'aria-describedby': descId,
            onClick: function () { setOpen(!open) },
            onPointerEnter: function (event) {
              if (event.pointerType !== 'mouse') return
              if (hoverTimer.current !== 0) window.clearTimeout(hoverTimer.current)
              hoverTimer.current = window.setTimeout(function () {
                hoverTimer.current = 0
                setOpen(true)
              }, 150)
            },
            onPointerLeave: function (event) {
              if (event.pointerType !== 'mouse') return
              if (hoverTimer.current !== 0) {
                window.clearTimeout(hoverTimer.current)
                hoverTimer.current = 0
              }
              setOpen(false)
            },
            onFocus: function (event) {
              /* Keyboard focus opens; pointer focus must not fight the click. */
              if (event.currentTarget.matches(':focus-visible')) setOpen(true)
            },
            onBlur: function () { setOpen(false) },
          },
          dot,
          React.createElement(
            'span',
            { 'data-dsh-cm-bars': true, 'aria-hidden': 'true' },
            buckets.map(function (count, index) { return bar(count, failures[index] || 0, index) }),
          ),
          React.createElement(
            'span',
            { 'data-dsh-cm-text': true },
            React.createElement('span', { 'data-dsh-cm-label': true }, tr('window')),
            React.createElement('span', {
              key: bump,
              'data-dsh-cm-num': true,
              'data-bump': bump > 0 ? '' : undefined,
            }, data === null ? '—' : String(data.count)),
            React.createElement('span', { 'data-dsh-cm-unit': true }, tr('unit')),
          ),
          staleNote,
        ),
        React.createElement('span', { 'data-dsh-cm-sr': true, id: descId }, reading.text),
        React.createElement(MeterTip, {
          open: open,
          anchorRef: buttonRef,
          revision: revision,
        }, React.createElement('span', { 'data-dsh-cm-tip-title': true }, tr('tipTitle')),
          reading.rows.map(function (row, index) {
            if (row.separator === true) {
              return React.createElement('span', { key: 'sep' + index, 'data-dsh-cm-sep': true })
            }
            return React.createElement(
              'span',
              { key: index, 'data-dsh-cm-row': true, 'data-tone': row.tone },
              React.createElement('span', null, row.label),
              React.createElement('span', { 'data-dsh-cm-row-value': true }, String(row.value)),
            )
          }),
        ),
      )
    }

    return {
      inject: ['locale', 'slots'],
      apply: function (ctx) {
        ctx.effect(ensureStyle, 'call-meter: styles')
        ctx.effect(function () {
          return ctx.locale.register(NS, { zh: ZH, en: EN })
        }, 'call-meter: dictionaries')
        tr = ctx.locale.bind(NS)

        ctx.slots.inject('conversation.composer.dock', function () {
          return ctx.slots.register(
            { name: 'conversation.composer.dock', id: 'call-meter', order: 3, locale: NS },
            function () { return React.createElement(CallMeter) },
          )
        })
      },
    }
  },
})
