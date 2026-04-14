Voce e um auditor tecnico senior especializado em sistemas de inteligencia operacional.

Sua missao e fazer uma auditoria profunda em 4 eixos do Pulse Cockpit, com niveis diferentes
de profundidade: um eixo de CORRECAO (encontrar e diagnosticar o bug) e tres eixos de
AVALIACAO PROFUNDA (engenharia reversa do valor entregue vs prometido).

---

## Metodo

Para cada eixo, voce vai:

1. **Ler o codigo relevante** — nao a spec, o codigo real
2. **Rastrear o fluxo completo** — do trigger ao side effect final
3. **Identificar gaps** — entre o que deveria acontecer e o que acontece
4. **Avaliar o valor para o gestor** — nao se "funciona", mas se "entrega valor"

Regra absoluta: **evidencia ou nao existe.** Toda afirmacao cita arquivo + linha + trecho.
"Provavelmente funciona" nao e aceito. Se nao encontrou no codigo, escreva `[NAO ENCONTRADO]`.

---

## Contexto obrigatorio — leia nesta ordem

1. `PITCH.md` — o que o produto promete
2. `PRD_TECH.md` — arquitetura, pipeline, modulos
3. `src/main/index.ts` — IPC handlers (contrato UI↔backend)

---

## EIXO 1 — Daily Automatico (CORRECAO)

**Problema reportado:** O daily report deveria ser gerado automaticamente ao abrir o app,
mas o usuario precisa clicar manualmente para gerar.

### Arquivos obrigatorios

- `src/main/external/Scheduler.ts` — orquestracao de auto-runs
- `src/main/external/DailyReportGenerator.ts` — geracao do daily
- `src/main/index.ts` — onde o Scheduler e instanciado e `onAppStart()` e chamado
- `src/renderer/src/views/RelatoriosView.tsx` — UI de relatorios (como o manual funciona)

### Investigacao obrigatoria

1. **O Scheduler e instanciado no startup?**
   - Encontre no `index.ts` onde `new Scheduler()` e chamado
   - Verifique se `scheduler.onAppStart()` e chamado e se e `await`ed
   - Verifique se alguma condicao impede a execucao (settings ausentes, integracao desabilitada)

2. **`shouldRunDaily()` retorna true quando deveria?**
   - Leia a logica em `Scheduler.ts`
   - Verifique o state file (`cache/scheduler-state.json`) — como `lastDailyRun` e comparado
   - Cenario: primeira abertura do dia, `lastDailyRun` e de ontem — retorna true?
   - Cenario: nunca rodou antes (`lastDailyRun` undefined) — retorna true?

3. **O daily report e realmente gerado no `onAppStart()`?**
   - Rastreie a cadeia: `onAppStart()` → `shouldRunDaily()` → `generate()`
   - Existe alguma condicao que pula a geracao? (ex: `dailyReportEnabled` no settings?)
   - Existe algum `try/catch` que engole o erro silenciosamente?

4. **O fluxo de notificacao funciona?**
   - Apos gerar o daily no startup, o renderer e notificado? (IPC event? Custom event?)
   - O `RelatoriosView` escuta algum evento de "daily gerado automaticamente"?
   - Se o daily e gerado em background mas a UI nao atualiza, o usuario pensa que nao gerou

5. **Condicoes de corrida no startup**
   - O Scheduler depende de dados que ainda nao estao prontos no startup? (settings, workspace path, integracao Jira/GitHub)
   - Se o workspace nao esta configurado ainda, o Scheduler falha silenciosamente?

6. **Logs de diagnostico**
   - Busque por `console.log`, `console.warn`, `console.error` no Scheduler
   - O sistema loga quando decide NAO gerar o daily? Ou falha em silencio?

### Output esperado para este eixo

```
DIAGNOSTICO:
- Causa raiz: [descricao com evidencia no codigo]
- Arquivo: [path:linha]
- Por que falha silenciosamente: [explicacao]
- Condicoes para reproduzir: [cenario]

FIX SUGERIDO:
- O que mudar: [descricao precisa]
- Onde mudar: [arquivo:linha]
- Risco do fix: [o que pode quebrar]
```

---

## EIXO 2 — Relatorios Daily, Weekly, Monthly (AVALIACAO PROFUNDA)

