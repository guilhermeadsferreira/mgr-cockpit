# Phase 2: Pipeline & Schema - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 02-pipeline-schema
**Areas discussed:** Dedup de temas, Health history cleanup, Tipagem do IPC externo

---

## Dedup de Temas

| Option | Description | Selected |
|--------|-------------|----------|
| Substring match | Se 'comunicacao' ja existe e chega 'comunicacao assertiva', mantem o mais especifico. Simples, deterministico. | ✓ |
| Keyword match + normalizacao | Normaliza (lowercase, remove acentos), depois checa overlap de palavras-chave. | |
| Voce decide | Claude escolhe a estrategia. | |

**User's choice:** Substring match
**Notes:** Escolhido pela simplicidade e determinismo.

| Option | Description | Selected |
|--------|-------------|----------|
| Manter o mais especifico | 'comunicacao assertiva' absorve 'comunicacao'. | ✓ |
| Manter o mais generico | 'comunicacao' absorve 'comunicacao assertiva'. | |
| Voce decide | Claude decide. | |

**User's choice:** Manter o mais especifico

| Option | Description | Selected |
|--------|-------------|----------|
| No ArtifactWriter antes de persistir | Direto no ponto onde temas sao escritos (linha 655). | ✓ |
| No prompt (IA faz o merge) | Instruir a IA a retornar temas deduplicados. | |
| Ambos (defesa em profundidade) | Prompt instrui e codigo valida. | |

**User's choice:** No ArtifactWriter antes de persistir

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, normalizar | Comparar ignorando case e acentos. | ✓ |
| So case-insensitive | Ignorar maiusculas, manter acentos. | |
| Voce decide | Claude escolhe. | |

**User's choice:** Sim, normalizar (case-insensitive + sem acentos)

---

## Health History Cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Resumo mensal | Agrupar entradas do mesmo mes em 1 linha resumo com contagem e motivo. | ✓ |
| Manter so ultimas 50 | Descarta entradas mais antigas. Simples mas perde historico. | |
| Voce decide | Claude escolhe. | |

**User's choice:** Resumo mensal

| Option | Description | Selected |
|--------|-------------|----------|
| Na ingestao, apos append | Apos cada append, checar se ultrapassou 50. Comprimir in-place. | ✓ |
| Na compressao de perfil | Rodar junto com ProfileCompressor. | |
| Voce decide | Claude escolhe. | |

**User's choice:** Na ingestao, apos append

| Option | Description | Selected |
|--------|-------------|----------|
| Contagem + motivo mais frequente | 'Mar/2026: 4x saudavel, 2x atencao (sobrecarga)'. Preserva tendencia e sinal principal. | ✓ |
| So contagem por indicador | 'Mar/2026: 4x saudavel, 2x atencao'. Mais enxuto. | |
| Voce decide | Claude define granularidade. | |

**User's choice:** Contagem + motivo mais frequente

---

## Tipagem do IPC Externo

| Option | Description | Selected |
|--------|-------------|----------|
| No ipc.ts compartilhado | Adicionar em src/renderer/src/types/ipc.ts. Ja e o ponto de tipos compartilhados. | ✓ |
| Arquivo dedicado external.types.ts | Criar src/shared/external.types.ts. | |
| Voce decide | Claude escolhe. | |

**User's choice:** No ipc.ts compartilhado

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, validar e tipar no main | Handler parseia YAML e retorna objeto tipado ou null. | ✓ |
| So tipar, sem validacao runtime | Interfaces TypeScript mas confiar no YAML. | |
| Voce decide | Claude decide. | |

**User's choice:** Sim, validar e tipar no main

| Option | Description | Selected |
|--------|-------------|----------|
| Remover e usar dados tipados | Substituir parsing regex por acesso a campos tipados. | ✓ |
| Manter como fallback | Tipagem + regex como fallback. | |
| Voce decide | Claude avalia. | |

**User's choice:** Remover e usar dados tipados

---

## Claude's Discretion

- Implementacao da funcao de normalizacao (remover acentos)
- Formato exato do resumo mensal comprimido
- Estrutura das interfaces TypeScript

## Deferred Ideas

None — discussion stayed within phase scope
