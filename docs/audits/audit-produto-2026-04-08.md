# Auditoria de Produto — Pulse Cockpit

**Data:** 2026-04-08
**Auditor:** Consultor de produto sênior (IA)
**Versão auditada:** v0.3.6 (V1+V2+V3+Revisão Extensiva)

---

## 1. Veredito Geral

O Pulse Cockpit resolve o problema principal de acumulação de contexto sobre pessoas — o loop ingestão → perfil mais rico → pauta melhor funciona e gera valor real. O gestor consegue, sim, parar de gerir de cabeça para 1:1s e calibração. No entanto, o app acumulou features demais para um produto com zero testes: 12+ views, 7 prompts complexos, integrações externas, 4 tipos de relatório, módulos de sustentação, refinamentos e audit interno — criando uma superfície de risco desproporcional ao valor incremental que essas features periféricas entregam.

---

## 2. Scorecard de Jornadas

| Jornada | Classificação | Principal gap |
|---------|--------------|---------------|
| 1 — Segunda de manhã: quem precisa de mim? | **[RESOLVE PARCIAL]** | Não existe "View Esta Semana" — o gestor vê quem está em risco mas não sabe quais 1:1s tem esta semana. O MorningBriefing mostra delta desde o último acesso mas não mostra a semana à frente. Sem integração com calendário, o app responde "quem está mal" mas não "o que tenho que fazer hoje/esta semana". |
| 2 — Preparar 1:1 em 2 minutos | **[RESOLVE]** | O modo "Preparar 1:1" existe com 1 clique, mostra delta desde último 1:1, ações abertas ordenadas por urgência, e gera pauta específica com base no perfil acumulado. O prompt `agenda.prompt.ts` recebe ações categorizadas por risco, PDI, dados externos, e demandas. A pauta NÃO é genérica. O deep pass fecha o loop após o 1:1. |
| 3 — Preparar calibração sem pânico | **[RESOLVE]** | CalibracaoView gera batch em paralelo para todos os liderados. Mostra flag de promovibilidade + conclusão inline. O prompt `cycle.prompt.ts` tem orçamento de 80k chars, exige evidências citáveis no fórum, e distingue promotabilidade com condições. O gestor vai de "nada preparado" a "pronto" em <20min. |
| 4 — Sustentação: está tudo pegando fogo? | **[RESOLVE PARCIAL]** | SustentacaoView mostra compliance, breach, trends e alertas com análise IA por ticket — tudo em 10 segundos. Mas os dados de sustentação são **siloados** do perfil das pessoas: o gestor precisa fazer mental-merge entre "Maria tem 3 tickets em breach" e "Maria está com saúde amarela". O app não faz essa conexão automaticamente. |
| 5 — Ingerir artefato e ver perfil crescer | **[RESOLVE PARCIAL]** | Pipeline multi-pass funciona bem. Perfil cresce incrementalmente com 8 seções. Mas: o drag & drop da UI **só aceita .md** (`/\.md$/i` na linha 59 do InboxView), enquanto o PITCH promete .md, .txt e .pdf. Arquivos não-.md são silenciosamente ignorados. O gestor que arrasta um PDF não recebe feedback. |
| 6 — "Como está o time?" para meu gestor | **[RESOLVE PARCIAL]** | O prompt `agenda-gestor.prompt.ts` faz roll-up do time com saúde por liderado, escalações e conquistas. Mas: a pauta precisa ser gerada sob demanda navegando até o perfil do gestor — não existe view consolidada "estado do time" pronta para apresentar. O módulo "Eu" rastreia demandas mas não consolida a visão de time para cima. |

---

## 3. Tabela de Features

