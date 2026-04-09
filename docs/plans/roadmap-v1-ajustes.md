# Roadmap V1 — Ajustes pós-auditoria

**Baseado em:** `docs/audits/audit-profunda-2026-04-09.md`
**Criado:** 2026-04-09
**Status:** Planejamento

---

## Visão geral

5 fases sequenciais. Cada fase tem um objetivo claro, tasks concretas e critério de aceite.
As fases são ordenadas por: risco → hábito → inteligência → apresentação.

```
Fase 1: Fundação        ─→ "O que já existe funciona sem risco"
Fase 2: Cockpit Diário  ─→ "O gestor abre o app toda segunda por hábito"
Fase 3: Conectar Silos  ─→ "Sustentação + pessoas = visão unificada"
Fase 4: Feedback Loop   ─→ "O gestor ensina a IA"
Fase 5: UI Inteligente  ─→ "A interface faz justiça à inteligência"
```

---

## Fase 1 — Fundação de Qualidade

**Objetivo:** Corrigir bugs, eliminar riscos de dados, adicionar safety net mínima.
**Branch:** `fix/fundacao-qualidade`
**Gaps endereçados:** G5, G6, G7, G8, G10, Riscos #1-#5

### 1.1 Correções imediatas

| # | Task | Arquivo(s) | Critério de aceite |
|---|------|-----------|-------------------|
| 1.1.1 | Fix drag & drop: aceitar .md, .txt, .pdf | `InboxView.tsx:59` | Regex `/\.(md\|txt\|pdf)$/i`. Arquivos .txt e .pdf processados com sucesso via drag & drop |
| 1.1.2 | Mensagem de erro para formatos não suportados | `InboxView.tsx` | Se usuário arrasta .docx ou .xlsx, toast com "Formato não suportado. Use .md, .txt ou .pdf" |
| 1.1.3 | Aviso de truncamento na UI | `InboxView.tsx`, `IngestionPipeline.ts` | Se artefato >50KB, QueueCard mostra warning "Artefato truncado — os primeiros 50KB foram processados" |
| 1.1.4 | Ações coletivas sem dono → DemandaRegistry | `IngestionPipeline.ts` | Se ação de reunião coletiva não tem responsável registrado, criar como demanda do gestor com origem "coletiva" em vez de descartar |

### 1.2 Integridade de dados

| # | Task | Arquivo(s) | Critério de aceite |
|---|------|-----------|-------------------|
| 1.2.1 | Sorting temporal antes de write | `ArtifactWriter.ts` | Se perfil.md tem `ultima_ingestao` mais recente que o artefato sendo processado, logar warning e não sobrescrever resumo_evolutivo (preservar o mais recente) |
| 1.2.2 | Detecção de regressão Pass 1 → Pass 2 | `IngestionPipeline.ts` | Log comparativo: # temas, # ações, confiança entre Pass 1 e Pass 2. Se Pass 2 produz menos ações E menos temas, manter Pass 1 e logar warning |
| 1.2.3 | Validação pré/pós migração de schema | `ProfileMigration.ts` | Antes de migrar: validar frontmatter parseável. Depois de migrar: validar que todas as seções existem. Se validação falha: não aplicar, logar erro, criar .bak |
| 1.2.4 | Backup de pending-queue.json | `IngestionPipeline.ts` | Escrever .bak antes de atualizar. Se JSON.parse falha no restore, tentar .bak |

### 1.3 Testes críticos

| # | Task | Critério de aceite |
|---|------|-------------------|
| 1.3.1 | Testes ArtifactWriter | writeArtifact com perfil existente, writeArtifact primeiro artefato, markResolvedPoints com fuzzy match, append de seções, atomic write |
| 1.3.2 | Testes IngestionPipeline | enqueue + dedup, processItem com pessoa registrada, processItem com pessoa não registrada, syncPending, concurrent per-person lock |
| 1.3.3 | Testes ProfileMigration | Migração v1→v6, migração com frontmatter malformado, migração com seção faltando, rollback em caso de erro |
| 1.3.4 | Testes ActionRegistry | createFromArtifact com dedup, updateStatus com audit trail, getEscalations, delete |

