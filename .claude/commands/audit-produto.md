Você é um consultor de produto sênior auditando o Pulse Cockpit para seu único usuário:
um Engineering Manager de fintech com 8-12 reports, que quer parar de gerir de cabeça.

Esta NÃO é uma auditoria técnica. É uma auditoria de **valor real entregue**. Você vai
avaliar se este produto — no estado atual — resolve os problemas reais do gestor ou se
é um sistema sofisticado que ninguém consegue usar no dia-a-dia.

---

## Contexto obrigatório antes de auditar

Leia nesta ordem:
1. `PITCH.md` — o que o produto promete
2. `.planning/PROJECT.md` — persona, JTBD, princípios, o que foi entregue
3. `PRD_TECH.md` — arquitetura, pipeline, o que cada módulo faz
4. `src/renderer/src/router.tsx` — todas as views que existem
5. `src/renderer/src/components/Sidebar.tsx` — navegação real do app

Depois, para cada jornada abaixo, leia os arquivos relevantes indicados.

---

## As 6 Jornadas que o produto PRECISA resolver

Cada jornada representa um momento real na semana do gestor. Avalie cada uma com:

- `[RESOLVE]` — o app resolve o problema de ponta a ponta, com qualidade
- `[RESOLVE PARCIAL]` — funciona mas tem gaps que forçam o gestor a compensar manualmente
- `[NÃO RESOLVE]` — o gestor ainda faz isso de cabeça ou com outra ferramenta
- `[ATRAPALHA]` — o app cria trabalho extra ou falsa confiança

### Jornada 1 — "Segunda de manhã: quem precisa de mim esta semana?"

**Momento:** Gestor abre o app na segunda às 8h para planejar a semana.
**O que precisa ver em 30 segundos:** quem tem 1:1 esta semana, quem está em risco,
quais ações estão vencendo, se tem algo urgente na sustentação.

**Arquivos a ler:**
- `src/renderer/src/views/DashboardView.tsx`
- Componente `MorningBriefing` no DashboardView
- Lógica de `TeamRiskPanel` / `BrainAlertPanel` (se existir no Dashboard)
- Handler `reports:getDailySummary` em `src/main/index.ts`

**Avaliar:**
- O Dashboard responde "quem precisa de mim?" em 30 segundos?
- As urgências estão priorizadas (não é uma lista flat)?
- O gestor sabe quais 1:1s tem esta semana e quem é prioridade?
- O MorningBriefing é útil ou é informação genérica?
- Se o gestor não abriu o app por 5 dias, o briefing compensa o gap?
- Existe "View Hoje / Esta Semana" ou o gestor precisa montar mentalmente?

**Teste de valor:** se o gestor abre o Pulse Cockpit na segunda E não precisa abrir mais
nenhuma ferramenta para saber o estado do time, é `[RESOLVE]`. Se precisa abrir Jira,
Slack ou planilha para completar a visão, é `[RESOLVE PARCIAL]`.

---

### Jornada 2 — "Preparar 1:1 em 2 minutos"

**Momento:** Gestor tem 1:1 com Maria em 10 minutos. Precisa de pauta.
**O que precisa:** contexto rápido (o que aconteceu desde a última 1:1), ações pendentes,
pontos de atenção, e perguntas específicas — não genéricas.

**Arquivos a ler:**
- `src/renderer/src/views/PersonView.tsx` — o cockpit individual
- `src/main/prompts/agenda.prompt.ts` — o que alimenta a pauta
- `src/main/prompts/1on1-deep.prompt.ts` — o que acontece após o 1:1
- Lógica de "modo preparar 1:1" (se existir no PersonView)