| View/Feature | Classificação | Justificativa |
|---|---|---|
| DashboardView (cards do time) | **[CORE]** | Vista central — grid de saúde, ordenação por urgência, ponto de partida do gestor |
| MorningBriefing | **[CORE]** | Responde "o que mudou desde que saí" em 5 segundos. Dados concretos (PRs, breach, sprint %) |
| BrainAlertPanel (convergência de risco) | **[VALOR INCREMENTAL]** | Inteligente mas sobrepõe TeamRiskPanel. Dois painéis de risco no mesmo dashboard confundem: qual olhar primeiro? |
| InboxView (drag & drop) | **[CORE]** | Porta de entrada do loop de valor. Sem inbox, não existe produto |
| PersonView (cockpit individual) | **[CORE]** | O ativo central — tudo sobre uma pessoa em um lugar |
| PersonView > Ações tab | **[CORE]** | Rastreamento de compromissos é uma das dores primárias da persona |
| PersonView > Artefatos tab | **[VALOR INCREMENTAL]** | Referência útil mas o gestor raramente revisita artefatos brutos — o resumo evolutivo é suficiente |
| PersonView > Pauta gerada | **[CORE]** | Output primário que transforma contexto acumulado em ação |
| PersonView > Dados externos | **[VALOR INCREMENTAL]** | Enriquece, mas o app funciona sem Jira/GitHub. Depende de configuração que nem todo gestor faz |
| PersonView > Modo preparar 1:1 | **[CORE]** | Excelente — layout focado que responde Journey 2 com 1 clique |
| PersonView > Síntese semanal | **[VALOR INCREMENTAL]** | Mais uma geração IA on-demand que sobrepõe com pauta. Quando o gestor usa síntese em vez de pauta? |
| CalibracaoView (batch de ciclo) | **[CORE]** | Resolve o JTBD principal diretamente |
| CycleReportView (relatório individual) | **[CORE]** | O entregável para o fórum de calibração |
| SustentacaoView | **[VALOR INCREMENTAL]** | Valioso para o caso de sustentação mas é um módulo inteiro separado do core de gestão de pessoas |
| SustentacaoView > Análise IA por ticket | **[VALOR INCREMENTAL]** | Gera narrativa + ação recomendada por ticket. Útil, mas cada ticket = chamada Claude = custo/tempo |
| SustentacaoView > Alertas/badge | **[VALOR INCREMENTAL]** | Proativo, bom design com badge na sidebar. Mas alerta sem conexão com perfil da pessoa é meia informação |
| RelatoriosView (daily/weekly/monthly/sprint) | **[SEM USO PROVÁVEL]** | 4 tipos de relatório gerados. Que ação concreta o gestor toma ao ler um "relatório daily" gerado por IA? O Dashboard + PersonView já mostram tudo que importa |
| EuView (módulo Eu) | **[VALOR INCREMENTAL]** | Self-management é secundário ao core. Bom ter, mas não é o que faz o gestor abrir o app |
| MyDemandsView (demandas do gestor) | **[VALOR INCREMENTAL]** | Todo list glorificado. Funciona, mas qualquer app de notas faz o mesmo |
| MyCycleView (autoavaliação) | **[SEM USO PROVÁVEL]** | Usado 1-2x/ano no ciclo do gestor. Feature de frequência ultra-baixa ocupando uma view inteira |
| MeetingsFeedView (histórico) | **[SEM USO PROVÁVEL]** | Arquivo cronológico reverso. Os artefatos já estão acessíveis por pessoa. Quando o gestor navega um feed global? |
| RefinamentosView | **[CANDIDATA A REMOÇÃO]** | Armazenamento de documentos de refinamento. Nada a ver com gestão de pessoas. Scope creep |
| AuditView (audit interno) | **[CANDIDATA A REMOÇÃO]** | Ferramenta de diagnóstico interno (score 0-100). O gestor não precisa auditar o sistema — o sistema precisa funcionar |
| LogsView | **[CANDIDATA A REMOÇÃO]** | Ferramenta de debug para o desenvolvedor. Não deveria estar na nav de produção |
| Auto-agenda (pauta automática) | **[VALOR INCREMENTAL]** | Geração proativa é boa mas sem calendário a "automação" é baseada em timer, não em necessidade real |
| Pass Cerimônia (sinais coletivos) | **[CORE]** | Reuniões com 6+ pessoas são comuns. Rotear sinais para cada participante é essencial para acumulação |
| Weekly Synthesis | **[VALOR INCREMENTAL]** | Síntese periódica. Quando o gestor olha a síntese em vez da pauta antes do 1:1? Sobreposição |
| Alert Bridge | **[VALOR INCREMENTAL]** | Conecta sustentação com pessoas — bom conceito, mas a conexão é fraca na prática |
| Relatório daily (Haiku) | **[SEM USO PROVÁVEL]** | Relatório diário gerado automaticamente. Ninguém lê relatório diário que não pediu |
| Relatório sprint | **[VALOR INCREMENTAL]** | Contexto de sprint útil 1x a cada 2 semanas. Frequência baixa |
| Relatório weekly | **[SEM USO PROVÁVEL]** | Relatório semanal. O Dashboard já é o relatório semanal visual |
| Relatório monthly | **[SEM USO PROVÁVEL]** | Relatório mensal com baixíssima frequência de uso |

