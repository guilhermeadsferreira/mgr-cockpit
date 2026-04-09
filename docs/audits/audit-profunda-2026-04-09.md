# Auditoria Profunda — Pulse Cockpit v0.3.6

**Data:** 2026-04-09
**Escopo:** Todas as dimensões — jornadas, módulos, inteligência, dados, pipeline, apresentação, princípios, interconexões
**Método:** Leitura completa de prompts, views, pipeline, registries, tipos IPC, model de dados e arquitetura

---

## Veredito Executivo

O Pulse Cockpit tem um **motor de inteligência de pessoas genuinamente sofisticado**. Os prompts são específicos, exigem evidências concretas, e o pipeline multi-pass (identificação → enriquecimento → análise profunda) é arquiteturalmente correto. O loop de acumulação funciona: perfis com 20+ artefatos produzem pautas e relatórios materialmente superiores aos de perfis recentes.

No entanto, três problemas sistêmicos limitam o valor entregue:

1. **A UI diminui a inteligência que a IA produz.** O sistema gera análise de convergência de risco, tendência emocional com threshold de 2 evidências, cross-referencing Jira × GitHub, e evidências citáveis para calibração — mas a apresentação achata tudo em badges, listas flat e markdown sem hierarquia. O gestor vê sintomas, não diagnósticos.

2. **Módulos que deveriam conversar operam em silos.** Sustentação não alimenta o perfil da pessoa. Relatórios são gerados mas não geram demandas. O deep pass de 1:1 pode não estar completamente wired. Dados externos são fetchados após o sync, não antes.

3. **A superfície de features cresceu mais rápido que a infraestrutura de qualidade.** 20+ features, 12+ views, 7 prompts complexos, pipeline com concorrência — e zero testes automatizados, sem checksums de integridade, migrações de schema baseadas em regex sem validação.

O produto resolve o JTBD de calibração e preparação de 1:1. Não resolve — ainda — o JTBD de "cockpit diário que organiza minha semana".

---

# DIMENSÃO 1: Jornadas do Gestor

## Jornada 1 — "Segunda de manhã: quem precisa de mim esta semana?"

### O que o Dashboard oferece
- **MorningBriefing**: Delta desde último acesso — PRs mergeados, sprint %, tickets em breach, ações do gestor vencendo, liderado com 1:1 mais atrasado
- **BrainAlertPanel**: Convergência de risco com severidade (crítica/alta/média), sinais por pessoa, recomendação
- **UrgenciasHoje**: Top 5 itens urgentes (1:1 urgente, prazo de ação, saúde crítica)
- **TeamRiskPanel**: Todos que precisam de atenção com 10+ triggers (saúde, 1:1, ações, estagnação, tendência emocional, abandono de ações, promessas do gestor, risco composto)
- **Grid de cards**: Ordenado por score de urgência, dividido em "Atenção agora" (score ≥30) e "Estável"

### O que está bom
O sistema de risco multi-fator é genuinamente sofisticado. O `calcUrgencyScore` pondera saúde (40pts vermelho), tendência emocional (25pts deteriorando), ações vencidas (8pts cada, cap 24), 1:1 atrasado (15pts se >2x frequência), estagnação (10pts), necessidade de 1:1 (10pts). Isso significa que o gestor vê prioridade real, não lista alfabética.

### O que falta
- **Nenhuma visão "Esta Semana"**: O gestor não sabe quais 1:1s tem esta semana. O campo `frequencia_1on1_dias` existe no config, mas sem `dia_1on1` o app não pode prever a agenda semanal. O MorningBriefing mostra o passado (delta), não o futuro.
- **3 painéis de risco sobrepostos**: BrainAlertPanel, UrgenciasHoje e TeamRiskPanel mostram informação redundante com hierarquias diferentes. O gestor vê 3 listas dizendo variações de "Maria precisa de atenção".
- **Sem integração com calendário**: Sem Google Calendar ou input manual de agenda, o app não pode ser o cockpit semanal.

### Veredito: **[RESOLVE PARCIAL]**
Responde "quem está mal?" mas não "o que tenho que fazer hoje/esta semana?".

---

## Jornada 2 — "Preparar 1:1 em 2 minutos"

### O que o modo "Preparar 1:1" oferece
- **SinceLastMeetingCard**: Contagem de novos artefatos, ações fechadas, ações vencidas, mudança de saúde desde último 1:1
- **Ações do liderado**: Lista de ações abertas ordenadas por urgência (vencidas primeiro)
- **Última pauta inline**: Renderizada com MarkdownPreview
- **Botão "Gerar pauta"**: Chama `agenda.prompt.ts`

### Qualidade do prompt de pauta (`agenda.prompt.ts`)
- **Inputs**: perfil.md completo, ações categorizadas por risco (abandono, gestor, normal), pautas anteriores, ratings de pautas, mudanças de saúde desde último 1:1, insights recentes, sinais de terceiros, PDI estruturado, dados externos (Jira/GitHub), demandas do gestor, memória de sugestões
- **Output**: JSON estruturado com follow-ups, temas recorrentes, perguntas sugeridas, alertas (max 3 críticos), reconhecimentos
- **Guards de qualidade**: Sinais de baixa confiança marcados como hipóteses; dados stale sinalizados; sugestões usam memória de aceitação anterior

### O que está bom
Este é o melhor fluxo do produto. O prompt recebe contexto rico e produz pauta específica — não "como você está?" mas "a Maria tem uma ação sobre observabilidade vencida há 12 dias e o último 1:1 mostrou frustração". O deep pass (`1on1-deep.prompt.ts`) fecha o loop após o 1:1 com follow-up de ações, tendência emocional, insights de carreira e PDI.

### O que falta
- **SinceLastMeetingCard conta mas não mostra**: "3 novos artefatos" sem dizer que um foi um feedback de performance com sinal crítico. Os dados ricos estão no pipeline mas a UI apresenta contagens.
- **Pauta colapsada por default**: Na tab Pautas, as pautas são cards colapsados. O output mais acionável do sistema está escondido atrás de um clique.
- **Sem link pauta ↔ perfil**: A pauta é markdown standalone. Não referencia de volta quais insights do perfil geraram cada ponto de discussão.

### Veredito: **[RESOLVE]**
O fluxo funciona ponta a ponta. Os gaps são de apresentação, não de inteligência.

---

## Jornada 3 — "Preparar o fórum de calibração sem pânico"

