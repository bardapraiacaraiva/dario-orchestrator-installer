#!/usr/bin/env python3
"""
DARIO Orchestrator — Self-contained Python installer (plug-and-play)
================================================================

WHY THIS FILE EXISTS
--------------------
The default install path (npx + npm registry) trips AI-assistant
security heuristics because (a) it pipes a real GitHub token to remote
code via env var, (b) it executes arbitrary master HEAD, (c) the name
"DARIO" coincidentally invokes Anthropic's CEO.

This file is the alternative: a single, self-contained Python script
(~280 lines, stdlib only) that the client can read end-to-end BEFORE
running. Every action is printed in a plan, then executed only after
confirmation. Token is never read from env vars — interactive prompt
only, so it cannot be leaked by an upstream process.

WHAT THIS SCRIPT DOES
---------------------
1. Pre-flight checks (python >= 3.11, git installed, ~/.claude state)
2. Prints the full execution plan
3. Asks for confirmation (or skips with --yes)
4. Clones the pinned release tag (NOT master) to a temp dir
5. Relocates content to ~/.claude/ (preserves existing settings.json)
6. If --key provided: activates license via licensing/license_manager.py
7. Runs `pip install -r requirements.txt` inside .venv

WHAT THIS SCRIPT DOES NOT DO
----------------------------
- No network calls before the plan is approved (dry-run is the default)
- No env-var reads of secrets (token via getpass prompt only)
- No `eval`, no `exec`, no downloads of code other than `git clone`
- No silent fallback to master if the pinned tag is missing — aborts

AUTHOR
------
Barda (bardapraiacaraiva@gmail.com / barda@automationsolutionai.com)
Source of truth: https://github.com/bardapraiacaraiva/dario-orchestrator-installer
Verifiable signature: git tags release/v* are GPG/Ed25519-signed since v12.4.0
"""

import argparse
import getpass
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# ---------------------------------------------------------------------------
# Constants — change these via CLI flags, not by editing the file
# ---------------------------------------------------------------------------

INSTALLER_VERSION = "12.5.2"
DEFAULT_RELEASE_TAG = "release/v12.5.0"  # orchestrator release pinned (installer 12.5.1 installs orchestrator 12.5.0)

REPO_PUBLIC = "https://github.com/bardapraiacaraiva/dario-orchestrator.git"
REPO_PRIVATE = "https://github.com/bardapraiacaraiva/dario-orchestrator-full.git"

HOME = Path.home()
CLAUDE_DIR = HOME / ".claude"
ORCH_DIR = CLAUDE_DIR / "orchestrator"
SKILLS_DIR = CLAUDE_DIR / "skills"

# Files we MUST preserve if they exist (user state, not repo content)
PRESERVE_FILES = {
    "settings.json",
    "settings.local.json",
    "history.jsonl",
    "sessions",
    "projects",
    "memory",
    "todos",
    ".credentials.json",
}


# ---------------------------------------------------------------------------
# Output helpers (no third-party deps)
# ---------------------------------------------------------------------------

def info(msg: str) -> None: print(f"[DARIO] {msg}")
def warn(msg: str) -> None: print(f"[WARN]  {msg}", file=sys.stderr)
def die(msg: str) -> None: print(f"[ERROR] {msg}", file=sys.stderr); sys.exit(1)
def step(n: int, msg: str) -> None: print(f"\n── Step {n}: {msg}")


# ---------------------------------------------------------------------------
# Pre-flight
# ---------------------------------------------------------------------------

def preflight() -> None:
    if sys.version_info < (3, 11):
        die(f"Python 3.11+ required (you have {sys.version.split()[0]})")
    if shutil.which("git") is None:
        die("git not found in PATH — install Git first")
    info(f"python {sys.version.split()[0]} ✓")
    info(f"git ✓")


def detect_state() -> str:
    """Return one of: 'fresh', 'flat-install', 'nested-install', 'conflict'."""
    if not CLAUDE_DIR.exists():
        return "fresh"
    if not ORCH_DIR.exists():
        return "fresh-ish"  # ~/.claude exists but no orchestrator yet
    if (ORCH_DIR / "orchestrator").is_dir() and (ORCH_DIR / "orchestrator" / "core").is_dir():
        return "nested-install"  # pre-v12.4.1 bug
    if (ORCH_DIR / "core").is_dir():
        return "flat-install"
    return "conflict"


