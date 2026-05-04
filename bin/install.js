#!/usr/bin/env node
/**
 * DARIO Orchestrator v2.1-ALIVE — One-Click Installer
 * Usage: npx @dario-ai/orchestrator
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

// ═══════════════════════════════════════════════════════════════
const VERSION = '2.1.0';
const REPO_RAW = 'https://raw.githubusercontent.com/bardapraiacaraiva/dario-orchestrator/master';
// ═══════════════════════════════════════════════════════════════

const isWindows = os.platform() === 'win32';
const HOME = os.homedir();
const ORCH_DIR = path.join(HOME, '.claude', 'orchestrator');
const SKILLS_DIR = path.join(HOME, '.claude', 'skills');
const RUNTIME_DIR = isWindows ? 'C:\\dario-orch' : path.join(HOME, 'dario-orch');

// Colors
const c = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', magenta: '\x1b[35m',
};

function log(msg) { console.log(`${c.green}[DARIO]${c.reset} ${msg}`); }
function warn(msg) { console.log(`${c.yellow}[WARN]${c.reset} ${msg}`); }
function err(msg) { console.error(`${c.red}[ERROR]${c.reset} ${msg}`); process.exit(1); }

function banner() {
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
║   Self-Evolving AI Agent OS for Claude Code              ║
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
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function installConfigs() {
  console.log(`\n${c.bold}${c.cyan}═══ Installing Orchestrator Configs ═══${c.reset}\n`);

  // Create directory structure
  const dirs = [
    ORCH_DIR,
    path.join(ORCH_DIR, 'tasks', 'active'),
    path.join(ORCH_DIR, 'tasks', 'done'),
    path.join(ORCH_DIR, 'tasks', 'templates'),
    path.join(ORCH_DIR, 'audit'),
    path.join(ORCH_DIR, 'budgets'),
    path.join(ORCH_DIR, 'quality'),
    path.join(ORCH_DIR, 'evolution', 'journal'),
    path.join(ORCH_DIR, 'evolution', 'mutations'),
    path.join(ORCH_DIR, 'evolution', 'rules'),
    path.join(ORCH_DIR, 'evolution', 'checkpoints'),
  ];
  dirs.forEach(d => mkdirp(d));
  log('Directory structure created');

  // Download config files
  const configs = [
    'autodiag.yaml',
    'composite_modes.yaml',
    'evolution_engine.yaml',
    'fallback_matrix.yaml',
    'manifesto.yaml',
    'operational_states.yaml',
    'synaptic_weights.yaml',
    'notifications.yaml',
  ];

  for (const cfg of configs) {
    try {
      const content = await download(`${REPO_RAW}/orchestrator/${cfg}`);
      const dest = path.join(ORCH_DIR, cfg);
      fs.writeFileSync(dest, content, 'utf-8');
      log(`Downloaded: ${cfg}`);
    } catch (e) {
      warn(`Could not download ${cfg}: ${e.message}`);
    }
  }

  // Download company.yaml template if not exists
  if (!fs.existsSync(path.join(ORCH_DIR, 'company.yaml'))) {
    try {
      const content = await download(`${REPO_RAW}/orchestrator/company.yaml`);
      fs.writeFileSync(path.join(ORCH_DIR, 'company.yaml'), content, 'utf-8');
      log('Downloaded: company.yaml (template)');
    } catch (e) {
      warn('company.yaml not available — create manually');
    }
  }

  // Create evolution CHANGELOG
  const changelog = path.join(ORCH_DIR, 'evolution', 'CHANGELOG.md');
  if (!fs.existsSync(changelog)) {
    fs.writeFileSync(changelog, `# DARIO Evolution Changelog\n\n## Generation 1 — ${new Date().toISOString().split('T')[0]}\n### Fresh Install v${VERSION}\n- All systems initialized\n`, 'utf-8');
    log('CHANGELOG created');
  }
}

async function installSkills() {
  console.log(`\n${c.bold}${c.cyan}═══ Installing Skills ═══${c.reset}\n`);

  const skills = [
    'dario-orchestrator',
    'dario-evolve',
    'dario-dispatch',
    'dario-taskboard',
    'dario-status',
    'dario-diagnose',
    'lucas-heartbeat',
    'lucas-quality',
    'lucas-autopilot',
    'lucas-analytics',
  ];

  for (const skill of skills) {
    try {
      const content = await download(`${REPO_RAW}/skills/${skill}/SKILL.md`);
      const skillDir = path.join(SKILLS_DIR, skill);
      mkdirp(skillDir);
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content, 'utf-8');
      log(`Skill installed: ${skill}`);
    } catch (e) {
      warn(`Could not install ${skill}: ${e.message}`);
    }
  }
}

async function installRuntime() {
  console.log(`\n${c.bold}${c.cyan}═══ Installing Runtime Service ═══${c.reset}\n`);

  // Check Python
  let pythonCmd = null;
  try {
    execSync('python3 --version', { stdio: 'pipe' });
    pythonCmd = 'python3';
  } catch {
    try {
      execSync('python --version', { stdio: 'pipe' });
      pythonCmd = 'python';
    } catch {
      warn('Python not found. Runtime service requires Python 3.11+');
      warn('Install Python and run: npx @dario-ai/orchestrator --runtime-only');
      return;
    }
  }
  log(`Python found: ${pythonCmd}`);

  mkdirp(RUNTIME_DIR);
  mkdirp(path.join(RUNTIME_DIR, 'src', 'routers'));
  mkdirp(path.join(RUNTIME_DIR, 'src', 'services'));
  mkdirp(path.join(RUNTIME_DIR, 'config'));
  mkdirp(path.join(RUNTIME_DIR, 'migrations'));
  mkdirp(path.join(RUNTIME_DIR, 'scripts'));
  mkdirp(path.join(RUNTIME_DIR, 'tests'));
  mkdirp(path.join(RUNTIME_DIR, 'logs'));

  // Download runtime files
  const BASE = 'https://raw.githubusercontent.com/bardapraiacaraiva/orchestrator-framework/master';

  const files = [
    ['run.py', ''],
    ['pyproject.toml', ''],
    ['pytest.ini', ''],
    ['runtime-migrations/001_initial_schema.sql', 'migrations/'],
    ['runtime-src/__init__.py', 'src/'],
    ['runtime-src/main.py', 'src/'],
    ['runtime-src/config.py', 'src/'],
    ['runtime-src/database.py', 'src/'],
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

  let downloaded = 0;
  for (const [src, destDir] of files) {
    try {
      const content = await download(`${BASE}/${src}`);
      const filename = path.basename(src);
      const dest = path.join(RUNTIME_DIR, destDir, filename);
      fs.writeFileSync(dest, content, 'utf-8');
      downloaded++;
    } catch (e) {
      warn(`Could not download ${src}`);
    }
  }
  log(`Downloaded ${downloaded}/${files.length} runtime files`);

  // Create .env template
  const envPath = path.join(RUNTIME_DIR, 'config', '.env');
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, `DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/dario_kb
RAG_ENGINE_URL=http://localhost:8420
ORCH_HOST=0.0.0.0
ORCH_PORT=8421
ORCHESTRATOR_DIR=${ORCH_DIR.replace(/\\/g, '/')}
SKILLS_DIR=${SKILLS_DIR.replace(/\\/g, '/')}
LOG_LEVEL=INFO
MICRO_PULSE_SECONDS=300
SESSION_PULSE_SECONDS=1800
`, 'utf-8');
    warn('EDIT config/.env — set your DATABASE_URL password!');
  }

  // Create venv + install deps
  log('Creating Python virtual environment...');
  try {
    execSync(`${pythonCmd} -m venv "${path.join(RUNTIME_DIR, '.venv')}"`, { stdio: 'pipe' });

    const pip = isWindows
      ? path.join(RUNTIME_DIR, '.venv', 'Scripts', 'pip')
      : path.join(RUNTIME_DIR, '.venv', 'bin', 'pip');

    log('Installing Python dependencies...');
    execSync(`"${pip}" install fastapi "uvicorn[standard]" "psycopg[binary,pool]" pydantic-settings httpx ruamel.yaml apscheduler pytest pytest-asyncio --quiet`, {
      stdio: 'pipe',
      timeout: 120000,
    });
    log('Dependencies installed');
  } catch (e) {
    warn(`Venv/pip failed: ${e.message}`);
    warn('Manually run: cd ' + RUNTIME_DIR + ' && python -m venv .venv && pip install -r requirements.txt');
  }

  console.log(`\n${c.green}${c.bold}Runtime installed at: ${RUNTIME_DIR}${c.reset}`);
}

function verify() {
  console.log(`\n${c.bold}${c.cyan}═══ Verification ═══${c.reset}\n`);

  let pass = 0, total = 0;
  function check(filePath, label) {
    total++;
    if (fs.existsSync(filePath)) {
      log(`✓ ${label}`);
      pass++;
    } else {
      warn(`✗ ${label}`);
    }
  }

  check(path.join(ORCH_DIR, 'manifesto.yaml'), 'Manifesto (governance)');
  check(path.join(ORCH_DIR, 'evolution_engine.yaml'), 'Evolution Engine');
  check(path.join(ORCH_DIR, 'operational_states.yaml'), 'Operational States');
  check(path.join(ORCH_DIR, 'autodiag.yaml'), 'AutoDiag');
  check(path.join(ORCH_DIR, 'fallback_matrix.yaml'), 'Fallback Matrix');
  check(path.join(ORCH_DIR, 'synaptic_weights.yaml'), 'Synaptic Weights');
  check(path.join(ORCH_DIR, 'composite_modes.yaml'), 'Composite Modes');
  check(path.join(ORCH_DIR, 'company.yaml'), 'Company hierarchy');
  check(path.join(SKILLS_DIR, 'dario-orchestrator', 'SKILL.md'), 'Orchestrator skill');
  check(path.join(SKILLS_DIR, 'dario-evolve', 'SKILL.md'), 'Evolution skill');
  check(path.join(SKILLS_DIR, 'lucas-quality', 'SKILL.md'), 'Quality scorer');
  check(path.join(SKILLS_DIR, 'lucas-heartbeat', 'SKILL.md'), 'Heartbeat engine');
  check(path.join(RUNTIME_DIR, 'run.py'), 'Runtime service');

  console.log(`\n${c.bold}Score: ${pass}/${total}${c.reset}`);
  if (pass === total) {
    console.log(`${c.green}${c.bold}✓ INSTALLATION COMPLETE — DARIO v${VERSION}-ALIVE${c.reset}`);
  } else if (pass >= total - 2) {
    console.log(`${c.yellow}Mostly complete — ${total - pass} items missing${c.reset}`);
  } else {
    console.log(`${c.red}Incomplete — run again or check errors${c.reset}`);
  }
}

function printNextSteps() {
  console.log(`
${c.bold}${c.cyan}═══ Next Steps ═══${c.reset}

  ${c.bold}1.${c.reset} Configure database:
     ${c.blue}Edit ${RUNTIME_DIR}/config/.env${c.reset}

  ${c.bold}2.${c.reset} Start the runtime:
     ${c.blue}cd ${RUNTIME_DIR} && ${isWindows ? '.venv\\\\Scripts\\\\python' : '.venv/bin/python'} run.py${c.reset}

  ${c.bold}3.${c.reset} Verify:
     ${c.blue}curl http://localhost:8421/health${c.reset}

  ${c.bold}4.${c.reset} Open dashboard:
     ${c.blue}http://localhost:8421/dashboard${c.reset}

  ${c.bold}5.${c.reset} In Claude Code, use:
     ${c.magenta}/dario-orchestrator${c.reset} — Plan & dispatch work
     ${c.magenta}/dario-evolve${c.reset}       — Check evolution status
     ${c.magenta}/dario-status${c.reset}       — System health

${c.cyan}Docs: https://github.com/bardapraiacaraiva/dario-orchestrator${c.reset}
`);
}

// ═══ Main ═══
async function main() {
  banner();

  const args = process.argv.slice(2);
  const mode = args.includes('--configs-only') ? 'configs'
    : args.includes('--runtime-only') ? 'runtime'
    : args.includes('--check') ? 'check'
    : 'full';

  try {
    switch (mode) {
      case 'check':
        verify();
        break;
      case 'configs':
        await installConfigs();
        await installSkills();
        verify();
        break;
      case 'runtime':
        await installRuntime();
        verify();
        break;
      case 'full':
        await installConfigs();
        await installSkills();
        await installRuntime();
        verify();
        printNextSteps();
        break;
    }
  } catch (e) {
    err(`Installation failed: ${e.message}`);
  }
}

main();
