# Active — Pulse Cockpit

> Última atualização: 2026-03-31

## R4 — UX do Gestor (em andamento)

- [x] T-R4.2 — Dados externos em aba dedicada "Dados Ext." + ExternalTab + IPC getHistorico + tabela histórico mensal
- [x] T-R4.3 — SinceLastMeetingCard: artefatos/ações/saúde desde último 1:1 no topo do Perfil
- [x] T-R4.1 — PDI: seção no PersonFormView (add/edit/remove), PDISection no PersonView (progress bar + badges), pdi_aderencia no cycle.prompt, pdi_objetivo_ref em Action
- [ ] T-R4.4 — Narrativa do resumo evolutivo preservada (ArtifactWriter + ingestion/compression prompts)

## R3 — Métricas Externas: Segurança e Qualidade ✅ (2026-03-31)

- [x] T-R3.1 — padraoHorario N/A — nunca implementado no código; risco ético mitigado por omissão
- [x] T-R3.2 — Trend indicators (↑↓→) nos relatórios (WeeklyReportGenerator, MonthlyReportGenerator, SprintReportGenerator)
- [x] T-R3.3 — Thresholds calibráveis por nivel/cargo (CrossAnalyzer + ExternalDataPass)
- [x] T-R3.4 — Insights positivos no CrossAnalyzer (tipo `destaque`, analyzeHighlights, cor verde na UI)
- [x] T-R3.5 — Caveat em contagens brutas (UI já tinha; caveat adicionado em agenda.prompt.ts; cycle.prompt.ts já tinha)

## R2 — Qualidade dos Prompts ✅ (2026-03-31)

- [x] T-R2.1 — PromptConstants com enums compartilhados (CONFIANCA_POR_TIPO_TEXTO, NECESSITA_1ON1_REGRA usados em ingestion + cerimônia)
- [x] T-R2.2 — sentimentos como array {valor, aspecto} (IngestionAIResult, CerimoniaSinalResult, SchemaValidator, ArtifactWriter, ipc.ts)
- [x] T-R2.3 — frequencia em pontos_de_atencao (PontoAtencao{texto,frequencia}, badge [recorrente], normalizer atualizado)
- [x] T-R2.4 — auto_percepcao do liderado no 1:1 deep pass (OneOnOneResult, prompt, persist como insight)
- [x] T-R2.5 — flag_promovibilidade condicionado_a (CycleAIResult, prompt, renderCycleMarkdown)
- [x] T-R2.6 — limite dinâmico de alertas na pauta (max 3 + outros_alertas, reconhecimentos 14d→30d→vazio)
