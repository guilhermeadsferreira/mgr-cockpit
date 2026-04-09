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

## Planejamento

Planejamento vive em `docs/` no próprio repo. NÃO usar GSD (`.planning/` é legado).

- **Auditorias:** `docs/audits/` — auditorias de produto com múltiplas dimensões
- **Planos:** `docs/plans/` — roadmaps executáveis com tasks, critérios de aceite e dependências
- **Decisões:** `docs/decisions/` — PDRs de decisões técnicas relevantes

### Referência técnica

- **PRD_TECH.md** (raiz do repo) — arquitetura, schema, IPC channels, prompts
- **PITCH.md** (raiz do repo) — positioning do produto

### Histórico

- `.planning/PROJECT.md` — contexto de produto, persona, JTBD, backlog de ideias (referência)
- `tasks/done.md` — histórico de tasks técnicas (referência, não ativo)

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
- **Testes:** Cobertura parcial — 4 módulos críticos com testes (ArtifactWriter, IngestionPipeline, ProfileMigration, ActionRegistry)

---

## Aprendizados de Produto (auditoria 2026-04-09)

Referência completa: `docs/audits/audit-profunda-2026-04-09.md`

### O motor de inteligência já sabe. A UI ainda não mostra.

Os prompts são sofisticados (threshold de 2 evidências para tendência emocional, formato forçado de ações, regra de convergência no ciclo, confiança explícita). Mas a UI achata essa inteligência em badges, listas flat e markdown sem hierarquia. Ao evoluir features, priorizar APRESENTAÇÃO do que já existe sobre ADIÇÃO de features novas.

### Dimensões para auditar o produto

Uma auditoria de produto completa precisa cobrir no mínimo:

1. **Jornadas do gestor** — fluxos ponta a ponta (6 jornadas mapeadas)
2. **Qualidade da inteligência** — prompts, extrações, outputs, cascata narrativa
3. **Modelo de dados e acumulação** — como o perfil cresce, quando degrada (>50 artefatos)
4. **Arquitetura de módulos** — como módulos se conectam, silos, dados que não fluem
5. **Pipeline e robustez** — concorrência, edge cases, tempos de processamento
6. **Apresentação da inteligência** — a UI faz justiça ao que a IA produz?
7. **Princípios de produto** — cada princípio está sendo honrado na prática?

### Padrões descobertos

- **Sustentação era silo completo** — dados existiam mas não alimentavam risk score nem perfil. Agora integrado (Fase 3 do roadmap).
- **3 painéis de risco sobrepostos** (BrainAlert + TeamRisk + Urgências) geravam ruído. Unificado em 1 painel com 3 níveis.
- **Sem feedback loop** — o gestor não podia corrigir a IA. Agora tem: rating de pautas com nota, flag "extração errada" em ações, override manual de saúde.
- **Faltava âncora de hábito** — sem "View Esta Semana" o app não se tornava o primeiro lugar que o gestor abre. Agora tem WeekView com 1:1s por dia.
- **Acumulação degrada após ~50 artefatos** — Conquistas, Insights e Sinais crescem indefinidamente. Histórico de Saúde comprime mas perde granularidade. Considerar archival e agregação temporal em futuras evoluções.

### Features que parecem dispensáveis mas NÃO são

- **Relatório daily**: NÃO é report dormant — é insumo para o loop de acumulação. O gestor usa como resumo da operação do dia e colhe sinais para o perfil vivo.
- **LogsView**: Observabilidade essencial enquanto dev=usuário e cobertura de testes é parcial.

### Features que são dispensáveis

- **RefinamentosView**: Armazenamento de docs sem relação com gestão de pessoas. Scope creep.
- **AuditView**: Meta-feature que deveria estar em Settings, não na nav.

### Riscos técnicos a monitorar

- **Inversão temporal**: Dois artefatos simultâneos podem resultar em perfil com estado antigo. Mitigado com `appendOnlyUpdate` no ArtifactWriter.
- **Regressão Pass 1→2**: Pass 2 pode produzir resultado pior. Mitigado com detecção de regressão (compara # ações e temas).
- **Fuzzy dedup de pontos de atenção**: Match bidirecional de ~40 chars pode gerar falsos positivos. Monitorar.
- **Migrações de schema**: Baseadas em regex sem rollback. Mitigado com validação pré/pós (`validateProfileStructure`).

### Como o gestor realmente usa o app

- Abre na segunda para ver o estado do time (Dashboard → WeekView → UnifiedRiskPanel)
- Antes do 1:1: modo "Preparar 1:1" (1 clique) → gera pauta → entra preparado
- Após o 1:1: arrasta transcrição → deep pass fecha o loop
- Antes da calibração: CalibracaoView → batch generation → flag de promovibilidade
- Daily: usa relatório daily como resumo da operação
- Sustentação: SustentacaoView antes de reunião com VP

---

## Convenções técnicas

### Commits
- Branch de feature: `feat/descricao-curta` ou `fix/descricao-curta`
- Conventional Commits em PT-BR: `tipo(escopo): descrição`
- Nunca commitar direto em main

### Código
- TypeScript strict
- Valores monetários em centavos (inteiros)
- Sem console.log em produção
- Imports respeitam camadas (main/ não importa de renderer/ exceto types/ipc.ts)
- Testes com vitest — rodar `npx vitest run` antes de commitar mudanças em módulos críticos

### Arquivos críticos (cuidado redobrado)
- `ArtifactWriter.ts` — escreve no perfil, qualquer regressão corrompe dados
- `IngestionPipeline.ts` — pipeline multi-pass com concorrência
- `ProfileMigration.ts` — migração de schema, deve ser aditiva
- `ActionRegistry.ts` — CRUD de ações com audit trail
- Prompts em `src/main/prompts/` — a qualidade de extração é o valor central do produto
