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

const VERSION = '12.1.0';
const HOME = os.homedir();
const ORCH_DIR = path.join(HOME, '.claude', 'orchestrator');
const SKILLS_DIR = path.join(HOME, '.claude', 'skills');

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
  const a = { mode: 'install', key: null, token: null, dryRun: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--upgrade') a.mode = 'upgrade';
    else if (v === '--check') a.mode = 'check';
    else if (v === '--help' || v === '-h') a.mode = 'help';
    else if (v === '--version' || v === '-v') a.mode = 'version';
    else if (v === '--dry-run') a.dryRun = true;
    else if (v === '--force') a.force = true;
    else if (v === '--key') a.key = argv[++i];
    else if (v === '--token') a.token = argv[++i];
    else if (v.startsWith('--key=')) a.key = v.slice(6);
    else if (v.startsWith('--token=')) a.token = v.slice(8);
  }
  if (!a.token && process.env.DARIO_GH_TOKEN) a.token = process.env.DARIO_GH_TOKEN;
  return a;
}

function banner(mode) {
  const title =
    mode === 'upgrade' ? `UPGRADE → v${VERSION}` :
    mode === 'check'   ? 'CHECK INSTALLATION'    :
    mode === 'help'    ? 'HELP'                  :
                         `INSTALL v${VERSION}`;
  console.log(`
${c.bold}${c.cyan}╔══════════════════════════════════════════════════════════════════╗
║  DARIO ORCHESTRATOR — ${title.padEnd(43)}║
║  32 squads · 559+ skills · 59 license tiers · v${VERSION.padEnd(18)}║
╚══════════════════════════════════════════════════════════════════╝${c.reset}
`);
}

function help() {
  console.log(`
${c.bold}USAGE${c.reset}
  npx github:bardapraiacaraiva/dario-orchestrator-installer [options]

${c.bold}MODES${c.reset}
  (default)            Install trial (public repo + 7-day trial)
  --upgrade            Pull latest + run upgrade script (idempotent)
  --check              Verify install + license status
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

function repoUrlWithToken(url, token) {
  if (!token) return url;
  return url.replace('https://', `https://${token}@`);
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
function doInstall(args) {
  const { python } = checkPrereqs();

  const parsed = parseKey(args.key);
  const vip = isVipKey(parsed);
  if (args.key && !parsed) die(`Invalid key format: ${args.key} (expected DARIO-XXXX-XXXX-XXXX-SUF)`);
  if (vip && !args.token)
    die(`VIP key requires --token (or env DARIO_GH_TOKEN) for the private VIP repo.\n` +
        `  Contact barda@automationsolutionai.com if you don't have one.`);

  step(2, vip ? 'Clone VIP repo (dario-orchestrator-full)' : 'Clone trial repo (dario-orchestrator)');
  if (fs.existsSync(ORCH_DIR) && !args.force) {
    die(`${ORCH_DIR} already exists. Use --upgrade to update, or --force to re-clone.`);
  }
  if (fs.existsSync(ORCH_DIR) && args.force) {
    log(`--force given; removing ${ORCH_DIR}`);
    if (!args.dryRun) fs.rmSync(ORCH_DIR, { recursive: true, force: true });
  }
  const url = vip ? repoUrlWithToken(REPO_VIP, args.token) : REPO_TRIAL;
  gitClone(url, ORCH_DIR, args.dryRun);

  step(3, 'Post-install setup (upgrade_v12_1.py)');
  if (python) runUpgradeScript(python, args.dryRun);

  step(4, parsed ? `Activate license (${parsed.suffix})` : 'Start 7-day trial');
  if (python) {
    if (parsed) activateLicense(python, parsed, args.dryRun);
    else initTrial(python, args.dryRun);
  }

  printSummary(vip, parsed);
}

function doUpgrade(args) {
  const { python } = checkPrereqs();
  if (!fs.existsSync(path.join(ORCH_DIR, '.git'))) {
    die(`No git repo at ${ORCH_DIR}. Run install first (no --upgrade).`);
  }
  step(2, 'git pull --ff-only');
  gitPull(ORCH_DIR, args.dryRun);

  step(3, 'Re-run upgrade_v12_1.py (idempotent)');
  if (python) runUpgradeScript(python, args.dryRun);

  step(4, 'Done');
  log(`Orchestrator at ${ORCH_DIR} is up to date.`);
}

function doCheck() {
  console.log(`\n${c.bold}${c.cyan}── Install state${c.reset}`);
  const checks = [
    ['Orchestrator dir',  ORCH_DIR],
    ['license_manager.py', path.join(ORCH_DIR, 'license_manager.py')],
    ['runtime.py',         path.join(ORCH_DIR, 'runtime.py')],
    ['scripts/upgrade_v12_1.py', path.join(ORCH_DIR, 'scripts', 'upgrade_v12_1.py')],
    ['company.yaml',       path.join(ORCH_DIR, 'company.yaml')],
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

  if (fs.existsSync(path.join(ORCH_DIR, '.git'))) {
    console.log(`\n${c.bold}${c.cyan}── Git state${c.reset}`);
    try {
      const head = execSync(`git -C "${ORCH_DIR}" rev-parse --short HEAD`).toString().trim();
      const branch = execSync(`git -C "${ORCH_DIR}" rev-parse --abbrev-ref HEAD`).toString().trim();
      log(`branch=${branch} head=${head}`);
    } catch {}
  }
}

function printSummary(vip, parsed) {
  console.log(`
${c.bold}${c.cyan}── Installation summary${c.reset}

  Mode:        ${vip ? `${c.magenta}VIP${c.reset} (${parsed.suffix})` : `${c.yellow}TRIAL${c.reset} (7 days)`}
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
function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.mode === 'version') { console.log(VERSION); return; }
  if (args.mode === 'help')    { help(); return; }

  banner(args.mode);
  if (args.dryRun) log(`${c.dim}(dry-run mode — nothing will be changed)${c.reset}`);

  try {
    if (args.mode === 'install') doInstall(args);
    else if (args.mode === 'upgrade') doUpgrade(args);
    else if (args.mode === 'check')   doCheck();
  } catch (e) {
    die(e.message || String(e));
  }
}

main();
