# Auditoria de Fluxo de Valor — Pulse Cockpit

**Data:** 2026-04-13
**Metodo:** Engenharia reversa de valor — rastreamento de cada fluxo desde trigger ate side effects finais
**Escopo:** 9 fluxos, 6 issues reportados, cadeia de acumulacao completa

---

## 1. Mapa de Fluxos

| # | Fluxo | Trigger | Side Effects | Valor Entregue | Valor Ausente | Severidade |
|---|-------|---------|-------------|----------------|---------------|------------|
| 1 | Ingestao (drag & drop) | Drop de .md/.txt/.pdf na InboxView | perfil.md atualizado (resumo, acoes, atencao, conquistas, temas, saude, historico); actions.yaml criado; DetectedRegistry popula nao-cadastrados; Deep pass: insights_1on1, PDI, tendencia_emocional, followup de acoes, demandas do gestor; Cerimonia: sinais por participante; Sinal-terceiro: sinais indiretos em perfil de mencionados | Perfil cresce a cada ingestao. Acoes rastreadas com responsavel. Saude atualizada. Historico acumulado. Deep pass fecha loop de follow-up. | `nivel_engajamento` (1-5) extraido e NUNCA persistido. `pessoas_esperadas_ausentes` extraida e descartada. `frequencia` de pontos de atencao perdida. `acao_implicita` de insights descartada. Temas e `impacto_potencial` de sinal-terceiro nao persistidos. `alertas_ativos` no frontmatter sempre `[]`. Sentimentos de cerimonias nao acumulados. | Alta |
| 2 | Geracao de pauta 1:1 | Clique "Gerar pauta" em PersonView | Pauta salva em `pessoas/{slug}/pautas/`. Feedback do pauta rating alimenta proxima geracao via `pauta_ratings.yaml`. | Pauta especifica com fonte por item (`acao_vencida`, `insight_1on1`, `sinal_terceiro`, `pdi`, `dados_externos`, `delta`). Consome perfil completo, acoes abertas, insights, PDI, dados externos, sustentacao, suggestion memory, ratings anteriores. | Pauta do gestor-upward significativamente mais pobre (sem PDI, insights, sustentacao, suggestion memory, delta, ratings). Insights truncados a 5 linhas no path padrao. Regenerar no mesmo dia sobrescreve sem historico. | Media |
| 3 | Relatorio de ciclo / Calibracao | Individual (PersonView tab ciclo) ou batch (CalibracaoView) | Salvo em `exports/` como markdown. | Evidencias citaveis com data. Promovibilidade com 4 niveis e bullets concretos. Linha do tempo. Cruza conquistas + terceiros + PDI + tendencia. | Salvo em `exports/` flat — nao e per-person, nao e reutilizado por nenhum fluxo. Batch em CalibracaoView perde resultados ao navegar (React state local). Sem source attribution por bullet (nao aponta qual artefato). | Media |
| 4 | Relatorios automaticos (Daily/Weekly/Monthly/Sprint) | Daily: auto no primeiro app launch do dia. Weekly/Monthly: manual via UI. Sprint: auto ao detectar mudanca de sprint (polling 30min). | Daily: salvo em `relatorios/`, alerta em `metricas.md`, **propaga blockers/wip_alto para perfil.md**. Weekly/Monthly/Sprint: salvos em `relatorios/`, metricas em `metricas.md`. | Daily e o mais completo: dados Jira/GitHub frescos, AI analysis (Haiku), pipeline health, sustentacao, side effect em perfis. Consumido pelo widget de sprint no dashboard. | Sprint report usa GitHub 30d rolling (nao sprint-bounded) — bug de alinhamento. Monthly nao inclui sustentacao. Sprint nao pode ser regenerado. Weekly e Monthly nao tem AI analysis. Nenhum report alem do Daily propaga sinais para perfil. | Alta |
| 5 | Dashboard + deteccao de risco | Abertura do app / navegacao | `markOpened()` salva timestamp. | Em 30 segundos: MorningBriefing (delta desde ultimo login), UnifiedRiskPanel (triage por urgencia), escalacoes do gestor, CrossTeamInsights. Score de risco deterministico (0-100) com 12 sinais incluindo sustentacao. | Dashboard e read-only para riscos — sem acao inline (so navegacao). `BrainAlertPanel` definido mas nao renderizado no path atual. | Baixa |
| 6 | Sustentacao | Manual (navegar para SustentacaoView) + AI analysis sob demanda | Cache em `board.json`, historico em `history.json`. AI analysis salva em `AnalysisSnapshotStore`. `MetricsWriter` escreve em `metricas.md` por pessoa. Alimenta risk score (+20 para 3+ breach, +15 para 8+ tickets). Injetado no prompt de pauta como `sustentacaoContext`. | Metricas sem abrir Jira: tickets, SLA 7d/30d, in/out semanal, alertas proativos (4 regras), temas recorrentes. AI enrichment por ticket. Alimenta risco e pauta. | Nao cria/atualiza tickets no Jira (read-only). Monthly report ignora sustentacao. | Baixa |
| 7 | Sintese semanal por liderado | Auto somente sexta-feira (Scheduler). Sem trigger manual. | Bloco gerenciado em perfil.md (`SINTESE_SEMANAL`), replace in-place. | Narrativa sintetica que alimenta proxima geracao de pauta (esta dentro do perfilMd passado ao prompt). | Se app nao abrir na sexta, sintese e perdida — sem catch-up. Sem trigger manual na UI. perfilResumo truncado a 2000 chars. | Media |
| 8 | Modulo "Eu" (gestor como liderado) | Navegacao para EuView (tabs Demandas + Ciclo) | Demandas salvas em `gestor/demandas.yaml`. Entradas de ciclo em `gestor/ciclo/`. Autoavaliacao exportavel como .md. | Pauta gestor-upward com rollup do time. Autoavaliacao com 3 eixos + evidencias. | **Bug:** checkbox "Adicionar ao Meu Ciclo" ao concluir demanda NAO funciona — DemandaRegistry.updateStatus() nao aceita/propaga o flag `addToCiclo`. Demandas concluidas nunca alimentam o ciclo automaticamente. | Alta |
| 9 | Feedback loop (gestor corrige IA) | Rating de pauta, override de saude, edicao de perfil via editor externo | Rating salvo em `pauta_ratings.yaml` — alimenta proxima pauta. | Rating de pauta e o loop mais completo: persiste, e injetado no prompt, e citado como contexto. | **Bug:** Override de saude e cosmetico — nao persiste em perfil.md, nao sobrevive a remontagem do componente, nao alimenta AI. Sem flag "extracao errada" em acoes. Sem edicao inline de perfil.md. Correcoes de acao sao destrutivas (delete/update), sem feedback textual para IA. | Alta |

