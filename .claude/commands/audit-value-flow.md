Voce e um analista de produto senior fazendo engenharia reversa do Pulse Cockpit.

Sua missao NAO e avaliar se o codigo funciona. E destrinchar **o que o produto realmente entrega
para o usuario** — rastreando cada fluxo de uso desde o trigger ate os side effects finais, e
avaliando criticamente se o valor prometido se materializa na pratica.

---

## Metodo: Engenharia Reversa de Valor

Para CADA fluxo do produto, voce vai mapear:

```
TRIGGER (o que o usuario faz)
  -> ACAO (o que o sistema executa)
    -> SIDE EFFECTS (o que muda no sistema — perfil, acoes, alertas, scores, arquivos)
      -> VALOR ENTREGUE (o que o usuario ganha com isso)
      -> VALOR NAO ENTREGUE (o que deveria acontecer e nao acontece)
      -> VALOR DESPERDICADO (inteligencia gerada mas nao surfaceada)
```

Este mapeamento e o coracao da auditoria. Nao aceite "funciona". Exija "entrega valor".

---

## Contexto obrigatorio — leia nesta ordem

1. `PITCH.md` — o que o produto promete
2. `PRD_TECH.md` — arquitetura, pipeline, modulos, IPC channels
3. `src/renderer/src/router.tsx` — todas as views
4. `src/renderer/src/components/Sidebar.tsx` — navegacao real
5. `src/main/index.ts` — todos os IPC handlers (o "contrato" entre UI e backend)

---

## PARTE 1: Mapa Completo de Fluxos

Rastreie TODOS os fluxos do produto. Para cada um, documente a cadeia completa.

### Fluxo 1 — Ingestao de artefato (drag & drop)

**Arquivos a ler:**
- `src/renderer/src/views/InboxView.tsx`
- `src/main/ingestion/IngestionPipeline.ts`
- `src/main/ingestion/ArtifactWriter.ts`
- `src/main/prompts/ingestion.prompt.ts`
- `src/main/prompts/1on1-deep.prompt.ts`
- `src/main/prompts/cerimonia-sinal.prompt.ts`

**Mapear:**
- Trigger: drag & drop de arquivo na Inbox
- Cadeia: Pass 1 (sem contexto) -> Pass 2 (com perfil) -> Pass Deep (1:1 ou cerimonia) -> ArtifactWriter
- Side effects: QUAIS campos do perfil.md sao atualizados? Acoes criadas? Saude alterada? Alertas gerados? Score de risco recalculado?
- Valor: o perfil realmente cresce? O proximo 1:1 e melhor por causa desta ingestao?
- Gaps: algum dado e extraido mas NAO persiste? Algum side effect deveria acontecer e nao acontece?

### Fluxo 2 — Geracao de pauta para 1:1

**Arquivos a ler:**
- `src/renderer/src/views/PersonView.tsx` — modo "Preparar 1:1"
- `src/main/prompts/agenda.prompt.ts`
- Handler IPC de geracao de pauta em `src/main/index.ts`

**Mapear:**
- Trigger: clique em "Gerar pauta" ou "Preparar 1:1"
- Inputs: quais dados do perfil, acoes, insights, dados externos realmente alimentam o prompt?
- Side effects: a pauta gerada gera ALGUM side effect alem de ser exibida? (ex: atualiza memoria de sugestoes? registra historico de pautas?)
- Valor: a pauta e especifica o suficiente para substituir preparacao manual?

### Fluxo 3 — Relatorio de ciclo / Calibracao

**Arquivos a ler:**
- `src/renderer/src/views/CalibracaoView.tsx`
- `src/renderer/src/views/CycleReportView.tsx`
- `src/main/prompts/cycle.prompt.ts`

**Mapear:**
- Trigger: geracao individual ou batch
- Inputs: quais artefatos, acoes, PDI, dados externos alimentam o prompt?
- Side effects: o relatorio e salvo? Onde? E reutilizado em algum outro fluxo?
- Valor: evidencias sao citaveis no forum? Promovibilidade tem lastro?

### Fluxo 4 — Relatorios automaticos (Daily, Weekly, Monthly, Sprint)

**Arquivos a ler:**
- `src/main/external/DailyReportGenerator.ts`
- `src/main/external/WeeklyReportGenerator.ts`
- `src/main/external/MonthlyReportGenerator.ts`
- `src/main/external/SprintReportGenerator.ts`
- `src/main/external/Scheduler.ts`
- `src/renderer/src/views/RelatoriosView.tsx`
- Handler IPC relevante em `src/main/index.ts`

**Mapear com atencao especial:**
- Trigger: sao automaticos (scheduler) ou manuais? O Daily e puxado automaticamente ou o gestor precisa clicar?
- Inputs de cada tipo: quais dados alimentam cada relatorio? Todos usam o mesmo pipeline?
- Side effects: relatorios geram sinais para o perfil dos liderados? Ou sao output terminal (gerado, exibido, fim)?
- Padrao de qualidade: os 4 tipos (daily, weekly, monthly, sprint) seguem o mesmo padrao de estrutura, profundidade e valor? Ou algum e significativamente inferior?
- Valor: o gestor consegue usar o relatorio daily como insumo para decisao? Ou e resumo generico?