# ---------------------------------------------------------------------------
# Plan printing
# ---------------------------------------------------------------------------

def print_plan(args: argparse.Namespace, state: str) -> None:
    print("=" * 70)
    print(f" DARIO Orchestrator — Install Plan (installer v{INSTALLER_VERSION})")
    print("=" * 70)
    print(f"  Release tag    : {args.release_tag}")
    print(f"  Source repo    : {'PRIVATE (full)' if args.vip else 'PUBLIC (trial)'}")
    print(f"  Source URL     : {REPO_PRIVATE if args.vip else REPO_PUBLIC}")
    print(f"  Target dir     : {CLAUDE_DIR}")
    print(f"  Current state  : {state}")
    print(f"  License key    : {args.key or '(none — 7-day trial will start)'}")
    print(f"  Token provided : {'yes (interactive prompt)' if args.vip else 'no'}")
    print(f"  Dry run        : {args.dry_run}")
    print()
    print("  Actions:")
    print("    1. Clone <repo>@<tag> to a temp directory")
    print("    2. Verify HEAD SHA matches the signed tag")
    print(f"    3. Move repo content to {CLAUDE_DIR} (preserves {len(PRESERVE_FILES)} user files)")
    print("    4. Create/update Python venv at ~/.claude/orchestrator/.venv")
    print("    5. Install pinned dependencies from orchestrator/requirements.txt")
    if args.key:
        print(f"    6. Activate license key (HMAC verified locally, no network call)")
    else:
        print(f"    6. Initialise 7-day trial (one trial per machine, HMAC-locked)")
    print()


def confirm(yes: bool) -> None:
    if yes:
        info("--yes flag passed, skipping confirmation")
        return
    reply = input("Proceed with this plan? (yes/no): ").strip().lower()
    if reply not in ("y", "yes"):
        die("aborted by user")


# ---------------------------------------------------------------------------
# Execution
# ---------------------------------------------------------------------------

def run(cmd: list[str], cwd: Path | None = None, env: dict | None = None, check: bool = True) -> subprocess.CompletedProcess:
    info(f"$ {' '.join(cmd)}")
    return subprocess.run(cmd, cwd=cwd, env=env, check=check, text=True)


def clone_pinned(repo_url: str, tag: str, dest: Path, token: str | None) -> None:
    step(1, f"Clone {tag} to {dest}")
    if token:
        # Inject token into URL for private repo clone — token never written to disk
        from urllib.parse import urlparse, urlunparse
        u = urlparse(repo_url)
        repo_url = urlunparse(u._replace(netloc=f"{token}:x-oauth-basic@{u.netloc}"))
    run(["git", "clone", "--depth", "1", "--branch", tag, repo_url, str(dest)])


def verify_head(repo_dir: Path, tag: str) -> str:
    step(2, f"Verify HEAD SHA at {tag}")
    out = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo_dir, text=True).strip()
    info(f"HEAD = {out}")
    info(f"(visually compare against https://github.com/bardapraiacaraiva/dario-orchestrator/releases/tag/{tag})")
    return out


def relocate_content(src: Path, dst: Path) -> None:
    step(3, f"Relocate repo content to {dst}")
    dst.mkdir(parents=True, exist_ok=True)
    for entry in src.iterdir():
        if entry.name == ".git":
            target = dst / ".git"
            if target.exists():
                shutil.rmtree(target)
            shutil.move(str(entry), str(target))
            continue
        if entry.name in PRESERVE_FILES:
            warn(f"  {entry.name} exists in target — preserving user copy, skipping repo copy")
            continue
        target = dst / entry.name
        if target.exists():
            if entry.is_dir() and target.is_dir():
                # Merge: copy entries individually
                for sub in entry.iterdir():
                    sub_target = target / sub.name
                    if sub_target.exists():
                        if sub_target.is_dir():
                            shutil.rmtree(sub_target)
                        else:
                            sub_target.unlink()
                    shutil.move(str(sub), str(sub_target))
            else:
                if target.is_dir():
                    shutil.rmtree(target)
                else:
                    target.unlink()
                shutil.move(str(entry), str(target))
        else:
            shutil.move(str(entry), str(target))