---

## 2. Cadeia de Acumulacao

```
INGESTAO (drag & drop)
  |
  v
PASS 1 (sem contexto) ──────────────────────────────────────────────┐
  extrai: resumo, acoes, atencao, conquistas, temas,                |
          saude, sentimentos, nivel_engajamento,                     |
          pessoas_esperadas_ausentes, frequencia_atencao             |
  |                                                                  |
  v                                                                  |
PASS 2 (com perfil) ── regressao? ── fallback p/ Pass 1             |
  |                                                                  |
  v                                                                  |
ARTIFACT WRITER                                                      |
  |                                                                  |
  ├─> perfil.md frontmatter: saude, confianca, necessita_1on1,      |
  |   alerta_estagnacao, sinal_evolucao, ultima_ingestao,            |
  |   total_artefatos, ultimo_1on1                                   |
  |     |                                                            |
  |     ├── consumido por: Agenda prompt (perfilMd)           ──> PAUTA
  |     ├── consumido por: Cycle prompt (perfilMd)            ──> RELATORIO CICLO
  |     ├── consumido por: RiskDetector (saude, tendencia)    ──> DASHBOARD
  |     ├── consumido por: WeeklySynthesis (perfilResumo)     ──> SINTESE SEMANAL
  |     └── consumido por: DailyReport (AlertBridge)          ──> perfil.md (blockers)
  |                                                                  |
  ├─> perfil.md body: resumo_evolutivo, atencao, conquistas, temas   |
  |     |                                                            |
  |     ├── consumido por: Agenda prompt (perfilMd raw)              |
  |     ├── consumido por: Cycle prompt (artifacts + perfilMd)       |
  |     └── consumido por: ProfileCompressor (a cada 10 artefatos)   |
  |                                                                  |
  ├─> perfil.md historico: append de link ao artefato                |
  ├─> perfil.md saude_historico: append de saude + motivo            |
  |     └── consumido por: Agenda prompt (deltaSinceLastMeeting)     |
  |                                                                  |
  ├─> actions.yaml: acoes extraidas com responsavel/prazo            |
  |     |                                                            |
  |     ├── consumido por: Agenda prompt (openActions)               |
  |     ├── consumido por: Cycle prompt (followupHistorico)          |
  |     ├── consumido por: RiskDetector (overdue + ciclos_sem_mencao)|
  |     └── consumido por: Dashboard (calcUrgencyScore)              |
  |                                                                  |
  ├─> historico/{date}.md: artefato processado completo              |
  |     └── consumido por: Cycle prompt (artifacts in date range)    |
  |                                                                  |
  └─ [DEEP PASS — somente 1:1]                                      |
       |                                                             |
       ├─> insights_1on1 em perfil.md                                |
       |     ├── consumido por: Agenda prompt (ultimos 5)            |
       |     └── consumido por: Cycle prompt (insights1on1)          |
       |                                                             |
       ├─> tendencia_emocional + nota_tendencia em frontmatter       |
       |     ├── consumido por: RiskDetector (+25 se deteriorando)   |
       |     └── consumido por: Cycle prompt (tendenciaEmocional)    |
       |                                                             |
       ├─> PDI update em config.yaml (status + evidencias)           |
       |     ├── consumido por: Agenda prompt (pdiEstruturado)       |
       |     └── consumido por: Cycle prompt (pdiEvolucao)           |
       |                                                             |
       ├─> followup de acoes (status atualizado, ciclos_sem_mencao)  |
       |     └── consumido por: proxima agenda + risk detector       |
       |                                                             |
       ├─> suggestion_memory.yaml (padroes aceitos/rejeitados)       |
       |     └── consumido por: Agenda prompt (suggestionMemory)     |
       |                                                             |
       ├─> DemandaRegistry (acoes_gestor)                            |
       |     └── consumido por: Modulo Eu (MyDemandsView)            |
       |                                                             |
       └─> sinais_terceiros em perfil.md (sinal-terceiro pass)       |
             ├── consumido por: Agenda prompt (sinaisTerceiros)      |
             └── consumido por: Deep pass input (sinaisTerceiros)    |

DADOS EXTERNOS (Jira + GitHub + Sustentacao)
  |
  ├─> external_data.yaml / metricas.md por pessoa
  |     ├── consumido por: Agenda prompt (externalData)
  |     ├── consumido por: Cycle prompt (externalData)
  |     ├── consumido por: RiskDetector (commit drop, workload, blockers)
  |     ├── consumido por: WeeklySynthesis (metricas)
  |     └── consumido por: Reports (Daily/Weekly/Monthly/Sprint)
  |
  └─> sustentacao board.json
        ├── consumido por: Agenda prompt (sustentacaoContext)
        ├── consumido por: RiskDetector (+20 para breach)
        ├── consumido por: DailyReport (sustentacao section)
        └── consumido por: SustentacaoView (display)

═══════════════════════════════════════════════════════
ELOS QUEBRADOS E AUSENTES
═══════════════════════════════════════════════════════

[QUEBRADO] nivel_engajamento: extraido em Pass 1 e cerimonia → nunca escrito em nenhum arquivo
[QUEBRADO] pessoas_esperadas_ausentes: extraido em Pass 1 → descartado silenciosamente
[QUEBRADO] frequencia de pontos de atencao: extraido (primeira_vez/recorrente) → so texto persiste
[QUEBRADO] acao_implicita de insights: extraido no deep pass → nunca lido pelo ArtifactWriter
[QUEBRADO] temas de sinal-terceiro: extraidos → appendSinalTerceiro() nao escreve
[QUEBRADO] impacto_potencial de sinal-terceiro: extraido → nao persiste, nao gera alerta
[QUEBRADO] sentimentos de cerimonia: extraidos → updatePerfilDeCerimonia() ignora
[QUEBRADO] resumo_evolutivo de cerimonia: extraido → descartado em perfis existentes
[QUEBRADO] alertas_ativos frontmatter: campo existe → sempre [] → nenhum path popula
[QUEBRADO] override de saude: UI existe → nao persiste em perfil.md → perde ao navegar
[QUEBRADO] addToCiclo em demandas: checkbox UI existe → backend ignora o flag

[AUSENTE] Cycle report → nao alimenta nenhum fluxo downstream (terminal)
[AUSENTE] Source attribution em cycle report (qual artefato gerou qual bullet)
[AUSENTE] Catch-up de sintese semanal para sextas perdidas
[AUSENTE] Trigger manual para sintese semanal
[AUSENTE] Feedback "extracao errada" em acoes individuais
[AUSENTE] Monthly report sem sustentacao
[AUSENTE] Sprint report com GitHub alinhado ao sprint (usa 30d rolling)
```