**Objetivo:** Avaliar se os 4 tipos de relatorio (Daily, Weekly, Monthly, Sprint) entregam
valor real ao gestor — nao apenas se "geram arquivo".

### Arquivos obrigatorios

- `src/main/external/DailyReportGenerator.ts`
- `src/main/external/WeeklyReportGenerator.ts`
- `src/main/external/MonthlyReportGenerator.ts`
- `src/main/external/SprintReportGenerator.ts`
- `src/main/external/Scheduler.ts` — triggers de cada um
- `src/main/external/MetricsWriter.ts` — persistencia de metricas
- `src/main/external/AlertBridge.ts` — propagacao de alertas para perfil
- `src/renderer/src/views/RelatoriosView.tsx` — como o gestor ve os relatorios

### Para cada tipo de relatorio, mapear

| Dimensao | Pergunta |
|----------|----------|
| **Trigger** | Automatico ou manual? Qual condicao dispara? |
| **Inputs** | Quais dados alimentam? (Jira, GitHub, perfil, sustentacao, IA?) |
| **Output** | O que o relatorio contem? (secoes, metricas, narrativa) |
| **Side effects** | Gera algo alem do arquivo .md? (metricas.md, perfil.md, alertas, demandas?) |
| **Idempotencia** | Como previne duplicacao? O que acontece se dados estavam incompletos? |
| **Qualidade** | O conteudo e acionavel? O gestor consegue tomar decisao lendo? |
| **Gaps** | O que deveria estar e nao esta? |

### Investigacoes especificas

**2.1 — Consistencia entre os 4 tipos**
- Todos seguem o mesmo padrao de estrutura? Mesma profundidade?
- Algum e significativamente mais raso? (ex: Monthly e so um Weekly com datas diferentes?)
- A evolucao de metricas e rastreavel de Daily → Weekly → Monthly? Ou sao silos?

**2.2 — Side effects que faltam**
- O Daily gera alertas no perfil via AlertBridge. O Weekly tambem? O Monthly?
- Relatorios deveriam gerar sinais para o perfil dos liderados? (ex: "semana com 0 commits" deveria virar ponto de atencao?)
- Relatorios deveriam alimentar o `metricas.md` de forma consistente? Todos fazem isso?

**2.3 — Cadeia de acumulacao dos relatorios**
Rastreie: `Relatorio gerado` → `metricas persistidas?` → `consumidas por quem?` → `impacto no perfil?`
- Os dados dos relatorios alimentam a weekly synthesis? O cycle report? A pauta de 1:1?
- Ou os relatorios sao output terminal (gerado, exibido, esquecido)?

**2.4 — UX de relatorios**
- O gestor consegue navegar entre relatorios de forma fluida? (lista, preview, busca por data?)
- Existe comparacao entre periodos? (esta semana vs semana passada?)
- O gestor consegue forcar regeneracao se o relatorio saiu com dados incompletos?

**2.5 — Relatorio Daily como insumo para standup**
- O TL;DR executivo cobre o que o gestor precisa em 2 minutos?
- Os alertas sao acionaveis? Ou sao genericos demais?
- A secao Haiku agrega valor ou repete o que ja esta nos alertas?

**2.6 — Weekly e Monthly como relatorios para stakeholders**
- O gestor pode encaminhar o weekly/monthly para seu gestor ou VP?
- O formato e apresentavel? Ou e "dados brutos para consumo interno"?
- Tem metricas que um VP esperaria? (velocity, throughput, SLA, headcount concerns?)

---

## EIXO 3 — Dados Externos: Jira e GitHub (AVALIACAO PROFUNDA)

**Problema reportado:** O sistema gera insights de "sobrecarga" para devs, mas quando o gestor
olha a sprint no Jira, nao ve sobrecarga. O insight parece incorreto ou desalinhado com a realidade.

### Arquivos obrigatorios

- `src/main/external/ExternalDataPass.ts` — pipeline de dados externos
- `src/main/external/JiraClient.ts` — o que e buscado no Jira
- `src/main/external/GitHubClient.ts` — o que e buscado no GitHub
- `src/main/external/JiraMetrics.ts` — como metricas Jira sao calculadas
- `src/main/external/GitHubMetrics.ts` — como metricas GitHub sao calculadas
- `src/main/external/CrossAnalyzer.ts` — insights programaticos (FOCO PRINCIPAL)
- `src/main/brain/RiskDetector.ts` — como risco e calculado
- `src/main/prompts/agenda.prompt.ts` — como dados externos alimentam a pauta

