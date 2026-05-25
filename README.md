# DARIO Orchestrator — Installer

One-line installer + upgrader for the [DARIO Orchestrator](https://github.com/bardapraiacaraiva/dario-orchestrator) — 32 squads, 559+ skills, 3 license tiers (trial / pro / enterprise).

> **v12.4.1 (2026-05-25) — Layout fix:** fresh installs from pre-v12.4.1 installers placed Python files at `~/.claude/orchestrator/orchestrator/` (nested) instead of `~/.claude/orchestrator/` (flat), breaking all imports. v12.4.1 clones to a temp dir and relocates content correctly, preserving existing files (settings.json, sessions/, history.jsonl). Added `--fix-layout` to migrate pre-v12.4.1 nested installs in-place. `--check` detects and warns about nested layouts. **If `--check` shows "NESTED LAYOUT detected", run `--fix-layout` once.**
>
> **v12.4.0 (2026-05-25) — Open Everything:** the trial (public) and VIP (private) repos now ship IDENTICAL working code. The "VIP-only stub" gating is removed. License tier signals consulting/support level, not code access. Risks #1/#4/#7/#10 closed. Test surface: 545 tests pass.
>
> **Upgrade existing installs:** `npx github:bardapraiacaraiva/dario-orchestrator-installer --upgrade` (idempotent, safe to run anytime). Restores ~11K LOC of cognitive features (semantic_dispatch, episode_promoter, q-value memory, prompt hints, ethical_gate, dispatch_cot, synaptic_update, golden_eval, chain_graph, dynamic_branch, prompt_hints, confidence_engine, executor + upgrades/ package).
>
> **v12.3.0 (2026-05-23):** Cython-compiled binaries are the **default** for all installs. To get readable `.py` source instead, add `--source` (intended for devs / pdb step-through).

## Quick start

### Trial install (free, public repo, 7-day trial)

```bash
npx github:bardapraiacaraiva/dario-orchestrator-installer
```

This clones the public repo to `~/.claude/orchestrator`, downloads the latest Cython-compiled binaries (.pyd on Windows / .so on Linux), removes the .py originals for license code, runs the post-install setup, and starts a 7-day trial that gives showcase access to all 32 squads. License enforcement bypass cost is raised from ~30 min (edit .py) to ~3 days expert (Cython disassembly).

### Trial with source (devs, integration debugging)

```bash
npx github:bardapraiacaraiva/dario-orchestrator-installer --source
```

Opts out of the obfuscation overlay. Identical functionality at runtime; the .py files stay readable. Use this if you need to step through `license_manager.py` with pdb, or if you're integrating the orchestrator with another system and need to inspect the dispatch logic. License enforcement still applies.

### Upgrade an existing install

```bash
npx github:bardapraiacaraiva/dario-orchestrator-installer --upgrade
```

Idempotent — pulls latest master and re-runs the upgrade script. Safe to run any time.

### VIP install (paying clients)

```bash
DARIO_GH_TOKEN=ghp_xxx \
  npx github:bardapraiacaraiva/dario-orchestrator-installer \
    --key DARIO-XXXX-XXXX-XXXX-PRO
```

VIP keys clone the private `dario-orchestrator-full` repo and activate the license immediately. The GitHub token is a read-only PAT for the private repo — contact `barda@automationsolutionai.com` if you don't have one.

> **Since v12.4.0 (open everything):** the private VIP repo ships the SAME code as the public trial repo. The VIP install still routes to the private repo for backward compatibility and to gate access via the GitHub PAT (consulting/support tier signal), but no source-code unlock happens — code is identical on both sides.

### Upgrading from v12.x to v12.4.0 (existing VIP / paid clients)

If you installed before 2026-05-25, your install has the old VIP stubs that raise `ImportError` on imports of `dispatch_engine`, `semantic_dispatch`, `episode_promoter`, `qvalue_memory_wire`, `synaptic_update`, etc. Upgrade to restore ~11K LOC of working cognitive features:

```bash
# Option A — installer-driven (handles dependency updates + post-install)
npx github:bardapraiacaraiva/dario-orchestrator-installer --upgrade

# Option B — manual git pull (faster, skips dependency check)
cd ~/.claude && git pull origin master
cd ~/.claude/orchestrator && .venv/Scripts/python.exe -m pytest -m "not slow" -q
# Expected: 545 passed
```

**What you gain:** working `semantic_dispatch`, `dispatch_cot`, `episode_promoter`, `qvalue_memory_wire`, `synaptic_update`, `golden_eval`, `prompt_hints`, `ethical_gate`, `chain_graph`, `dynamic_branch`, `confidence_engine`, `executor`, full `upgrades/` package (21 files: core, execution, financial, intelligence, observability, quality, security, state). Production code paths in `cron_daily` and `cognitive_dashboard` that were silently degraded via try/except ImportError will now actually run.

**No license/key change needed.** Your existing key keeps working — the tier model was simplified to 3 (trial/pro/enterprise) in v12.4.0 but old keys map cleanly.

### Check status

```bash
npx github:bardapraiacaraiva/dario-orchestrator-installer --check
```

Reports install state, license validity, current git branch + HEAD.

---

## All options

| Flag | What it does |
|---|---|
| (none) | Trial install with **default Cython obfuscation** |
| `--source` / `--no-obfuscated` | Skip obfuscation overlay — keep .py source readable |
| `--upgrade` | git pull + re-run upgrade script (preserves prior obfuscation state) |
| `--check` | Verify install + license |
| `--help` | Full help message |
| `--version` | Print installer version |
| `--key DARIO-...` | Activate this license key after install |
| `--token GHP_xxx` | GitHub PAT for the private VIP repo (or env `DARIO_GH_TOKEN`) |
| `--release-tag TAG` | Pin obfuscation overlay to specific release (default: latest) |
| `--dry-run` | Show actions without executing |
| `--force` | Re-clone even if `~/.claude/orchestrator` exists |

---

## Requirements

- **Node.js 18+** (for the installer itself)
- **Git** (for clone/pull)
- **Python 3.11+** (for the orchestrator runtime + license manager)
- **Claude Code CLI** (the agent platform DARIO orchestrates)

The installer detects missing prereqs and tells you what to install.

---

## What gets installed

Clones one of two repos to `~/.claude/orchestrator/`:

- **Trial** → `bardapraiacaraiva/dario-orchestrator` (public)
- **VIP**   → `bardapraiacaraiva/dario-orchestrator-full` (private, token-gated)

Then runs `scripts/upgrade_v12_1.py` which:

1. Creates state directories (`prometheus/`, `tasks/`, `audit/`, `quality/`, `evolution/`)
2. Initialises YAML state files (last_run, releases, mcp, papers, regulatory)
3. Schedules weekly PROMETHEUS scan (Sunday 22h00 BRT)
4. Schedules one-shot PROMETHEUS Wave 3 reminder (2026-06-17 09h00)
5. Verifies daily cron continues active (Memory & Dreaming)
6. Optionally re-ingests skills into the local RAG (if engine running)

Finally, activates your license key (`--activate KEY`) or starts a trial (`--init-trial`).

---

## License tiers

| Suffix | Tier | Notes |
|---|---|---|
| `PRO` | Professional | R$ 297/mo, 3 parallel workers, all engines |
| `ENT` | Enterprise | R$ 997/mo, 5 parallel, multi-tenancy + federation |
| `LXS`/`LXO`/`LXE` | LEX-BR (legal Brasil) | Solo/Office/Enterprise |
| `GAS`/`GAT`/`GAE` | GAIA (ESG/CSRD) | |
| `NMS`/`NMT`/`NME` | NOMOS (compliance PT — CMVM/BdP/AI Act/DORA) | |
| `ELG` | Enterprise Legal bundle | ENT + LEX-BR Office, 10% off (R$ 1.795) |
| `ESC` | Enterprise Security bundle | ENT + AEGIS, 15% off (R$ 3.395) |
| `ECP` | Enterprise Compliance bundle | ENT + NOMOS + GAIA, 17% off (R$ 6.633) |
| `EFN` | Enterprise Finance bundle | ENT + ATLAS-FIN + DEMETER, 20% off (R$ 3.993) |
| `EFL` | Enterprise Full bundle | ENT + 5 verticals, 25% off (R$ 9.736) |
| + 9 other vertical squads | see full tier list | each with Solo/Team/Enterprise |

Full tier matrix: 59 tiers including 5 Onda 12 bundles (introduced 2026-05-22).

---

## Troubleshooting

**"git not found"** → install Git: <https://git-scm.com>

**"Python 3.11+ not detected"** → install Python: <https://python.org/downloads>. On Windows, ensure "Add Python to PATH" is checked during install.

**"already exists"** → use `--upgrade` (to update) or `--force` (to nuke and re-clone). The `--force` flag deletes `~/.claude/orchestrator` before re-cloning, so back up anything custom first.

**"VIP key requires --token"** → you need a GitHub PAT to clone the private VIP repo. Email `barda@automationsolutionai.com` after purchase.

**"trial init returned non-zero — may already be initialised"** → the 7-day trial is one-per-machine (3-layer fingerprint). Re-running `--init-trial` after the first run is a no-op. If you bought a key, use `--activate`.

---

## Support

- **Issues:** <https://github.com/bardapraiacaraiva/dario-orchestrator-installer/issues>
- **Email:** `barda@automationsolutionai.com`
- **Docs:** <https://github.com/bardapraiacaraiva/dario-orchestrator>