### 1.4 Limpeza de nav

| # | Task | Critério de aceite |
|---|------|-------------------|
| 1.4.1 | Remover RefinamentosView da sidebar | `Sidebar.tsx`, `router.tsx` | View não acessível pela nav. Código mantido (não deletar) |
| 1.4.2 | Mover AuditView para Settings | `SettingsView.tsx` | Botão "Auditoria do sistema" dentro de Settings. Removido da sidebar |

**Critério de aceite da fase:** Zero bugs conhecidos no pipeline core. Testes passando para os 4 módulos críticos. Drag & drop aceita 3 formatos. Nav simplificada.

---

## Fase 2 — Cockpit Diário

**Objetivo:** Transformar o Dashboard em âncora de hábito semanal.
**Branch:** `feat/cockpit-diario`
**Gaps endereçados:** G1, G4 (parcial)
**Dependência:** Fase 1 completa

### 2.1 Modelo de dados

| # | Task | Arquivo(s) | Critério de aceite |
|---|------|-----------|-------------------|
| 2.1.1 | Adicionar campo `dia_1on1` no PersonConfig | `PersonRegistry.ts`, `PersonFormView.tsx`, `ipc.ts` | Campo opcional: "segunda", "terça", ..., "sexta". Editável no formulário da pessoa |
| 2.1.2 | Migração: campo `dia_1on1` default null | `ProfileMigration.ts` | Pessoas existentes recebem `dia_1on1: null`. Sem breaking change |

### 2.2 View "Esta Semana"

| # | Task | Arquivo(s) | Critério de aceite |
|---|------|-----------|-------------------|
| 2.2.1 | Seção "Sua semana" no topo do Dashboard | `DashboardView.tsx` | Acima de todos os painéis. Mostra: dias da semana (seg-sex) com 1:1s previstos por dia, status de preparação (pauta gerada sim/não), saúde do liderado |
| 2.2.2 | Ações vencendo esta semana | `DashboardView.tsx` | Dentro de "Sua semana": lista de ações com prazo esta semana, agrupadas por dia |
| 2.2.3 | Alertas ativos resumidos | `DashboardView.tsx` | Dentro de "Sua semana": contagem de alertas por severidade (X críticos, Y atenção) |
| 2.2.4 | Clique no dia → navega para pessoa | `DashboardView.tsx` | Clicar no nome da pessoa no dia navega para PersonView com modo "Preparar 1:1" ativo |

### 2.3 Dashboard unificado

| # | Task | Arquivo(s) | Critério de aceite |
|---|------|-----------|-------------------|
| 2.3.1 | Unificar BrainAlertPanel + TeamRiskPanel + UrgenciasHoje | `DashboardView.tsx` | Um único componente "Quem precisa de mim" com 3 níveis: (1) Urgente hoje — saúde crítica, 1:1 urgente, ações vencendo hoje (2) Atenção esta semana — ações vencendo, 1:1 atrasado, tendência deteriorando (3) Monitorar — estagnação, dados stale, risco composto |
| 2.3.2 | Executive summary (1 frase) | `DashboardView.tsx` | No topo: "2 pessoas precisam de atenção hoje, 4 esta semana. Time estável no geral." Gerado deterministicamente, sem IA |
| 2.3.3 | Remover redundância visual | `DashboardView.tsx` | Nenhuma pessoa aparece em mais de uma lista de risco. Se está em "Urgente", não duplica em "Atenção" |

### 2.4 Fallback sem `dia_1on1`

| # | Task | Critério de aceite |
|---|------|-------------------|
| 2.4.1 | Se `dia_1on1` não configurado, usar heurística | Calcular próximo 1:1 previsto com base em `ultimo_1on1` + `frequencia_1on1_dias`. Mostrar como "estimado" (ícone diferente) |

