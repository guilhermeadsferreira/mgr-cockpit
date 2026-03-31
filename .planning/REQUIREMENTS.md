# Requirements: Pulse Cockpit — Revisao Extensiva

**Defined:** 2026-03-31
**Core Value:** Garantir que toda informacao coletada pelo pipeline seja de alta qualidade, acionavel e visivel para o gestor.

## v1 Requirements

Requirements para este milestone. Cada um mapeia para phases do roadmap.

### Prompt Refinements — Ingestion

- [ ] **PRMT-01**: Pipeline detecta `pessoas_esperadas_ausentes` em cerimonias (planning/retro/daily)
- [ ] **PRMT-02**: Pipeline detecta early stagnation nos primeiros 3 meses (janela minima explicita)

### Prompt Refinements — 1on1 Deep

- [ ] **PRMT-03**: Tendencia emocional "deteriorando" requer evidencia de 2+ entradas de 1:1 no historico

### Prompt Refinements — Cerimonia

- [ ] **PRMT-04**: Participacao minima diferenciada por tipo de cerimonia (daily/planning/retro/review)
- [ ] **PRMT-05**: Saude calibrada por cargo/nivel (Staff silencioso != Junior silencioso)

### Prompt Refinements — Compression

- [ ] **PRMT-06**: Definicao unica e harmonizada de "ponto resolvido" (strikethrough + contradicao por evidencia)
- [ ] **PRMT-07**: Conquistas preservam formato "titulo — outcome" na compressao

### Prompt Refinements — Cycle

- [ ] **PRMT-08**: `linha_do_tempo` flexivel (5-10 eventos, IA decide densidade por significancia)
- [ ] **PRMT-09**: Expectativas benchmarked por cargo/nivel
- [ ] **PRMT-10**: Evidencias de promovibilidade nunca triviais — gaps com comportamento observado

### Prompt Refinements — Autoavaliacao

- [ ] **PRMT-11**: Valores calibrados por tipo de role (manager vs IC)
- [ ] **PRMT-12**: Desafios reconhecidos como campo obrigatorio quando ha evidencia

### Prompt Refinements — Gemini

- [ ] **PRMT-13**: Mode detection por conteudo (num_speakers), nao por filename
- [ ] **PRMT-14**: Emotional content (frustacao, excitacao) capturado em full mode
- [ ] **PRMT-15**: Speaker identification confidence (alta/media/baixa) como metadata

### Prompt Refinements — Gestor Ciclo

- [ ] **PRMT-16**: Decisao exige trade-off explicito ou rejeicao de alternativa
- [ ] **PRMT-17**: Aprendizado obrigatorio (minimo 1 por ciclo)

### Pipeline & Schema

- [ ] **PIPE-01**: Temas deduplicados via fuzzy matching (substring/keyword merge) antes de persistir
- [ ] **PIPE-02**: Health history com cleanup automatico (manter ultimas 50 entradas, comprimir anteriores)
- [ ] **PIPE-03**: External data IPC retorna JSON tipado em vez de parsing regex no frontend

### GitHub Metrics & CrossAnalyzer

- [ ] **MTRC-01**: Code review depth: avgCommentsPerReview, turnaround de primeira review, approval rate
- [ ] **MTRC-02**: Collaboration score (0-100): co-authored commits, PRs cross-repo, mentions em issues
- [ ] **MTRC-03**: Test coverage trend: % de PRs com mudancas de teste, trend historico
- [ ] **MTRC-04**: CrossAnalyzer inclui campo `causa_raiz` nos insights (awaiting review vs changes vs stale)
- [ ] **MTRC-05**: Desalinhamento checado contra contexto do perfil (ferias, licenca) antes de flaggar
- [ ] **MTRC-06**: Relatorios incluem narrative context paragraph injetado do perfil
- [ ] **MTRC-07**: Relatorios incluem baseline comparison pessoal (media dos ultimos 3 meses)

### Action System Avancado

- [ ] **ACTN-01**: Sync bidirecional acoes <> Jira: issue fechada no Jira auto-fecha acao no app
- [ ] **ACTN-02**: Escalation: acao vencida do gestor gera follow-up automatico para liderado
- [ ] **ACTN-03**: Action audit trail: array `statusHistory[]` com status, date, source
- [ ] **ACTN-04**: Prioridade de acoes atualizada automaticamente pelo deep pass
- [ ] **ACTN-05**: Evidence aggregation: multiplos artefatos acumulam evidencias para mesmo objetivo PDI

### UX Avancado

- [ ] **UX-01**: Insights cross-team: padroes detectados em multiplos perfis exibidos no Dashboard
- [ ] **UX-02**: Risk panel estendido para pares e gestores (nao apenas liderados)
- [ ] **UX-03**: Agenda generation agendada: pauta gerada automaticamente N dias antes do proximo 1:1

## v2 Requirements

Nao ha v2 neste milestone — todas as tasks identificadas estao no escopo v1.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Features novas fora da revisao | Foco e curadoria e qualidade, nao expansao |
| Entidade Projeto | Requer novo modelo de dados — milestone futuro |
| Integracao MCP Slack | Requer novo adapter de ingestao |
| Testes automatizados | Abordagem defensiva via uso real |
| API Anthropic / SDK | Decisao arquitetural: sempre Claude Code CLI |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PRMT-01 | TBD | Pending |
| PRMT-02 | TBD | Pending |
| PRMT-03 | TBD | Pending |
| PRMT-04 | TBD | Pending |
| PRMT-05 | TBD | Pending |
| PRMT-06 | TBD | Pending |
| PRMT-07 | TBD | Pending |
| PRMT-08 | TBD | Pending |
| PRMT-09 | TBD | Pending |
| PRMT-10 | TBD | Pending |
| PRMT-11 | TBD | Pending |
| PRMT-12 | TBD | Pending |
| PRMT-13 | TBD | Pending |
| PRMT-14 | TBD | Pending |
| PRMT-15 | TBD | Pending |
| PRMT-16 | TBD | Pending |
| PRMT-17 | TBD | Pending |
| PIPE-01 | TBD | Pending |
| PIPE-02 | TBD | Pending |
| PIPE-03 | TBD | Pending |
| MTRC-01 | TBD | Pending |
| MTRC-02 | TBD | Pending |
| MTRC-03 | TBD | Pending |
| MTRC-04 | TBD | Pending |
| MTRC-05 | TBD | Pending |
| MTRC-06 | TBD | Pending |
| MTRC-07 | TBD | Pending |
| ACTN-01 | TBD | Pending |
| ACTN-02 | TBD | Pending |
| ACTN-03 | TBD | Pending |
| ACTN-04 | TBD | Pending |
| ACTN-05 | TBD | Pending |
| UX-01 | TBD | Pending |
| UX-02 | TBD | Pending |
| UX-03 | TBD | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 0
- Unmapped: 35

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after initial definition*