---

## 3. Inteligencia Desperdicada (Top 5)

### 3.1 — `nivel_engajamento` (1-5): extraido e jogado fora

**Arquivo:** `ingestion.prompt.ts` extrai. `ArtifactWriter.ts` nunca escreve.
**Impacto:** O sistema pede ao Claude para avaliar engajamento numa escala de 1-5 em CADA artefato e em CADA cerimonia. A IA gasta tokens analisando engajamento. O dado e descartado antes de chegar ao disco. Nao existe trend de engajamento, nao alimenta risk score, nao aparece em dashboard nem cycle report. E o campo fantasma mais caro do sistema — extraido dezenas de vezes, usado zero vezes.

### 3.2 — `impacto_potencial` + `temas` de sinais de terceiros: silenciosamente descartados

**Arquivo:** `sinal-terceiro.prompt.ts` extrai ambos. `appendSinalTerceiro()` em `ArtifactWriter.ts` so escreve `resumo_sinal`, `sugestao_devolutiva`, `categoria`, `confianca`.
**Impacto:** Quando um par menciona um liderado em reuniao, o sistema extrai temas relevantes e avalia impacto potencial. Ambos sao descartados. O gestor perde enriquecimento tematico vindo de fontes externas e nao recebe priorizacao de quais sinais de terceiros sao mais criticos. Alem disso, `impacto_potencial` critico nao seta `necessita_1on1` — um sinal grave de terceiro nao gera urgencia.