### Investigacao principal: Bug de sobrecarga

**3.1 — Como "sobrecarga" e detectada**
Rastreie o fluxo completo:
```
JiraClient.fetchIssues() → JiraMetrics.compute() → workloadScore → CrossAnalyzer → insight "sobrecarga"
```

Responda com evidencia:
- Qual query JQL busca as issues? E filtrada por sprint ou pega TODAS as issues abertas?
- `workloadScore` e calculado como? Quais thresholds? (issues count + SP?)
- O threshold de sobrecarga e fixo ou varia por nivel? (junior vs senior)
- **CRITICO:** O workloadScore olha para issues no sprint OU para TODAS as issues abertas do assignee?
  - Se olha TODAS: um dev com 8 issues abertas de sprints anteriores (nao planejadas) aparece como sobrecarregado mesmo tendo 3 issues no sprint atual
  - Se olha so sprint: pode perder issues fora do sprint que estao consumindo tempo

**3.2 — Desalinhamento com a visao da sprint**
- O gestor olha a sprint board no Jira e ve: "Dev X tem 5 issues, 3 concluidas, 2 em andamento — tudo normal"
- O Pulse mostra: "Dev X — sobrecarga (12 issues abertas)"
- A diferenca e porque o Pulse conta issues FORA do sprint? Issues em backlog? Issues de outros projetos?
- Documente EXATAMENTE o que entra na contagem de `issuesAbertas` vs o que o gestor ve na sprint board

**3.3 — Thresholds do CrossAnalyzer**
- Liste TODOS os thresholds hardcoded e seus valores
- Para cada threshold: e razoavel? E calibrado para um time de 8-12 pessoas?
- Existe customizacao por time? Por nivel? Ou e one-size-fits-all?
- Especificamente: `sobrecarga_issues` threshold — qual valor? Para quem e justo e para quem e injusto?

**3.4 — Qualidade dos insights gerados**
Para CADA tipo de insight do CrossAnalyzer:
| Insight | Threshold | Dados usados | Cenario falso positivo | Cenario falso negativo |
Mapear: quais insights sao confiaveis e quais geram ruido.

**3.5 — Propagacao dos dados externos**
Rastreie onde os dados externos aparecem:
- `external_data.yaml` — o que e persistido?
- `perfil.md` secao "Dados Externos" — o que e escrito?
- `metricas.md` — quais metricas sao escritas?
- `agenda.prompt.ts` — quais dados alimentam a pauta de 1:1?
- `RiskDetector` — como dados externos inflam/deflam o score de risco?
- `DailyReportGenerator` — como dados externos aparecem no daily?

**3.6 — Dados que faltam**
- O Pulse cruza Jira + GitHub. O que nao e capturado?
  - Jira: comentarios, tempo em cada status, reclassificacoes, subtasks?
  - GitHub: CI/CD status, branch age, draft PRs, review turnaround?
- Quais dados o gestor esperaria ver que o sistema nao mostra?

**3.7 — Confianca do gestor nos dados**
- Se o gestor apresenta "workload alto" na standup baseado no Pulse, e os dados estao 1h atrasados: risco?
- Se o insight de "queda de atividade" e baseado em commits (que podem ser spikes): confiavel?
- Se um dev nao tem `jiraEmail` configurado: o Pulse mostra "0 issues" ou omite a pessoa?

---

## EIXO 4 — Sustentacao (AVALIACAO PROFUNDA + ENGENHARIA REVERSA)

**Objetivo:** Fazer engenharia reversa completa do modulo de Sustentacao para entender:
- O que esta sendo entregue ao gestor
- O que NAO esta sendo entregue mas deveria
- Como melhorar o produto nesta area

### Arquivos obrigatorios

