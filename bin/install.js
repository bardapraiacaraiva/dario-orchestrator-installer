#!/usr/bin/env node
/**
 * DARIO Orchestrator v11.0 — Installer
 *
 * INSTALL:   npx github:bardapraiacaraiva/dario-orchestrator-installer
 * UPGRADE:   npx github:bardapraiacaraiva/dario-orchestrator-installer --upgrade
 * CHECK:     npx github:bardapraiacaraiva/dario-orchestrator-installer --check
 * WHITE-LABEL: npx github:bardapraiacaraiva/dario-orchestrator-installer --company "Acme" --preset agency
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const VERSION = '11.3.0';
// v11.3.0 — DEMETER Squad (2026-05-19): 15 skills data engineering
//   ETL, warehouse, BI, ML pipelines, A/B testing, cohort, predictive,
//   streaming, catalog, DataOps, dbt, metrics layer, event tracking, storytelling
//   Pricing tiers demeter_solo (R$ 297) / team (R$ 997) / enterprise (R$ 4K+)
// v11.2.0 — LEX-BR Agent (2026-05-19): 15 skills legal Brasil
//   OAB 205 + LGPD compliance, MCP JusBrasil/CNJ/STF, 15 áreas Direito BR
// v11.1.1 — License Enforcement Hardening (2026-05-19)
//   Closes trial leak: middleware FastAPI + enforce_or_exit em 19 CLIs.
//   Adds license_guard.py. Trial expirado bloqueia runtime+CLIs (era 4/37 endpoints).
// v11.1.0 — Cognitive Audit (2026-05-19): 18 new modules
//   Sprints 1-4 cognitive (10) + U11-U18 operational (8) = 216 tests passing
//   See: dario-orchestrator/COGNITIVE-AUDIT-v11.1.md
const REPO_RAW = 'https://raw.githubusercontent.com/bardapraiacaraiva/dario-orchestrator/master';

const isWindows = os.platform() === 'win32';
const HOME = os.homedir();
const ORCH_DIR = path.join(HOME, '.claude', 'orchestrator');
const SKILLS_DIR = path.join(HOME, '.claude', 'skills');

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', magenta: '\x1b[35m',
};

function log(msg) { console.log(`${c.green}[DARIO]${c.reset} ${msg}`); }
function warn(msg) { console.log(`${c.yellow}[WARN]${c.reset} ${msg}`); }
function err(msg) { console.error(`${c.red}[ERROR]${c.reset} ${msg}`); process.exit(1); }
function skip(msg) { console.log(`${c.blue}[SKIP]${c.reset} ${msg} (exists)`); }

function banner(mode) {
  const label = mode === 'upgrade' ? `UPGRADE → v${VERSION}` : mode === 'check' ? 'VERIFICATION' : `INSTALL v${VERSION}`;
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
║   AI Enterprise OS v${VERSION}                              ║
║   269 skills | 17 domains | 66 engines                   ║
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
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }
function fileExists(p) { return fs.existsSync(p); }

async function downloadFile(url, dest, label, force = false) {
  if (!force && fileExists(dest)) { skip(label); return false; }
  try {
    if (force && fileExists(dest)) {
      fs.copyFileSync(dest, dest + `.bak-${new Date().toISOString().split('T')[0]}`);
    }
    const content = await download(url);
    mkdirp(path.dirname(dest));
    fs.writeFileSync(dest, content, 'utf-8');
    log(`${force ? 'Updated' : 'Installed'}: ${label}`);
    return true;
  } catch (e) {
    warn(`Failed: ${label} (${e.message})`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// CORE ENGINES (66 Python files)
// ═══════════════════════════════════════════════════════════════
const CORE_ENGINES = [
  'runtime.py', 'db.py', 'session_boot.py',
  'executor.py', 'api_executor.py', 'dispatch_engine.py', 'chain_executor.py',
  'hierarchical_process.py', 'workflow_graph.py', 'filter_pipeline.py', 'reactive_subscriptions.py',
  'evolution_runner.py', 'adaptive_rubric.py', 'context_injector.py', 'memory_blocks.py',
  'model_router.py', 'predictor.py', 'llm_judge.py', 'llm_evaluators.py', 'composite_memory_scoring.py',
  'quality_scorer.py', 'eval_suite.py', 'artifact_schemas.py', 'output_guardrails.py', 'guardrails.py',
  'state_machine.py', 'autodiag_runner.py', 'termination.py', 'checkpoint_interrupt.py',
  'error_handlers.py', 'replanner.py', 'suspend_resume.py',
  'span_tracer.py', 'tracer.py', 'audit_logger.py', 'sse_streaming.py', 'lifecycle_hooks.py',
  'auth.py', 'approval_gates.py', 'filelock.py', 'license_manager.py',
  'budget_tracker.py', 'token_meter.py', 'financial_dashboard.py', 'tax_calendar.py', 'pt_validators.py',
  'bank_parser.py', 'saft_parser.py',
  'core_upgrades.py', 'execution_upgrades.py', 'intelligence_upgrades.py',
  'quality_upgrades.py', 'state_upgrades.py', 'observability_upgrades.py',
  'security_upgrades.py', 'financial_upgrades.py',
  'task_store.py', 'task_spec.py', 'task_templates.py', 'skill_store.py',
  'tier3.py', 'process_manager.py', 'generate_dashboard.py',
  // ─── v11.1.0 Cognitive Audit (2026-05-19) ─────────────────────────────
  // Sprints 1-4 cognitive layer (10 modules) + U11-U18 operational (8 modules)
  'semantic_dispatch.py',     // U1: embedding-based skill routing
  'ethical_gate.py',          // U2: pre-dispatch triade decisoria (Check 0)
  'synaptic_update.py',       // U3: synaptic weights write-back runtime
  'confidence_engine.py',     // U4: 5-way action gating (HIGH/MED/LOW)
  'qvalue_memory_wire.py',    // U5: Q-value memory wired with SQLite
  'chain_validator.py',       // U6: pass_to_next field validation
  'golden_eval.py',           // U7: regression detection with goldens
  'episode_promoter.py',      // U8: episodes -> semantic + auto-rules
  'dispatch_cot.py',          // U9: Chain-of-Thought pre-dispatch + postmortem
  'dynamic_branch.py',        // U10: runtime chain branching
  'cron_daily.py',            // U12: daily background maintenance
  'cognitive_dashboard.py',   // U13: HTML dashboard generator (8 cards)
  'webhook_dispatcher.py',    // U15: Slack/Discord/generic alerts
  'eval_drilldown.py',        // U16: token/section/paragraph diff + hints
  'prompt_hints.py',          // U17: auto prompt hints from drilldowns
  'weekly_summary.py',        // U18: cron weekly Obsidian report
  'obsidian_safe_write.py',   // Utility: prevents Obsidian shadow files
  // ─── v11.1.1 License Enforcement Hardening (2026-05-19) ───────────────
  'license_guard.py',         // Centralized enforcement: middleware + decorator + CLI guard
];

// ═══════════════════════════════════════════════════════════════
// SKILLS (269 total — organized by domain)
// ═══════════════════════════════════════════════════════════════
const CORE_SKILLS = [
  'dario-orchestrator', 'dario-dispatch', 'dario-taskboard', 'dario-status', 'dario-evolve',
  'dario-diagnose', 'dario-brand', 'dario-offer', 'dario-naming', 'dario-pitch',
  'dario-proposal', 'dario-content', 'dario-social', 'dario-email-seq',
  'dario-cfo', 'cfo-agency-pnl', 'cfo-token-roi', 'cfo-tax-autopilot',
  'lucas-heartbeat', 'lucas-quality', 'lucas-autopilot', 'lucas-analytics', 'lucas-finance',
  'seo-audit', 'seo-technical', 'seo-content', 'seo-local', 'seo-schema', 'seo-plan',
];

const BUILDER_SKILLS = [
  'builder-design-system', 'builder-landing-page', 'builder-nextjs-app', 'builder-vercel-deploy',
  'builder-api-design', 'builder-database-schema', 'builder-auth-system', 'builder-react-components',
  'builder-docker-compose', 'builder-ci-cd', 'builder-brand-identity', 'builder-wireframe',
  'builder-analytics-setup', 'builder-data-model', 'builder-prd-complete', 'builder-mvp-scope',
  'builder-tech-stack', 'builder-architecture-doc', 'builder-launch-checklist', 'builder-form-system',
  'builder-visual-to-code', 'builder-accessibility-check', 'builder-coolify-deploy',
  'builder-nextjs-monorepo', 'builder-svg-icons', 'builder-animated-ui',
  'builder-drizzle-schema', 'builder-orpc-api', 'builder-smart-context',
  'builder-sst-deploy', 'builder-component-registry', 'builder-component-docs',
];

// ═══════════════════════════════════════════════════════════════
// LEX-BR SKILLS (v11.2.0 — legal agent Brasil)
// ═══════════════════════════════════════════════════════════════
const LEX_SKILLS = [
  'lex-civil', 'lex-commercial', 'lex-corporate', 'lex-trabalhista',
  'lex-tributario', 'lex-lgpd', 'lex-regulatorio', 'lex-ai-governance',
  'lex-ip', 'lex-litigation', 'lex-consumidor', 'lex-administrativo',
  'lex-imobiliario', 'lex-familia', 'lex-criminal',
];

// ═══════════════════════════════════════════════════════════════
// DEMETER SKILLS (v11.3.0 — data engineering & analytics)
// ═══════════════════════════════════════════════════════════════
const DEMETER_SKILLS = [
  'demeter-etl', 'demeter-warehouse', 'demeter-bi-dashboard',
  'demeter-data-quality', 'demeter-ml-pipelines', 'demeter-ab-testing',
  'demeter-cohort-analysis', 'demeter-predictive', 'demeter-realtime-streaming',
  'demeter-data-catalog', 'demeter-dataops', 'demeter-dbt-workflows',
  'demeter-metrics-layer', 'demeter-event-tracking', 'demeter-data-storytelling',
];

// ═══════════════════════════════════════════════════════════════
// CONFIGS + DATA
// ═══════════════════════════════════════════════════════════════
const CONFIGS = [
  'company.yaml', 'autodiag.yaml', 'composite_modes.yaml', 'evolution_engine.yaml',
  'fallback_matrix.yaml', 'manifesto.yaml', 'operational_states.yaml',
  'synaptic_weights.yaml', 'notifications.yaml', 'skill_chains.yaml',
  'integration_registry.yaml',
];

const DATA_FILES = [
  'finance/receivables.yaml', 'finance/freelancers.yaml', 'finance/tax_calendar.yaml',
  'finance/model_pricing.yaml', 'finance/output_schemas.yaml',
  'chains/client_onboarding.yaml', 'chains/idea_to_landing_page.yaml',
];

// ═══════════════════════════════════════════════════════════════
// INSTALL
// ═══════════════════════════════════════════════════════════════
async function install(upgrade = false) {
  let installed = 0;

  // Directories
  console.log(`\n${c.bold}Step 1: Directory Structure${c.reset}`);
  const dirs = [
    'tasks/active', 'tasks/done', 'tasks/templates',
    'audit', 'budgets', 'quality', 'finance', 'chains', 'tests',
    'evolution/journal', 'evolution/mutations', 'evolution/rules', 'evolution/checkpoints',
  ];
  dirs.forEach(d => mkdirp(path.join(ORCH_DIR, d)));
  log(`${dirs.length} directories verified`);

  // Configs
  console.log(`\n${c.bold}Step 2: Orchestrator Configs (${CONFIGS.length})${c.reset}`);
  for (const cfg of CONFIGS) {
    if (await downloadFile(`${REPO_RAW}/orchestrator/${cfg}`, path.join(ORCH_DIR, cfg), cfg, upgrade)) installed++;
  }

  // Data files
  console.log(`\n${c.bold}Step 3: Finance & Chains Data (${DATA_FILES.length})${c.reset}`);
  for (const df of DATA_FILES) {
    if (await downloadFile(`${REPO_RAW}/orchestrator/${df}`, path.join(ORCH_DIR, df), df)) installed++;
  }

  // Engines
  console.log(`\n${c.bold}Step 4: Python Engines (${CORE_ENGINES.length})${c.reset}`);
  for (const eng of CORE_ENGINES) {
    if (await downloadFile(`${REPO_RAW}/orchestrator/${eng}`, path.join(ORCH_DIR, eng), eng, upgrade)) installed++;
  }

  // Core Skills
  console.log(`\n${c.bold}Step 5: Core Skills (${CORE_SKILLS.length})${c.reset}`);
  for (const skill of CORE_SKILLS) {
    if (await downloadFile(
      `${REPO_RAW}/skills/${skill}/SKILL.md`,
      path.join(SKILLS_DIR, skill, 'SKILL.md'), skill, upgrade
    )) installed++;
  }

  // Builder Skills
  console.log(`\n${c.bold}Step 6: Builder Skills (${BUILDER_SKILLS.length})${c.reset}`);
  for (const skill of BUILDER_SKILLS) {
    if (await downloadFile(
      `${REPO_RAW}/skills/${skill}/SKILL.md`,
      path.join(SKILLS_DIR, skill, 'SKILL.md'), skill, upgrade
    )) installed++;
  }

  // LEX-BR Skills (legal Brasil)
  console.log(`\n${c.bold}Step 6a: LEX-BR Skills (${LEX_SKILLS.length}) — Legal Brasil${c.reset}`);
  for (const skill of LEX_SKILLS) {
    if (await downloadFile(
      `${REPO_RAW}/skills/${skill}/SKILL.md`,
      path.join(SKILLS_DIR, skill, 'SKILL.md'), skill, upgrade
    )) installed++;
  }

  // DEMETER Skills (data engineering)
  console.log(`\n${c.bold}Step 6b: DEMETER Skills (${DEMETER_SKILLS.length}) — Data Engineering & Analytics${c.reset}`);
  for (const skill of DEMETER_SKILLS) {
    if (await downloadFile(
      `${REPO_RAW}/skills/${skill}/SKILL.md`,
      path.join(SKILLS_DIR, skill, 'SKILL.md'), skill, upgrade
    )) installed++;
  }

  // Python deps
  console.log(`\n${c.bold}Step 7: Python Dependencies${c.reset}`);
  let pythonCmd = null;
  try { execSync('python3 --version', { stdio: 'pipe' }); pythonCmd = 'python3'; } catch {
    try { execSync('python --version', { stdio: 'pipe' }); pythonCmd = 'python'; } catch {
      warn('Python not found. Install Python 3.11+ for runtime.');
    }
  }
  if (pythonCmd) {
    log(`Python: ${pythonCmd}`);
    try {
      execSync(`${pythonCmd} -m pip install fastapi uvicorn pyyaml --quiet`, { stdio: 'pipe', timeout: 60000 });
      log('Dependencies: fastapi + uvicorn + pyyaml installed');
    } catch { warn('pip install failed — install manually: pip install fastapi uvicorn pyyaml'); }
  }

  // Initialize DB
  console.log(`\n${c.bold}Step 8: Initialize Database${c.reset}`);
  if (pythonCmd) {
    try {
      execSync(`cd "${ORCH_DIR}" && ${pythonCmd} -c "import sys;sys.path.insert(0,'.');from db import DB;db=DB();print(f'DB: {db.stats()}')"`, { stdio: 'inherit', timeout: 10000 });
    } catch { warn('DB init failed — will auto-init on first runtime start'); }
  }

  // Summary
  console.log(`\n${c.bold}${c.cyan}═══ Installation Summary ═══${c.reset}\n`);
  console.log(`  Version:        ${c.green}${c.bold}v${VERSION}${c.reset}`);
  console.log(`  Components:     ${c.bold}${installed}${c.reset} installed/updated`);
  console.log(`  Engines:        ${CORE_ENGINES.length} Python modules`);
  console.log(`  Skills:         ${CORE_SKILLS.length + BUILDER_SKILLS.length + LEX_SKILLS.length + DEMETER_SKILLS.length} (${BUILDER_SKILLS.length} builder + ${LEX_SKILLS.length} LEX-BR + ${DEMETER_SKILLS.length} DEMETER)`);
  console.log(`  Configs:        ${CONFIGS.length + DATA_FILES.length} YAML files`);
  console.log(`  Path:           ${ORCH_DIR}`);
  console.log('');

  verify();
  if (!upgrade) printNextSteps();
}

function verify() {
  console.log(`\n${c.bold}${c.cyan}═══ Verification ═══${c.reset}\n`);
  let pass = 0, total = 0;
  function chk(p, label) {
    total++;
    if (fileExists(p)) { log(`V ${label}`); pass++; }
    else { warn(`X ${label}`); }
  }

  chk(path.join(ORCH_DIR, 'company.yaml'), 'Company hierarchy (269 skills)');
  chk(path.join(ORCH_DIR, 'runtime.py'), 'Runtime server (90+ endpoints)');
  chk(path.join(ORCH_DIR, 'db.py'), 'SQLite persistence');
  chk(path.join(ORCH_DIR, 'core_upgrades.py'), 'Core Upgrades v11.0');
  chk(path.join(ORCH_DIR, 'execution_upgrades.py'), 'Execution Pipeline (168 agent cards)');
  chk(path.join(ORCH_DIR, 'intelligence_upgrades.py'), 'Intelligence (Q-value + KnowledgeGraph)');
  chk(path.join(ORCH_DIR, 'security_upgrades.py'), 'Security (OWASP 10/10)');
  chk(path.join(ORCH_DIR, 'pt_validators.py'), 'PT Validators (NIF/ATCUD/SNC/IVA)');
  chk(path.join(ORCH_DIR, 'financial_dashboard.py'), 'CFO Dashboard');
  chk(path.join(ORCH_DIR, 'bank_parser.py'), 'Bank Parser (6 PT banks)');
  chk(path.join(ORCH_DIR, 'integration_registry.yaml'), 'Integration Registry (42 repos)');
  chk(path.join(SKILLS_DIR, 'dario-cfo', 'SKILL.md'), 'CFO VP skill');
  chk(path.join(SKILLS_DIR, 'builder-landing-page', 'SKILL.md'), 'Builder: Landing Page');
  chk(path.join(SKILLS_DIR, 'builder-nextjs-monorepo', 'SKILL.md'), 'Builder: Monorepo (next-forge)');
  chk(path.join(SKILLS_DIR, 'builder-visual-to-code', 'SKILL.md'), 'Builder: Visual to Code');

  // v11.1.0 Cognitive Audit modules
  chk(path.join(ORCH_DIR, 'semantic_dispatch.py'), 'U1: Semantic Dispatch (embeddings)');
  chk(path.join(ORCH_DIR, 'ethical_gate.py'),      'U2: Ethical Pre-Gate (triade)');
  chk(path.join(ORCH_DIR, 'confidence_engine.py'), 'U4: Confidence Engine (5-way gate)');
  chk(path.join(ORCH_DIR, 'dispatch_cot.py'),      'U9: Chain-of-Thought + Postmortem');
  chk(path.join(ORCH_DIR, 'cron_daily.py'),        'U12: Cron Daily (6 jobs)');
  chk(path.join(ORCH_DIR, 'cognitive_dashboard.py'), 'U13: Cognitive Dashboard HTML');
  chk(path.join(ORCH_DIR, 'webhook_dispatcher.py'), 'U15: Webhook Dispatcher');
  chk(path.join(ORCH_DIR, 'weekly_summary.py'),    'U18: Weekly Summary');
  chk(path.join(ORCH_DIR, 'license_guard.py'),     'v11.1.1: License Guard (closes trial leak)');

  console.log(`\n  ${c.bold}Score: ${pass}/${total}${c.reset}`);
  if (pass === total) console.log(`  ${c.green}${c.bold}V DARIO v${VERSION} — FULLY OPERATIONAL${c.reset}`);
  else console.log(`  ${c.yellow}${pass}/${total} — some files may need manual download${c.reset}`);
}

function printNextSteps() {
  console.log(`
${c.bold}${c.cyan}═══ Next Steps ═══${c.reset}

  ${c.bold}1.${c.reset} Start runtime:  ${c.blue}cd ${ORCH_DIR} && python runtime.py --port 8422${c.reset}
  ${c.bold}2.${c.reset} Health check:   ${c.blue}curl http://localhost:8422/health${c.reset}
  ${c.bold}3.${c.reset} CFO Dashboard:  ${c.blue}http://localhost:8422/cfo${c.reset}
  ${c.bold}4.${c.reset} All endpoints:  ${c.blue}http://localhost:8422/core/status${c.reset}

  ${c.bold}Skills available:${c.reset}
  /dario-diagnose    — Holistic diagnostic
  /dario-brand       — Brand positioning
  /dario-cfo         — CFO virtual (PT compliance)
  /builder-landing-page — Generate landing page
  /builder-nextjs-app   — Scaffold Next.js app
  /seo-audit         — Full SEO audit

${c.cyan}Demo: http://31.97.53.231:8422${c.reset}
${c.cyan}Docs: https://github.com/bardapraiacaraiva/dario-orchestrator${c.reset}
${c.cyan}Full version: barda@automationsolutionai.com${c.reset}
`);
}

// ═══ Main ═══
async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--upgrade') ? 'upgrade'
    : args.includes('--check') ? 'check'
    : 'install';

  banner(mode);

  try {
    switch (mode) {
      case 'upgrade': await install(true); break;
      case 'check': verify(); break;
      case 'install': await install(false); break;
    }
  } catch (e) {
    err(`Failed: ${e.message}`);
  }
}

main();