### 3.3 — Sentimentos e engajamento de cerimonias: extraidos e ignorados

**Arquivo:** `cerimonia-sinal.prompt.ts` extrai `sentimentos[]` e `nivel_engajamento`. `updatePerfilDeCerimonia()` em `IngestionPipeline.ts` nunca os escreve.
**Impacto:** Reunioes coletivas (dailies, plannings, retros) sao o contexto mais frequente de observacao de comportamento em grupo. O sistema extrai sentimentos detectados por pessoa, mas so persiste sinais "duros" (pontos de desenvolvimento, conquistas). A dimensao emocional — visivel para todos na reuniao — e a que o sistema descarta.

### 3.4 — `pessoas_esperadas_ausentes`: extraido e descartado sem rastro

**Arquivo:** `ingestion.prompt.ts` extrai. Nenhum handler o lê.
**Impacto:** O Claude identifica quem deveria estar presente mas nao estava. Esse dado e valioso para detectar desengajamento, conflitos de agenda, ou padroes de ausencia. E descartado sem gerar alerta, sem persistir em perfil, sem alimentar risk score. O gestor nunca sabe que a IA notou a ausencia.

### 3.5 — Cycle report como output terminal: inteligencia que morre ao nascer

**Arquivo:** `index.ts:933` salva em `exports/` flat. Nenhum outro handler lê de `exports/`.
**Impacto:** O relatorio de ciclo e o artefato mais rico do sistema — cruza meses de dados, gera evidencias de promovibilidade, detecta padroes de comportamento. Mas e salvo num diretorio flat, nao e indexado por pessoa, nao alimenta proxima pauta, nao alimenta proxima avaliacao, nao e comparavel com ciclo anterior. Cada geracao e uma ilha. O gestor que gera 2 ciclos consecutivos nao consegue ver evolucao entre eles sem abrir os dois arquivos manualmente.

---

## 4. Analise de Issues Reportados

### 4.1 — Relatorio Daily nao e automatico

**Causa raiz:** O Daily E automatico — mas depende de `dailyReportEnabled === true` em settings E do app ser aberto naquela data. O trigger e `Scheduler.onAppStart()` chamado em `index.ts:1799` no evento `ready` do Electron. Se o gestor nao abre o app num dia, o daily nao e gerado. Nao ha cron de OS, nem daemon, nem catch-up.

**Evidencia:** `Scheduler.ts:75-89` — `shouldRunDaily()` compara `lastDailyRun` vs hoje. So dispara se datas diferem. `Scheduler.ts:327` — `markDailyRun()` grava hoje apos execucao.