### O que CalibracaoView + CycleReportView oferecem
- **Geração batch**: Botão único gera relatórios para todos os liderados em paralelo
- **Tabela consolidada**: Pessoa, nível, saúde, flag de promovibilidade, conclusão para o fórum, link para relatório completo
- **Relatório individual**: Timeline (5-10 eventos), entregas, padrões de comportamento, evolução vs nível esperado, pontos de desenvolvimento, conclusão para calibração, flag de promovibilidade com evidências

### Qualidade do prompt de ciclo (`cycle.prompt.ts`)
- **Budget de 80k chars**: Artefatos mais recentes priorizados; se excede, usa resumos anteriores como fallback
- **Enriquecimentos**: Insights de 1:1, correlações de terceiros, histórico de follow-up de ações, tendência emocional, evolução do PDI, dados externos
- **Guards**: Evidências de promovibilidade devem ser "citáveis no fórum" (data + fato concreto). Dados externos (commits/PRs) usados como contexto, nunca como evidência primária de qualidade. Regra de convergência: 2+ fontes independentes = sinal mais forte. Flag "nao" exige gaps comportamentais específicos com evidência.

### O que está bom
O prompt é o mais sofisticado do sistema. A regra de convergência (exigir 2+ fontes) previne falsos positivos. O budget de 80k chars com priorização temporal garante que artefatos recentes têm mais peso. A flag de promovibilidade é um output concreto para o fórum.

### O que falta
- **Flag de promovibilidade sub-dimensionada na UI**: É um badge de `fontSize: 11` no canto superior direito do relatório. Para o fórum de calibração, deveria ser a informação mais visível da tela, com resumo do reasoning inline.
- **Sem aviso de dados insuficientes**: Se um liderado tem <3 artefatos no período, o sistema gera relatório normalmente. Deveria avisar: "evidências insuficientes — relatório baseado em dados limitados".
- **Export não é batch**: Da CalibracaoView, o gestor precisa clicar "Ver completo" para cada pessoa e depois exportar markdown individualmente. Falta "Exportar todos" como zip ou documento único.

### Veredito: **[RESOLVE]**
O JTBD principal é atendido. Gaps são de polish, não de funcionalidade.

---

## Jornada 4 — "Meu time de sustentação: tá tudo pegando fogo?"

### O que SustentacaoView oferece
- **KPIs**: Tickets abertos, fechados 30d, em breach, compliance rate com delta semanal (↑↓)
- **Charts**: Compliance trend (mini line chart), backlog histórico, vazão in/out semanal (bar chart)
- **Alertas**: Cards expandíveis com severidade (crítico/atenção), narrativa IA, blocker category, risk level, comentários do Jira, ação recomendada
- **Inteligência operacional**: Temas mais frequentes, recorrentes detectados (candidatos a resolver na raiz)

### Qualidade dos prompts de sustentação
- **`sustentacao-ticket-analysis.prompt.ts`**: Recebe batch de tickets enriquecidos com comentários, blocker inferido, staleness, contexto do assignee. Produz narrativa + blocker + ação recomendada + risk level + evolução vs análise anterior. Regras: narrativa não repete título; risk level ajustado pelo workload do assignee; junior em ticket de alto risco → sugerir pairing.
- **`sustentacao-analysis.prompt.ts`**: Recebe snapshot do board com breach, temas, alertas, vazão. Produz: padrões recorrentes, oportunidades de automação, hipótese de causa raiz, tendência do backlog, sugestões de redução de SLA.

### O que está bom
A análise IA por ticket é genuinamente acionável. O blocker category (fornecedor/dev/cliente/produto/deploy) ajuda o gestor a entender onde o time está travado. Os recorrentes surfaceiam problemas sistêmicos que nenhum dashboard de Jira mostra.

### O que falta
- **Silo completo**: Sustentação NÃO alimenta o perfil da pessoa. O RiskDetector NÃO consome dados de sustentação. Um liderado com 3 tickets em breach + saúde amarela + 1:1 atrasado aparece em duas views separadas, sem convergência.
- **Assignee context limitado**: O prompt recebe workload score do assignee, mas o PersonView não mostra tickets de sustentação atribuídos. O gestor no modo "Preparar 1:1" não vê que essa pessoa está sobrecarregada de sustentação.
- **Dependência de configuração**: Requer `jiraSupportProjectKey` no settings. Sem isso, a view inteira é inútil.

### Veredito: **[RESOLVE PARCIAL]**
Excelente standalone, mas siloed. O valor multiplica se integrado ao core de gestão de pessoas.

---

## Jornada 5 — "Ingerir artefato e ver o perfil crescer"

### O que Inbox + Pipeline oferecem
- **Drop zone**: Drag & drop com feedback visual
- **Fila**: Status (processando/pendente/concluído/erro), filename, tipo, pessoa, duração, resumo
- **Detecção de não-cadastrados**: Botão para registrar pessoas novas
- **Pipeline multi-pass**: Pass 0 (Gemini opcional) → Pass 1 (identificação, 90s) → Pass 2 (enriquecimento com perfil, 180s) → Pass 1on1 Deep (análise profunda, 300s) → Pass Cerimônia (sinais por pessoa)

### Qualidade do prompt de ingestão (`ingestion.prompt.ts`)
- **26 campos de output**: Participantes, resumo, ações (com formato "O QUÊ + SOBRE O QUÊ + PARA QUÊ"), pontos de atenção (com frequência), conquistas, temas, saúde (apenas deste artefato, não média histórica), engajamento, urgência de 1:1, estagnação, evolução, confiança
- **Guards**: Nunca copiar texto garbled; ações exigem responsável explícito; frequência de atenção marcada como "recorrente" apenas se perfil anterior registrou mesmo padrão; estagnação detectável a partir de 2 artefatos em 90 dias

### O que está bom
O pipeline multi-pass é arquiteturalmente correto. Pass 1 sem contexto de perfil garante análise não-enviesada. Pass 2 com perfil garante continuidade narrativa. O deep pass de 1:1 extrai insights de carreira, PDI, tendência emocional com threshold de 2 evidências. O pass de cerimônia roteia sinais para cada participante em reuniões coletivas.

