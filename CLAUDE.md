# Pulse Cockpit — CLAUDE.md

---

## ⚠️ ATENÇÃO — App em produção com dados reais

**Este app está em uso real.** O workspace do usuário (`~/Library/Mobile Documents/com~apple~CloudDocs/PulseCockpit/` ou o path configurado em `~/.pulsecockpit/settings.json`) contém perfis de liderados, histórico de artefatos e contexto acumulado ao longo do tempo — tudo sincronizado com iCloud Drive.

**Regras absolutas ao trabalhar neste projeto:**

- **NUNCA deletar, mover ou renomear arquivos/pastas do workspace** (`~/MgrCockpit/pessoas/`, `inbox/`, `artefatos/`, `gestor/`, etc.) — qualquer perda é irreversível mesmo com iCloud
- **NUNCA executar operações de limpeza ou migração de dados** sem confirmação explícita do usuário
- **Antes de qualquer mudança que afete a estrutura do workspace** (novos diretórios, renaming de campos no `config.yaml` ou `perfil.md`, mudanças de schema): descrever o impacto e aguardar aprovação
- **Mudanças no `ArtifactWriter`, `PersonRegistry` ou qualquer classe que escreve em disco** devem ser revisadas com atenção redobrada — uma regressão pode corromper perfis existentes
- **Migrações de schema** (como `ProfileMigration.ts`) devem sempre ser aditivas e não-destrutivas; nunca remover campos sem garantir que todos os arquivos existentes já foram migrados

**Por que isso importa:** o contexto acumulado nos perfis (insights, histórico de 1:1s, alertas, evolução das pessoas) é o valor central do produto. Perder esses dados significa perder meses de trabalho do gestor.

---

## Planejamento — GSD (source of truth)

Todo o planejamento de produto e técnico vive no GSD:

```
.planning/
├── PROJECT.md     ← visão de produto, persona, principios, backlog de ideias
├── ROADMAP.md     ← phases do milestone atual
├── REQUIREMENTS.md ← requirements com traceability
├── STATE.md       ← estado atual do milestone
└── phases/        ← plans e verificações por phase
```

**Antes de implementar qualquer feature:** consulte `.planning/PROJECT.md` (backlog) e `.planning/ROADMAP.md` (phases).

**Para planejar:** use `/gsd:discuss-phase` → `/gsd:plan-phase` → `/gsd:execute-phase`.
**Para ideias rápidas:** use `/gsd:add-backlog` ou edite o backlog no PROJECT.md.

### Referência técnica

- **PRD_TECH.md** (raiz do repo) — arquitetura, schema, IPC channels, prompts
- **PITCH.md** (raiz do repo) — positioning do produto

### Histórico

- `tasks/done.md` — histórico de tasks técnicas concluídas (referência, não ativo)
- pm-agent (`pm-agent/projects/pulse-cockpit/`) — arquivado, não usar para planejamento

---

## IA — Claude Code CLI (OBRIGATÓRIO)

Este projeto usa **Claude Code CLI** (`claude -p`) via `child_process.spawn` no Main Process do Electron.

**Nunca usar:**
- Anthropic API (`@anthropic-ai/sdk`)
- API keys ou variáveis de ambiente com tokens da Anthropic
- Qualquer SDK de terceiro para chamar LLMs

O usuário deve ter o Claude Code CLI instalado e autenticado localmente. O path do binário é detectado via `which claude` e armazenado em `~/.mgrcockpit/settings.json`.

---

## PRD_TECH.md — quando atualizar

O `PRD_TECH.md` é o documento vivo da implementação. Atualizar sempre que:

| Mudança | Seção a atualizar |
|---------|------------------|
| Nova dependência | Stack |
| Mudança na estrutura de pastas | Estrutura de Arquivos do Projeto |
| Mudança no schema do config.yaml ou perfil.md | Modelagem de Dados |
| Novo IPC channel ou mudança de contrato | IPC Channels |
| Mudança em prompt | Prompts — Estrutura |
| Novo risco identificado | Riscos Técnicos |

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Pulse Cockpit** — app desktop (Electron + React) para gestores de tecnologia. Transforma transcricoes e anotacoes em inteligencia sobre pessoas. V1 + V2 + V3 + Revisao Extensiva em producao.

**Core Value:** Acumulacao de contexto ao longo do tempo — cada ingestao enriquece o perfil, que melhora pautas, alertas e relatorios de ciclo.

**Persona:** Engineering Manager de fintech, 8-12 reports, power user tecnico. Quer parar de gerir de cabeca.

**Principios:** Acumulacao > feature. O app encontra o gestor. IA sugere, gestor decide. Dados locais. Cirurgico, nao ambicioso. Qualidade de extracao e tudo.

Para contexto completo de produto, persona, JTBD e backlog: `.planning/PROJECT.md`

### Constraints

- **Producao:** App em uso real com dados irreversiveis — nenhuma operacao destrutiva sem confirmacao
- **Tech stack:** Electron + React + TypeScript — nao mudar
- **IA:** Exclusivamente Claude Code CLI (`claude -p`) — nunca SDK/API
- **Dados:** Workspace em disco (Markdown + YAML) — sem banco de dados
- **Schema:** Mudancas em perfil.md devem ser aditivas; nunca remover campos sem migration
- **Sem testes:** Zero coverage — priorizar mudancas cirurgicas
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