**Impacto:** Em dias que o gestor nao abre o app (ferias, feriado, dia ocupado), o daily e perdido. O gap de dados afeta weekly e monthly que consultam historico.

**Recomendacao:** Documentar a dependencia de abertura diaria. Considerar catch-up: ao abrir apos N dias sem daily, gerar os dailies retroativos.

### 4.2 — Relatorio Daily nao gera sinais para perfil

**Causa raiz:** O Daily JA gera sinais para perfil — `propagateAlertsToProfile()` em `DailyReportGenerator.ts:1429-1459` injeta blockers e wip_alto como pontos de atencao em `perfil.md`. E o unico report com write-back.

**Evidencia:** `DailyReportGenerator.ts:198-233` — itera por pessoa, checa blockers/wip, chama `propagateAlertsToProfile()` que escreve na secao "Pontos de Atencao" com dedup por `[date] tipo`.

**Impacto:** Este issue NAO e um gap. O daily ja alimenta o perfil. O que falta e que os outros 3 tipos de report (weekly, monthly, sprint) nao fazem o mesmo — trends detectados em weekly/monthly nao propagam para perfil.

### 4.3 — Erro `keys2.join is not a function`

**Causa raiz:** Nao existe `keys2` no codigo fonte. O identificador e um artefato de minificacao do bundler (esbuild via electron-vite). O crash mais provavel esta em `SustentacaoView.tsx:894`:

```tsx
{Object.entries(snapshot.executiveSummary.byBlocker)
  .filter(([, keys]) => keys && keys.length > 0)
  .map(([category, keys]) => (
    ...
    {keys!.join(', ')}
```

`byBlocker` e `Partial<Record<BlockerCategory, string[]>>`. Se a AI retornar um valor nao-array (ex: string ao inves de string[]) para uma categoria, `.join()` falharia com `is not a function`. Nao ha validacao de runtime do shape de `byBlocker` antes do render.

**Impacto:** Crash da SustentacaoView quando AI produz output malformado no ticket analysis.

**Recomendacao:** Adicionar guard: `Array.isArray(keys) ? keys.join(', ') : String(keys)`.

### 4.4 — Padrao de qualidade dos relatorios

| Dimensao | Daily | Weekly | Monthly | Sprint |
|----------|-------|--------|---------|--------|
| Dados Jira (sprint-scoped) | Sim | Sim (live) | Sim (live) | Sim mas snapshot 30d |
| Dados GitHub (period-scoped) | Sim (ontem) | Sim (semana) | Sim (mes) | **NAO** (30d rolling) |
| Sustentacao | Sim | Sim | **NAO** | **NAO** |
| AI analysis | Sim (Haiku) | Nao | Nao | Nao |
| Pipeline health | Sim | Nao | Nao | Nao |
| Baseline comparison | Sim (per-person) | Sim (3 meses) | Sim (3 meses) | Parcial (30d anterior) |
| Side effect em perfil | **SIM** (blockers/wip) | Nao | Nao | Nao |
| Regeneravel | Sim | Sim | Sim | **NAO** |

**Veredito:** O Daily e significativamente superior. O Sprint e o mais fraco: GitHub desalinhado do sprint, sem sustentacao, sem AI, sem pipeline health, nao regeneravel.

### 4.5 — Logs, Refinamento e Auditoria escondidos

**Evidencia:** `Sidebar.tsx:63-71` — o menu lateral contem: Time, Inbox, Sustentacao, Relatorios, Calibracao, Eu, Historico. Logs, Refinamentos e Audit NAO estao no menu.

`router.tsx:4-16` — as ViewNames `refinamentos`, `logs`, `audit` existem no tipo mas nao ha NavItem correspondente no Sidebar. Sao views orfas — acessiveis apenas por navegacao programatica ou URL direta (que nao existe neste app).

**Impacto:** LogsView e inacessivel para o usuario — observabilidade perdida. RefinamentosView inacessivel (mas e scope creep conforme auditoria anterior, entao nao e perda). AuditView inacessivel (deveria estar em Settings).

**Recomendacao:** Adicionar LogsView ao menu (essencial enquanto dev=usuario). Mover AuditView para dentro de SettingsView. Remover RefinamentosView do router.

### 4.6 — Qualidade de sinais para ciclo de avaliacao

**Sinais acumulados hoje:**