### O que falta
- **BUG: Drag & drop aceita apenas .md**: `InboxView.tsx:59` usa `/\.md$/i`. O PITCH promete .md, .txt, .pdf. O pipeline suporta os 3 formatos (FileReader.ts). Apenas o UI filter está errado.
- **Truncamento silencioso**: Artefatos >50KB são truncados sem aviso na UI. Decisões e ações no final de uma transcrição longa são perdidas.
- **Pass 2 pode regredir qualidade**: Pass 2 substitui completamente o resultado do Pass 1 se validação de schema passa. Não há detecção de regressão (ex: Pass 2 produz menos temas que Pass 1).
- **Dados externos fetchados APÓS sync**: O deep pass de 1:1 pode rodar com dados de Jira/GitHub stale ou ausentes.
- **Ações coletivas silenciosamente descartadas**: Se o responsável de uma ação em reunião coletiva não é registrado, a ação é logada como warning e descartada. Não é criada como demanda nem salva em lugar nenhum.

### Veredito: **[RESOLVE PARCIAL]**
O motor funciona bem. Os gaps são: bug do .md-only, truncamento silencioso, e perda de ações coletivas.

---

## Jornada 6 — "Meu gestor me perguntou: como está o time?"

### O que está disponível
- **agenda-gestor.prompt.ts**: Recebe config do gestor, perfil de interação com o próprio gestor, snapshot de saúde de todos os liderados (saúde, alertas, estagnação, evolução, ações pendentes), pautas anteriores com gestor, ações abertas com gestor
- **EuView > MyDemandsView**: CRUD de demandas com filtros por urgência e origem (líder/par/eu/liderado)
- **EuView > MyCycleView**: Journal de contribuições + geração de autoavaliação por IA

### O que está bom
O prompt de agenda com gestor faz roll-up genuíno: status do time, escalações, conquistas, desenvolvimento do próprio gestor, necessidades do gestor. O módulo de demandas rastreia promessas com origem e prazo.

### O que falta
- **Sem view consolidada "Estado do Time"**: Quando o gestor do EM pergunta "como está o time?", não existe uma página exportável com a saúde resumida. O gestor precisa navegar ao perfil do seu gestor e gerar uma pauta — workflow não intuitivo.
- **Demandas são parcialmente automáticas**: O deep pass de 1:1 cria demandas automaticamente, mas nem todas as fontes geram demandas (relatórios não, anomalias externas parcialmente).
- **Autoavaliação é feature de ultra-baixa frequência**: Usada 1-2x/ano. Ocupa uma view inteira.

### Veredito: **[RESOLVE PARCIAL]**
O roll-up funciona via prompt, mas falta uma view dedicada para apresentar o estado do time para cima.

---

# DIMENSÃO 2: Qualidade da Inteligência Produzida

## 2.1 Cadeia de Prompts — Como a inteligência se acumula

```
Artefato novo
  ↓
INGESTION (Pass 1): Sem contexto → extração limpa, não-enviesada
  ↓
INGESTION (Pass 2): Com perfil.md → resumo evolutivo integrado ao histórico
  ↓
1ON1-DEEP (se tipo=1:1): Com perfil + ações + PDI + dados externos
  → Side effects: atualiza tendência emocional, cria demandas, marca ações como follow-up
  ↓
CERIMÔNIA (se coletiva): Per-person → extrai sinais individuais
  ↓
PERFIL.MD ATUALIZADO
  ↓
AGENDA: Consome perfil + ações + insights + dados externos + memória de sugestões
  → Output: pauta específica para 1:1
  ↓
CYCLE REPORT: Consome perfil + artefatos + enriquecimentos
  → Output: relatório com evidências citáveis para calibração
```

### Pontos fortes da cadeia
1. **Separação de concerns**: Pass 1 extrai sem viés histórico. Pass 2 integra ao contexto. Deep pass aprofunda. Cada pass tem papel claro.
2. **Acumulação real**: O `resumo_evolutivo` é reescrito a cada ingestão, com os 3 resumos anteriores arquivados. Isso cria narrativa contínua.
3. **Guards anti-trivialidade**: Ações exigem formato "O QUÊ + SOBRE O QUÊ + PARA QUÊ". Pontos de atenção exigem evidência concreta. Tendência emocional "deteriorando" exige 2+ evidências consecutivas.
4. **Cross-referencing**: A pauta cruza ações, PDI, dados externos, insights de 1:1 e sinais de terceiros num único output contextualizado.

### Perdas de informação na cadeia

| Transição | O que se perde | Impacto |
|-----------|---------------|---------|
| Pass 1 → Pass 2 | Pass 2 substitui completamente o resultado se schema válido. Sem detecção de regressão | Médio — Pass 2 pode produzir menos temas ou ações que Pass 1 |
| Ingestão → Deep Pass | Dados externos fetchados APÓS sync; deep pass pode rodar com dados stale | Médio — pauta/insights podem não refletir Jira/GitHub recente |
| Ingestão → Cerimônia | Cache limpo antes de cerimônia completar (fire-and-forget) | Baixo-médio — sinais individuais podem usar contexto parcial |
| Perfil → Agenda | Agenda não recebe perfil.md inteiro — seções são extraídas seletivamente | Baixo — as seções relevantes são selecionadas corretamente |
| Artefatos → Cycle Report | Budget de 80k chars; artefatos antigos podem ser resumidos | Baixo — design correto (recentes têm prioridade) |

### Risco de cascata narrativa

O `resumo_evolutivo` é reescrito a cada ingestão pelo Claude, com base no resumo anterior + novo artefato. Após 30+ ingestões, o resumo é uma narrativa que passou por 30 reescritas da IA. Existe risco de:
- **Drift semântico**: Nuances de artefatos antigos se perdem progressivamente
- **Viés de recência**: Os últimos 3-5 artefatos dominam a narrativa
- **Amplificação de sinais falsos**: Um sinal fraco repetido 3x pode se transformar em "padrão" sem que seja
- **Mitigação existente**: Os 3 resumos anteriores são arquivados como snapshot, permitindo ao Claude ver a evolução. O ProfileCompressor roda a cada 10 artefatos para limpar a narrativa.

## 2.2 Análise por Prompt

### ingestion.prompt.ts — A porta de entrada
**Sofisticação: 9/10**
- 26 campos de output com regras de preenchimento
- Regra de responsabilidade: compromisso explícito > instrução direta > ambiguidade = gestor
- Detecção de recorrência: "recorrente" só se perfil anterior já registrou o mesmo padrão
- Texto garbled: interpreta e reescreve, nunca copia
- Gap: Não recebe follow-ups recentes de ações — precisa inferir status de ações a partir do artefato

