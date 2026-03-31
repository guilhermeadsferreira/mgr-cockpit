# Phase 2: Pipeline & Schema - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Corrigir 3 problemas de qualidade de dados no pipeline de ingestao: deduplicacao de temas recorrentes via fuzzy matching, cleanup automatico do health history com compressao mensal, e tipagem segura do IPC de dados externos. Nao ha mudancas de UI — sao correcoes cirurgicas em codigo backend existente.

</domain>

<decisions>
## Implementation Decisions

### Deduplicacao de Temas (PIPE-01)
- **D-01:** Estrategia de merge: substring match com normalizacao (case-insensitive + remoção de acentos). Se "comunicação" ja existe e chega "comunicação assertiva", manter o mais especifico.
- **D-02:** Label apos merge: manter sempre o tema mais especifico (mais longo/detalhado). O mais generico e absorvido.
- **D-03:** Ponto de execucao: no ArtifactWriter, antes de persistir no perfil (linha 655 atual com `new Set()`). Substituir `new Set()` por logica de substring match normalizado.
- **D-04:** Normalizacao: comparar temas em lowercase e sem acentos para matching. Preservar o label original (com acentos) no resultado final.

### Health History Cleanup (PIPE-02)
- **D-05:** Estrategia de compressao: resumo mensal. Agrupar entradas do mesmo mes em 1 linha: "Mar/2026: 4x saudavel, 2x atencao (motivo mais citado: sobrecarga)".
- **D-06:** Nivel de detalhe do resumo: contagem por indicador + motivo mais frequente. Preserva tendencia e o sinal principal sem poluir o perfil.
- **D-07:** Trigger do cleanup: na ingestao, apos append ao bloco saude_historico. Se total de entradas ativas > 50, comprimir as mais antigas em resumos mensais.

### Tipagem do IPC Externo (PIPE-03)
- **D-08:** Local das interfaces: em `src/renderer/src/types/ipc.ts` — ja e o ponto de tipos compartilhados main/renderer. Adicionar ExternalDataSnapshot, JiraMetrics, GitHubMetrics.
- **D-09:** Validacao no main process: o handler `external:get-data` deve parsear o YAML e retornar objeto tipado (ou null se invalido). Renderer nunca lida com dados mal-formados.
- **D-10:** Remover parsers regex no renderer: substituir parsing regex ad-hoc por acesso direto aos campos tipados retornados pelo IPC. Eliminar codigo fragil e duplicado.

### Claude's Discretion
- Implementacao interna da funcao de normalizacao (remover acentos) — pode ser inline ou utilitario
- Formato exato do resumo mensal comprimido (texto livre, desde que contenha contagem + motivo)
- Estrutura exata das interfaces TypeScript (campos, nomes, nesting) — baseado no schema do external_data.yaml existente

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Pipeline de Ingestao
- `src/main/ingestion/ArtifactWriter.ts` — Ponto de escrita de temas (linha 647-657) e saude_historico (linha 660-667). Dedup e cleanup acontecem aqui.
- `src/main/ingestion/SchemaValidator.ts` — Validacao de schema dos artefatos (temas_detectados, temas_atualizados)
- `src/main/ingestion/ProfileCompressor.ts` — Pipeline de compressao existente (temas e blocos gerenciados)
- `src/main/ingestion/IngestionPipeline.ts` — Orquestra todo o fluxo de ingestao (Pass 1, Pass 2)

### IPC e Tipos
- `src/renderer/src/types/ipc.ts` — Tipos compartilhados main/renderer (AppSettings, IngestionOperation, etc.)
- `src/preload/index.ts` — API bridge do IPC (linhas 107-116 para external)
- `src/main/index.ts` — Handlers IPC do main process (linhas 699-784 para external:*)

### Dados Externos
- `src/main/external/ExternalDataPass.ts` — Gera snapshots de dados externos (Jira + GitHub)
- `src/main/external/Scheduler.ts` — Agenda coleta automatica de dados externos

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ArtifactWriter.extractBlock()` / `replaceBlock()` / `appendToBlock()` — metodos para manipular blocos gerenciados no perfil markdown
- `SECTION` constants — marcadores de bloco (open/close) para temas, saude_historico, etc.
- `ProfileCompressor` — ja faz compressao de perfil (temas, atencao, conquistas) via IA

### Established Patterns
- Blocos gerenciados por marcadores HTML `<!-- BLOCO ... -->` / `<!-- FIM BLOCO ... -->`
- Atomic write: escreve em .tmp, depois rename
- Append-only para historico; replace para listas deduplicadas (temas)

### Integration Points
- `ArtifactWriter.writeCeremonySinal()` — ponto de merge de temas (cerimonia)
- `ArtifactWriter.writeProfile()` — ponto de merge de temas (ingestao)
- `ipcMain.handle('external:get-data')` — ponto de retorno de dados ao renderer
- Renderer components que consomem `external:get-data` — precisam migrar de regex para tipos

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-pipeline-schema*
*Context gathered: 2026-03-31*
