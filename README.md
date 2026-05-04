# @dario-ai/orchestrator

**DARIO Orchestrator v2.1-ALIVE** — Self-Evolving AI Agent OS for Claude Code.

The first orchestrator that learns from usage and improves itself autonomously.

## One-Click Install

```bash
npx @dario-ai/orchestrator
```

## Options

```bash
npx @dario-ai/orchestrator                 # Full install (configs + skills + runtime)
npx @dario-ai/orchestrator --configs-only  # Only YAML configs + skills
npx @dario-ai/orchestrator --runtime-only  # Only Python runtime service
npx @dario-ai/orchestrator --check         # Verify installation
```

## Requirements

- **Node.js 18+** (for the installer)
- **Claude Code CLI** (the agent platform)
- **Python 3.11+** (for the runtime service)
- **PostgreSQL** (for metrics/state persistence)

## What Gets Installed

### Orchestrator Configs (`~/.claude/orchestrator/`)
- `manifesto.yaml` — Governance document (immutable)
- `evolution_engine.yaml` — Self-evolution protocol
- `operational_states.yaml` — State machine + autonomy ladder
- `autodiag.yaml` — Silent diagnostic checks
- `fallback_matrix.yaml` — 40+ skill fallback paths
- `synaptic_weights.yaml` — Inter-skill affinity graph
- `composite_modes.yaml` — Multi-skill formations
- `company.yaml` — Agent hierarchy

### Skills (`~/.claude/skills/`)
- `dario-orchestrator` — Control plane (877 lines)
- `dario-evolve` — Evolution engine skill
- `lucas-heartbeat` — Pulse scheduler
- `lucas-quality` — Weighted quality scoring
- `lucas-autopilot` — Autonomous execution
- + 5 more core skills

### Runtime Service (`~/dario-orch/`)
- FastAPI on port 8421
- PostgreSQL backend (10 tables)
- APScheduler (micro/session/weekly pulses)
- Mutation Engine (auto-modifies configs)
- Live Dashboard at `/dashboard`
- 26 pytest tests

## How It Works

```
You use Claude → tasks complete → hooks fire →
scores recorded → fitness rises → patterns detected →
threshold reached → rule crystallizes → YAML mutated →
next session uses improved config → scores rise more →
weekly pulse → checkpoint + generation++
```

## Architecture

```
GOVERNANCE (Manifesto + Ethical Gate + Blocklist)
    ↓
BOOT CHAIN (8 steps DAG)
    ↓
STATE MACHINE (Active/Reflective/Guardian/Expansion)
    ↓
AUTONOMY LADDER (P-A1 → P-A4 based on trust)
    ↓
DISPATCH (Synaptic Weights + Composite Modes)
    ↓
EXECUTION (7 Phases + Co-signature)
    ↓
QUALITY (Weighted Scoring + Confidence Modes)
    ↓
SELF-HEALING (AutoDiag + Fallback + Circuit Breaker)
    ↓
EVOLUTION (Espiral + Delta + Crystallization)
```

## License

MIT