### 1on1-deep.prompt.ts — O motor de profundidade
**Sofisticação: 10/10**
- Threshold de 2+ evidências para tendência "deteriorando" (evita falso alarme)
- Privacy: reduz conteúdo pessoal/sensível como "Temas pessoais: alinhados"
- Self-perception: avalia como o liderado se percebe vs como o gestor o avalia
- PDI: atualiza objetivos com evidências extraídas do artefato
- Autonomia: descrições devem ser compreensíveis sem contexto do artefato
- Gap: Se o deep pass falha (timeout/erro), os insights são perdidos. Sem retry.

### agenda.prompt.ts — O output mais usado
**Sofisticação: 8/10**
- Categoriza ações por risco (abandono ≥3 ciclos, gestor-owned, normal)
- Usa memória de sugestões anteriores (quais foram aceitas vs ignoradas)
- Dados stale sinalizados no contexto
- PDI injetado com status de cada objetivo
- Gap: A pauta é markdown sem estrutura semântica. Um ponto crítico ("burnout iminente") tem mesma formatação que um ponto menor ("discutir férias").

### cycle.prompt.ts — O entregável de calibração
**Sofisticação: 9/10**
- Budget inteligente de 80k chars com fallback para resumos
- Regra de convergência: 2+ fontes = sinal mais forte
- External data como contexto, nunca como evidência primária
- Flag de promovibilidade com 3-5 bullets citáveis
- Condição de promoção se flag = "condicionado_a"
- Gap: Não explicita quando dados são insuficientes para um julgamento confiável

### agenda-gestor.prompt.ts — O roll-up para cima
**Sofisticação: 6/10**
- Recebe snapshot de saúde do time (resumo, não perfil completo)
- Produz: status do time, escalações, conquistas, desenvolvimento do gestor
- Gap: Menor profundidade que os prompts de liderados — o gestor do EM recebe resumo genérico do time, não insights por pessoa. Sem dados de sustentação incluídos.

### sustentacao-ticket-analysis.prompt.ts — A inteligência operacional
**Sofisticação: 8/10**
- Batch de até 5 tickets com comentários completos
- Blocker inferido deterministicamente e validado via IA nos comentários
- Risk level ajustado pelo contexto do assignee (workload, seniority)
- Evolução vs análise anterior (tracking de mudanças)
- Gap: Análise não alimenta de volta o perfil da pessoa (silo)

## 2.3 O que torna a inteligência realmente boa

1. **Ações com formato forçado**: "O QUÊ + SOBRE O QUÊ + PARA QUÊ" garante que ações são acionáveis, não genéricas
2. **Tendência emocional com threshold**: 2+ evidências para "deteriorando" previne falsos alarmes
3. **Frequência de atenção**: "recorrente" só se o padrão já apareceu antes — não confunde primeira menção com padrão
4. **Confiança explícita**: Campo `confianca` (alta/media/baixa) no output de ingestão permite que a pauta trate sinais de baixa confiança como hipóteses
5. **Regra de convergência no ciclo**: Exigir 2+ fontes independentes para os sinais mais fortes reduz risco de falso positivo

## 2.4 O que degrada a inteligência

1. **Sem feedback loop**: O gestor não pode dizer "esta pauta foi ruim" ou "esta ação foi mal extraída". A qualidade melhora apenas por mudanças nos prompts, não por aprendizado.
2. **Cascata narrativa**: 30+ reescritas do resumo evolutivo pode amplificar sinais fracos
3. **Prompts não sabem sobre erros anteriores**: Se um prompt extraiu uma ação incorretamente, o próximo prompt não sabe — a ação incorreta alimenta a pauta
4. **Sem consistência cross-prompt**: O mesmo fato sobre a mesma pessoa pode ser descrito diferente no resumo evolutivo vs na pauta vs no relatório de ciclo

---

# DIMENSÃO 3: Modelo de Dados e Acumulação

## 3.1 Arquitetura de dados

| Camada | Arquivo | Dono | Atualização |
|--------|---------|------|------------|
| Identidade estática | `config.yaml` | Humano (edita via UI) | Manual |
| Perfil dinâmico | `perfil.md` | IA (escreve via ArtifactWriter) | Cada ingestão |
| Ações | `actions.yaml` | IA cria, humano resolve | Ingestão + manual |
| Artefatos | `historico/{date}-{slug}.md` | IA (write-once) | Cada ingestão |
| Dados externos | `external_data.yaml` | IA (ExternalDataPass) | Scheduler diário |
| Pautas | `pautas/{date}-pauta.md` | IA (write-once) | Sob demanda |
| Demandas | `demandas.yaml` | IA cria, humano gerencia | 1:1 deep + manual |
| Sustentação | `cache/sustentacao/` | IA (SupportBoardClient) | Scheduler |

## 3.2 Como o perfil cresce

| Seção do perfil.md | Modelo de crescimento | Compressão |
|--------------------|----------------------|-----------|
| Resumo Evolutivo | Reescrito a cada ingestão | Arquiva últimos 3 |
| Ações Pendentes | Append | Strikethrough quando resolvidas |
| Pontos de Atenção | Append + mark resolved | Fuzzy match com ~40 chars (risco de falso positivo) |
| Conquistas e Elogios | Append-only | **Nenhuma — crescimento ilimitado** |
| Temas Recorrentes | Dedup + replace | Fuzzy dedup (risco de merge incorreto) |
| Histórico de Artefatos | Append-only | **Nenhuma — cresce linearmente** |
| Histórico de Saúde | Append | Auto-comprime em resumos mensais após 50 entries |
| Insights de 1:1 | Append-only | **Nenhuma — crescimento ilimitado** |
| Sinais de Terceiros | Append-only | **Nenhuma — crescimento ilimitado** |

### A acumulação realmente gera mais valor?

**Sim, até ~50 artefatos. Depois, retornos decrescentes.**

- **0-10 artefatos**: Cada novo artefato adiciona contexto significativo. Temas emergem. A pauta melhora drasticamente vs perfil vazio.
- **10-30 artefatos**: Padrões estabilizam. Tendências emocionais ficam confiáveis. A pauta referencia contexto histórico real.
- **30-50 artefatos**: Relatórios de ciclo têm evidências fortes. Promovibilidade é avaliável com confiança.
- **50+ artefatos**: **Degradação começa**. Histórico de Saúde perde granularidade (compressão). Conquistas e Insights crescem indefinidamente → perfil fica pesado. Temas se repetem. O resumo evolutivo carrega drift de 50 reescritas.

## 3.3 Riscos de integridade de dados

