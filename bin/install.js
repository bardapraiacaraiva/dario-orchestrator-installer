#!/usr/bin/env node
/**
 * DARIO Orchestrator v2.1-ALIVE — Installer + Upgrader
 *
 * FRESH INSTALL:  npx github:bardapraiacaraiva/dario-orchestrator-installer
 * UPGRADE VIP:    npx github:bardapraiacaraiva/dario-orchestrator-installer --upgrade
 * CHECK:          npx github:bardapraiacaraiva/dario-orchestrator-installer --check
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const VERSION = '2.1.0';
const REPO_RAW = 'https://raw.githubusercontent.com/bardapraiacaraiva/dario-orchestrator/master';
const FW_RAW = 'https://raw.githubusercontent.com/bardapraiacaraiva/orchestrator-framework/master';

const isWindows = os.platform() === 'win32';
const HOME = os.homedir();
const ORCH_DIR = path.join(HOME, '.claude', 'orchestrator');
const SKILLS_DIR = path.join(HOME, '.claude', 'skills');
const RUNTIME_DIR = isWindows ? 'C:\\dario-orch' : path.join(HOME, 'dario-orch');

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', magenta: '\x1b[35m',
};

function log(msg) { console.log(`${c.green}[DARIO]${c.reset} ${msg}`); }
function warn(msg) { console.log(`${c.yellow}[WARN]${c.reset} ${msg}`); }
function err(msg) { console.error(`${c.red}[ERROR]${c.reset} ${msg}`); process.exit(1); }
function skip(msg) { console.log(`${c.blue}[SKIP]${c.reset} ${msg} (already exists)`); }

function banner(mode) {
  const label = mode === 'upgrade' ? 'UPGRADE VIP → v2.1' : mode === 'check' ? 'VERIFICATION' : 'FRESH INSTALL';
  console.log(`
${c.cyan}${c.bold}╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   ██████╗  █████╗ ██████╗ ██╗ ██████╗                   ║
║   ██╔══██╗██╔══██╗██╔══██╗██║██╔═══██╗                  ║
║   ██║  ██║███████║██████╔╝██║██║   ██║                  ║
║   ██║  ██║██╔══██║██╔══██╗██║██║   ██║                  ║
║   ██████╔╝██║  ██║██║  ██║██║╚██████╔╝                  ║
║   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝ ╚═════╝                  ║
║                                                          ║
║   Orchestrator v${VERSION}-ALIVE                             ║
║   ${label.padEnd(42)}         ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝${c.reset}
`);
}

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }

function fileExists(p) { return fs.existsSync(p); }

/** Download file only if it doesn't exist (upgrade-safe) */
async function downloadIfMissing(url, dest, label) {
  if (fileExists(dest)) {
    skip(label);
    return false;
  }
  try {
    const content = await download(url);
    mkdirp(path.dirname(dest));
    fs.writeFileSync(dest, content, 'utf-8');
    log(`Installed: ${label}`);
    return true;
  } catch (e) {
    warn(`Could not download ${label}: ${e.message}`);
    return false;
  }
}