| Tipo de sinal | Fonte | Acumulacao | Suficiente para 6 meses? |
|---------------|-------|------------|--------------------------|
| Acoes (comprometidas, follow-up, status) | Ingestao + deep pass | Append-only em actions.yaml com statusHistory | Sim — rastreabilidade completa |
| Saude + motivo | Ingestao + cerimonia | Append em saude_historico | Sim — timeline continua |
| Insights de 1:1 | Deep pass | Append em perfil.md | Sim, se 1:1s regulares |
| Sinais de terceiros | Sinal-terceiro pass | FIFO 20 max em perfil.md | **Parcial** — cap de 20 perde sinais antigos |
| Tendencia emocional | Deep pass (1:1 only) | Frontmatter (ultimo valor) | **Insuficiente** — so ultimo valor, sem historico |
| PDI evolucao | Deep pass | config.yaml (status + evidencias) | Sim |
| Conquistas | Ingestao + cerimonia | Append (comprimido a cada 10) | Parcial — compressao perde granularidade |
| Dados externos (Jira/GitHub) | ExternalDataPass | metricas.md com historico limitado | Parcial — snapshot 30d, sem historico longo |
| Sustentacao | SupportBoardClient | metricas.md + history.json (90d) | Parcial — 90 dias max |
| Sentimentos | Ingestao (so artefato file) | Frontmatter do artefato, NAO do perfil | **Insuficiente** — nao acumula em perfil |
| Engajamento | NUNCA persistido | — | **Ausente** |
| Ausencias | NUNCA persistido | — | **Ausente** |

**O que falta para avaliacao robusta:**
1. **Feedback de pares estruturado** — sinais de terceiros existem mas sao cap 20 e sem score
2. **Goals/OKRs** — nao existe entidade de objetivo de periodo; PDI e o mais proximo mas e desenvolvimento, nao delivery
3. **Metricas quantitativas de delivery** — Jira/GitHub existem mas snapshot 30d nao cobre periodo de avaliacao
4. **Historico de tendencia emocional** — so ultimo valor persiste; impossivel ver evolucao 6 meses
5. **Historico de engajamento** — campo extraido e descartado; zero dados
6. **Comparativo entre ciclos** — cycle report e terminal, nao indexado; impossivel comparar ciclo atual vs anterior

---

## 5. Scorecard de Valor por Fluxo

| # | Fluxo | Valor Prometido | Valor Entregue | Gap | Nota |
|---|-------|-----------------|----------------|-----|------|
| 1 | Ingestao | Cada artefato enriquece o perfil completo | Perfil cresce: resumo, acoes, atencao, conquistas, temas, saude. Deep pass fecha loop. MAS 6+ campos extraidos e descartados (engajamento, ausencias, frequencia). | Dados emocionais e comportamentais nao acumulam. | 3.5/5 |
| 2 | Pauta 1:1 | Substituir preparacao manual com pauta contextualizada | Pauta rica com fonte por item, PDI, delta, sustentacao, suggestion memory, rating loop. A melhor feature do produto. | Gestor-upward empobrecido. Insights truncados a 5 linhas. | 4.5/5 |
| 3 | Cycle report | Evidencias citaveis para calibracao | Promovibilidade com lastro, 4 niveis, bullets concretos. | Output terminal — nao reutilizado. Sem source attribution. Batch perde ao navegar. | 3.5/5 |
| 4 | Reports | Visao operacional automatica | Daily e excelente e propaga para perfil. | Sprint report fraco (GitHub desalinhado, nao regeneravel). Monthly sem sustentacao. Weekly/Monthly sem AI. | 3/5 |
| 5 | Dashboard | Em 30s saber quem precisa de atencao | MorningBriefing + UnifiedRiskPanel + escalacoes. Score deterministico com 12 sinais. | Read-only — sem acao inline. | 4/5 |
| 6 | Sustentacao | Reportar operacao sem abrir Jira | Metricas completas, alertas proativos, AI enrichment, alimenta risco e pauta. | Read-only (sem write-back para Jira). | 4/5 |
| 7 | Sintese semanal | Narrativa semanal que alimenta pauta | Bloco gerenciado em perfil.md, consumido por agenda. | So dispara sexta, sem catch-up, sem trigger manual, trunca perfil a 2000 chars. | 3/5 |
| 8 | Modulo Eu | Gestor se preparar para 1:1 com chefe | Pauta upward funciona. Autoavaliacao com 3 eixos. | Bug: "Adicionar ao Meu Ciclo" nao funciona. Gestor-upward agenda empobrecida. | 3/5 |
| 9 | Feedback loop | Gestor corrige a IA | Rating de pauta e completo e funcional. | Override de saude e cosmetico (nao persiste). Sem flag "extracao errada". Sem edicao inline de perfil. | 2/5 |

