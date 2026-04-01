---
phase: 04-action-system-ux-avancado
plan: "02"
subsystem: action-system
tags: [escalation, prioridade, deep-pass, 1on1, ActionRegistry]
dependency_graph:
  requires: ["04-01"]
  provides: ["04-04"]
  affects: ["IngestionPipeline", "ActionRegistry", "1on1-deep.prompt"]
tech_stack:
  added: []
  patterns: ["list+find+saveAll para mutacao em memoria com persistencia atomica"]
key_files:
  created: []
  modified:
    - src/main/registry/ActionRegistry.ts
    - src/main/prompts/1on1-deep.prompt.ts
    - src/main/ingestion/IngestionPipeline.ts
decisions:
  - "saveAll() publico adicionado ao ActionRegistry para evitar acesso a write() privado via IngestionPipeline — mais limpo do que tornar write() publico ou usar save() por loop"
  - "prioridade_atualizada como array vazio por default — backward compat com resultados anteriores ao campo"
metrics:
  duration: ~15min
  completed: "2026-04-01"
  tasks_completed: 1
  files_modified: 3
---

# Phase 04 Plan 02: Escalation de Acoes do Gestor e Prioridade via Deep Pass — Summary

**One-liner:** Metodo getEscalations no ActionRegistry detecta acoes do gestor vencidas 14+ dias; deep pass 1:1 retorna prioridade_atualizada e pipeline aplica via list+find+saveAll.

## What Was Built

### ActionRegistry.ts

Dois novos metodos publicos adicionados:

**`getEscalations(slug, thresholdDays=14)`** — Retorna acoes do gestor com status `open` ou `in_progress` pendentes ha mais de `thresholdDays` dias (default 14). Para cada uma, correlaciona acoes do liderado potencialmente bloqueadas usando dois criterios: mesma `fonteArtefato` ou substring match nas primeiras 4+ letras das palavras da descricao. Retorna array de `{ gestorAction, diasPendente, relatedLideradoActions }`.

**`saveAll(slug, actions)`** — Metodo publico que delega ao `write()` privado. Expoe persistencia atomica de uma lista ja mutada em memoria, sem recarregar do disco. Usado pelo IngestionPipeline para aplicar prioridades atualizadas.

### 1on1-deep.prompt.ts

**Nova interface `OneOnOnePrioridadeAtualizada`:**
```typescript
export interface OneOnOnePrioridadeAtualizada {
  acao_id: string
  nova_prioridade: 'baixa' | 'media' | 'alta'
  motivo: string
}
```

**`OneOnOneResult`** recebe novo campo:
```typescript
prioridade_atualizada: OneOnOnePrioridadeAtualizada[]
```

**Prompt atualizado** com secao `## Prioridade de acoes` e campo `prioridade_atualizada` no JSON schema de saida, instruindo o modelo a detectar mudancas de urgencia baseadas no contexto do 1:1.

### IngestionPipeline.ts

Bloco inserido apos `createFrom1on1Result` (antes do step 4 — PDI updates):

```typescript
// Apply priority updates from deep pass
if (oneOnOneResult.prioridade_atualizada?.length > 0) {
  const currentActions = actionReg.list(slug)
  let prioChanged = false
  for (const prio of oneOnOneResult.prioridade_atualizada) {
    const action = currentActions.find(a => a.id === prio.acao_id)
    if (action && action.prioridade !== prio.nova_prioridade) {
      action.prioridade = prio.nova_prioridade
      prioChanged = true
      this.log.info('prioridade atualizada via deep pass', { ... })
    }
  }
  if (prioChanged) {
    actionReg.saveAll(slug, currentActions)
  }
}
```

## Deviations from Plan

### Auto-added: saveAll() public method

**Found during:** Task 1 (Parte C)
**Issue:** O plano instrui usar `actionRegistry.write(slug, currentActions)` mas `write` e privado no ActionRegistry — chamada causaria erro de compilacao TypeScript.
**Fix:** Adicionado metodo publico `saveAll(slug, actions)` no ActionRegistry que delega ao `write()` privado. Mais limpo do que expor `write()` diretamente ou iterar com `save()` por item (N disk writes vs 1).
**Files modified:** `src/main/registry/ActionRegistry.ts`
**Commit:** cdebc88

## Verification

TypeScript: `npx tsc --noEmit` — zero erros.

Acceptance criteria verificados:
- `ActionRegistry.ts` contem `getEscalations(` — OK
- `ActionRegistry.ts` retorna `{ gestorAction, diasPendente, relatedLideradoActions }` — OK
- `1on1-deep.prompt.ts` contem `export interface OneOnOnePrioridadeAtualizada` — OK
- `1on1-deep.prompt.ts` `OneOnOneResult` contem `prioridade_atualizada:` — OK
- `1on1-deep.prompt.ts` `build1on1DeepPrompt` contem `prioridade_atualizada` — OK
- `IngestionPipeline.ts` contem `prioridade_atualizada` — OK
- `IngestionPipeline.ts` contem `prioridade atualizada via deep pass` — OK
- Usa padrao list+find+saveAll (NAO bare `save()` sem personSlug) — OK
- TypeScript compila sem erros — OK

## Next Steps

- Plan 04-04 adicionara IPC handler `actions:escalations` consumindo `getEscalations`
- TeamRiskPanel no Dashboard exibira os escalations via esse IPC

## Self-Check: PASSED

- `src/main/registry/ActionRegistry.ts` — modified, commit cdebc88
- `src/main/prompts/1on1-deep.prompt.ts` — modified, commit cdebc88
- `src/main/ingestion/IngestionPipeline.ts` — modified, commit cdebc88
