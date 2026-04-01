---
phase: 03-github-metrics-crossanalyzer
plan: 02
subsystem: external-data
tags: [cross-analyzer, insights, causa-raiz, absence-detection]

requires:
  - phase: 03-github-metrics-crossanalyzer
    provides: "CrossAnalyzer base com insights cruzados Jira/GitHub"
provides:
  - "CrossInsight com campo causa_raiz para todos os tipos de insight"
  - "ProfileContext interface para deteccao de ausencia (ferias/licenca)"
  - "Supressao de alertas de desalinhamento/gap_comunicacao quando pessoa ausente"
affects: [enriched-prompts, person-view, team-risk-panel]

tech-stack:
  added: []
  patterns: [profile-context-extraction, absence-aware-analysis]

key-files:
  created: []
  modified:
    - src/main/external/CrossAnalyzer.ts
    - src/main/external/ExternalDataPass.ts

key-decisions:
  - "ProfileContext extraido de notas_manuais do PersonConfig e ultimas 5 linhas de ## Notas do perfil.md"
  - "analyzeActivityDrop rebaixa severidade para baixa quando pessoa ausente em vez de suprimir completamente"
  - "ausente/afastado tratado como ferias (emFerias=true) por padrao"

patterns-established:
  - "ProfileContext: padrao para passar contexto de ausencia do perfil para analise cruzada"
  - "Supressao condicional via skipActivityAnalysis flag"

requirements-completed: [MTRC-04, MTRC-05]

duration: 2min
completed: 2026-03-31
---

# Phase 03 Plan 02: CrossAnalyzer Causa Raiz e Contexto de Ausencia Summary

**CrossInsight enriquecido com causa_raiz (awaiting_review, stale, blocked, overloaded, vacation, leave) e supressao de falsos positivos por contexto de ferias/licenca**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-01T01:24:28Z
- **Completed:** 2026-04-01T01:26:55Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- CrossInsight interface agora inclui campo `causa_raiz` com 7 valores possiveis
- ProfileContext interface permite deteccao de ausencia (ferias, licenca, afastamento)
- Insights de desalinhamento e gap_comunicacao suprimidos quando pessoa esta ausente
- analyzeActivityDrop rebaixa severidade e ajusta mensagem quando pessoa em ferias/licenca
- extractProfileContext le notas_manuais e secao ## Notas do perfil.md

## Task Commits

Each task was committed atomically:

1. **Task 1: Adicionar causa_raiz ao CrossInsight e logica de contexto de ausencia** - `c899111` (feat)

## Files Created/Modified
- `src/main/external/CrossAnalyzer.ts` - CrossInsight com causa_raiz, ProfileContext, analyze() com 4o param, skipActivityAnalysis
- `src/main/external/ExternalDataPass.ts` - extractProfileContext(), profileContext passado para analyze()

## Decisions Made
- ProfileContext extraido de notas_manuais (PersonConfig) e ultimas 5 linhas de ## Notas do perfil.md para detectar padroes de ausencia
- analyzeActivityDrop nao e totalmente suprimido quando pessoa ausente — apenas rebaixa severidade para "baixa" e ajusta acao sugerida, mantendo o registro para planejamento de retorno
- "ausente" e "afastado" tratados como emFerias=true por padrao (campo generico)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CrossInsight com causa_raiz pronto para consumo na UI (PersonView, TeamRiskPanel)
- ProfileContext pode ser expandido com campos adicionais (data_retorno, tipo_licenca) em fases futuras

---
*Phase: 03-github-metrics-crossanalyzer*
*Completed: 2026-03-31*