---

## 4. Scorecard de Princípios

| Princípio | Nota (1-5) | Principal evidência |
|-----------|-----------|---------------------|
| P1: Acumulação > Feature | **3** | O loop de acumulação funciona (perfil cresce, pauta melhora). Mas features novas (V3 inteira: 4 relatórios, Cross Analyzer, external data) diluíram atenção do que já existia. O backlog tem 30+ itens. Acumulação perdendo para feature. |
| P2: O app encontra o gestor | **3** | MorningBriefing + BrainAlertPanel + UrgenciasHoje + badge de sustentação são proativos. Mas: sem push notifications desktop, sem integração com calendário, sem "hoje você tem 1:1 com Maria às 14h — aqui está a pauta". O gestor ainda precisa abrir o app e navegar. |
| P3: IA sugere, gestor decide | **3** | O gestor pode completar/descartar ações e editar notas_manuais. Mas não pode rejeitar uma extração errada ("esta ação está errada"), não pode avaliar qualidade da pauta ("esta pauta foi inútil"), e não existe feedback loop que melhore o sistema. A IA escreve no perfil e o gestor aceita tacitamente. |
| P4: Dados locais, transparentes, portáveis | **5** | Perfeito. Tudo em Markdown + YAML. Legível no VS Code/Obsidian. iCloud sync. Sem servidor. Se o app morre, os dados sobrevivem e são compreensíveis. |
| P5: Cirúrgico, não ambicioso | **2** | 12+ views na nav. 4 tipos de relatório. Módulo de sustentação inteiro. Refinamentos. Audit. Logs. Brain convergence. Weekly synthesis. Auto-agenda. Cross-team insights. Para um app com ZERO testes, isso é ambicioso demais. Cada feature é superfície de bug sem safety net. |
| P6: Qualidade de extração é tudo | **4** | Prompts sofisticados com guards reais: evidências concretas obrigatórias, formato "O QUÊ + SOBRE O QUÊ + PARA QUÊ" para ações, correção de texto garbled, confidence levels, rejeição de evidência trivial. Pipeline multi-pass (identify → enrich → deep) é arquiteturalmente correto. Ponto de melhoria: sem feedback loop do gestor para calibrar extrações. |

---

## 5. Top 5 Gaps Críticos para Fechar V1

### Gap 1 — Falta "View Esta Semana" / Integração com calendário
**Jornada impactada:** 1, 2
**Impacto:** O gestor abre o app na segunda e vê quem está em risco, mas NÃO vê "terça 10h Maria, quarta 14h Carlos, quinta 9h Ana". Sem saber quais 1:1s tem esta semana, não consegue priorizar preparação. O MorningBriefing mostra o passado (delta), não o futuro (agenda). A âncora de hábito diário ("abrir o app toda manhã") não se forma sem essa view.
**Esforço:** Médio — precisa de fonte de calendário (Google Calendar API ou input manual de frequência+dia da semana) e uma seção "Esta Semana" no Dashboard.

### Gap 2 — Drag & drop não aceita .txt e .pdf na UI
**Jornada impactada:** 5
**Impacto:** O PITCH promete "aceita .md, .txt e .pdf". O pipeline suporta os 3 formatos. Mas a UI do InboxView filtra `const supported = /\.md$/i.test(file.name)` — .txt e .pdf são silenciosamente ignorados sem feedback. O gestor que tenta arrastar um PDF pensa que o app quebrou. Isso quebra confiança no primeiro uso.
**Esforço:** Baixo — mudar a regex para `/\.(md|txt|pdf)$/i` e adicionar mensagem de erro para formatos não suportados.

