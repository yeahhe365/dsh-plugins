/**
 * Sync this repo from the live DSH profile.
 *
 * The live copies of these plugins are installed in a profile, not here:
 * `dsh-composer-kit` is linked from a workspace directory, the other two and
 * the five pre-merge sources sit in `<profile>/.vendor`. This script copies
 * them into the repo so the repo stays a faithful, versioned snapshot.
 *
 * Usage:
 *   node scripts/sync.mjs           copy live -> repo, report what changed
 *   node scripts/sync.mjs --check   report drift only; exit 1 when different
 *
 * Environment:
 *   DSH_PROFILE_DIR       profile directory (default: the desktop profile)
 *   DSH_COMPOSER_KIT_DIR  live checkout of dsh-composer-kit
 *                         (default: ../dsh-composer-kit beside this repo)
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PROFILE = process.env.DSH_PROFILE_DIR ?? 'C:/Users/yeahhe/.dsh/profiles/desktop'
const LIVE_KIT = process.env.DSH_COMPOSER_KIT_DIR ?? resolve(REPO, '..', 'dsh-composer-kit')
const VENDOR = join(PROFILE, '.vendor')

/** The five packages that were merged into dsh-composer-kit. */
const SOURCES = [
  'dsh-client-ui-new-session',
  'dsh-client-ui-compact-button',
  'dsh-client-ui-brief-send',
  'dsh-client-ui-composer-dock-wrap',
  'dsh-call-meter',
]

/** @type {{ from: string, to: string }[]} */
const PAIRS = [
  { from: LIVE_KIT, to: 'dsh-composer-kit' },
  { from: join(VENDOR, 'dsh-client-ui-channel-key'), to: 'dsh-client-ui-channel-key' },
  { from: join(VENDOR, 'dsh-llm-route-retry'), to: 'dsh-llm-route-retry' },
  ...SOURCES.map((name) => ({ from: join(VENDOR, name), to: join('sources', name) })),
]

/** Files that never belong in the snapshot. */
const SKIP_DIRS = new Set(['node_modules', '.git', '.venv', '__pycache__'])
const SKIP_FILES = /(^|[\\/])(\.DS_Store|Thumbs\.db|.*\.log|.*\.bak(-\d{8}-\d{6})?)$/

/**
 * Every file below `root`, as paths relative to it.
 *
 * @param {string} root - directory to walk.
 * @returns {string[]} relative file paths, using forward slashes.
 */
function walk(root) {
  const out = []
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue
        visit(full)
      } else if (entry.isFile()) {
        if (SKIP_FILES.test(full)) continue
        out.push(relative(root, full).split(sep).join('/'))
      }
    }
  }
  visit(root)
  return out.sort()
}

const check = process.argv.includes('--check')
const changed = []
const added = []
const missing = []

for (const pair of PAIRS) {
  if (!existsSync(pair.from)) {
    missing.push(`${pair.to}  <-  ${pair.from} (source directory does not exist)`)
    continue
  }
  const destRoot = join(REPO, pair.to)
  for (const rel of walk(pair.from)) {
    const src = join(pair.from, rel)
    const dest = join(destRoot, rel)
    const same = existsSync(dest)
      && statSync(dest).size === statSync(src).size
      && readFileSync(dest).equals(readFileSync(src))
    if (same) continue
    if (existsSync(dest)) changed.push(`${pair.to}/${rel}`)
    else added.push(`${pair.to}/${rel}`)
    if (!check) {
      mkdirSync(dirname(dest), { recursive: true })
      copyFileSync(src, dest)
    }
  }
}

const drift = changed.length + added.length

for (const line of missing) console.error(`missing source: ${line}`)
for (const line of added) console.log(`${check ? 'would add   ' : 'added       '} ${line}`)
for (const line of changed) console.log(`${check ? 'would update' : 'updated     '} ${line}`)

if (check) {
  if (drift === 0 && missing.length === 0) console.log('repo is in sync with the live profile')
  else {
    console.error(`${drift} file(s) differ, ${missing.length} missing source(s)`)
    process.exit(1)
  }
} else {
  console.log(`${added.length} added, ${changed.length} updated, ${missing.length} missing source(s)`)
  if (drift === 0) console.log('nothing to do — repo already matches the live profile')
}