### CRÍTICO: Race conditions em ingestões simultâneas
Cenário: Dois artefatos para a mesma pessoa processados em paralelo. Per-person lock serializa as escritas, mas o segundo processamento lê perfil.md ANTES do primeiro terminar de escrever → segundo resultado pode sobrescrever insights do primeiro.

### CRÍTICO: Inversão temporal
Se o artefato A (data: 01/jan) processa mais devagar que artefato B (data: 10/jan), o artefato B escreve primeiro e depois A sobrescreve com contexto mais antigo. Sem validação de ordem temporal.

### ALTO: Migrações de schema baseadas em regex
Migrações v1→v6 usam `string.indexOf()` e `string.replace()` sem validação pré/pós. Se um marcador de seção está malformado, a migração é no-op silencioso. Sem rollback, sem dry-run, sem validação de integridade.

### MÉDIO: Fuzzy dedup de pontos de atenção
Normalização remove datas, pontuação, e usa substring match de 40+ chars bidirecionais. "Capacidade de delegação em processos críticos com time" e "Capacidade de delegação em processos críticos com stakeholders" podem ser marcados ambos como resolvidos por match parcial.

### MÉDIO: Ações nunca expiram
Ações completadas e canceladas ficam no `actions.yaml` indefinidamente. Após 2 anos, o arquivo pode ter centenas de ações, das quais 90% são históricas. Sem archival, sem cleanup.

---

# DIMENSÃO 4: Arquitetura de Módulos e Interconexões

## 4.1 Mapa de fluxo de dados

```
                 ┌──────────────┐
                 │  FileWatcher  │
                 │   (inbox/)    │
                 └──────┬───────┘
                        ▼
              ┌────────────────────┐
              │ IngestionPipeline  │
              │ Pass 1 → 2 → Deep │
              └─────┬──────┬──────┘
                    │      │
          ┌─────────▼──┐   ▼
          │ ArtifactWriter │  ActionRegistry
          │  perfil.md     │  actions.yaml
          └─────┬──────────┘
                │
     ┌──────────┼──────────────────────┐
     ▼          ▼                      ▼
  Agenda    CycleReport           Dashboard
  prompt    prompt                (read perfis +
  (pauta)   (relatório)            actions + brain)
     │          │                      ▲
     ▼          ▼                      │
  pautas/   relatório.md         RiskDetector
                                 (convergência)
                                      ▲
                                      │
                            ┌─────────┴──────────┐
                            │   ExternalDataPass  │
                            │   Jira + GitHub     │
                            └─────────────────────┘

              ╔════════════════════╗
              ║   SILOS (sem       ║
              ║   conexão ao core) ║
              ╠════════════════════╣
              ║ SustentacaoView    ║──→ NÃO alimenta perfil
              ║ RefinamentosView   ║──→ NÃO conecta a nada
              ║ AuditView          ║──→ NÃO gera alertas
              ╚════════════════════╝
              
              ╔════════════════════════════╗
              ║   PARCIALMENTE CONECTADOS  ║
              ╠════════════════════════════╣
              ║ RelatoriosView (daily)     ║──→ Insumo para perfil vivo
              ║ LogsView                   ║──→ Observabilidade (fase atual)
              ╚════════════════════════════╝
```

## 4.2 Conexões que funcionam

| Conexão | Status | Qualidade |
|---------|--------|-----------|
| Ingestão → Perfil | ✅ Completa | Boa — multi-pass, atomic writes |
| Perfil → Agenda | ✅ Completa | Boa — contexto rico, guards de qualidade |
| Perfil → Cycle Report | ✅ Completa | Boa — budget inteligente, evidências citáveis |
| External Data → Perfil | ✅ Completa | Boa — multi-stage, cache, auto-sync Jira |
| Ingestão → Actions | ✅ Completa | Boa — dedup defensivo, audit trail |
| Brain/Alerts → Dashboard | ✅ Completa | Boa — convergência multi-fator |
| External Data → Demandas | ✅ Completa | Boa — auto-cria demandas para insights severos |

## 4.3 Conexões quebradas ou ausentes

| Conexão esperada | Status | Impacto |
|------------------|--------|---------|
| Sustentação → Perfil da pessoa | ❌ Ausente | Gestor faz mental-merge entre 2 views |
| Sustentação → RiskDetector | ❌ Ausente | Risco convergente perde sinal de sustentação |
| Relatórios → Demandas | ❌ Ausente | Anomalias em relatórios são dormant |
| Relatórios → Alertas | ❌ Ausente | Reports gerados e não consumidos |
| Pauta → Perfil (backlink) | ❌ Ausente | Pauta não referencia de volta os insights que a geraram |
| Ações → Narrativa do perfil | ⚠️ Fraca | Ações rastreadas mas não narrativizadas no perfil |
| Cerimônia → Confirmação | ⚠️ Fire-and-forget | Sinais individuais podem se perder sem retry |

## 4.4 Degradação graciosa

| Módulo que falha | Impacto | Gracioso? |
|------------------|---------|-----------|
| Jira indisponível | Dados externos retornam null, perfil não atualiza | ✅ Sim |
| GitHub indisponível | Idem Jira | ✅ Sim |
| Claude timeout (ingestão) | Item marcado "pending", cached para retry | ✅ Sim |
| Claude timeout (cerimônia) | Fire-and-forget falha silenciosamente | ⚠️ Falha silenciosa |
| Claude timeout (agenda) | Retorna erro ao usuário | ✅ Sim |
| Sustentação indisponível | View vazia, sem impacto no core | ✅ Sim (é silo) |

---

# DIMENSÃO 5: Pipeline e Robustez Operacional

## 5.1 Modelo de concorrência

| Mecanismo | Implementação | Adequação |
|-----------|--------------|-----------|
| Queue global | MAX_CONCURRENT = 3, MAX_QUEUE_SIZE = 100 | ✅ Adequado |
| Per-person lock | Promise queue por slug | ✅ Previne escritas concorrentes |
| Semáforo 1:1 | MAX_CONCURRENT_1ON1 = 2 | ✅ Evita sobrecarga de Claude |
| Persistência de fila | pending-queue.json com cache de AI result | ✅ Sobrevive restart |
| Dedup de enqueue | Verifica filePath + status | ✅ Evita reprocessamento |

## 5.2 Edge cases problemáticos

### Artefatos >50KB — truncamento silencioso
`FileReader.ts` trunca em 50.000 chars com marcador `[CONTEÚDO TRUNCADO]`. Reuniões longas (>2h) podem ter decisões e ações no final que são perdidas. **Sem aviso na UI.**

