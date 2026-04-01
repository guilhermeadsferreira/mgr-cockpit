---
phase: 04-action-system-ux-avancado
plan: 04
subsystem: dashboard-ui
tags: [cross-team-insights, escalations, dashboard, ipc, risk-panel]
dependency_graph:
  requires: [04-02]
  provides: [cross-team-insights-panel, escalation-alerts, extended-risk-panel]
  affects: [DashboardView, main-ipc, preload-api]
tech_stack:
  added: []
  patterns: [ipc-handler, react-state, inline-component]
key_files:
  created: []
  modified:
    - src/main/index.ts
    - src/preload/index.ts
    - src/renderer/src/types/global.d.ts
    - src/renderer/src/views/DashboardView.tsx
decisions:
  - "CrossTeamInsightsPanel inline no DashboardView (sem arquivo separado) para manter consistencia com pattern existente"
  - "TeamRiskPanel removido do guard relacao === liderado para ser visivel para pares e gestores"
  - "Escalation alerts renderizados separadamente do TeamRiskPanel para ter controle visual independente"
metrics:
  duration: 15min
  completed_date: "2026-04-01"
  tasks: 2
  files: 4
---

# Phase 04 Plan 04: Cross-Team Insights e Escalation Alerts no Dashboard Summary

Cross-team insights panel e escalation alerts conectados ao Dashboard via dois novos IPC handlers, com TeamRiskPanel estendido para pares e gestores.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Estender TeamRiskPanel + IPC escalations + UI | 4b5a9f3 | src/main/index.ts, src/preload/index.ts, src/renderer/src/types/global.d.ts, src/renderer/src/views/DashboardView.tsx |
| 2 | CrossTeamInsightsPanel + IPC cross-team | 4b5a9f3 | src/main/index.ts, src/preload/index.ts, src/renderer/src/views/DashboardView.tsx |

## What Was Built

### IPC Handlers (src/main/index.ts)

**`actions:escalations`** — Itera todos os liderados, chama `actionRegistry.getEscalations(slug)` (criado no Plan 04-02), e retorna array plano com `{ slug, nome, gestorAction, diasPendente, relatedCount }`. Exibe acoes do gestor vencidas (14+ dias sem resolver) que potencialmente bloqueiam liderados.

**`insights:cross-team`** — Detecta 6 padroes sistemicos no time:
1. `saude_critica_generalizada` — 2+ liderados com saude vermelho (severidade alta)
2. `saude_atencao_generalizada` — 3+ liderados com saude amarelo (severidade media)
3. `estagnacao_multipla` — 2+ com `alerta_estagnacao` no perfil (severidade media)
4. `acoes_vencidas_generalizadas` — 3+ pessoas com acoes vencidas (severidade media)
5. `dados_desatualizados` — 40%+ dos liderados com `dados_stale` (severidade baixa)
6. `tendencia_deteriorando_multipla` — 2+ com `tendencia_emocional === deteriorando` (severidade alta)

### UI (DashboardView.tsx)

- **TeamRiskPanel**: removido guard `relacao === 'liderado'` — agora visivel para pares e gestores tambem
- **Escalation alerts**: painel vermelho abaixo do UrgenciasHoje quando ha acoes do gestor vencidas, com dias pendentes e acoes relacionadas clicaveis
- **CrossTeamInsightsPanel**: componente inline azul-indigo com lista de insights, icone TrendingUp, badge de contagem e dot colorido por severidade. Renderizado apenas na view de liderados quando ha insights.

### Types

- `src/preload/index.ts`: adicionado `actions.escalations` e novo bloco `insights.crossTeam`
- `src/renderer/src/types/global.d.ts`: declarados tipos para `actions.escalations` e `insights.crossTeam`

## Deviations from Plan

None — plan executed exactly as written. O unico ajuste menor foi renomear a variavel `actionsMap` para `actionsMapCT` no handler `insights:cross-team` para evitar conflito de nome com a variavel existente no mesmo escopo do handler `actions:escalations`.

## Known Stubs

None — todos os dados sao calculados em tempo real a partir dos perfis e acoes existentes no workspace.

## Self-Check: PASSED

- `src/main/index.ts` contains `ipcMain.handle('actions:escalations'` — FOUND
- `src/main/index.ts` contains `ipcMain.handle('insights:cross-team'` — FOUND
- `src/preload/index.ts` contains `escalations:` — FOUND
- `src/preload/index.ts` contains `crossTeam:` — FOUND
- `src/renderer/src/views/DashboardView.tsx` contains `function CrossTeamInsightsPanel` — FOUND
- `src/renderer/src/views/DashboardView.tsx` contains `Acoes do gestor pendentes` — FOUND
- TypeScript compilation: PASSED (zero errors)
- Commit 4b5a9f3: FOUND
