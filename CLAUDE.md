# MgrCockpit — CLAUDE.md

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

## PM Agent

A documentação de produto deste projeto vive no PM Agent:

**Caminho:** `/Users/guilhermeaugusto/Documents/workspace-projects/pm-agent/projects/pulse-cockpit/`

```
pm-agent/projects/pulse-cockpit/
├── README.md          ← visão PM: o que é, status, decisões-chave
├── PRD.md             ← requisitos de produto (documento vivo)
├── decisions/         ← PDRs (Product Decision Records)
├── tasks/
│   ├── backlog.md     ← features e tarefas planejadas
│   ├── active.md      ← o que está em andamento agora
│   └── done.md        ← concluídas
└── docs/              ← PITCH.md, PRODUCT_STATUS.md (quando criados)
```

**Antes de implementar qualquer feature:** consulte `tasks/backlog.md` e `tasks/active.md` para entender o que está planejado e priorizado.

---

## Tasks locais (auditoria técnica)

Este repo mantém um diretório `/tasks` com o plano de execução da auditoria técnica (TECH.md):

```
tasks/
├── backlog.md    ← tarefas identificadas na auditoria, ainda não iniciadas
├── active.md     ← tarefas em andamento
├── done.md       ← tarefas concluídas (com data e resultado)
└── sequencia.md  ← sequência de execução recomendada (Fase 1 → 2 → 3)
```

Estas tasks são independentes do pm-agent — rastreiam issues técnicas (bugs, débito, arquitetura), não features de produto.

---

## Living Documentation

A documentação de produto vive **no PM Agent**, não neste repo.

**Caminho para docs de produto:** `/Users/guilhermeaugusto/Documents/workspace-projects/pm-agent/projects/pulse-cockpit/docs/`

| Situação | Documento a atualizar |
|----------|----------------------|
| Adicionei, conclui ou removi uma feature | `docs/PRODUCT_STATUS.md` no pm-agent |
| Mudei escopo ou público-alvo | `docs/PITCH.md` no pm-agent |
| Mudei stack, arquitetura, schema, rotas ou convenções técnicas | `PRD_TECH.md` na raiz deste repo |
| Conclui uma task | Mover de `tasks/active.md` para `tasks/done.md` no pm-agent |

A documentação técnica vive em `PRD_TECH.md` na raiz **deste repo**.

### Checklist pré-commit obrigatório

- [ ] Adicionei, conclui ou removi uma feature? → atualizar `docs/PRODUCT_STATUS.md` no pm-agent
- [ ] Mudei stack, arquitetura, schema, rotas ou convenções técnicas? → atualizar `PRD_TECH.md` neste repo
- [ ] Mudei escopo ou público-alvo? → atualizar `docs/PITCH.md` no pm-agent
- [ ] Conclui uma task? → mover de `tasks/active.md` para `tasks/done.md` no pm-agent
- [ ] Atualizei algum doc? → bumpar "Última atualização" nesse doc

---

## IA — Claude Code CLI (OBRIGATÓRIO)

Este projeto usa **Claude Code CLI** (`claude -p`) via `child_process.spawn` no Main Process do Electron.

**Nunca usar:**
- Anthropic API (`@anthropic-ai/sdk`)
- API keys ou variáveis de ambiente com tokens da Anthropic
- Qualquer SDK de terceiro para chamar LLMs

O usuário deve ter o Claude Code CLI instalado e autenticado localmente. O path do binário é detectado via `which claude` e armazenado em `~/.mgrcockpit/settings.json`.

---

## PRD

- **PRD de produto:** `/Users/guilhermeaugusto/Documents/workspace-projects/pm-agent/projects/pulse-cockpit/PRD.md`
- **PRD técnico:** `PRD_TECH.md` (na raiz deste repo)

---

## PRD_TECH — o que atualizar durante a implementação

O `PRD_TECH.md` é o documento vivo da implementação. Atualizar sempre que:

| Mudança | Seção a atualizar |
|---------|------------------|
| Nova dependência adicionada ao package.json | Stack |
| Mudança na estrutura de pastas do projeto | Estrutura de Arquivos do Projeto |
| Mudança no schema do config.yaml ou perfil.md | Modelagem de Dados |
| Novo IPC channel ou mudança de contrato | IPC Channels |
| Mudança no prompt de ingestão/pauta/ciclo | Prompts — Estrutura |
| Fase concluída ou replaneada | Plano de Implementação V1 |
| Novo risco identificado ou mitigado | Riscos Técnicos |
| Scripts npm definidos na Fase 0 | Comandos |

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Pulse Cockpit — Revisao Extensiva**

Pulse Cockpit e um app desktop (Electron + React) para gestores de tecnologia que transforma transcricoes e anotacoes de cerimonias (1:1s, dailies, plannings, retros) num sistema vivo de inteligencia sobre pessoas. O nucleo (V1), qualidade de ingestao (V2) e inteligencia externa Jira/GitHub (V3) estao em producao. Este milestone foca em curadoria e qualidade: refinar prompts, pipeline, metricas e UX a partir de uma revisao extensiva que identificou 101 gaps (66 ja corrigidos, 35 pendentes).

**Core Value:** Garantir que toda informacao coletada pelo pipeline seja de alta qualidade, acionavel e visivel para o gestor.

### Constraints

- **Producao:** App em uso real com dados irreversiveis — nenhuma operacao destrutiva sem confirmacao
- **Tech stack:** Electron + React + TypeScript — nao mudar sem PDR
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