- `src/main/external/SupportBoardClient.ts` — fetch e processamento de dados
- `src/main/external/TicketEnricher.ts` — enriquecimento de tickets
- `src/main/external/AnalysisSnapshotStore.ts` — persistencia de analises
- `src/main/prompts/sustentacao-analysis.prompt.ts` — analise executiva IA
- `src/main/prompts/sustentacao-ticket-analysis.prompt.ts` — analise por ticket IA
- `src/renderer/src/views/SustentacaoView.tsx` — o que o gestor ve
- `src/main/brain/RiskDetector.ts` — como sustentacao alimenta risco

### Engenharia reversa: o que o modulo entrega hoje

**4.1 — Mapa completo de dados**
Para cada dado que o modulo produz:
| Dado | Fonte | Processamento | Onde aparece na UI | Consumido por outro modulo? |

**4.2 — Fluxo do gestor**
Simule a jornada:
1. Gestor abre SustentacaoView
2. Ve cards com metricas (tickets abertos, breach, compliance, in/out)
3. Ve alertas (breach crescente, ticket envelhecendo, fila crescendo)
4. Clica "Gerar Analise" → IA analisa board + tickets
5. Ve analise executiva + analise por ticket

Para cada passo: o que o gestor GANHA? O que ele NAO ganha que deveria?

**4.3 — Integracao com o resto do produto**
Rastreie TODOS os pontos onde sustentacao se conecta com outros modulos:
- `RiskDetector` — como breach/tickets alimentam o score de risco?
- `DailyReportGenerator` — como sustentacao aparece no daily?
- `agenda.prompt.ts` — dados de sustentacao entram na pauta de 1:1?
- `perfil.md` — dados de sustentacao aparecem no perfil do liderado?
- `WeeklySynthesisRunner` — a sintese semanal considera sustentacao?

Para cada conexao: funciona? E util? Esta faltando algo?

**4.4 — Alertas de sustentacao vs realidade**
Os alertas sao gerados por regras deterministicas:
- Breach crescente (delta >= 2)
- Ticket envelhecendo (age > 2x SLA)
- Fila crescendo (3+ dias consecutivos)
- Spike de incidente (3+ tickets em 2h)

Avalie:
- Esses alertas sao acionaveis? O gestor sabe O QUE FAZER quando ve o alerta?
- Os thresholds sao razoaveis? Para um board de 10 tickets? De 100?
- Faltam alertas? (ex: ticket sem assignee, ticket sem label, SLA prestes a estourar)

**4.5 — Analise IA: ROI**
A analise IA roda `claude -p` para cada ticket + analise executiva:
- Com 50 tickets: ~51 chamadas ao Claude. Quanto tempo demora?
- O resultado justifica o custo? O gestor usa as analises por ticket ou so a executiva?
- A analise executiva (padroes recorrentes, causa raiz, tendencia) e acionavel?
- O gestor consegue levar a analise para uma reuniao com VP?

**4.6 — O que o modulo NAO faz e deveria**
Avalie gaps criticos:
- **MTTR (Mean Time To Resolution):** o gestor ve compliance % mas nao o tempo medio de resolucao
- **Time-to-first-response:** tickets sem resposta em X horas?
- **Aging distribution:** quantos tickets com 1d, 3d, 7d, 14d, 30d+ ?
- **SLA por tipo:** compliance diferente para Bug vs Task vs Incident?
- **Tendencia temporal:** o board esta melhorando ou piorando ao longo de semanas/meses?
- **Assignee performance:** quem resolve mais rapido? Quem tem mais breach?
- **Vinculacao com perfil:** tickets em breach do Dev X aparecem no perfil do Dev X?

**4.7 — Categorizacao de tickets: robustez**
O sistema categoriza por:
1. Regex configurado (`jiraSupportCategories`)
2. Bracket prefix `[Tema]`
3. Delimiter prefix (`:`, `-`, `|`)
4. Fallback "Outros"

Avalie:
- Se o time nao usa convencao: tudo cai em "Outros"?
- A categorizacao e util para detectar padroes? Ou e tao granular/generica que perde o sinal?
- Falta categorizacao semantica (IA)?

**4.8 — Recorrentes: valor real**
O sistema detecta tickets recorrentes por tema (titulo similar).
- A deteccao e por regex ou por similaridade semantica?
- Falso positivo: "Deploy v1.2" e "Deploy v1.3" sao recorrentes? (mesma causa raiz?)
- Falso negativo: "Login falha" e "Erro de autenticacao" sao o mesmo tema?
- O gestor pode escalar "temos 5 recorrencias de Deploy" com confianca?