### Gap 3 — Sustentação siloada do perfil das pessoas
**Jornada impactada:** 4, 1
**Impacto:** O gestor precisa fazer mental-merge entre SustentacaoView ("3 tickets em breach, assignee: maria") e PersonView ("Maria saúde amarela, 1:1 atrasado 8 dias"). O app tem os dois dados mas não os cruza. Na reunião com o VP, o gestor olha sustentação. Na prep do 1:1, olha o perfil. Nunca vê: "Maria está com 3 tickets em breach E saúde amarela E 1:1 atrasado — prioridade máxima". O BrainAlertPanel poderia integrar isso, mas não o faz.
**Esforço:** Médio — enriquecer o TeamRiskPanel/BrainAlertPanel com dados de sustentação do assignee; mostrar tickets atribuídos no cockpit da pessoa.

### Gap 4 — Sem feedback loop gestor → IA
**Jornada impactada:** 2, 3, 5
**Impacto:** O gestor não pode dizer "esta ação foi mal extraída" ou "esta pauta foi genérica". Sem feedback, a qualidade de extração não melhora com o uso — apenas com mudanças manuais nos prompts pelo desenvolvedor. Isso viola P3 (IA sugere, gestor decide) na prática: o gestor aceita tacitamente tudo que a IA escreve porque não tem como corrigir sem editar markdown.
**Esforço:** Médio-alto — implementar thumbs up/down em pautas e ações, armazenar feedback, injetar como contexto nos prompts.

### Gap 5 — Complexidade desproporcionada ao estágio (zero testes, ~20 features)
**Jornada impactada:** Todas (risco sistêmico)
**Impacto:** O app tem ~20 features distintas, 12+ views, 7 prompts complexos, pipeline multi-pass com concorrência, integração Jira+GitHub, módulo de sustentação, 4 tipos de relatório — e ZERO testes automatizados. Qualquer mudança em ArtifactWriter ou nos prompts pode corromper perfis existentes em produção sem que ninguém perceba. O custo de cada feature nova cresce exponencialmente porque não há safety net. O schema está na v5, indicando 4 migrações já feitas — cada migração é risco sem testes.
**Esforço:** Alto para cobrir tudo, mas: testes nos 3 módulos críticos (ArtifactWriter, IngestionPipeline, ProfileMigration) dariam 80% da proteção com 20% do esforço.

---

## 6. Top 3 Features para Simplificar/Remover

### 1. Remover: RefinamentosView + AuditView + LogsView
**Por que remover:** RefinamentosView é armazenamento de documentos sem relação com gestão de pessoas — o gestor usa Notion/Drive para isso. AuditView é diagnóstico interno que deveria ser CLI do dev, não UI do usuário. LogsView é debugging puro. Juntas, são 3 views na produção que nenhum gestor vai usar e que adicionam complexidade ao router, sidebar e manutenção.
**O que fazer com o que sobra:** Mover audit para CLI (`claude -p`). Logs ficam no arquivo em disco (já existem com rotation). Refinamentos: deletar — se o gestor quer guardar docs, usa o filesystem.

### 2. Simplificar: RelatoriosView (4 tipos → 0 tipos na UI)
**Por que simplificar:** Os 4 relatórios (daily/weekly/monthly/sprint) são gerados por IA e ficam como markdown em disco. Mas o Dashboard já mostra tudo que um "relatório" mostraria — e de forma interativa. A pergunta fatal: **que ação concreta o gestor toma ao ler um relatório daily gerado automaticamente?** Se a resposta é "nenhuma", é peso morto. O Scheduler gera esses relatórios em background consumindo recursos do Claude CLI sem evidência de que alguém os lê.
**O que fazer com o que sobra:** Remover a view e a geração automática. Se o gestor quiser relatório pontual, o prompt `cycle.prompt.ts` já atende. Os 4 generators + Scheduler + view = complexidade significativa que pode ser removida.