### Ações coletivas sem dono
Se o responsável de uma ação em reunião coletiva não é registrado, a ação é logada como warning e **descartada silenciosamente**. Não é criada como demanda, não aparece em nenhum lugar.

### Nomes ambíguos
Fuzzy match usa primeiro nome. Se existem "Ana Silva" e "Ana Santos", uma menção a "Ana" sem sobrenome resulta em nenhum match (corretamente ambíguo). Mas o artefato vai para "pendente" sem indicação de qual Ana se refere.

### OpenRouter como fallback
Pass 1 pode usar OpenRouter (Gemma 3 27B) com fallback para Claude se schema inválido. A qualidade do Gemma vs Claude não é medida — pode haver degradação sistemática não detectada.

## 5.3 Tempos de processamento

| Operação | Timeout | Caso típico | Caso pessimista |
|----------|---------|-------------|-----------------|
| Gemini preprocessing | 180s | 10-30s | 60s+ para transcrições longas |
| Pass 1 (Claude) | 90s | 30-60s | 90s (timeout) |
| Pass 2 (Claude) | 180s | 60-120s | 180s (perfil grande) |
| Deep pass 1:1 | 300s | 120-180s | 300s (muito contexto) |
| Cerimônia per-person | 60s | 20-40s | 60s |
| **Total para 1:1** | — | **~4-5min** | **~10min** |
| **Total para coletiva 8 pessoas** | — | **~6-8min** | **~15min** |

---

# DIMENSÃO 6: Apresentação da Inteligência na UI

## 6.1 Onde a UI amplifica a inteligência

| Componente | O que faz bem |
|-----------|---------------|
| PersonCard urgency score | Ordenação real por prioridade (não alfabética) |
| AlertCard (sustentação) | Progressive disclosure: colapsado → expandido com narrativa + ação |
| AcoesTab (PersonView) | Lifecycle completo: texto, contexto, responsável, prazo, fonte, status |
| CalibracaoView table | Batch generation + flag inline — scannable |
| ExternalDataCard | Métricas claras com thresholds visuais |

## 6.2 Onde a UI diminui a inteligência

### Perfil como markdown flat
O `MarkdownPreview` renderiza o perfil.md como texto corrido. Sem distinção visual entre fatos (total artefatos, último 1:1) e insights (tendência emocional, sinais de evolução). Um sinal de deterioração emocional tem o mesmo peso visual que a contagem de artefatos.

### SinceLastMeetingCard conta em vez de narrar
Mostra "3 novos artefatos, 2 ações fechadas, 1 vencida" — mas não diz **o que** mudou. Um dos 3 artefatos pode ser um feedback de performance com sinal crítico, e o card mostra "3".

### Pautas colapsadas por default
O output mais acionável do sistema (pauta de 1:1) é renderizado como card colapsado na tab "Pautas". O gestor precisa clicar para abrir cada uma.

### 3 painéis de risco sobrepostos no Dashboard
BrainAlertPanel + UrgenciasHoje + TeamRiskPanel mostram informação redundante com formatos diferentes. O gestor vê "Maria" em 3 listas distintas, cada uma com linguagem diferente.

### Flag de promovibilidade é badge de 11px
Na CycleReportView, o campo mais importante para o fórum de calibração (`flag_promovibilidade`) é um badge de `fontSize: 11` no canto superior direito. Deveria ser a informação mais visível, com reasoning inline.

### Sem executive summary no Dashboard
Não existe "3 pessoas precisam de atenção HOJE, 4 esta semana, time estável no geral". O gestor abre o Dashboard e vê muitos cards, muitas badges, muitas listas — sem uma frase que resuma o estado do time.

### Sem cross-referencing entre módulos
A pauta não linka de volta para o perfil. O relatório de ciclo não linka para artefatos específicos. Os dados externos não aparecem na mesma tela que o health indicator. O gestor precisa navegar tabs para montar o quadro completo.

---

# DIMENSÃO 7: Princípios de Produto (reavaliados)

## P1: Acumulação > Feature — Nota: 3/5

**Evidência positiva**: O loop ingestão → perfil → pauta funciona. Perfis com 20+ artefatos geram outputs materialmente melhores. O resumo evolutivo mantém narrativa contínua. O budget de 80k no cycle report prioriza artefatos recentes.

**Evidência negativa**: V3 adicionou 4 geradores de relatório, Scheduler, CrossAnalyzer, ExternalDataPass — tudo feature nova, não melhoria do que existia. O backlog tem 30+ itens. RefinamentosView e AuditView são features que não contribuem para acumulação. A acumulação degrada após 50 artefatos (compressão, crescimento ilimitado de seções).

## P2: O app encontra o gestor — Nota: 3/5

**Evidência positiva**: MorningBriefing mostra delta. BrainAlertPanel detecta convergência de risco. UrgenciasHoje surface itens do dia. Badge de sustentação na sidebar. Notificação nativa do Electron para riscos críticos.

**Evidência negativa**: Sem push notification desktop proativa. Sem integração com calendário. O app não sabe quando o próximo 1:1 é. O gestor precisa abrir o app e navegar. Auto-agenda é baseada em timer, não em necessidade real. Sem "View Hoje/Esta Semana".

## P3: IA sugere, gestor decide — Nota: 2/5

**Evidência positiva**: O gestor pode completar/descartar ações. Notas manuais são preservadas. A IA não sobrescreve dados sem "confirmação" (mas a confirmação é tácita — a IA escreve e o gestor não corrige).

**Evidência negativa**: Sem botão "esta extração está errada". Sem thumbs up/down em pautas. Sem feedback que melhore o sistema. Se a IA extrai uma ação incorretamente, ela persiste como verdade no perfil. O gestor precisa editar markdown diretamente para corrigir — a maioria não vai fazer isso. Na prática, "IA sugere" virou "IA decide tacitamente".

## P4: Dados locais, transparentes, portáveis — Nota: 5/5

**Perfeito.** Tudo em Markdown + YAML. Legível em qualquer editor. iCloud sync funciona. Sem servidor, sem vendor lock-in. Se o app morre, os dados sobrevivem e são compreensíveis.

## P5: Cirúrgico, não ambicioso — Nota: 2/5