**Critério de aceite da fase:** Gestor abre o app na segunda e vê a semana inteira: 1:1s por dia, ações vencendo, alertas. Um único painel de risco sem redundância. Executive summary em 1 frase.

---

## Fase 3 — Conectar Silos

**Objetivo:** Sustentação + Pessoas = visão unificada. Dados que existem em silos passam a convergir.
**Branch:** `feat/conectar-silos`
**Gaps endereçados:** G2, G9 (parcial)
**Dependência:** Fase 1 completa (Fase 2 pode ser paralela se não tocar DashboardView)

### 3.1 Sustentação → RiskDetector

| # | Task | Arquivo(s) | Critério de aceite |
|---|------|-----------|-------------------|
| 3.1.1 | RiskDetector consome dados de sustentação | `RiskDetector.ts` (ou equivalente no Brain) | Novo sinal: "X tickets em breach atribuídos". Se pessoa tem 3+ tickets em breach → +20pts no score. Se tem tickets com risco "critical" → +15pts |
| 3.1.2 | Carregar snapshot de sustentação no load do Dashboard | `DashboardView.tsx`, `index.ts` | `window.api.sustentacao.getAssigneeBreachCounts()` retorna mapa slug → breach count |

### 3.2 Sustentação → PersonView

| # | Task | Arquivo(s) | Critério de aceite |
|---|------|-----------|-------------------|
| 3.2.1 | Card de sustentação no cockpit da pessoa | `PersonView.tsx` | Na sidebar esquerda (abaixo de Saúde): card "Sustentação" mostrando tickets abertos, em breach, último ticket atribuído |
| 3.2.2 | Tickets no modo "Preparar 1:1" | `PersonView.tsx` | No layout de prep, seção "Sustentação" mostrando tickets em breach atribuídos à pessoa com status e dias aberto |

### 3.3 Sustentação → Agenda prompt

| # | Task | Arquivo(s) | Critério de aceite |
|---|------|-----------|-------------------|
| 3.3.1 | Injetar dados de sustentação no prompt de pauta | `agenda.prompt.ts`, handler `ai:generate-agenda` | Se pessoa tem tickets em breach, incluir na seção de contexto do prompt: "Esta pessoa tem X tickets em breach de SLA (keys: ABC-123, ABC-456). Considere perguntar sobre bloqueadores e priorização." |

### 3.4 Relatórios → Sinal no perfil

| # | Task | Arquivo(s) | Critério de aceite |
|---|------|-----------|-------------------|
| 3.4.1 | Daily report gera sinais para perfil vivo | `DailyReportGenerator.ts`, `ArtifactWriter.ts` | Após gerar daily, para cada pessoa com atividade relevante (PR mergeado, ticket fechado, commit significativo), appendar sinal em "Sinais de Terceiros" do perfil.md com data e fonte |

**Critério de aceite da fase:** Sustentação aparece no risk score, no cockpit da pessoa, no modo prep 1:1, e no prompt de pauta. Daily report alimenta perfil vivo.

---

## Fase 4 — Feedback Loop

**Objetivo:** O gestor pode corrigir a IA e o sistema aprende.
**Branch:** `feat/feedback-loop`
**Gaps endereçados:** G3
**Dependência:** Fase 1 completa

### 4.1 Feedback em pautas

| # | Task | Arquivo(s) | Critério de aceite |
|---|------|-----------|-------------------|
| 4.1.1 | Thumbs up/down em pauta gerada | `PersonView.tsx`, `PautaCard` | Após expandir pauta, dois botões: 👍 (útil) / 👎 (não útil). Opcional: campo texto para comentário curto |
| 4.1.2 | Armazenar rating de pauta | Novo: `PautaRatingRegistry.ts` ou campo em pauta metadata | Rating salvo com: pauta_path, rating (up/down), comentario, data |
| 4.1.3 | Injetar ratings no prompt de pauta | `agenda.prompt.ts` | Seção no prompt: "Últimas 5 pautas: 3 aprovadas, 2 rejeitadas. Motivos de rejeição: 'muito genérica', 'faltou contexto de ações'. Ajustar estilo." |