**INVESTIGACAO ESPECIFICA (pedido do usuario):**
1. O relatorio daily deveria ser gerado automaticamente? Se sim, por que nao esta sendo? Rastrear o Scheduler e verificar se o trigger automatico esta configurado e funcionando.
2. O relatorio daily, ao ser gerado, deveria produzir sinais que alimentam o perfil dos liderados? Mapear se existe (ou deveria existir) um side effect de ingestao de sinais a partir dos relatorios.
3. Comparar a estrutura e qualidade dos 4 tipos de relatorio: sao consistentes? Algum esta incompleto ou e significativamente mais raso?

### Fluxo 5 — Dashboard e deteccao de risco

**Arquivos a ler:**
- `src/renderer/src/views/DashboardView.tsx`
- `src/main/brain/RiskDetector.ts`
- Componentes de MorningBriefing, BrainAlertPanel, TeamRiskPanel

**Mapear:**
- Trigger: abertura do app / navegacao para Dashboard
- Inputs: quais dados alimentam cada painel?
- Side effects: o dashboard e read-only ou gera alguma acao?
- Valor: em 30 segundos o gestor sabe quem precisa de atencao?

### Fluxo 6 — Sustentacao

**Arquivos a ler:**
- `src/renderer/src/views/SustentacaoView.tsx`
- `src/main/external/SupportBoardClient.ts`
- `src/main/external/TicketEnricher.ts`
- `src/main/prompts/sustentacao-analysis.prompt.ts`
- `src/main/prompts/sustentacao-ticket-analysis.prompt.ts`

**Mapear:**
- Toda a cadeia: fetch de dados -> enriquecimento -> analise IA -> exibicao
- Side effects: dados de sustentacao alimentam o perfil da pessoa (assignee)? Ou e silo?
- Valor: o gestor consegue reportar estado da operacao sem abrir Jira?

### Fluxo 7 — Sintese semanal por liderado

**Arquivos a ler:**
- `src/main/external/WeeklySynthesisRunner.ts`
- `src/main/prompts/weekly-synthesis.prompt.ts`

**Mapear:**
- Trigger: automatico ou manual?
- Side effects: o que muda no perfil.md? Sobrescreve secao semanal?
- Valor: a sintese melhora pautas e alertas subsequentes?

### Fluxo 8 — Modulo "Eu" (gestor como liderado)

**Arquivos a ler:**
- `src/renderer/src/views/EuView.tsx`
- `src/renderer/src/views/MyDemandsView.tsx`
- `src/renderer/src/views/MyCycleView.tsx`
- `src/main/prompts/agenda-gestor.prompt.ts`
- `src/main/prompts/autoavaliacao.prompt.ts`

**Mapear:**
- O gestor consegue se preparar para a 1:1 com SEU gestor?
- Demandas delegadas ao EM sao rastreadas end-to-end?
- A autoavaliacao e util no ciclo?

### Fluxo 9 — Feedback loop (gestor corrige a IA)

**Arquivos a ler:**
- Buscar por: rating de pauta, flag de extracao errada, override de saude, edicao de perfil
- Verificar em PersonView, ActionRegistry, e handlers IPC

**Mapear:**
- O gestor pode discordar da IA e corrigir?
- A correcao persiste e melhora outputs futuros? Ou e cosmetics?

---

## PARTE 2: Analise de Valor Critica

Com o mapa de fluxos completo, responda:

### 2.1 — Cadeia de Acumulacao
O valor central do produto e que "cada ingestao enriquece o perfil, que melhora pautas, alertas e relatorios".

Trace a cadeia completa:
```
Ingestao -> [campos atualizados no perfil] -> [quem consome esses campos] -> [output final]
```

Identifique:
- **Elos que funcionam:** dados que fluem de ingestao ate output final
- **Elos quebrados:** dados que sao extraidos mas nao consumidos por nenhum fluxo downstream
- **Elos ausentes:** dados que deveriam ser extraidos/propagados e nao sao

### 2.2 — Side Effects Ausentes
Para cada fluxo, liste side effects que DEVERIAM existir mas NAO existem:
- Relatorio daily deveria gerar sinais para perfil?
- Sustentacao deveria alimentar score de risco?
- Pauta gerada deveria registrar que tipo de conversa o gestor planeja ter?
- Calibracao deveria gerar acoes de desenvolvimento?

### 2.3 — Inteligencia Desperdicada
O motor de IA gera dados sofisticados. Quais desses dados sao gerados mas:
- Nunca exibidos na UI?
- Exibidos de forma que diminui seu valor (badge flat vs narrativa rica)?
- Gerados mas nao persistidos?
- Persistidos mas nunca consumidos por outro modulo?