**Media ponderada: 3.4/5**

---

## 6. Viabilidade do Ciclo de Avaliacao

### O produto consegue ser fonte primaria para avaliacao de performance de 3-6 meses?

**Parcialmente sim, com gaps significativos.**

**O que funciona bem:**
- Acoes comprometidas sao rastreadas end-to-end com follow-up, status, e ciclos sem mencao. Em 6 meses, o gestor tem registro completo de comprometimentos e entregas.
- Saude tem timeline continua (saude_historico) — e possivel ver deterioracao ou melhora ao longo do tempo.
- Insights de 1:1 acumulam e sao append-only — narrativa rica de evolucao.
- PDI tem evolucao rastreada com evidencias acumuladas em config.yaml.
- O cycle prompt e sofisticado: cruza 4 sinais para promovibilidade, exige evidencias concretas, proibe linguagem vaga.

**O que impede robustez:**

1. **Tendencia emocional nao tem historico.** O frontmatter guarda apenas o ultimo valor (`estavel`/`melhorando`/`deteriorando`). O cycle prompt recebe isso como input, mas nao consegue ver "em janeiro estava deteriorando, em marco estabilizou, em abril melhorou". Sem essa curva, a narrativa de evolucao emocional depende do que o Claude lembra dos artefatos — nao de dados estruturados.

2. **Engajamento e um buraco negro.** Extraido em cada artefato, descartado antes do disco. Em 6 meses: zero dados de engajamento. O cycle report nao pode citar tendencia de engajamento porque o dado nunca existiu no perfil.

3. **Sinais de terceiros tem cap de 20.** Em 6 meses com reunioes semanais, facilmente se geram 50+ sinais de terceiros. O FIFO descarta os mais antigos. O cycle report que cobre o periodo completo so ve os 20 mais recentes — o feedback do Q1 ja sumiu quando o ciclo do H1 e gerado.

4. **Conquistas sao comprimidas.** A cada 10 artefatos, `ProfileCompressor` condensa conquistas em "milestones". Em 6 meses com ingestao frequente, as conquistas especificas do inicio do periodo sao resumos genericos — perdem a granularidade citavel.

5. **Dados externos sao snapshot 30d.** Jira/GitHub metrics no `external_data.yaml` cobrem os ultimos 30 dias. O cycle report que cobre 6 meses so ve o ultimo mes de metricas quantitativas. Nao existe historico longo de velocity, cycle time, ou collaboration score.

6. **Cycle report e output terminal.** Gerar um ciclo nao cria baseline para o proximo. Nao ha comparacao "este ciclo vs anterior". Cada avaliacao parte do zero.

**Veredito:** O produto e uma fonte primaria UTIL mas nao SUFICIENTE. Ele fornece narrativa rica, acoes rastreadas, e evidencias qualitativas. Mas falta: (a) historico longo de metricas quantitativas, (b) historico de tendencia emocional, (c) retencao de sinais de terceiros alem de 20, (d) engajamento como dado acumulado, (e) comparabilidade entre ciclos.

Para um EM que faz 1:1s regulares e ingere artefatos consistentemente, o produto cobre ~70% do material necessario para uma calibracao. Os 30% restantes sao exatamente os dados que o sistema extrai e descarta.

---

## 7. Recomendacoes Priorizadas