**Evidência negativa**: 12+ views na navegação. 7 prompts complexos. Pipeline multi-pass com concorrência. 4 tipos de relatório. Módulo de sustentação. Refinamentos. Audit. Logs. Brain convergence. Weekly synthesis. Cross-team insights. Tudo isso com ZERO testes. O schema está na v6 (5 migrações). Cada feature adicionada é superfície de bug sem safety net.

## P6: Qualidade de extração é tudo — Nota: 4/5

**Evidência positiva**: Prompts com guards anti-trivialidade. Formato forçado de ações. Threshold de evidência para tendência emocional. Confiança explícita. Regra de convergência no ciclo. 17 refinamentos de prompts na Revisão Extensiva.

**Evidência negativa**: Sem feedback loop. Sem detecção de regressão entre Pass 1 e Pass 2. Sem métrica de qualidade dos outputs. T-R6.19 (evidências nunca triviais) ainda no backlog.

---

# DIMENSÃO 8: Classificação de Features (atualizada)

| Feature | Classificação | Justificativa |
|---|---|---|
| **Ingestion Pipeline** (multi-pass) | [CORE] | O motor do produto. Sem isso, nada funciona |
| **Perfil Vivo** (perfil.md) | [CORE] | O ativo acumulado — o valor central |
| **Dashboard** (grid + risk panel) | [CORE] | Vista central — onde o gestor começa |
| **MorningBriefing** | [CORE] | Responde "o que mudou?" em 5 segundos |
| **InboxView** (drag & drop) | [CORE] | Porta de entrada do loop |
| **PersonView** (cockpit) | [CORE] | Tudo sobre uma pessoa |
| **Modo Preparar 1:1** | [CORE] | Melhor feature do app |
| **Pauta gerada** (agenda.prompt) | [CORE] | Output primário do sistema |
| **Action Loop** (ActionRegistry) | [CORE] | Rastreamento de compromissos |
| **CalibracaoView** (batch) | [CORE] | Resolve JTBD principal |
| **Cycle Report** (cycle.prompt) | [CORE] | Entregável para calibração |
| **Pass Cerimônia** | [CORE] | Essencial para reuniões coletivas |
| **Deep Pass 1:1** | [CORE] | Motor de profundidade pós-1:1 |
| **BrainAlertPanel** | [VALOR INCREMENTAL] | Convergência inteligente, mas sobrepõe TeamRiskPanel |
| **UrgenciasHoje** | [VALOR INCREMENTAL] | Útil mas poderia ser parte do TeamRiskPanel |
| **ExternalDataPass** (Jira+GitHub) | [VALOR INCREMENTAL] | Enriquece mas app funciona sem |
| **SustentacaoView** | [VALOR INCREMENTAL] | Valiosa mas siloada |
| **SustentacaoView > Análise IA** | [VALOR INCREMENTAL] | Ação recomendada por ticket é boa, mas cara |
| **EuView** (demandas + ciclo) | [VALOR INCREMENTAL] | Self-management secundário ao core |
| **MyDemandsView** | [VALOR INCREMENTAL] | Todo list funcional, não diferenciador |
| **CrossTeamInsightsPanel** | [VALOR INCREMENTAL] | Padrões cross-team, frequência baixa |
| **Weekly Synthesis** | [SOBREPOSIÇÃO] | Sobrepõe com pauta — quando o gestor usa um vs outro? |
| **Auto-agenda** (scheduled) | [VALOR INCREMENTAL] | Sem calendário, geração proativa é baseada em timer |
| **PersonView > Artefatos tab** | [VALOR INCREMENTAL] | Referência, uso raro |
| **PersonView > Dados externos tab** | [VALOR INCREMENTAL] | Enriquece mas isolado dos outros sinais |
| **MeetingsFeedView** | [SEM USO PROVÁVEL] | Arquivo cronológico — artefatos já acessíveis por pessoa |
| **MyCycleView** (autoavaliação) | [SEM USO PROVÁVEL] | 1-2x/ano |
| **RelatoriosView** | [VALOR INCREMENTAL] | Daily é insumo para perfil vivo e resumo da operação do dia. Sprint/weekly úteis pontualmente |
| **Relatório daily** | [VALOR INCREMENTAL] | Insumo para acumulação — agrega sinais do dia que alimentam o perfil. Gestor usa como resumo da operação |
| **Relatório weekly/monthly** | [SEM USO PROVÁVEL] | Dashboard já é o relatório visual — validar uso real |
| **RefinamentosView** | [CANDIDATA A REMOÇÃO] | Scope creep — nada a ver com gestão de pessoas |
| **AuditView** | [CANDIDATA A REMOÇÃO] | Meta-feature — o app deve funcionar, não ser auditado |
| **LogsView** | [VALOR INCREMENTAL] | Observabilidade essencial na fase atual (dev=usuário, zero testes). Reclassificar quando houver outros usuários |

---

# DIMENSÃO 9: Riscos de Produção

## 9.1 Riscos técnicos ordenados por severidade

| # | Risco | Severidade | Probabilidade | Impacto |
|---|-------|-----------|---------------|---------|
| 1 | Race condition em ingestão simultânea → perfil corrompido | CRÍTICO | Média | Perda de dados acumulados |
| 2 | Migração de schema falha silenciosamente → dados inconsistentes | CRÍTICO | Baixa | Perfil corrompido sem detecção |
| 3 | Inversão temporal de artefatos → perfil com estado antigo | ALTO | Média | Pauta/relatório baseados em contexto desatualizado |
| 4 | Pass 2 regride qualidade sem detecção | ALTO | Média | Extração pior que Pass 1 aceita como verdade |
| 5 | Ações coletivas sem dono descartadas | ALTO | Alta (toda reunião coletiva) | Compromissos perdidos |
| 6 | Truncamento de artefatos >50KB sem aviso | ALTO | Baixa-média | Decisões/ações do final perdidas |
| 7 | Conquistas e Insights crescem indefinidamente | MÉDIO | Certa (com o tempo) | Perfil pesado, performance degradada |
| 8 | Fuzzy dedup marca pontos de atenção incorretamente como resolvidos | MÉDIO | Média | Ponto importante removido por falso positivo |
| 9 | pending-queue.json corrompido → itens pendentes perdidos | MÉDIO | Baixa | Artefatos em pending perdidos |
| 10 | Zero testes → qualquer mudança é risco | SISTÊMICO | Certa | Risco cresce com cada feature |

## 9.2 Garantias de processamento