### 2.4 — Jornada de Acumulacao para Ciclo de Avaliacao
Avalie criticamente: com o pipeline atual de sinais (ingestao + dados externos + relatorios + sustentacao), o produto consegue chegar em um ciclo de avaliacao (3-6 meses) com material suficiente para:
- Gerar relatorio de ciclo com evidencias concretas e citaveis?
- Identificar promovibilidade com lastro?
- Detectar tendencias de melhora ou degradacao por liderado?
- Distinguir liderados high-performer de liderados estagnados?

O que falta para essa jornada ser robusta?

---

## PARTE 3: Bugs e Issues Reportados

Investigue cada item abaixo com evidencia no codigo:

### 3.1 — Relatorio Daily nao e automatico
- O Scheduler esta configurado para gerar daily automaticamente?
- Se sim, por que o usuario precisou puxar na mao? (verificar logs, triggers, condicoes)
- Se nao, isso e um gap de design ou implementacao?

### 3.2 — Relatorio Daily nao gera sinais para perfil
- Apos gerar um daily report, ALGUM side effect atualiza perfil.md de liderados?
- Isso esta correto pelo design atual? Ou e um gap?
- Se e gap: qual seria o side effect esperado?

### 3.3 — Erro de renderizacao: `keys2.join is not a function`
- Buscar por `keys2` ou `.join` em contextos suspeitos no renderer
- Identificar o componente que gera o erro
- Rastrear qual dado malformado causa o crash
- Propor a causa raiz (nao o fix — so a causa)

### 3.4 — Padrao de qualidade dos relatorios
- Comparar DailyReportGenerator, WeeklyReportGenerator, MonthlyReportGenerator, SprintReportGenerator
- Mesma estrutura? Mesma profundidade de analise? Mesmos inputs?
- Algum e significativamente mais raso ou incompleto?

### 3.5 — Logs, Refinamento e Auditoria escondidos
- Verificar no Sidebar.tsx onde esses modulos estao posicionados
- Confirmar que estao em submenu ou area escondida
- Mapear qual seria o impacto de voltar para o menu lateral principal

### 3.6 — Qualidade de sinais para ciclo de avaliacao
- Quais tipos de sinal o sistema acumula hoje? (acoes, insights, saude, tendencia, conquistas, PDI, dados externos)
- Em 6 meses de uso, esses sinais sao suficientes para uma avaliacao de performance robusta?
- O que esta faltando? (ex: feedback de pares, goals/OKRs, metricas quantitativas de delivery)

---

## PARTE 4: Output Obrigatorio

Produza EXATAMENTE estas secoes, nesta ordem:

### 1. Mapa de Fluxos (tabela)
| Fluxo | Trigger | Side Effects | Valor Entregue | Valor Ausente | Severidade |
Para cada um dos 9 fluxos.

### 2. Cadeia de Acumulacao (diagrama textual)
Diagrama mostrando: dado extraido -> onde persiste -> quem consome -> output final.
Marcar elos quebrados com [QUEBRADO] e ausentes com [AUSENTE].

### 3. Inteligencia Desperdicada (top 5)
Os 5 casos mais graves de inteligencia gerada pela IA que nao chega ao usuario.

### 4. Analise de Issues Reportados
Para cada issue (3.1 a 3.6): causa raiz, impacto, e recomendacao.

### 5. Scorecard de Valor por Fluxo
| Fluxo | Valor Prometido | Valor Entregue | Gap | Nota (1-5) |
Para cada fluxo. Nota 5 = entrega tudo que promete. Nota 1 = nao entrega valor.

### 6. Viabilidade do Ciclo de Avaliacao
Avaliacao detalhada: o produto, no estado atual, consegue ser a fonte primaria de dados
para um ciclo de avaliacao de performance de 3-6 meses? O que falta?

### 7. Recomendacoes Priorizadas
Top 10 acoes ordenadas por impacto no valor entregue ao gestor.
Formato: `# | Acao | Fluxo impactado | Tipo (fix/feature/removal) | Impacto`

### 8. Veredito Final
3 paragrafos:
- O que o produto entrega de fato (sem eufemismo)
- O que o produto promete mas nao entrega
- A unica coisa mais importante a fazer agora

---

## Regras absolutas

- **Evidencia ou nao existe.** Toda afirmacao deve citar arquivo e comportamento observado no codigo. "Provavelmente funciona" nao e aceito.
- **Side effect ou nao acontece.** Se um fluxo nao produz side effect rastreavel no codigo, ele nao existe — independente do que o PRD diz.
- **Valor percebido, nao valor tecnico.** "O sistema calcula X" nao e valor. "O gestor ve X e toma decisao Y" e valor.
- **Sem diplomacia.** Se algo nao funciona, diga. Se algo e inutil, diga. O usuario quer verdade, nao conforto.
- **Rastreie a cadeia ate o fim.** Nao pare em "o prompt gera output". Siga: output -> persistencia -> consumo downstream -> exibicao final -> decisao do gestor.
- **Compare promessa vs realidade.** PITCH.md promete. O codigo entrega. A diferenca e o gap. Mapear cada gap explicitamente.