/** Download file, backup existing first (upgrade = update) */
async function downloadAndUpdate(url, dest, label) {
  try {
    // Backup existing
    if (fileExists(dest)) {
      const bak = dest + `.bak-${new Date().toISOString().split('T')[0]}`;
      fs.copyFileSync(dest, bak);
    }
    const content = await download(url);
    mkdirp(path.dirname(dest));
    fs.writeFileSync(dest, content, 'utf-8');
    log(`Updated: ${label}`);
    return true;
  } catch (e) {
    warn(`Could not update ${label}: ${e.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// DETECT — What does the VIP already have?
// ═══════════════════════════════════════════════════════════════
function detectExisting() {
  const has = {
    orchestrator_dir: fileExists(ORCH_DIR),
    company_yaml: fileExists(path.join(ORCH_DIR, 'company.yaml')),
    taskboard: fileExists(path.join(ORCH_DIR, 'tasks', 'active')),
    // v1.6 (Paperclip base)
    orchestrator_skill: fileExists(path.join(SKILLS_DIR, 'dario-orchestrator', 'SKILL.md')),
    dispatch_skill: fileExists(path.join(SKILLS_DIR, 'dario-dispatch', 'SKILL.md')),
    taskboard_skill: fileExists(path.join(SKILLS_DIR, 'dario-taskboard', 'SKILL.md')),
    // v1.7+ (ASIMO)
    autodiag: fileExists(path.join(ORCH_DIR, 'autodiag.yaml')),
    fallback_matrix: fileExists(path.join(ORCH_DIR, 'fallback_matrix.yaml')),
    // v1.8+ (ASIMO phi)
    manifesto: fileExists(path.join(ORCH_DIR, 'manifesto.yaml')),
    // v1.9+ (DARIO v1.0)
    operational_states: fileExists(path.join(ORCH_DIR, 'operational_states.yaml')),
    synaptic_weights: fileExists(path.join(ORCH_DIR, 'synaptic_weights.yaml')),
    // v2.0+ (DIVA2)
    composite_modes: fileExists(path.join(ORCH_DIR, 'composite_modes.yaml')),
    // v2.1 (Evolution)
    evolution_engine: fileExists(path.join(ORCH_DIR, 'evolution_engine.yaml')),
    evolve_skill: fileExists(path.join(SKILLS_DIR, 'dario-evolve', 'SKILL.md')),
    // Runtime
    runtime: fileExists(path.join(RUNTIME_DIR, 'run.py')),
  };

  // Determine current version
  if (!has.orchestrator_dir) has.version = 'none';
  else if (has.evolution_engine && has.runtime) has.version = 'v2.1';
  else if (has.evolution_engine) has.version = 'v2.1-no-runtime';
  else if (has.composite_modes) has.version = 'v2.0';
  else if (has.operational_states) has.version = 'v1.9';
  else if (has.manifesto) has.version = 'v1.8';
  else if (has.autodiag) has.version = 'v1.7';
  else if (has.orchestrator_skill) has.version = 'v1.6';
  else has.version = 'v1.0-partial';

  return has;
}

// ═══════════════════════════════════════════════════════════════
// UPGRADE — Only install what's missing
// ═══════════════════════════════════════════════════════════════
async function upgradeVIP() {
  const has = detectExisting();

  console.log(`\n${c.bold}${c.cyan}═══ Current Installation Detected ═══${c.reset}\n`);
  console.log(`  Version: ${c.bold}${has.version}${c.reset}`);
  console.log(`  Path:    ${ORCH_DIR}\n`);

  if (has.version === 'none') {
    err('No orchestrator found. Use without --upgrade for fresh install.');
  }

  if (has.version === 'v2.1') {
    log('Already at v2.1-ALIVE. Checking for updates to skills and runtime...');
  }

  let installed = 0;

  // ── Step 1: Directory structure ──
  console.log(`\n${c.bold}Step 1: Directory Structure${c.reset}`);
  const dirs = [
    'evolution/journal', 'evolution/mutations', 'evolution/rules', 'evolution/checkpoints',
    'tasks/active', 'tasks/done', 'tasks/templates', 'audit', 'budgets', 'quality',
  ];
  dirs.forEach(d => mkdirp(path.join(ORCH_DIR, d)));
  log('Directories verified');

  // ── Step 2: New configs (only what's missing) ──
  console.log(`\n${c.bold}Step 2: Orchestrator Configs${c.reset}`);

  const newConfigs = [
    ['autodiag.yaml', 'AutoDiag (silent diagnostic)'],
    ['fallback_matrix.yaml', 'Fallback Matrix (40+ paths)'],
    ['manifesto.yaml', 'Manifesto (governance)'],
    ['operational_states.yaml', 'Operational States (state machine + autonomy)'],
    ['synaptic_weights.yaml', 'Synaptic Weights (inter-skill affinity)'],
    ['composite_modes.yaml', 'Composite Modes (multi-skill formations)'],
    ['evolution_engine.yaml', 'Evolution Engine (self-evolution protocol)'],
    ['notifications.yaml', 'Notifications (event protocol)'],
  ];

  for (const [file, label] of newConfigs) {
    const result = await downloadIfMissing(
      `${REPO_RAW}/orchestrator/${file}`,
      path.join(ORCH_DIR, file),
      label
    );
    if (result) installed++;
  }

  // CHANGELOG
  if (!fileExists(path.join(ORCH_DIR, 'evolution', 'CHANGELOG.md'))) {
    fs.writeFileSync(path.join(ORCH_DIR, 'evolution', 'CHANGELOG.md'),
      `# DARIO Evolution Changelog\n\n## Generation 1 — ${new Date().toISOString().split('T')[0]}\n### Upgraded to v2.1-ALIVE\n`, 'utf-8');
    log('Created: CHANGELOG');
    installed++;
  }

  // ── Step 3: Skills (update core skills, preserve others) ──
  console.log(`\n${c.bold}Step 3: Core Skills (update to v2.1)${c.reset}`);

  const coreSkills = [
    ['dario-orchestrator', 'Orchestrator (877 lines, v2.1)'],
    ['dario-evolve', 'Evolution Engine skill (NEW)'],
    ['dario-dispatch', 'Dispatch (intelligent routing)'],
    ['dario-taskboard', 'Taskboard (task lifecycle)'],
    ['dario-status', 'Status (health dashboard)'],
    ['lucas-heartbeat', 'Heartbeat (pulse scheduler)'],
    ['lucas-quality', 'Quality (weighted scoring)'],
    ['lucas-autopilot', 'Autopilot (autonomous execution)'],
    ['lucas-analytics', 'Analytics (cross-project patterns)'],
  ];

  for (const [skill, label] of coreSkills) {
    const dest = path.join(SKILLS_DIR, skill, 'SKILL.md');
    // For core skills: ALWAYS update to latest (these are the upgraded versions)
    const result = await downloadAndUpdate(
      `${REPO_RAW}/skills/${skill}/SKILL.md`,
      dest,
      label
    );
    if (result) installed++;
  }

  // ── Step 4: Runtime Service ──
  console.log(`\n${c.bold}Step 4: Runtime Service${c.reset}`);

  if (has.runtime) {
    log('Runtime already installed at ' + RUNTIME_DIR);
    log('To update runtime: delete ' + RUNTIME_DIR + ' and re-run with --runtime-only');
  } else {
    await installRuntime();
    installed++;
  }

  // ── Summary ──
  console.log(`\n${c.bold}${c.cyan}═══ Upgrade Summary ═══${c.reset}\n`);
  console.log(`  Previous version: ${c.yellow}${has.version}${c.reset}`);
  console.log(`  New version:      ${c.green}${c.bold}v2.1-ALIVE${c.reset}`);
  console.log(`  Components added: ${c.bold}${installed}${c.reset}`);
  console.log('');

  verify();
}

// ═══════════════════════════════════════════════════════════════
// FRESH INSTALL
// ═══════════════════════════════════════════════════════════════
async function freshInstall() {
  const has = detectExisting();

  if (has.version !== 'none') {
    console.log(`\n${c.yellow}Existing installation detected (${has.version}).${c.reset}`);
    console.log(`Use ${c.bold}--upgrade${c.reset} to upgrade without losing your data.\n`);
    console.log(`Proceeding will ${c.bold}add missing files only${c.reset} (safe).\n`);
  }

  await installConfigs();
  await installSkills();
  await installRuntime();
  verify();
  printNextSteps();
}

async function installConfigs() {
  console.log(`\n${c.bold}${c.cyan}═══ Installing Orchestrator Configs ═══${c.reset}\n`);

  const dirs = [
    'tasks/active', 'tasks/done', 'tasks/templates',
    'audit', 'budgets', 'quality',
    'evolution/journal', 'evolution/mutations', 'evolution/rules', 'evolution/checkpoints',
  ];
  dirs.forEach(d => mkdirp(path.join(ORCH_DIR, d)));
  log('Directory structure created');

  const configs = [
    'autodiag.yaml', 'composite_modes.yaml', 'evolution_engine.yaml',
    'fallback_matrix.yaml', 'manifesto.yaml', 'operational_states.yaml',
    'synaptic_weights.yaml', 'notifications.yaml',
  ];

  for (const cfg of configs) {
    await downloadIfMissing(
      `${REPO_RAW}/orchestrator/${cfg}`,
      path.join(ORCH_DIR, cfg),
      cfg
    );
  }

  if (!fileExists(path.join(ORCH_DIR, 'company.yaml'))) {
    await downloadIfMissing(`${REPO_RAW}/orchestrator/company.yaml`, path.join(ORCH_DIR, 'company.yaml'), 'company.yaml');
  }

  const changelog = path.join(ORCH_DIR, 'evolution', 'CHANGELOG.md');
  if (!fileExists(changelog)) {
    fs.writeFileSync(changelog, `# DARIO Evolution Changelog\n\n## Generation 1 — ${new Date().toISOString().split('T')[0]}\n### Fresh Install v${VERSION}\n`, 'utf-8');
    log('CHANGELOG created');
  }
}

async function installSkills() {
  console.log(`\n${c.bold}${c.cyan}═══ Installing Skills ═══${c.reset}\n`);

  const skills = [
    'dario-orchestrator', 'dario-evolve', 'dario-dispatch', 'dario-taskboard',
    'dario-status', 'dario-diagnose',
    'lucas-heartbeat', 'lucas-quality', 'lucas-autopilot', 'lucas-analytics',
  ];

  for (const skill of skills) {
    await downloadIfMissing(
      `${REPO_RAW}/skills/${skill}/SKILL.md`,
      path.join(SKILLS_DIR, skill, 'SKILL.md'),
      skill
    );
  }
}

async function installRuntime() {
  console.log(`\n${c.bold}${c.cyan}═══ Installing Runtime Service ═══${c.reset}\n`);

  let pythonCmd = null;
  try { execSync('python3 --version', { stdio: 'pipe' }); pythonCmd = 'python3'; } catch {
    try { execSync('python --version', { stdio: 'pipe' }); pythonCmd = 'python'; } catch {
      warn('Python not found. Runtime needs Python 3.11+');
      return;
    }
  }
  log(`Python: ${pythonCmd}`);

  mkdirp(path.join(RUNTIME_DIR, 'src', 'routers'));
  mkdirp(path.join(RUNTIME_DIR, 'src', 'services'));
  mkdirp(path.join(RUNTIME_DIR, 'config'));
  mkdirp(path.join(RUNTIME_DIR, 'migrations'));
  mkdirp(path.join(RUNTIME_DIR, 'logs'));

  const files = [
    ['run.py', ''], ['pyproject.toml', ''], ['pytest.ini', ''],
    ['runtime-migrations/001_initial_schema.sql', 'migrations/'],
    ['runtime-src/__init__.py', 'src/'], ['runtime-src/main.py', 'src/'],
    ['runtime-src/config.py', 'src/'], ['runtime-src/database.py', 'src/'],
    ['runtime-src/models.py', 'src/'],
    ['runtime-src/routers/__init__.py', 'src/routers/'],
    ['runtime-src/routers/health.py', 'src/routers/'],
    ['runtime-src/routers/tasks.py', 'src/routers/'],
    ['runtime-src/routers/hooks.py', 'src/routers/'],
    ['runtime-src/routers/evolution.py', 'src/routers/'],
    ['runtime-src/routers/budget.py', 'src/routers/'],
    ['runtime-src/routers/weights.py', 'src/routers/'],
    ['runtime-src/routers/dashboard.py', 'src/routers/'],
    ['runtime-src/services/__init__.py', 'src/services/'],
    ['runtime-src/services/task_sync.py', 'src/services/'],
    ['runtime-src/services/fitness.py', 'src/services/'],
    ['runtime-src/services/state_machine.py', 'src/services/'],
    ['runtime-src/services/autodiag.py', 'src/services/'],
    ['runtime-src/services/mutation_engine.py', 'src/services/'],
    ['runtime-src/services/crystallizer.py', 'src/services/'],
    ['runtime-src/services/weekly_evolution.py', 'src/services/'],
  ];

  let ok = 0;
  for (const [src, destDir] of files) {
    const filename = path.basename(src);
    const dest = path.join(RUNTIME_DIR, destDir, filename);
    if (await downloadIfMissing(`${FW_RAW}/${src}`, dest, `runtime/${destDir}${filename}`)) ok++;
  }
  log(`Runtime files: ${ok} new, ${files.length - ok} already existed`);

  const envPath = path.join(RUNTIME_DIR, 'config', '.env');
  if (!fileExists(envPath)) {
    fs.writeFileSync(envPath, `DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/dario_kb\nRAG_ENGINE_URL=http://localhost:8420\nORCH_HOST=0.0.0.0\nORCH_PORT=8421\nORCHESTRATOR_DIR=${ORCH_DIR.replace(/\\/g, '/')}\nSKILLS_DIR=${SKILLS_DIR.replace(/\\/g, '/')}\nLOG_LEVEL=INFO\nMICRO_PULSE_SECONDS=300\nSESSION_PULSE_SECONDS=1800\n`, 'utf-8');
    warn('EDIT config/.env — set your DATABASE_URL password!');
  }

  const venvPath = path.join(RUNTIME_DIR, '.venv');
  if (!fileExists(venvPath)) {
    log('Creating Python venv + installing dependencies...');
    try {
      execSync(`${pythonCmd} -m venv "${venvPath}"`, { stdio: 'pipe' });
      const pip = isWindows ? path.join(venvPath, 'Scripts', 'pip') : path.join(venvPath, 'bin', 'pip');
      execSync(`"${pip}" install fastapi "uvicorn[standard]" "psycopg[binary,pool]" pydantic-settings httpx ruamel.yaml apscheduler pytest pytest-asyncio --quiet`, { stdio: 'pipe', timeout: 120000 });
      log('Dependencies installed');
    } catch (e) {
      warn(`Venv setup failed: ${e.message}`);
    }
  } else {
    skip('Python venv');
  }
}

function verify() {
  console.log(`\n${c.bold}${c.cyan}═══ Verification ═══${c.reset}\n`);
  let pass = 0, total = 0;
  function chk(p, label) { total++; if (fileExists(p)) { log(`✓ ${label}`); pass++; } else { warn(`✗ ${label}`); } }

  chk(path.join(ORCH_DIR, 'manifesto.yaml'), 'Manifesto (governance)');
  chk(path.join(ORCH_DIR, 'evolution_engine.yaml'), 'Evolution Engine');
  chk(path.join(ORCH_DIR, 'operational_states.yaml'), 'Operational States + Autonomy Ladder');
  chk(path.join(ORCH_DIR, 'autodiag.yaml'), 'AutoDiag (silent diagnostic)');
  chk(path.join(ORCH_DIR, 'fallback_matrix.yaml'), 'Fallback Matrix (40+ paths)');
  chk(path.join(ORCH_DIR, 'synaptic_weights.yaml'), 'Synaptic Weights (affinity graph)');
  chk(path.join(ORCH_DIR, 'composite_modes.yaml'), 'Composite Modes (multi-skill)');
  chk(path.join(ORCH_DIR, 'company.yaml'), 'Company hierarchy');
  chk(path.join(SKILLS_DIR, 'dario-orchestrator', 'SKILL.md'), 'Orchestrator skill (877 lines)');
  chk(path.join(SKILLS_DIR, 'dario-evolve', 'SKILL.md'), 'Evolution skill');
  chk(path.join(SKILLS_DIR, 'lucas-quality', 'SKILL.md'), 'Quality scorer (weighted)');
  chk(path.join(SKILLS_DIR, 'lucas-heartbeat', 'SKILL.md'), 'Heartbeat (AutoDiag + Evolution)');
  chk(path.join(RUNTIME_DIR, 'run.py'), 'Runtime service (FastAPI)');

  console.log(`\n${c.bold}Score: ${pass}/${total}${c.reset}`);
  if (pass === total) console.log(`${c.green}${c.bold}✓ DARIO v${VERSION}-ALIVE — FULLY OPERATIONAL${c.reset}`);
  else if (pass >= total - 2) console.log(`${c.yellow}Mostly complete — ${total - pass} optional items missing${c.reset}`);
  else console.log(`${c.red}Incomplete — re-run or check errors above${c.reset}`);
}

function printNextSteps() {
  console.log(`
${c.bold}${c.cyan}═══ Next Steps ═══${c.reset}

  ${c.bold}1.${c.reset} Configure database: ${c.blue}Edit ${RUNTIME_DIR}/config/.env${c.reset}
  ${c.bold}2.${c.reset} Start runtime:      ${c.blue}cd ${RUNTIME_DIR} && ${isWindows ? '.venv\\Scripts\\python' : '.venv/bin/python'} run.py${c.reset}
  ${c.bold}3.${c.reset} Verify:             ${c.blue}curl http://localhost:8421/health${c.reset}
  ${c.bold}4.${c.reset} Dashboard:          ${c.blue}http://localhost:8421/dashboard${c.reset}

${c.cyan}Docs: https://github.com/bardapraiacaraiva/dario-orchestrator${c.reset}
`);
}

// ═══ Main ═══
async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--upgrade') ? 'upgrade'
    : args.includes('--check') ? 'check'
    : args.includes('--configs-only') ? 'configs'
    : args.includes('--runtime-only') ? 'runtime'
    : 'full';

  banner(mode);

  try {
    switch (mode) {
      case 'upgrade':  await upgradeVIP(); break;
      case 'check':    verify(); break;
      case 'configs':  await installConfigs(); await installSkills(); verify(); break;
      case 'runtime':  await installRuntime(); verify(); break;
      case 'full':     await freshInstall(); break;
    }
  } catch (e) {
    err(`Failed: ${e.message}`);
  }
}

main();
