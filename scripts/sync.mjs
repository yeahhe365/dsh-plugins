/**
 * Sync this repo from the live DSH profile.
 *
 * The live copies of these plugins are installed in a profile or in the shared
 * plugins directory, not here: `dsh-composer-kit` is linked from a workspace
 * directory, the other two and the five pre-merge sources sit either in
 * `<profile>/.vendor` or in `~/.dsh/plugins`. This script copies them into the
 * repo so the repo stays a faithful, versioned snapshot.
 *
 * Usage:
 *   node scripts/sync.mjs           copy live -> repo, report what changed
 *   node scripts/sync.mjs --check   report drift only; exit 1 when different
 *
 * Environment:
 *   DSH_PROFILE_DIR       profile directory (default: ~/.dsh/profiles/desktop)
 *   DSH_PLUGINS_DIR       shared plugins directory (default: ~/.dsh/plugins)
 *   DSH_COMPOSER_KIT_DIR  live checkout of dsh-composer-kit
 *                         (default: ../dsh-composer-kit beside this repo)
 *
 * Paths listed in `.syncignore` at the repo root are never compared or copied;
 * they are the files that live inside a live checkout but stay out of the
 * snapshot (each live plugin is its own git checkout, so it carries its own
 * `.gitignore`, and the pre-merge sources carry tests and notes the snapshot
 * does not ship).
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PROFILE = process.env.DSH_PROFILE_DIR ?? join(homedir(), '.dsh', 'profiles', 'desktop')
const PLUGINS = process.env.DSH_PLUGINS_DIR ?? join(homedir(), '.dsh', 'plugins')
const LIVE_KIT = process.env.DSH_COMPOSER_KIT_DIR ?? resolve(REPO, '..', 'dsh-composer-kit')

/**
 * Where a live copy of one package may sit, in priority order.
 *
 * Both layouts are in use: a profile can vendor its plugins in `.vendor`, and
 * a machine that installs them once for every profile keeps them in the shared
 * `~/.dsh/plugins`. Neither is more correct, so try both instead of assuming.
 *
 * @param {string} name - package name.
 * @returns {string[]} candidate directories, most specific first.
 */
function liveCandidates(name) {
  return [
    join(PROFILE, '.vendor', name),
    join(PLUGINS, name),
    join(PROFILE, 'plugins', name),
  ]
}

/** The five packages that were merged into dsh-composer-kit. */
const SOURCES = [
  'dsh-client-ui-new-session',
  'dsh-client-ui-compact-button',
  'dsh-client-ui-brief-send',
  'dsh-client-ui-composer-dock-wrap',
  'dsh-call-meter',
]

/** @type {{ to: string, from: string[] }[]} */
const PAIRS = [
  { to: 'dsh-composer-kit', from: [LIVE_KIT] },
  { to: 'dsh-client-ui-channel-key', from: liveCandidates('dsh-client-ui-channel-key') },
  { to: 'dsh-llm-route-retry', from: liveCandidates('dsh-llm-route-retry') },
  ...SOURCES.map((name) => ({ to: join('sources', name), from: liveCandidates(name) })),
]

/** Files that never belong in the snapshot. */
const SKIP_DIRS = new Set(['node_modules', '.git', '.venv', '__pycache__'])
const SKIP_FILES = /(^|[\\/])(\.DS_Store|Thumbs\.db|.*\.log|.*\.bak(-\d{8}-\d{6})?)$/

/**
 * Compile one `.syncignore` pattern into a regexp.
 *
 * The grammar is deliberately tiny and follows the git convention: a star
 * matches within one path segment, a pattern without a slash matches that name
 * at any depth, and a pattern that names a directory also covers everything
 * below it. That covers `sources/<pkg>/test` and a bare `.gitignore` without
 * pulling in a glob dependency for a script that must run on a bare checkout.
 *
 * @param {string} pattern - repo-relative path pattern, forward slashes.
 * @returns {RegExp} anchored matcher.
 */
function globToRegExp(pattern) {
  const body = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '[^/]*')
  const head = pattern.includes('/') ? `^${body}` : `^(?:.*/)?${body}`
  return new RegExp(`${head}(?:/.*)?$`)
}

/** Patterns from `.syncignore`, matched against repo-relative paths. */
const IGNORE = (() => {
  const file = join(REPO, '.syncignore')
  if (!existsSync(file)) return []
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map(globToRegExp)
})()

/**
 * Whether a repo-relative path is deliberately outside the snapshot.
 *
 * @param {string} rel - path relative to the repo root, forward slashes.
 * @returns {boolean} true when `.syncignore` covers it.
 */
function isIgnored(rel) {
  return IGNORE.some((pattern) => pattern.test(rel))
}

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
const strict = process.argv.includes('--strict')
const changed = []
const added = []
const missing = []

for (const pair of PAIRS) {
  const source = pair.from.find((candidate) => existsSync(candidate))
  if (source === undefined) {
    missing.push(`${pair.to}  <-  tried ${pair.from.join(', ')}`)
    continue
  }
  const destRoot = join(REPO, pair.to)
  for (const rel of walk(source)) {
    const to = `${pair.to}/${rel}`
    if (isIgnored(to)) continue
    const src = join(source, rel)
    const dest = join(destRoot, rel)
    const same = existsSync(dest)
      && statSync(dest).size === statSync(src).size
      && readFileSync(dest).equals(readFileSync(src))
    if (same) continue
    if (existsSync(dest)) changed.push(to)
    else added.push(to)
    if (!check) {
      mkdirSync(dirname(dest), { recursive: true })
      copyFileSync(src, dest)
    }
  }
}

const drift = changed.length + added.length
const failed = strict && missing.length > 0

for (const line of missing) console.error(`not installed here: ${line}`)
for (const line of added) console.log(`${check ? 'would add   ' : 'added       '} ${line}`)
for (const line of changed) console.log(`${check ? 'would update' : 'updated     '} ${line}`)

if (check) {
  if (drift === 0 && !failed) console.log('repo is in sync with the live profile')
  else {
    console.error(`${drift} file(s) differ, ${missing.length} source(s) not installed here`)
    process.exit(1)
  }
} else {
  console.log(`${added.length} added, ${changed.length} updated, ${missing.length} source(s) not installed here`)
  if (drift === 0) console.log('nothing to do — repo already matches the live profile')
  if (failed) process.exit(1)
}
