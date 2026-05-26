#!/usr/bin/env node
/**
 * DARIO Orchestrator — Installer v12.1.0
 *
 *   npx github:bardapraiacaraiva/dario-orchestrator-installer
 *   npx github:bardapraiacaraiva/dario-orchestrator-installer --upgrade
 *   npx github:bardapraiacaraiva/dario-orchestrator-installer --key DARIO-XXXX-XXXX-XXXX-PRO
 *   npx github:bardapraiacaraiva/dario-orchestrator-installer --check
 *
 * Trial (public): clones dario-orchestrator (master) + starts 7-day trial.
 * VIP (private):  needs --key and a GitHub token (env DARIO_GH_TOKEN
 *                 or --token), clones dario-orchestrator-full + activates.
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const VERSION = '12.5.0';
const HOME = os.homedir();
const CLAUDE_DIR = path.join(HOME, '.claude');
const ORCH_DIR = path.join(HOME, '.claude', 'orchestrator');
const SKILLS_DIR = path.join(HOME, '.claude', 'skills');

// v12.5.0 (2026-05-26) — Observability + Enforcement layer release.
// New in canonical repo: enforcement/token_capture.py, core/org_tree.py,
// 7 dashboards refreshed, per-client P&L hooks in budget_tracker.py,
// 2 new design skills (dario-design-shotgun, emil-design-eng).
// Installer behavior unchanged from v12.4.1 — same clone-and-relocate
// flow; users upgrading from v12.4.x just pull new content.
//
// v12.4.1 (2026-05-25) — Layout fix: repo content is structured as
// <root>/{orchestrator,skills,runtime,LICENSE,README.md}, so cloning
// the whole repo into ORCH_DIR creates nested ~/.claude/orchestrator/
// orchestrator/ which breaks all Python imports. Fix: clone to a temp
// dir, then relocate top-level dirs into ~/.claude/, and move the .git
// directory to ~/.claude/.git. Existing files in ~/.claude/ are
// preserved unless they collide with a repo file (in which case we
// abort and ask the user to back up and re-run with --force).

const REPO_TRIAL = 'https://github.com/bardapraiacaraiva/dario-orchestrator.git';
const REPO_VIP   = 'https://github.com/bardapraiacaraiva/dario-orchestrator-full.git';

// ANSI colors
const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m',
};

const log = (m) => console.log(`${c.green}[DARIO]${c.reset} ${m}`);
const warn = (m) => console.log(`${c.yellow}[WARN]${c.reset}  ${m}`);
const die = (m) => { console.error(`${c.red}[ERROR]${c.reset} ${m}`); process.exit(1); };
const step = (n, m) => console.log(`\n${c.bold}${c.cyan}── Step ${n}: ${m}${c.reset}`);

// ─────────────────────────────────────────────────────────────────────────────
// Args
// ─────────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  // v12.3.0 (2026-05-23): --obfuscated is now the DEFAULT for all installs.
  // Opt out with --source if you need to read / debug / modify the .py
  // (e.g., dev integration). All paid customers and casual trials get
  // Cython-compiled binaries unless they explicitly ask for source.
  const a = {
    mode: 'install', key: null, token: null,
    dryRun: false, force: false,
    obfuscated: true, releaseTag: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--upgrade') a.mode = 'upgrade';
    else if (v === '--check') a.mode = 'check';
    else if (v === '--fix-layout') a.mode = 'fix-layout';
    else if (v === '--help' || v === '-h') a.mode = 'help';
    else if (v === '--version' || v === '-v') a.mode = 'version';
    else if (v === '--dry-run') a.dryRun = true;
    else if (v === '--force') a.force = true;
    else if (v === '--obfuscated') a.obfuscated = true;          // explicit opt-in (now redundant — default)
    else if (v === '--source' || v === '--no-obfuscated') a.obfuscated = false;  // dev opt-out
    else if (v === '--key') a.key = argv[++i];
    else if (v === '--token') a.token = argv[++i];
    else if (v === '--release-tag') a.releaseTag = argv[++i];
    else if (v.startsWith('--key=')) a.key = v.slice(6);
    else if (v.startsWith('--token=')) a.token = v.slice(8);
    else if (v.startsWith('--release-tag=')) a.releaseTag = v.slice(14);
  }
  if (!a.token && process.env.DARIO_GH_TOKEN) a.token = process.env.DARIO_GH_TOKEN;
  return a;
}

function banner(mode) {
  const title =
    mode === 'upgrade'    ? `UPGRADE → v${VERSION}`        :
    mode === 'check'      ? 'CHECK INSTALLATION'           :
    mode === 'fix-layout' ? 'FIX NESTED LAYOUT (v12.4.1)'  :
    mode === 'help'       ? 'HELP'                         :
                            `INSTALL v${VERSION}`;
  console.log(`
${c.bold}${c.cyan}╔══════════════════════════════════════════════════════════════════╗
║  DARIO ORCHESTRATOR — ${title.padEnd(43)}║
║  32 squads · 584+ skills · 3 license tiers · v${VERSION.padEnd(19)}║
╚══════════════════════════════════════════════════════════════════╝${c.reset}
`);
}

function help() {
  console.log(`
${c.bold}USAGE${c.reset}
  npx github:bardapraiacaraiva/dario-orchestrator-installer [options]

${c.bold}MODES${c.reset}
  (default)            Install trial (public repo + 7-day trial)
  --upgrade            Pull latest + run upgrade script (idempotent).
                       Auto-detects and fixes pre-v12.4.1 nested layout.
  --fix-layout         Migrate a pre-v12.4.1 nested install to flat layout
                       without doing a git pull (in-place, preserves runtime
                       state). Safe no-op if already flat.
  --check              Verify install + license status + layout
  --help               This message
  --version            Print installer version

${c.bold}LICENSE${c.reset}
  --key DARIO-XXXX-XXXX-XXXX-SUF
                       Activate a license key after install.
                       Tier inferred from suffix (PRO/ENT/ELG/EFL/...).
                       VIP keys (anything other than PRO basic trial)
                       additionally trigger the VIP repo clone — for
                       that you also need:

  --token GHP_xxx      GitHub Personal Access Token with read access
                       to dario-orchestrator-full (private).
                       Or set env: DARIO_GH_TOKEN=ghp_xxx

${c.bold}OPTIONS${c.reset}
  --dry-run            Show what would happen without doing it
  --force              Re-clone even if ~/.claude/orchestrator exists
  --obfuscated         [DEFAULT since v12.3.0] After cloning, download the
                       latest Cython-compiled binaries (.pyd/.so) from
                       GitHub Releases and remove the .py sources for
                       license_manager / license_client / license_server.
                       Bypass cost is ~3 days expert (Cython disassembly +
                       Onda 10 hardening) instead of ~30 min (edit .py).
  --source             Opt out of the default obfuscation. Keeps .py
                       sources readable / debuggable. Use this if you are
                       a dev integrating with the orchestrator and need
                       to step through license_manager logic in pdb. The
                       license enforcement still applies — only the
                       readability changes.
  --no-obfuscated      Alias for --source.
  --release-tag TAG    Pin the obfuscated overlay to a specific release tag
                       (default: latest). Format: release/license-vX.Y.Z

${c.bold}EXAMPLES${c.reset}
  # Trial install (free, public)
  npx github:bardapraiacaraiva/dario-orchestrator-installer

  # Upgrade existing install
  npx github:bardapraiacaraiva/dario-orchestrator-installer --upgrade

  # VIP install with PRO key
  DARIO_GH_TOKEN=ghp_xxx npx github:bardapraiacaraiva/dario-orchestrator-installer \\
      --key DARIO-A7B7-6AE8-75EB-PRO

  # Verify existing install
  npx github:bardapraiacaraiva/dario-orchestrator-installer --check
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Prereqs
// ─────────────────────────────────────────────────────────────────────────────
function which(cmd) {
  try {
    const r = spawnSync(os.platform() === 'win32' ? 'where' : 'which', [cmd],
      { encoding: 'utf8' });
    return r.status === 0 ? (r.stdout.split('\n')[0] || '').trim() : null;
  } catch { return null; }
}

function detectPython() {
  for (const cmd of ['python3', 'python', 'py']) {
    try {
      const r = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
      if (r.status === 0) {
        const ver = (r.stdout + r.stderr).match(/(\d+)\.(\d+)/);
        if (ver && (+ver[1] > 3 || (+ver[1] === 3 && +ver[2] >= 11))) {
          return { cmd, version: ver[0] };
        }
      }
    } catch {}
  }
  return null;
}

function checkPrereqs() {
  step(1, 'Prerequisites');
  const node = process.version;
  const major = parseInt(node.slice(1).split('.')[0], 10);
  if (major < 18) die(`Node ${node} — need >= 18.0.0`);
  log(`Node ${node}`);

  if (!which('git')) die('git not found in PATH. Install: https://git-scm.com');
  log(`git ${execSync('git --version').toString().trim()}`);

  const py = detectPython();
  if (!py) warn('Python 3.11+ not detected — runtime/license_manager will need it');
  else log(`Python ${py.version} (${py.cmd})`);

  return { python: py };
}

// ─────────────────────────────────────────────────────────────────────────────
// Key → tier mapping
// ─────────────────────────────────────────────────────────────────────────────
function parseKey(key) {
  if (!key) return null;
  // DARIO-XXXX-XXXX-XXXX-SUFFIX where SUFFIX is 2-4 chars
  const m = key.match(/^DARIO-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-([A-Z_]+)$/i);
  if (!m) return null;
  const suffix = m[1].toUpperCase();
  return { suffix, key };
}

function isVipKey(parsed) {
  // Any valid key triggers VIP repo. Trial users don't need a key —
  // they just run without --key and start the 7-day trial.
  return !!parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Clone / pull
// ─────────────────────────────────────────────────────────────────────────────
function ensureParentDir(dir) {
  fs.mkdirSync(path.dirname(dir), { recursive: true });
}

function gitClone(url, dest, dry) {
  ensureParentDir(dest);
  if (dry) { console.log(`  [dry-run] git clone ${url} ${dest}`); return; }
  execSync(`git clone --depth 1 "${url}" "${dest}"`, { stdio: 'inherit' });
}

function gitPull(dest, dry) {
  if (dry) { console.log(`  [dry-run] git -C ${dest} pull --ff-only`); return; }
  execSync(`git -C "${dest}" pull --ff-only`, { stdio: 'inherit' });
}

// v12.4.1 — Safe clone-and-relocate. Repo content is at <root>/{orchestrator,
// skills,runtime,...}, so we clone to a temp dir then move each top-level
// entry into ~/.claude/, and move .git to ~/.claude/.git. Existing
// non-conflicting files in ~/.claude/ (settings.json, sessions/, etc.) are
// preserved.
function gitCloneIntoClaudeDir(url, dry, force) {
  if (dry) {
    console.log(`  [dry-run] git clone ${url} <temp>`);
    console.log(`  [dry-run] relocate <temp>/* into ${CLAUDE_DIR}/`);
    console.log(`  [dry-run] move <temp>/.git to ${CLAUDE_DIR}/.git`);
    return;
  }

  const claudeGit = path.join(CLAUDE_DIR, '.git');
  if (fs.existsSync(claudeGit) && !force) {
    die(`${claudeGit} already exists — looks like a previous install.\n` +
        `  Run with --upgrade to update, or --force to remove and re-clone.`);
  }

  ensureParentDir(CLAUDE_DIR);
  if (!fs.existsSync(CLAUDE_DIR)) fs.mkdirSync(CLAUDE_DIR, { recursive: true });

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dario-install-'));
  const tempClone = path.join(tempDir, 'clone');
  log(`Cloning to temp: ${tempClone}`);
  execSync(`git clone --depth 1 "${url}" "${tempClone}"`, { stdio: 'inherit' });

  // Detect conflicts: any top-level entry from the clone that already exists
  // in CLAUDE_DIR with different content is a problem.
  const entries = fs.readdirSync(tempClone).filter(e => e !== '.git');
  const conflicts = [];
  for (const entry of entries) {
    const dest = path.join(CLAUDE_DIR, entry);
    if (fs.existsSync(dest)) {
      // For directories, that's a conflict only if we'd overwrite files.
      // For files, any existing file is a conflict.
      if (fs.statSync(dest).isFile()) conflicts.push(entry);
      // Directory collisions handled by merging — flagged below if --force
      else if (fs.readdirSync(dest).length > 0) conflicts.push(entry + '/ (non-empty)');
    }
  }
  if (conflicts.length > 0 && !force) {
    warn(`Conflicts detected in ${CLAUDE_DIR}:`);
    for (const c of conflicts) warn(`  - ${c}`);
    fs.rmSync(tempDir, { recursive: true, force: true });
    die(`Cannot relocate without overwriting. Back up the conflicting paths and re-run with --force, OR use --upgrade if this is an existing DARIO install.`);
  }

  // Move .git first
  fs.renameSync(path.join(tempClone, '.git'), claudeGit);
  log(`  moved .git → ${claudeGit}`);

  // Then relocate each top-level entry (directories merge, files overwrite if --force)
  for (const entry of entries) {
    const src = path.join(tempClone, entry);
    const dest = path.join(CLAUDE_DIR, entry);
    if (fs.existsSync(dest) && fs.statSync(dest).isDirectory() && fs.statSync(src).isDirectory()) {
      // Directory merge: copy each child from src into dest
      copyDirRecursiveMerging(src, dest);
      fs.rmSync(src, { recursive: true, force: true });
    } else {
      if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
      fs.renameSync(src, dest);
    }
    log(`  relocated ${entry}`);
  }

  // Cleanup temp
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function copyDirRecursiveMerging(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) {
      copyDirRecursiveMerging(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

// Detect install layout. Returns 'flat' (correct), 'nested' (bug from
// pre-v12.4.1 installs), or 'missing' (no install).
function detectLayout() {
  const flatMarker  = path.join(CLAUDE_DIR, 'orchestrator', 'dispatch_engine.py');
  const nestedMarker = path.join(CLAUDE_DIR, 'orchestrator', 'orchestrator', 'dispatch_engine.py');
  if (fs.existsSync(flatMarker))   return 'flat';
  if (fs.existsSync(nestedMarker)) return 'nested';
  return 'missing';
}

// Migrate a nested install to flat layout (in-place, preserving runtime
// state and git history).
function fixNestedLayout(dry) {
  log(`Detected NESTED layout — migrating to flat (v12.4.1 fix)...`);
  if (dry) {
    console.log(`  [dry-run] would move ${ORCH_DIR}/orchestrator/* up one level`);
    console.log(`  [dry-run] would move ${ORCH_DIR}/skills, ${ORCH_DIR}/runtime to ${CLAUDE_DIR}/`);
    console.log(`  [dry-run] would move ${ORCH_DIR}/.git to ${CLAUDE_DIR}/.git`);
    return;
  }

  const nestedRoot = ORCH_DIR;  // ~/.claude/orchestrator/
  const tempStaging = path.join(os.tmpdir(), `dario-fix-${Date.now()}`);
  fs.mkdirSync(tempStaging, { recursive: true });

  // Step 1: move .git out of nestedRoot (it will become CLAUDE_DIR/.git)
  const nestedGit = path.join(nestedRoot, '.git');
  if (fs.existsSync(nestedGit)) {
    fs.renameSync(nestedGit, path.join(tempStaging, '.git'));
    log(`  staged .git → temp`);
  }

  // Step 2: move every top-level dir (orchestrator/, skills/, runtime/, etc.)
  // out of nestedRoot
  for (const entry of fs.readdirSync(nestedRoot)) {
    const src = path.join(nestedRoot, entry);
    fs.renameSync(src, path.join(tempStaging, entry));
    log(`  staged ${entry} → temp`);
  }

  // Step 3: delete the now-empty ORCH_DIR shell so we can repopulate it
  fs.rmdirSync(nestedRoot);

  // Step 4: place .git into CLAUDE_DIR
  if (fs.existsSync(path.join(tempStaging, '.git'))) {
    fs.renameSync(path.join(tempStaging, '.git'), path.join(CLAUDE_DIR, '.git'));
    log(`  installed .git → ${CLAUDE_DIR}/.git`);
  }

  // Step 5: relocate each entry from temp into CLAUDE_DIR (directory merge)
  for (const entry of fs.readdirSync(tempStaging)) {
    const src = path.join(tempStaging, entry);
    const dest = path.join(CLAUDE_DIR, entry);
    if (fs.existsSync(dest) && fs.statSync(dest).isDirectory() && fs.statSync(src).isDirectory()) {
      copyDirRecursiveMerging(src, dest);
      fs.rmSync(src, { recursive: true, force: true });
    } else {
      fs.renameSync(src, dest);
    }
    log(`  installed ${entry} → ${CLAUDE_DIR}/${entry}`);
  }

  fs.rmSync(tempStaging, { recursive: true, force: true });
  log(`Layout migration complete. Python files now at ${ORCH_DIR}/*.py`);
}

function repoUrlWithToken(url, token) {
  if (!token) return url;
  return url.replace('https://', `https://${token}@`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Obfuscated mode (Fix 2 — 2026-05-23)
// Downloads Cython-compiled .pyd/.so binaries from the GitHub Release
// instead of cloning .py source. Raises the bar against casual reverse-
// engineering (Onda 9-10 hardening). Source files for licensing logic are
// REPLACED by the compiled artefacts; the rest of the repo (skills, configs,
// non-licensing python) is still source.
// ─────────────────────────────────────────────────────────────────────────────
const RELEASES_API_TRIAL = 'https://api.github.com/repos/bardapraiacaraiva/dario-orchestrator/releases';
const RELEASES_API_VIP   = 'https://api.github.com/repos/bardapraiacaraiva/dario-orchestrator-full/releases';

async function fetchJson(url, token) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'dario-installer', 'Accept': 'application/vnd.github+json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    https.get(url, { headers }, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, dest, token) {
  const https = require('https');
  const fileStream = fs.createWriteStream(dest);
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'dario-installer', 'Accept': 'application/octet-stream' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const req = https.get(url, { headers, followAllRedirects: true }, (res) => {
      // Follow redirect (GitHub releases use signed S3 URLs)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fileStream.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest, token).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        fileStream.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} — ${url}`));
      }
      res.pipe(fileStream);
      fileStream.on('finish', () => fileStream.close(resolve));
    });
    req.on('error', reject);
  });
}

async function installObfuscatedOverlay(vip, token, dryRun, requestedTag) {
  // 1. Find the latest (or requested) Release with license binaries
  const api = vip ? RELEASES_API_VIP : RELEASES_API_TRIAL;
  log(`Fetching releases from GitHub...`);
  const releases = await fetchJson(api, vip ? token : null);
  if (!Array.isArray(releases)) {
    throw new Error(`Releases API returned non-array. ${vip ? 'Token may lack repo scope.' : 'Repo may have no releases.'}`);
  }
  const tagged = releases.filter(r => r.tag_name && r.tag_name.startsWith('release/license-v'));
  if (tagged.length === 0) {
    throw new Error(`No license-* releases found. ` +
      `Trigger the license-build workflow with a tag push first ` +
      `(see Fix 2 docs in installer README).`);
  }
  const target = requestedTag
    ? tagged.find(r => r.tag_name === requestedTag)
    : tagged[0]; // latest
  if (!target) throw new Error(`Release ${requestedTag} not found.`);
  log(`Using release: ${target.tag_name}`);

  // 2. Pick the right asset for this platform
  const plat = os.platform();
  const assetName = plat === 'win32'
    ? 'license-binaries-windows-x64.zip'
    : 'license-binaries-linux-x64.tar.gz';
  const asset = (target.assets || []).find(a => a.name === assetName);
  if (!asset) {
    throw new Error(`Asset ${assetName} not found in release ${target.tag_name}. ` +
      `Available: ${(target.assets || []).map(a => a.name).join(', ') || '(none)'}`);
  }

  // 3. Download
  const tmpFile = path.join(os.tmpdir(), `dario-${assetName}`);
  log(`Downloading ${assetName} (${(asset.size / 1024 / 1024).toFixed(1)} MB)...`);
  if (dryRun) {
    console.log(`  [dry-run] download ${asset.url} → ${tmpFile}`);
    console.log(`  [dry-run] extract into ${ORCH_DIR}`);
    return;
  }
  await downloadFile(asset.url, tmpFile, vip ? token : null);

  // 4. Extract over the cloned source (binaries replace .py)
  log(`Extracting into ${ORCH_DIR}...`);
  if (plat === 'win32') {
    execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${tmpFile}' -DestinationPath '${ORCH_DIR}' -Force"`,
      { stdio: 'inherit' });
  } else {
    execSync(`tar -xzf "${tmpFile}" -C "${ORCH_DIR}"`, { stdio: 'inherit' });
  }
  fs.unlinkSync(tmpFile);

  // 5. Remove the .py originals so the .pyd/.so take over
  const srcCritical = [
    path.join(ORCH_DIR, 'license_manager.py'),
    path.join(ORCH_DIR, 'license_client.py'),
    path.join(ORCH_DIR, 'license_server', 'app.py'),
  ];
  let removed = 0;
  for (const f of srcCritical) {
    if (fs.existsSync(f)) { fs.unlinkSync(f); removed++; }
  }
  log(`Obfuscated overlay installed (${removed} .py sources removed; .pyd/.so in place)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// License + upgrade scripts
// ─────────────────────────────────────────────────────────────────────────────
function runUpgradeScript(py, dry) {
  const script = path.join(ORCH_DIR, 'scripts', 'upgrade_v12_1.py');
  if (!fs.existsSync(script)) {
    warn(`upgrade script not found at ${script} — skipping post-install setup`);
    return;
  }
  if (dry) { console.log(`  [dry-run] ${py.cmd} ${script}`); return; }
  try {
    execSync(`${py.cmd} "${script}"`, { stdio: 'inherit', cwd: ORCH_DIR });
  } catch (e) {
    warn(`upgrade script returned non-zero; check output above`);
  }
}

function activateLicense(py, parsed, dry) {
  const lm = path.join(ORCH_DIR, 'license_manager.py');
  if (!fs.existsSync(lm)) { warn(`license_manager.py not found; skipping activation`); return; }
  if (dry) { console.log(`  [dry-run] ${py.cmd} ${lm} --activate ${parsed.key}`); return; }
  try {
    execSync(`${py.cmd} "${lm}" --activate "${parsed.key}"`, { stdio: 'inherit', cwd: ORCH_DIR });
  } catch (e) {
    warn(`activation failed — run manually: python license_manager.py --activate ${parsed.key}`);
  }
}

function initTrial(py, dry) {
  const lm = path.join(ORCH_DIR, 'license_manager.py');
  if (!fs.existsSync(lm)) { warn(`license_manager.py not found; skipping trial init`); return; }
  if (dry) { console.log(`  [dry-run] ${py.cmd} ${lm} --init-trial`); return; }
  try {
    execSync(`${py.cmd} "${lm}" --init-trial`, { stdio: 'inherit', cwd: ORCH_DIR });
  } catch (e) {
    warn(`trial init returned non-zero — may already be initialised`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main flows
// ─────────────────────────────────────────────────────────────────────────────
async function doInstall(args) {
  const { python } = checkPrereqs();

  const parsed = parseKey(args.key);
  const vip = isVipKey(parsed);
  if (args.key && !parsed) die(`Invalid key format: ${args.key} (expected DARIO-XXXX-XXXX-XXXX-SUF)`);
  if (vip && !args.token)
    die(`VIP key requires --token (or env DARIO_GH_TOKEN) for the private VIP repo.\n` +
        `  Contact barda@automationsolutionai.com if you don't have one.`);

  step(2, vip ? 'Clone VIP repo (dario-orchestrator-full)' : 'Clone trial repo (dario-orchestrator)');
  // v12.4.1 fix: install detects existing nested or flat layouts and
  // refuses to clobber. Use --upgrade for existing installs, --force to
  // wipe and re-clone.
  const layout = detectLayout();
  if (layout !== 'missing' && !args.force) {
    die(`Existing DARIO install detected (layout=${layout}) at ${CLAUDE_DIR}.\n` +
        `  Use --upgrade to update, or --force to wipe and re-clone.`);
  }
  if (layout !== 'missing' && args.force) {
    log(`--force given; removing existing install`);
    if (!args.dryRun) {
      if (fs.existsSync(ORCH_DIR))                          fs.rmSync(ORCH_DIR, { recursive: true, force: true });
      if (fs.existsSync(path.join(CLAUDE_DIR, '.git')))     fs.rmSync(path.join(CLAUDE_DIR, '.git'), { recursive: true, force: true });
      if (fs.existsSync(path.join(CLAUDE_DIR, 'skills')))   fs.rmSync(path.join(CLAUDE_DIR, 'skills'), { recursive: true, force: true });
      if (fs.existsSync(path.join(CLAUDE_DIR, 'runtime')))  fs.rmSync(path.join(CLAUDE_DIR, 'runtime'), { recursive: true, force: true });
    }
  }
  const url = vip ? repoUrlWithToken(REPO_VIP, args.token) : REPO_TRIAL;
  gitCloneIntoClaudeDir(url, args.dryRun, args.force);

  if (args.obfuscated) {
    step(3, 'Install Cython-compiled overlay (binaries replace .py for license code)');
    try {
      await installObfuscatedOverlay(vip, args.token, args.dryRun, args.releaseTag);
    } catch (e) {
      warn(`--obfuscated overlay failed: ${e.message}`);
      warn(`  continuing with source install. Fix the release and re-run with --upgrade --obfuscated.`);
    }
  }

  step(args.obfuscated ? 4 : 3, 'Post-install setup (upgrade_v12_1.py)');
  if (python) runUpgradeScript(python, args.dryRun);

  step(args.obfuscated ? 5 : 4, parsed ? `Activate license (${parsed.suffix})` : 'Start 7-day trial');
  if (python) {
    if (parsed) activateLicense(python, parsed, args.dryRun);
    else initTrial(python, args.dryRun);
  }

  printSummary(vip, parsed, args.obfuscated);
}

function doUpgrade(args) {
  const { python } = checkPrereqs();
  const layout = detectLayout();

  if (layout === 'missing') {
    die(`No DARIO install detected at ${CLAUDE_DIR}. Run install first (no --upgrade).`);
  }

  if (layout === 'nested') {
    step(2, 'Fix nested layout (pre-v12.4.1 install)');
    fixNestedLayout(args.dryRun);
  }

  // After potential fix, the git repo should be at CLAUDE_DIR/.git (flat).
  // Fall back to ORCH_DIR/.git for any unusual legacy install.
  const gitDir = fs.existsSync(path.join(CLAUDE_DIR, '.git'))
    ? CLAUDE_DIR
    : (fs.existsSync(path.join(ORCH_DIR, '.git')) ? ORCH_DIR : null);
  if (!gitDir) {
    die(`Could not find .git in ${CLAUDE_DIR} or ${ORCH_DIR}. Install may be corrupted — try --force --upgrade or re-install.`);
  }

  step(layout === 'nested' ? 3 : 2, 'git pull --ff-only');
  gitPull(gitDir, args.dryRun);

  step(layout === 'nested' ? 4 : 3, 'Re-run upgrade_v12_1.py (idempotent)');
  if (python) runUpgradeScript(python, args.dryRun);

  step(layout === 'nested' ? 5 : 4, 'Done');
  log(`Orchestrator at ${ORCH_DIR} is up to date.`);
}

function doFixLayout(args) {
  const layout = detectLayout();
  if (layout === 'flat') {
    log(`Layout already flat at ${ORCH_DIR}. Nothing to fix.`);
    return;
  }
  if (layout === 'missing') {
    die(`No DARIO install detected. Use install instead.`);
  }
  step(1, 'Fix nested layout');
  fixNestedLayout(args.dryRun);
  step(2, 'Done');
  log(`Layout migrated. Verify with: npx ... --check`);
}

function doCheck() {
  console.log(`\n${c.bold}${c.cyan}── Install state${c.reset}`);

  const layout = detectLayout();
  if (layout === 'missing') {
    warn(`No DARIO install detected at ${CLAUDE_DIR}.`);
    console.log(`  Run: ${c.blue}npx github:bardapraiacaraiva/dario-orchestrator-installer${c.reset}`);
    return;
  }
  if (layout === 'nested') {
    warn(`NESTED LAYOUT detected (pre-v12.4.1 install bug).`);
    warn(`  Python files at ${ORCH_DIR}/orchestrator/ instead of ${ORCH_DIR}/`);
    warn(`  All imports will fail. Fix with: npx ... --fix-layout (or --upgrade)`);
    console.log('');
  } else {
    log(`✓ Layout=flat (correct)`);
  }

  const checks = [
    ['Orchestrator dir',  ORCH_DIR],
    ['license_manager.py', path.join(ORCH_DIR, 'license_manager.py')],
    ['runtime.py',         path.join(ORCH_DIR, 'runtime.py')],
    ['scripts/upgrade_v12_1.py', path.join(ORCH_DIR, 'scripts', 'upgrade_v12_1.py')],
    ['company.yaml',       path.join(ORCH_DIR, 'company.yaml')],
    ['dispatch_engine.py (post-v12.4.0)', path.join(ORCH_DIR, 'dispatch_engine.py')],
  ];
  let pass = 0;
  for (const [label, p] of checks) {
    if (fs.existsSync(p)) { log(`✓ ${label}`); pass++; }
    else warn(`✗ ${label} (${p})`);
  }
  console.log(`\n  ${c.bold}${pass}/${checks.length} checks passed${c.reset}`);

  const py = detectPython();
  if (py && fs.existsSync(path.join(ORCH_DIR, 'license_manager.py'))) {
    console.log(`\n${c.bold}${c.cyan}── License status${c.reset}`);
    try {
      execSync(`${py.cmd} license_manager.py --check`,
        { stdio: 'inherit', cwd: ORCH_DIR });
    } catch {}
  }

  // Git repo is at CLAUDE_DIR (flat) or ORCH_DIR (legacy nested).
  const gitDir = fs.existsSync(path.join(CLAUDE_DIR, '.git'))
    ? CLAUDE_DIR
    : (fs.existsSync(path.join(ORCH_DIR, '.git')) ? ORCH_DIR : null);
  if (gitDir) {
    console.log(`\n${c.bold}${c.cyan}── Git state${c.reset}`);
    try {
      const head = execSync(`git -C "${gitDir}" rev-parse --short HEAD`).toString().trim();
      const branch = execSync(`git -C "${gitDir}" rev-parse --abbrev-ref HEAD`).toString().trim();
      const tag = (() => {
        try { return execSync(`git -C "${gitDir}" describe --tags --abbrev=0`).toString().trim(); }
        catch { return null; }
      })();
      log(`branch=${branch} head=${head}${tag ? ` tag=${tag}` : ''}`);
    } catch {}
  }
}

function printSummary(vip, parsed, obfuscated) {
  console.log(`
${c.bold}${c.cyan}── Installation summary${c.reset}

  Mode:        ${vip ? `${c.magenta}VIP${c.reset} (${parsed.suffix})` : `${c.yellow}TRIAL${c.reset} (7 days)`}
  Code:        ${obfuscated ? `${c.green}OBFUSCATED${c.reset} (Cython .pyd/.so overlay)` : `${c.dim}SOURCE${c.reset} (.py)`}
  Path:        ${ORCH_DIR}
  Version:     ${VERSION}

${c.bold}${c.cyan}── Next steps${c.reset}

  1. Open Claude Code in this directory:    ${c.blue}cd ${ORCH_DIR} && claude${c.reset}
  2. Check license:                          ${c.blue}python license_manager.py --check${c.reset}
  3. Start runtime (optional):               ${c.blue}python runtime.py --port 8422${c.reset}
  4. Health endpoint:                        ${c.blue}curl http://localhost:8422/health${c.reset}

${c.bold}Help / support:${c.reset}  barda@automationsolutionai.com
${c.bold}Docs:${c.reset}           https://github.com/bardapraiacaraiva/dario-orchestrator
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.mode === 'version') { console.log(VERSION); return; }
  if (args.mode === 'help')    { help(); return; }

  banner(args.mode);
  if (args.dryRun) log(`${c.dim}(dry-run mode — nothing will be changed)${c.reset}`);

  try {
    if (args.mode === 'install')          await doInstall(args);
    else if (args.mode === 'upgrade')     doUpgrade(args);
    else if (args.mode === 'fix-layout')  doFixLayout(args);
    else if (args.mode === 'check')   doCheck();
  } catch (e) {
    die(e.message || String(e));
  }
}

main();