| Garantia | Status |
|----------|--------|
| At-most-once (não reprocessar duplicatas) | ❌ Não garantido — reprocessamento possível |
| At-least-once (não perder dados) | ✅ Forte — persistent queue, retry on restart |
| Exactly-once | ❌ Não garantido — sem idempotency key |
| Ordem temporal | ❌ Não garantido — sem sorting por data antes de write |

---

# DIMENSÃO 10: Gaps Consolidados (cross-dimensional)

## Gaps Críticos (sem estes, a V1 tem limitações fundamentais)

### G1 — Falta âncora de hábito diário
**Dimensões:** Jornada 1, Princípio P2
**O problema:** Sem "View Esta Semana", o app não se torna o primeiro lugar que o gestor abre na segunda. O hábito de alimentar o sistema depende do hábito de abrir o app. Sem âncora temporal (calendário, 1:1s da semana), o app é reativo (gestor procura) em vez de proativo (app encontra o gestor).

### G2 — Sustentação é silo
**Dimensões:** Jornada 4, Módulos, Interconexões
**O problema:** O RiskDetector não consome dados de sustentação. Um liderado com 3 tickets em breach + saúde amarela + 1:1 atrasado aparece em 2 views separadas. A convergência de risco — a feature mais inteligente do sistema — ignora um dos sinais mais acionáveis.

### G3 — Sem feedback loop gestor → IA
**Dimensões:** Qualidade da Inteligência, Princípio P3
**O problema:** O gestor aceita tacitamente tudo que a IA escreve. Ações incorretas persistem. Pautas genéricas não são sinalizadas. O sistema não aprende com o uso — apenas com mudanças manuais nos prompts.

### G4 — UI achata inteligência sofisticada
**Dimensões:** Apresentação, Jornadas 2/3
**O problema:** O sistema produz análise de convergência de risco, tendência emocional com threshold, evidências citáveis, blocker categories — mas a UI renderiza tudo como badges, listas flat e markdown sem hierarquia. A sofisticação do motor é desperdiçada na apresentação.

### G5 — Bug: drag & drop aceita apenas .md
**Dimensões:** Jornada 5, Pipeline
**O problema:** `/\.md$/i` no InboxView ignora .txt e .pdf silenciosamente. O pipeline suporta os 3 formatos. O PITCH promete os 3. Quebra confiança no primeiro uso.

## Gaps Importantes (melhoram significativamente a experiência)

### G6 — Truncamento silencioso de artefatos longos
Decisões e ações no final de reuniões de 2h+ são perdidas sem aviso.

### G7 — Ações coletivas sem dono descartadas silenciosamente
Compromissos de reuniões coletivas se perdem se o responsável não está registrado.

### G8 — Sem detecção de regressão Pass 1 → Pass 2
Pass 2 pode produzir resultado pior que Pass 1 e ser aceito.

### G9 — Relatórios dormant
4 tipos de relatório gerados automaticamente que provavelmente ninguém lê. Consomem recursos de Claude sem evidência de valor.

### G10 — Inversão temporal de artefatos simultâneos
Dois artefatos para a mesma pessoa podem resultar em perfil com estado mais antigo.

---

# Roadmap Integrado

## Fase 1 — Fundação de qualidade (1 sprint)
**Foco:** Risco e correções imediatas

| Ação | Gap endereçado | Esforço |
|------|---------------|---------|
| Corrigir regex drag & drop para `.md\|.txt\|.pdf` | G5 | 1h |
| Aviso na UI para artefatos truncados | G6 | 2h |
| Criar ações "sem dono" em DemandaRegistry em vez de descartar | G7 | 4h |
| Testes para ArtifactWriter, IngestionPipeline, ProfileMigration | Risco sistêmico | 2-3 dias |
| Validação pré/pós migração de schema | Risco #2 | 1 dia |
| Remover RefinamentosView e AuditView da nav (manter LogsView) | P5 | 2h |

## Fase 2 — Âncora de hábito (1 sprint)
**Foco:** Transformar o app em cockpit diário

| Ação | Gap endereçado | Esforço |
|------|---------------|---------|
| Adicionar `dia_1on1` no config da pessoa | G1 | 2h |
| Criar seção "Esta Semana" no Dashboard (1:1s + ações + alertas) | G1 | 3 dias |
| Unificar 3 painéis de risco em 1 "Quem precisa de mim" | G4, P5 | 2 dias |
| Executive summary no topo do Dashboard (1 frase) | G4 | 4h |

## Fase 3 — Conectar silos (1 sprint)
**Foco:** Sustentação + People + Risk

| Ação | Gap endereçado | Esforço |
|------|---------------|---------|
| Adicionar dados de sustentação ao RiskDetector | G2 | 2 dias |
| Mostrar tickets atribuídos no cockpit da pessoa | G2 | 2 dias |
| Incluir tickets no modo "Preparar 1:1" | G2 | 1 dia |
| Validar se weekly/monthly reports são usados; manter daily como insumo de acumulação | G9 | 2h |

## Fase 4 — Feedback loop (1 sprint)
**Foco:** IA que aprende com o gestor

| Ação | Gap endereçado | Esforço |
|------|---------------|---------|
| Thumbs up/down em pautas geradas | G3 | 2 dias |
| Botão "extração errada" em ações | G3 | 1 dia |
| Armazenar feedback e injetar no prompt | G3 | 2 dias |
| Detecção de regressão Pass 1 → Pass 2 (log de delta) | G8 | 1 dia |

## Fase 5 — Polir a apresentação (1 sprint)
**Foco:** UI que faz justiça à inteligência

| Ação | Gap endereçado | Esforço |
|------|---------------|---------|
| SinceLastMeetingCard expandido (mostrar O QUE mudou, não contagem) | G4 | 2 dias |
| Flag de promovibilidade como headline, não badge | G4 | 4h |
| MarkdownPreview com callouts para alertas críticos | G4 | 1 dia |
| Cross-referencing: pauta referencia insights do perfil | G4 | 2 dias |
| Sorting temporal antes de write no ArtifactWriter | G10 | 4h |

---

# A Pergunta Final

> **O gestor abre o Pulse Cockpit toda segunda-feira por hábito — ou só quando lembra que tem 1:1?**

Se a resposta é "só quando lembra", o produto é um gerador de pautas excelente, não um cockpit de gestão. A diferença entre os dois é a âncora de hábito: uma view que organiza a semana, um painel que diz o que fazer PRIMEIRO, e uma apresentação que faz o gestor sentir que o app SABE o que está acontecendo no time dele.

O motor de inteligência já sabe. A UI ainda não mostra.