### 3. Simplificar: BrainAlertPanel + Weekly Synthesis → Consolidar no TeamRiskPanel
**Por que simplificar:** O Dashboard tem 3 componentes de risco/alerta sobrepostos: BrainAlertPanel (IA convergence), TeamRiskPanel (determinístico multi-fator), e UrgenciasHoje (itens do dia). O gestor vê 3 listas diferentes dizendo variações de "Maria precisa de atenção" — é ruído, não clareza. Weekly Synthesis é mais uma geração IA per-person que sobrepõe com a pauta.
**O que fazer com o que sobra:** Unificar num único painel "Quem precisa de mim" com prioridade clara: (1) urgências do dia, (2) riscos multi-fator, (3) contexto IA se disponível. Eliminar a síntese semanal como botão separado — integrar os insights úteis no prompt da pauta.

---

## 7. Roadmap Sugerido para Fechar V1

### Fase 1 — Limpeza e segurança (1 sprint)
**O que fazer:** Remover RefinamentosView, AuditView, LogsView da UI. Remover RelatoriosView e os 4 generators + Scheduler. Simplificar sidebar para 6 items (Time, Inbox, Sustentação, Calibração, Eu, Histórico). Corrigir regex do drag & drop para aceitar .md/.txt/.pdf. Adicionar testes nos 3 módulos críticos (ArtifactWriter, IngestionPipeline, ProfileMigration).
**Por que:** Reduz superfície de risco de 12 views para 7. Dá safety net para mudanças futuras. Corrige promessa quebrada do .txt/.pdf.
**Jornada que melhora:** 5 (drag & drop) + todas (menos bugs).

### Fase 2 — "View Esta Semana" + Dashboard unificado (1 sprint)
**O que fazer:** Adicionar campo `dia_1on1` no config da pessoa (ex: "terça"). Criar seção "Esta Semana" no Dashboard mostrando: 1:1s previstos com status de preparação, ações vencendo, alertas ativos. Unificar BrainAlertPanel + TeamRiskPanel + UrgenciasHoje num único componente "Quem precisa de mim" com prioridade clara.
**Por que:** Fecha o gap #1 — o gestor abre na segunda e vê a semana inteira. Um painel de risco em vez de 3.
**Jornada que melhora:** 1 (visão da semana), 2 (saber qual 1:1 preparar).

### Fase 3 — Conectar sustentação com pessoas (1 sprint)
**O que fazer:** Enriquecer o cockpit individual (PersonView) com tickets de sustentação atribuídos à pessoa. Adicionar dados de sustentação como fator no TeamRiskPanel ("Maria: 3 tickets em breach"). Mostrar no modo "Preparar 1:1": tickets que esta pessoa está tocando.
**Por que:** Fecha o gap #3 — o gestor não precisa mais fazer mental-merge entre duas views.
**Jornada que melhora:** 4 (sustentação integrada), 2 (prep 1:1 mais completa).

### Fase 4 — Feedback loop mínimo (1 sprint)
**O que fazer:** Adicionar thumbs up/down em pautas geradas. Permitir marcar ações como "extração errada" (descarta + registra). Armazenar feedback e injetar como contexto no prompt da pauta ("últimas 3 pautas: 2 aprovadas, 1 rejeitada por ser genérica demais").
**Por que:** Fecha o gap #4 — o sistema começa a aprender com o gestor.
**Jornada que melhora:** 2 (pautas melhores), 5 (extrações mais precisas).

---

## 8. A Pergunta que o Produto Precisa Responder

> **O gestor abre o Pulse Cockpit toda segunda-feira por hábito — ou só quando lembra?**

Se a resposta for "só quando lembra", a V1 não está pronta. O app precisa ser a primeira aba da semana, não um nice-to-have que compete com Jira e Slack. A "View Esta Semana" e a redução de ruído visual (menos painéis, menos views) são o que transformam uma ferramenta poderosa num hábito diário. O valor de acumulação só se realiza se o gestor alimenta o sistema toda semana — e ele só alimenta se abrir o app toda semana.