| # | Acao | Fluxo | Tipo | Impacto |
|---|------|-------|------|---------|
| 1 | **Persistir `nivel_engajamento` em perfil.md frontmatter + saude_historico.** Ja e extraido — so falta escrever. Criar campo `engajamento_historico` analogo a `saude_historico`. | Ingestao, Ciclo, Dashboard | fix | Desbloqueia trend de engajamento para cycle report e risk detection. Custo: ~20 linhas em ArtifactWriter. |
| 2 | **Persistir `tendencia_emocional` como historico (nao so ultimo valor).** Append em secao dedicada com data, analogo a saude_historico. | Ingestao, Ciclo | fix | Habilita curva emocional no cycle report. Sem isso, promovibilidade perde dimensao humana. |
| 3 | **Corrigir override de saude para persistir em perfil.md.** Escrever no frontmatter + saude_historico com marcacao `(manual)`. | Feedback loop | fix | Torna o feedback loop de saude funcional. Hoje e placebo — gestor acha que corrigiu, IA ignora. |
| 4 | **Corrigir flag `addToCiclo` em DemandaRegistry.** Propagar para CicloRegistry quando demanda e concluida. | Modulo Eu | fix | Fecha o loop demandas → ciclo → autoavaliacao. Sem isso, o ciclo do gestor perde entregas. |
| 5 | **Aumentar cap de sinais de terceiros de 20 para 50.** Ou implementar archival temporal (mover antigos para secao `sinais_terceiros_arquivados`). | Ingestao, Ciclo | fix | Sinais de terceiros do inicio do periodo nao desaparecem antes do cycle report. |
| 6 | **Alinhar Sprint report com datas do sprint (nao 30d rolling).** Fazer `SprintReportGenerator` chamar GitHub API com date range do sprint. | Reports | fix | Sprint report deixa de misturar dados de sprints diferentes. |
| 7 | **Salvar cycle report per-person (nao em exports/ flat).** Gravar em `pessoas/{slug}/ciclos/{date}-ciclo.md`. Injetar ultimo ciclo como input do proximo. | Ciclo | feature | Habilita comparacao entre ciclos e evolucao longitudinal. |
| 8 | **Persistir `pessoas_esperadas_ausentes` como sinal em perfil.md.** Append em atencao com tag `(ausencia)`. | Ingestao | fix | Desbloqueia deteccao de padroes de ausencia — sinal precoce de desengajamento. |
| 9 | **Adicionar trigger manual para sintese semanal.** Botao em PersonView ou handler IPC. Implementar catch-up para sextas perdidas. | Sintese semanal | feature | Gestor que nao abre app na sexta nao perde sintese. |
| 10 | **Enriquecer gestor-upward agenda com mesmos inputs da pauta padrao.** Adicionar PDI, insights, sustentacao, suggestion memory, delta, ratings. | Pauta 1:1 | feature | Pauta com o chefe e tao boa quanto pauta com liderado. Hoje e significativamente mais pobre. |

---

## 8. Veredito Final

**O que o produto entrega de fato:** O Pulse Cockpit resolve o problema central que promete — transforma artefatos brutos em perfis vivos que melhoram pautas de 1:1. A cadeia ingestao → perfil → pauta funciona e e o fluxo mais completo do sistema. A pauta de 1:1 e genuinamente boa: contextualizada, com fonte por item, adaptada a feedback anterior, enriquecida com dados externos e sustentacao. O dashboard entrega triage funcional em 30 segundos. A sustentacao esta bem integrada ao ecossistema (risco, pauta, alertas). O daily report e surpreendentemente sofisticado e e o unico report que fecha o loop escrevendo de volta no perfil. Para um EM que faz 1:1s semanais e ingere artefatos consistentemente, o produto ja e uma ferramenta de gestao funcional e superior a gestao de cabeca.

**O que o produto promete mas nao entrega:** A promessa de "acumulacao ao longo do tempo" tem furos estruturais. O sistema extrai dados sofisticados (engajamento, ausencias, sentimentos em cerimonias, impacto potencial de sinais de terceiros) e os descarta antes de persistir. O override de saude e placebo. A cadeia de feedback do gestor para a IA e unilateral — rating de pauta funciona, mas correcao de extracao, correcao de saude e correcao de acoes nao tem efeito real. O ciclo de avaliacao — que deveria ser o ponto culminante de meses de acumulacao — produz um arquivo solto que nao alimenta o proximo ciclo. A sintese semanal depende de o app estar aberto na sexta. O modulo Eu tem um checkbox quebrado que impede demandas concluidas de alimentar o ciclo do gestor.

**A unica coisa mais importante a fazer agora:** Persistir os dados que o sistema ja extrai e descarta. Sao ~6 campos (`nivel_engajamento`, `pessoas_esperadas_ausentes`, sentimentos de cerimonia, temas de sinal-terceiro, `impacto_potencial`, historico de `tendencia_emocional`) que custam ~100 linhas de codigo para persistir e desbloqueiam a promessa central do produto: que cada interacao faz o sistema mais inteligente. Hoje o sistema paga o custo de IA para extrair esses dados e os joga fora antes de chegar ao disco. Corrigir isso e puro ROI — o investimento ja foi feito na extracao, falta so o ultimo metro de persistencia.