### 4.2 Correção de ações

| # | Task | Arquivo(s) | Critério de aceite |
|---|------|-----------|-------------------|
| 4.2.1 | Botão "Extração errada" em ações | `PersonView.tsx` (AcoesTab) | Ao lado de cada ação aberta: ícone de flag. Ao clicar, marca ação como `status: 'incorrect'` com timestamp |
| 4.2.2 | Ações incorretas no audit trail | `ActionRegistry.ts` | Novo status `incorrect` no statusHistory. Ações marcadas como incorrect não aparecem em pautas futuras |
| 4.2.3 | Contagem de incorretas no prompt | `ingestion.prompt.ts` | Se >10% das ações de uma pessoa foram marcadas como incorretas, incluir nota: "Atenção: histórico de extrações imprecisas. Ser mais conservador com ações ambíguas." |

### 4.3 Edição de saúde pelo gestor

| # | Task | Arquivo(s) | Critério de aceite |
|---|------|-----------|-------------------|
| 4.3.1 | Override de saúde no cockpit | `PersonView.tsx`, `PersonRegistry.ts` | Gestor pode clicar no indicador de saúde e selecionar verde/amarelo/vermelho manualmente. Override persiste até próxima ingestão |
| 4.3.2 | Override visível e reversível | `PersonView.tsx` | Se saúde é override manual, mostra badge "manual" ao lado. Botão para reverter ao valor da IA |

**Critério de aceite da fase:** Gestor pode avaliar pautas, marcar ações incorretas, e overridar saúde. Feedback armazenado e injetado nos prompts. O sistema adapta comportamento com base no feedback acumulado.

---

## Fase 5 — UI Inteligente

**Objetivo:** A interface faz justiça à inteligência que a IA produz.
**Branch:** `feat/ui-inteligente`
**Gaps endereçados:** G4
**Dependência:** Fases 1 e 2 completas

### 5.1 SinceLastMeetingCard expandido

| # | Task | Arquivo(s) | Critério de aceite |
|---|------|-----------|-------------------|
| 5.1.1 | Mostrar O QUE mudou, não apenas contagem | `PersonView.tsx` (SinceLastMeetingCard) | Em vez de "3 novos artefatos", mostrar: nome dos artefatos, tipo, e resumo de 1 linha cada. Em vez de "2 ações fechadas", mostrar: texto da ação fechada. Em vez de "1 ação vencida", mostrar: texto + dias de atraso |
| 5.1.2 | Mudança de saúde com contexto | `PersonView.tsx` | Se saúde mudou desde último 1:1, mostrar: "Saúde: amarelo → vermelho (desde artefato de 03/04)" |

### 5.2 Flag de promovibilidade como headline

| # | Task | Arquivo(s) | Critério de aceite |
|---|------|-----------|-------------------|
| 5.2.1 | Redesenhar header do CycleReport | `CycleReportView.tsx` | Flag de promovibilidade: fontSize 16, posição top-left, com 1 linha de reasoning inline. Ex: "Promovível — liderou migração do auth, reduzindo incidents em 40%, e mentoreou 2 juniors no trimestre" |
| 5.2.2 | Bullets de evidência visíveis sem scroll | `CycleReportView.tsx` | Os 3-5 bullets de evidência de promovibilidade visíveis na primeira tela do relatório (sem precisar scrollar) |

### 5.3 MarkdownPreview com hierarquia

| # | Task | Arquivo(s) | Critério de aceite |
|---|------|-----------|-------------------|
| 5.3.1 | Callout styling para alertas críticos | `MarkdownPreview.tsx` | Linhas que começam com "⚠️", "🔴", "ALERTA", "CRÍTICO" renderizadas com background red-dim, border-left vermelha |
| 5.3.2 | Destaque visual para recomendações | `MarkdownPreview.tsx` | Linhas que começam com "→", "RECOMENDAÇÃO", "SUGESTÃO" renderizadas com background accent-dim, border-left accent |