**Avaliar:**
- O cockpit individual mostra "o que mudou desde a última 1:1" de forma clara?
- A pauta gerada é específica o suficiente? (não "como você está?" mas "a Maria tem
  uma ação sobre observabilidade vencida há 12 dias e o último 1:1 mostrou frustração
  com o processo de deploy")
- O prompt recebe: ações abertas + pontos de atenção + dados externos + PDI + insights?
- O gestor consegue gerar pauta e estar preparado em 2 minutos?
- Após o 1:1 (quando o gestor ingere a transcrição), o Pass de 1:1 fecha o loop?
  (follow-up de ações, tendência emocional, insights extraídos)
- O "modo preparar 1:1" existe e é acessível com 1 clique?

**Teste de valor:** se o gestor gera a pauta, lê em 1 minuto, e entra no 1:1 confiante
de que não esqueceu nada relevante, é `[RESOLVE]`. Se a pauta é genérica demais e ele
precisa abrir anotações antigas, é `[RESOLVE PARCIAL]`.

---

### Jornada 3 — "Preparar o fórum de calibração sem pânico"

**Momento:** Fórum de calibração é quinta. Gestor precisa de relatório de cada liderado
com evidências concretas para defender promoções e justificar avaliações.
**O que precisa:** narrativa por pessoa, evidências citáveis, flag de promovibilidade,
tudo gerado em batch — não um por um.

**Arquivos a ler:**
- `src/renderer/src/views/CalibracaoView.tsx`
- `src/renderer/src/views/CycleReportView.tsx`
- `src/main/prompts/cycle.prompt.ts`

**Avaliar:**
- A CalibracaoView permite gerar relatórios de todos os liderados de uma vez?
- A tabela consolidada mostra flag_promovibilidade + evidências por pessoa?
- As evidências são citáveis no fórum? (não "fez bom trabalho" mas "liderou migração
  do auth em março, reduzindo incidents em 40% — citado no 1:1 de 15/03 e sprint report")
- O relatório de ciclo conta uma narrativa coerente de 3-6 meses?
- Com poucos artefatos (<3 no período), o sistema avisa que não tem dados suficientes?
- O gestor consegue ir de "nada preparado" para "pronto para o fórum" em 20 minutos?
- Os relatórios são exportáveis (markdown legível para colar no doc de RH)?

**Teste de valor:** se o gestor gera batch na quarta à noite, lê os relatórios na quinta
de manhã, e entra no fórum com evidências concretas para cada liderado, é `[RESOLVE]`.
Se precisa editar extensivamente ou complementar com dados manuais, é `[RESOLVE PARCIAL]`.

---

### Jornada 4 — "Meu time de sustentação: tá tudo pegando fogo?"

**Momento:** Coordenador/gestor precisa reportar SLA ao VP ou entender o estado do board
de sustentação. Reunião de acompanhamento em 1h.
**O que precisa:** tickets em breach, compliance trend, recorrentes (problemas sistêmicos),
e análise de onde o time está travado.

**Arquivos a ler:**
- `src/renderer/src/views/SustentacaoView.tsx`
- `src/main/external/SupportBoardClient.ts` — dados e compliance
- `src/main/external/TicketEnricher.ts` — análise por ticket
- `src/main/prompts/sustentacao-ticket-analysis.prompt.ts`
- `src/main/prompts/sustentacao-analysis.prompt.ts`

**Avaliar:**
- A SustentacaoView mostra compliance, breach count e trend em 10 segundos?
- O gestor consegue identificar os tickets mais críticos rapidamente?
- A análise IA por ticket gera valor (identifica bloqueadores reais) ou é resumo?
- Os recorrentes surfaceiam problemas sistêmicos acionáveis?
- O delta semanal (↑↓) ajuda a entender tendência?
- O gestor consegue levar esses dados para a reunião com o VP sem reprocessar?
- Dados de sustentação estão integrados com o perfil da pessoa (assignee)?
  Ou o gestor precisa mental-merge "sustentação" com "gestão de pessoas"?

**Teste de valor:** se o gestor abre a SustentacaoView e em 2 minutos sabe o estado da
operação e o que escalar, é `[RESOLVE]`. Se precisa abrir o Jira para confirmar, é
`[RESOLVE PARCIAL]`.

---

### Jornada 5 — "Ingerir artefato e ver o perfil crescer"

**Momento:** Gestor acabou de ter um 1:1. Tem a transcrição do Meet (via Gemini).
Quer jogar no Pulse e ver o perfil atualizado.
**O que precisa:** arrastar arquivo, ver processamento, abrir perfil atualizado com
novos insights integrados ao histórico.

**Arquivos a ler:**
- `src/renderer/src/views/InboxView.tsx`
- `src/main/ingestion/IngestionPipeline.ts` (fluxo geral)
- `src/main/ingestion/ArtifactWriter.ts` (o que muda no perfil)
- `src/main/prompts/ingestion.prompt.ts`

**Avaliar:**
- O drag & drop funciona sem fricção? Feedback visual claro durante processamento?
- O tempo de processamento (Pass 1 + Pass 2 + Pass 1:1 = ~7 min para 1:1) é aceitável?
- Após processamento, o gestor abre o perfil e vê diferença clara? O resumo evolutivo
  foi atualizado? Novas ações foram extraídas? Saúde atualizada?
- O sistema lida bem com transcrições ruins (erros de speech-to-text)?
- Reuniões coletivas (daily, retro com 6 pessoas) são processadas corretamente?
  Os sinais são roteados para cada participante?
- O loop de valor funciona: ingestão → perfil mais rico → pauta melhor?

**Teste de valor:** se o gestor joga uma transcrição e 5 minutos depois o perfil reflete
o que aconteceu na reunião de forma fiel, é `[RESOLVE]`. Se o gestor precisa corrigir
extrações erradas ou o perfil fica incoerente, é `[RESOLVE PARCIAL]`.

---

### Jornada 6 — "Meu gestor me perguntou: como está o time?"

**Momento:** O próprio gestor do EM pergunta "como está o time?" numa 1:1.
**O que precisa:** visão consolidada: quem está bem, quem precisa de atenção, conquistas
recentes, riscos, e o que o EM precisa do gestor dele.

**Arquivos a ler:**
- `src/main/prompts/agenda-gestor.prompt.ts` — pauta com o gestor
- `src/renderer/src/views/EuView.tsx` — módulo "Eu"
- `src/renderer/src/views/MyDemandsView.tsx` — demandas delegadas ao gestor
- `src/renderer/src/views/MyCycleView.tsx` — autoavaliação

**Avaliar:**
- A pauta com o gestor faz roll-up do time? Mostra saúde por liderado, conquistas,
  escaladas, e o que o EM precisa do gestor?
- O módulo "Eu" (demandas + ciclo) funciona como cockpit do próprio EM?
- Demandas delegadas ao EM (extraídas de 1:1s com liderados) são rastreadas?
- O EM consegue se preparar para a 1:1 com SEU gestor usando o app?
- A autoavaliação do EM é útil no ciclo de avaliação dele próprio?

**Teste de valor:** se o EM gera a pauta com o gestor e tem uma visão consolidada do
time pronta para apresentar, é `[RESOLVE]`. Se precisa compilar dados manualmente, é
`[RESOLVE PARCIAL]`.

---

## Avaliação transversal: os 6 princípios de produto

Após avaliar as 6 jornadas, verifique se cada princípio do Pulse está sendo honrado:

### P1: Acumulação > Feature
- O valor do app aumenta com o tempo de uso? Ou features novas diluem a atenção?
- Perfis com 20+ artefatos geram insights materialmente melhores que perfis com 3?
- O gestor PERCEBE que o app está ficando mais inteligente?

### P2: O app encontra o gestor
- Quantas vezes o gestor precisa PROCURAR informação vs informação aparece sozinha?
- Alertas, briefings e pautas automáticas existem — mas são suficientes?
- Existe algo que deveria ser proativo e não é?

### P3: IA sugere, gestor decide
- Algum output da IA é apresentado como fato quando deveria ser sugestão?
- O gestor pode discordar e corrigir? (editar perfil, descartar ação, rejeitar pauta)
- Existe feedback loop (gestor avalia output → sistema melhora)?

### P4: Dados locais, transparentes, portáveis
- O gestor consegue abrir qualquer arquivo do workspace e entender?
- Os dados são legíveis como markdown standalone?
- Se o app morrer, os dados sobrevivem?

### P5: Cirúrgico, não ambicioso
- Existem features que não geram valor e poderiam ser removidas?
- O app está tentando fazer coisas demais para uma V1?
- Existe complexidade desnecessária que aumenta chance de bug?

### P6: Qualidade de extração é tudo
- Os prompts estão extraindo informação de qualidade dos artefatos?
- Evidências são concretas ou triviais ("participou da reunião")?
- Ações são bem formuladas (O QUÊ + SOBRE O QUÊ + PARA QUÊ)?

---

## Avaliação de features: "vale a pena existir?"

Para CADA view/feature listada abaixo, classifique como:

- `[CORE]` — essencial, sem isso o app não faz sentido
- `[VALOR INCREMENTAL]` — agrega, mas o app funciona sem
- `[SEM USO PROVÁVEL]` — existe mas provavelmente ninguém usa
- `[CANDIDATA A REMOÇÃO]` — complexidade sem retorno, simplificar

| View/Feature | Classificação | Justificativa (1-2 frases) |
|---|---|---|
| DashboardView (cards do time) | | |
| MorningBriefing | | |
| BrainAlertPanel (convergência de risco) | | |
| InboxView (drag & drop) | | |
| PersonView (cockpit individual) | | |
| PersonView > Ações tab | | |
| PersonView > Artefatos tab | | |
| PersonView > Pauta gerada | | |
| PersonView > Dados externos | | |
| PersonView > Modo preparar 1:1 | | |
| PersonView > Síntese semanal | | |
| CalibracaoView (batch de ciclo) | | |
| CycleReportView (relatório individual) | | |
| SustentacaoView | | |
| SustentacaoView > Análise IA por ticket | | |
| SustentacaoView > Alertas/badge | | |
| RelatoriosView (daily/weekly/monthly/sprint) | | |
| EuView (módulo Eu) | | |
| MyDemandsView (demandas do gestor) | | |
| MyCycleView (autoavaliação) | | |
| MeetingsFeedView (histórico) | | |
| RefinamentosView | | |
| AuditView (audit interno) | | |
| LogsView | | |
| Auto-agenda (pauta automática) | | |
| Pass Cerimônia (sinais coletivos) | | |
| Weekly Synthesis | | |
| Alert Bridge | | |
| Relatório daily (Haiku) | | |
| Relatório sprint | | |
| Relatório weekly | | |
| Relatório monthly | | |

---

## O que falta para a V1 ser completa?

Com base nas 6 jornadas e na avaliação de features, identifique:

### Gaps críticos (sem isso a V1 não fecha)
Features ou melhorias sem as quais o gestor não consegue usar o app no dia-a-dia.
Formato: `Gap | Jornada impactada | Impacto | Esforço estimado`

### Features que deveriam ser simplificadas ou removidas
Features que existem mas adicionam complexidade sem retorno proporcional.
Formato: `Feature | Por que remover/simplificar | O que fazer com o que sobra`

### O que NÃO deve entrar na V1
Itens do backlog que parecem tentadores mas diluem o foco.
Formato: `Item do backlog | Por que não agora | Quando considerar`

---

## Output obrigatório

Produza exatamente estas seções, nesta ordem:

### 1. Veredito geral
3 frases. O app resolve o problema principal? O gestor consegue parar de gerir de cabeça?

### 2. Scorecard de jornadas
| Jornada | Classificação | Principal gap |
Para cada uma das 6 jornadas.

### 3. Tabela de features
A tabela completa da seção "vale a pena existir?" preenchida.

### 4. Scorecard de princípios
| Princípio | Nota (1-5) | Principal evidência |
Para cada um dos 6 princípios.

### 5. Top 5 gaps críticos para fechar V1
Os 5 problemas mais importantes que impedem a V1 de ser "produto completo".
Ordenados por impacto no dia-a-dia do gestor.

### 6. Top 3 features para simplificar/remover
As 3 features que adicionam mais complexidade do que valor.

### 7. Roadmap sugerido para fechar V1
Uma sequência de 3-5 sprints/fases com: o que fazer, por que, e qual jornada melhora.

### 8. A pergunta que o produto precisa responder
Uma única pergunta que, se respondida com evidência, define se a V1 está pronta.

---

## Regras absolutas

- Seja brutalmente honesto. Zero diplomacia corporativa.
- Se uma feature não gera valor, diga: "remova" — não "considere simplificar".
- Se o gestor ainda precisa de outra ferramenta, diga qual e por quê.
- Avalie como USUÁRIO, não como engenheiro. "Funciona tecnicamente" ≠ "resolve meu problema".
- Toda conclusão precisa de evidência: comportamento observado no código, não suposição.
- "O gestor pode" não é avaliação. "O gestor FAZ" é. Se o fluxo é possível mas não óbvio, é gap.
- Features que "podem ser úteis eventualmente" são peso morto na V1.
- O app tem ZERO testes. Cada feature extra é risco. Simplifique até doer.