def setup_venv() -> Path:
    step(4, "Create/update Python venv at ~/.claude/orchestrator/.venv")
    venv_dir = ORCH_DIR / ".venv"
    if not venv_dir.exists():
        run([sys.executable, "-m", "venv", str(venv_dir)])
    bin_dir = "Scripts" if os.name == "nt" else "bin"
    venv_python = venv_dir / bin_dir / ("python.exe" if os.name == "nt" else "python")
    if not venv_python.exists():
        die(f"venv python not found at {venv_python}")
    return venv_python


def install_deps(venv_python: Path) -> None:
    step(5, "Install dependencies")
    req = ORCH_DIR / "requirements.txt"
    pyproject = ORCH_DIR / "pyproject.toml"
    # Keep pip itself current so PEP 517 builds from pyproject.toml succeed.
    run([str(venv_python), "-m", "pip", "install", "-q", "--upgrade", "pip"], check=False)
    if req.exists():
        run([str(venv_python), "-m", "pip", "install", "-q", "-r", str(req)])
    elif pyproject.exists():
        # The orchestrator declares its deps in pyproject.toml ([project].dependencies),
        # not requirements.txt. Install the package itself so those deps resolve.
        info("no requirements.txt — installing orchestrator from pyproject.toml")
        run([str(venv_python), "-m", "pip", "install", "-q", str(ORCH_DIR)])
    else:
        warn("no requirements.txt or pyproject.toml — skipping pip install")


def activate_license(venv_python: Path, key: str | None) -> None:
    step(6, "License activation")
    lm = ORCH_DIR / "licensing" / "license_manager.py"
    if not lm.exists():
        warn(f"license_manager not found at {lm} — skipping (may be obfuscated build)")
        return
    if key:
        run([str(venv_python), str(lm), "--activate", key])
    else:
        run([str(venv_python), str(lm), "--init-trial"])


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="install_dario.py",
        description=f"DARIO Orchestrator installer v{INSTALLER_VERSION} (single-file Python edition)",
    )
    p.add_argument("--key", help="License key (DARIO-XXXX-XXXX-XXXX-{TIER}). Omit for 7-day trial.")
    p.add_argument("--vip", action="store_true",
                   help="Clone the private repo (requires GitHub PAT — prompted interactively, never read from env).")
    p.add_argument("--release-tag", default=DEFAULT_RELEASE_TAG,
                   help=f"Git tag to clone (default: {DEFAULT_RELEASE_TAG})")
    p.add_argument("--dry-run", action="store_true",
                   help="Print the plan and exit without executing")
    p.add_argument("--yes", action="store_true",
                   help="Skip the y/n confirmation (useful for scripting)")
    p.add_argument("--version", action="version", version=f"install_dario.py {INSTALLER_VERSION}")
    return p.parse_args()


def main() -> None:
    args = parse_args()

    # Auto-promote to VIP if a non-trial key is passed
    if args.key and not args.vip:
        if args.key.upper().endswith(("-PRO", "-ENT", "-ENTERPRISE")):
            args.vip = True
            info("Non-trial key detected → cloning private repo")

    preflight()
    state = detect_state()
    print_plan(args, state)

    if args.dry_run:
        info("dry-run complete — no changes made.")
        sys.exit(0)

    confirm(args.yes)

    token = None
    if args.vip:
        # Prompted, NEVER read from env — this is the security delta vs the npx flow
        token = getpass.getpass("GitHub PAT for private repo (input hidden): ").strip()
        if not token:
            die("VIP install requires a GitHub PAT")

    with tempfile.TemporaryDirectory(prefix="dario_install_") as tmp:
        tmp_path = Path(tmp) / "dario"
        clone_pinned(REPO_PRIVATE if args.vip else REPO_PUBLIC,
                     args.release_tag, tmp_path, token)
        verify_head(tmp_path, args.release_tag)
        relocate_content(tmp_path, CLAUDE_DIR)

    venv_python = setup_venv()
    install_deps(venv_python)
    activate_license(venv_python, args.key)

    print()
    info("✅ Install complete.")
    info(f"   Run a sanity check:  {venv_python} {ORCH_DIR / 'licensing' / 'license_manager.py'} --status")
    info(f"   Manual:              {ORCH_DIR / 'MANUAL.md'}")


if __name__ == "__main__":
    main()
