// Stub relay: answers every chat-completions request with the failure body a
// pooled kakou/new-api channel returns. The scenario is read from
// /tmp/rrstub.mode on each request so one server can serve several test runs:
//   route  403 INSUFFICIENT_BALANCE  (per-channel, transient)
//   denied 403 Access to model denied (account-level, permanent)
//   server 500 upstream exploded      (already-retryable code, control)
const http = require('node:http')
const fs = require('node:fs')

const LOG = '/tmp/rrstub.log'
const MODE = '/tmp/rrstub.mode'
fs.writeFileSync(LOG, 'listening\n')
if (!fs.existsSync(MODE)) fs.writeFileSync(MODE, 'route\n')

const SCENARIOS = {
  route: [403, { code: 'INSUFFICIENT_BALANCE', message: '当前余额已用完；如需继续使用，请充值额度后使用。', type: 'permission_error' }],
  denied: [403, { message: 'Access to model denied. Please make sure you are eligible for using the model.', type: 'permission_error' }],
  server: [500, { message: 'upstream exploded', type: 'api_error' }],
}

let count = 0
http.createServer((req, res) => {
  let body = ''
  req.on('data', chunk => { body += chunk })
  req.on('end', () => {
    count += 1
    const mode = (fs.readFileSync(MODE, 'utf8').trim() || 'route')
    const [status, payload] = SCENARIOS[mode] ?? SCENARIOS.route
    fs.appendFileSync(LOG, `${Date.now()} #${count} ${mode} ${status} ${req.method} ${req.url}\n`)
    const text = JSON.stringify(payload)
    res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(text) })
    res.end(text)
  })
}).listen(8787, '127.0.0.1', () => console.log('stub listening on 8787'))