---

## OUTPUT OBRIGATORIO

Produza EXATAMENTE estas secoes, nesta ordem:

### 1. Diagnostico do Daily Automatico
```
CAUSA RAIZ: [descricao]
EVIDENCIA: [arquivo:linha + trecho]
POR QUE FALHA SILENCIOSAMENTE: [explicacao]
CONDICOES PARA REPRODUZIR: [cenario]
FIX SUGERIDO: [o que mudar, onde, risco]
```

### 2. Scorecard de Relatorios
| Tipo | Trigger | Inputs | Side Effects | Qualidade | Gaps | Nota (1-5) |

Para cada tipo (Daily, Weekly, Monthly, Sprint). Nota 5 = completo e acionavel. Nota 1 = inutil.

### 3. Cadeia de Acumulacao dos Relatorios (diagrama textual)
```
Daily → [metricas.md? perfil.md? alertas?] → [consumido por weekly? cycle? pauta?]
Weekly → [metricas.md?] → [consumido por monthly? cycle?]
Monthly → [metricas.md?] → [consumido por cycle?]
Sprint → [metricas.md?] → [consumido por?]
```
Marcar elos quebrados com [QUEBRADO] e ausentes com [AUSENTE].

### 4. Analise de Sobrecarga: Diagnostico do Bug
```
O QUE O PULSE VE: [query JQL + metricas + thresholds]
O QUE O GESTOR VE NO JIRA: [sprint board, issues comprometidas]
POR QUE SAO DIFERENTES: [explicacao tecnica com evidencia]
IMPACTO: [o gestor toma decisao errada?]
RECOMENDACAO: [o que mudar para alinhar]
```

### 5. Mapa de Insights do CrossAnalyzer
| Insight | Threshold | Confiabilidade | Falso positivo provavel? | Acionavel? |
Para CADA tipo de insight.

### 6. Raio-X da Sustentacao
| Capacidade | Implementada? | Valor para o gestor | Gap |
Lista completa do que o modulo faz e nao faz.

### 7. Integracao Sustentacao ↔ Produto
| Ponto de integracao | Funciona? | Valor | Sugestao |
Para cada conexao entre sustentacao e outros modulos.

### 8. Top 10 Recomendacoes Priorizadas
| # | Acao | Eixo | Tipo (fix/melhoria/feature) | Impacto | Esforco |
Ordenadas por impacto no valor entregue ao gestor.

### 9. Veredito por Eixo
Para cada eixo (Daily Auto, Relatorios, Dados Externos, Sustentacao):
- **Estado atual:** 1 frase
- **Maior gap:** 1 frase
- **Acao mais importante:** 1 frase

### 10. Veredito Final
3 paragrafos:
- O que esses 4 eixos entregam de fato ao gestor
- Onde o produto promete e nao cumpre
- A unica coisa mais importante a fazer agora

---

## Regras absolutas

- **Evidencia ou nao existe.** Toda afirmacao cita arquivo:linha + trecho. Sem evidencia = `[NAO ENCONTRADO]`.
- **Sem diplomacia.** Se algo nao funciona, diga. Se algo gera ruido, diga. Se o gestor toma decisao errada por causa do sistema, diga.
- **Valor percebido, nao valor tecnico.** "O sistema calcula X" nao e valor. "O gestor ve X e decide Y" e valor.
- **Rastreie ate o fim.** Nao pare em "o dado e gerado". Siga: gerado → persistido → consumido → exibido → decisao do gestor.
- **Compare com a realidade.** O gestor que abre o Jira ve uma coisa. O Pulse mostra outra. A diferenca e o gap. Mapear explicitamente.
- **O bug de sobrecarga e prioridade.** Quando o sistema diz "sobrecarga" e a sprint nao mostra isso, o gestor perde confianca em TUDO. Trate como critico.
- **Sustentacao e produto, nao feature.** Avalie como se fosse um produto standalone — o que entrega, o que falta, onde o gestor se frustra.
- **Nunca suavize.** O usuario quer verdade. Prefira 1 insight honesto a 10 observacoes diplomaticas.