### 5.4 Cross-referencing

| # | Task | Arquivo(s) | Critério de aceite |
|---|------|-----------|-------------------|
| 5.4.1 | Pauta referencia insights que a geraram | `agenda.prompt.ts`, `PersonView.tsx` | No output da pauta, cada ponto de discussão tem tag `[fonte: perfil]`, `[fonte: ação ABC]`, `[fonte: dados-ext]`. Na UI, tags renderizadas como chips clicáveis |
| 5.4.2 | Dados externos visíveis no card de saúde | `PersonView.tsx` | Se ExternalData disponível, mostrar workload score e sprint risk no card de Saúde (sidebar esquerda), não apenas na tab separada |

### 5.5 Pautas com destaque

| # | Task | Arquivo(s) | Critério de aceite |
|---|------|-----------|-------------------|
| 5.5.1 | Última pauta expandida por default no modo prep | `PersonView.tsx` | No modo "Preparar 1:1", a última pauta é renderizada aberta (não colapsada). Pautas anteriores colapsadas |
| 5.5.2 | Pauta com seções visuais claras | `PersonView.tsx` ou `MarkdownPreview.tsx` | Seções da pauta (Follow-ups, Temas, Perguntas, Alertas, Reconhecimentos) renderizadas com headers visuais distintos e separadores |

**Critério de aceite da fase:** SinceLastMeeting mostra o que mudou (não contagem). Flag de promovibilidade é headline. Alertas críticos têm callout visual. Pautas referenciam fontes. Dados externos integrados ao card de saúde.

---

## Dependências entre fases

```
Fase 1 (Fundação)
  ├──→ Fase 2 (Cockpit Diário)     ← bloqueia
  ├──→ Fase 3 (Conectar Silos)     ← bloqueia (parcial)
  ├──→ Fase 4 (Feedback Loop)      ← bloqueia
  └──→ Fase 5 (UI Inteligente)     ← bloqueia

Fase 2 ──→ Fase 5                  ← bloqueia (5.1-5.5 dependem de Dashboard novo)
Fase 3 ──→ (independente de 2, 4, 5)
Fase 4 ──→ (independente de 2, 3, 5)
```

**Execução possível após Fase 1:**
- Fase 2 e Fase 3 podem rodar em paralelo (branches diferentes)
- Fase 4 pode rodar em paralelo com 2 e 3
- Fase 5 depende de Fase 2 (Dashboard redesenhado)

---

## Métricas de sucesso

| Métrica | Antes | Meta pós-ajustes |
|---------|-------|-------------------|
| Formatos aceitos no drag & drop | .md only | .md, .txt, .pdf |
| Módulos com testes | 0 | 4 (ArtifactWriter, Pipeline, Migration, Actions) |
| Painéis de risco no Dashboard | 3 (sobrepostos) | 1 (unificado) |
| Gestor vê 1:1s da semana | Não | Sim |
| Sustentação integrada ao risk score | Não | Sim |
| Gestor pode corrigir a IA | Não | Sim (pautas, ações, saúde) |
| Tempo para entender estado do time | ~2min (navegar) | ~15s (executive summary) |

---

## Estimativa de esforço total

| Fase | Tasks | Estimativa |
|------|-------|-----------|
| Fase 1 — Fundação | 14 tasks | 1 semana |
| Fase 2 — Cockpit Diário | 9 tasks | 1 semana |
| Fase 3 — Conectar Silos | 7 tasks | 3-4 dias |
| Fase 4 — Feedback Loop | 8 tasks | 4-5 dias |
| Fase 5 — UI Inteligente | 9 tasks | 1 semana |
| **Total** | **47 tasks** | **~4-5 semanas** |

---

*Documento vivo — atualizar conforme tasks forem concluídas.*
