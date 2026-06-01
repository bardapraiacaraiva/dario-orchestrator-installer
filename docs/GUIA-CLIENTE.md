# DARIO Orchestrator — Guia de Instalação (Cliente)

Bem-vindo. Este guia leva-te do zero a um **DARIO Orchestrator** a funcionar dentro do teu Claude Code, em poucos minutos. Tens **duas formas** de instalar: pelo **terminal** ou **diretamente no Claude Code**. Escolhe a que preferires.

> Se compraste uma licença, recebeste uma **KEY** (`DARIO-XXXX-XXXX-XXXX-PRO` ou `-ENT`) e um **TOKEN** GitHub (`ghp_...`). Tem-nos à mão. Se estás em **trial**, não precisas de nada disso.

---

## 1. Pré-requisitos

Confirma que tens (o instalador também verifica):

| Requisito | Como verificar | Onde obter |
|---|---|---|
| **Python 3.11+** | `python --version` | https://python.org/downloads — no Windows, marca **"Add Python to PATH"** |
| **git** | `git --version` | https://git-scm.com/downloads |
| **Claude Code** | `claude --version` | https://claude.com/claude-code |

(Opcional, só se usares o caminho NPX: **Node 18+** — https://nodejs.org)

---

## 2. Instalação VIA TERMINAL

### 2.1. Trial (7 dias grátis)

```bash
curl -O https://raw.githubusercontent.com/bardapraiacaraiva/dario-orchestrator-installer/master/install_dario.py
python install_dario.py
```

> Queres ver o que o script faz antes de correr? `less install_dario.py` (são ~280 linhas, fáceis de ler).

### 2.2. Licença comprada (PRO ou Enterprise)

```bash
curl -O https://raw.githubusercontent.com/bardapraiacaraiva/dario-orchestrator-installer/master/install_dario.py

# 1) Ver o plano, sem mexer em nada:
python install_dario.py --dry-run --key DARIO-XXXX-XXXX-XXXX-PRO

# 2) Instalar a sério:
python install_dario.py --key DARIO-XXXX-XXXX-XXXX-PRO
```

O instalador deteta a tua licença, liga-se ao repositório privado e **pede-te o TOKEN GitHub num prompt escondido** (não fica gravado em lado nenhum). Cola o `ghp_...` quando for pedido.

> Enterprise: usa a tua key terminada em `-ENT` em vez de `-PRO`.

### 2.3. Alternativa one-liner (NPX)

Se preferires um único comando (precisa de Node 18+):

```bash
# Trial
npx github:bardapraiacaraiva/dario-orchestrator-installer

# PRO/ENT
DARIO_GH_TOKEN=ghp_XXXXXXXX npx github:bardapraiacaraiva/dario-orchestrator-installer --key DARIO-XXXX-XXXX-XXXX-PRO
```

---

## 3. Instalação DIRETO NO CLAUDE CODE

Se já tens o Claude Code aberto, podes instalar sem sair dele.

> **Importante:** corre o comando **tu próprio**, escrevendo-o com `!` à frente. Não peças ao assistente para "ir buscar e correr" o instalador — assistentes de IA bloqueiam downloads remotos por segurança. Com o `!` és **tu** a executar; o resultado aparece na conversa.

**Passo 1 —** abre o Claude Code:
```
claude
```

**Passo 2 —** no prompt, escreve (com `!`):

Trial:
```
! curl -O https://raw.githubusercontent.com/bardapraiacaraiva/dario-orchestrator-installer/master/install_dario.py && python install_dario.py
```

PRO/ENT (corre o `curl` da mesma forma e depois):
```
! python install_dario.py --key DARIO-XXXX-XXXX-XXXX-PRO
```

**Passo 3 —** reabre o Claude Code na pasta do orchestrator para carregar tudo:
```
cd ~/.claude/orchestrator && claude
```

**Passo 4 —** confirma que está vivo. No Claude Code, escreve:
```
/dario-orchestrator
```
Se responder com o painel do orchestrator, está tudo a postos. 🎉

---

## 4. Confirmar a instalação

A qualquer momento:

```bash
npx github:bardapraiacaraiva/dario-orchestrator-installer --check
```

Resultado esperado:
```
✓ Layout=flat (correct)
6/6 checks passed
valid=True tier=<trial|pro|ent>
```

Ou um sanity check direto da licença:
```bash
python ~/.claude/orchestrator/licensing/license_manager.py --status
```

---

## 5. O que tens depois de instalar

Dentro do Claude Code:

- **`/dario-orchestrator`** — o cérebro central: dá-lhe um projeto e ele decompõe, delega e coordena o trabalho.
- **32 squads · 584+ skills** — marketing, SEO, finanças, produto, arquitetura/design (DIVA), compliance e muito mais.
- **`/dario-dashboard`** — painel visual com tarefas, orçamento e qualidade.
- **Memória persistente** entre sessões.

---

## 6. Atualizar mais tarde

```bash
# Terminal (Python)
python install_dario.py --release-tag release/v12.5.0 --key DARIO-XXXX-XXXX-XXXX-PRO

# Ou NPX
npx github:bardapraiacaraiva/dario-orchestrator-installer --upgrade
```

A atualização **preserva** as tuas definições, sessões, memória e histórico.

---

## 7. Resolução de problemas

| Mensagem | Significa | O que fazer |
|---|---|---|
| `git not found` | Git não está no PATH | Instala de https://git-scm.com/downloads |
| `Python 3.11+ required` | Python em falta ou antigo | Instala de https://python.org/downloads (marca "Add to PATH") |
| `VIP install requires a GitHub PAT` | Licença paga sem token | Volta a correr — o instalador pede o token num prompt escondido |
| `permission denied` ao clonar | Token errado ou expirado | Pede um token novo ao Barda |
| `trial init returned non-zero` | Já usaste o trial nesta máquina | Normal — usa a tua key se compraste |
| `No DARIO install detected` (no `--check`) | Instalação antiga | Corre com `--upgrade` |
| `ModuleNotFoundError` ao arrancar | Instalação antiga (dependências em falta) | Corre com `--upgrade` |
| O Claude Code recusa `npx github:...` | Proteção do assistente | Usa o caminho `install_dario.py` (secção 2) |

---

**Suporte:** barda@automationsolutionai.com
**Versão do instalador:** v12.5.3 · **DARIO Orchestrator:** v12.5.0
