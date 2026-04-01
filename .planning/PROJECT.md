# Pulse Cockpit

## O que é

App desktop (Electron + React) para gestores de tecnologia que transforma transcricoes, anotacoes e dados de cerimonias (1:1s, dailies, plannings, retros) num sistema vivo de inteligencia sobre pessoas. O gestor arrasta um arquivo na inbox, a IA analisa, e o perfil de cada pessoa cresce com o tempo — alimentando pautas, alertas e relatorios de ciclo.

## Persona

**Guilherme** — Engineering Manager de fintech, 8-12 reports diretos entre liderados, pares e gestores. Faz 1:1s semanais/quinzenais, conduz plannings e retros, defende liderados em foruns de calibracao trimestrais. Ja usa transcricao automatica (Gemini no Meet) e Claude Code CLI no dia a dia. Quer parar de gerir de cabeca.

**Dores reais:**
- Chega no forum de calibracao sem evidencias concretas — compila tudo na vespera
- Pautas de 1:1 genericas porque nao lembra o que aconteceu nas ultimas semanas
- Acoes comprometidas em reunioes se perdem — ninguem cobra, ninguem rastreia
- Nao sabe quem do time esta travado ate que ja e tarde demais
- Dados de gestao espalhados em Notion, Drive, Slack, email e memoria

**Comportamento:** power user tecnico. Prefere dados locais, markdown, CLI. Nao quer SaaS de RH. Quer algo que funcione como "segundo cerebro" — ele alimenta, o sistema acumula e devolve inteligencia.

## JTBD

**Job principal:**
> Quando estou num forum de calibracao defendendo um liderado, quero ter uma narrativa clara com evidencias da evolucao dele no ciclo — para defender com confianca se merece promocao, ficou acima/abaixo das expectativas e qual foi seu papel nos desafios do time.

**Jobs secundarios:**
- Antes de um 1:1, ter pauta gerada com base no historico real da pessoa
- Ser alertado sobre liderados sem contato recente ou com sinais de risco
- Rastrear acoes comprometidas sem esforco manual
- Ter visao consolidada do time: quem precisa de atencao agora

## Principios de produto

1. **Acumulacao > feature.** O valor do Pulse vem do efeito composto: cada ingestao enriquece o perfil, que melhora a pauta, que melhora o 1:1, que gera melhor transcricao. Priorizar qualidade do que ja existe sobre adicionar coisas novas.

2. **O app encontra o gestor.** Alertas, pautas e briefings aparecem sem o gestor precisar procurar. O default e proatividade, nao navegacao.

3. **IA sugere, gestor decide.** Nenhum dado e sobrescrito automaticamente sem confirmacao. O gestor e o dono do contexto — a IA e assistente, nao autora.

4. **Dados locais, transparentes, portaveis.** Tudo em Markdown + YAML no disco. Sem servidor, sem banco, sem lock-in. O gestor pode abrir qualquer arquivo no VS Code.

5. **Cirurgico, nao ambicioso.** Mudancas pequenas e precisas que melhoram o que existe. Sem refatoracoes largas. Sem features especulativas. Sem abstractions prematuros.

6. **Qualidade de extracao e tudo.** Se o prompt extrai mal, todo o sistema degrada. Prompt refinement e a alavanca de maior impacto.

## Como geramos valor

```
Gestor ingere artefato (transcricao, anotacao, PDF)
  → IA analisa em 2 passes (sem contexto → com perfil acumulado)
    → Perfil Vivo cresce (resumo evolutivo, acoes, temas, saude, sentimento)
      → Pauta de 1:1 usa contexto acumulado → 1:1 melhor → transcricao mais rica
      → Alertas proativos (risco, estagnacao, 1:1 atrasado)
      → Relatorio de Ciclo com evidencias concretas para calibracao
```

**Loop central:** ingestao → perfil mais rico → outputs melhores → gestor ingere mais.

## O que ja foi entregue

- **V1 core:** People Registry, Inbox + Pipeline two-pass, Perfil Vivo, Pauta 1:1, Relatorio de Ciclo, Dashboard + TeamRiskPanel
- **V2 core:** Pipeline paralelo, schema v5, Action Loop com audit trail e escalation, alertas inteligentes, Modulo "Eu" (demandas + autoavaliacao), templates de artefato, flag_promovibilidade com evidencias
- **V3 External Intelligence:** JiraClient, GitHubClient, metricas (cycle time, velocity, code review depth, collaboration score), CrossAnalyzer, 4 report generators (daily/weekly/monthly/sprint), RelatoriosView
- **Revisao Extensiva:** 17 prompt refinements, pipeline & schema cleanup, GitHub metrics avancados, action system com audit trail, cross-team insights, agenda generation agendada

## Backlog — ideias e features futuras

> Itens para considerar em futuros milestones. Nao sao compromissos — sao opcoes.

### Alta prioridade (proximo milestone provavel)

- **View Hoje / Esta Semana** — ancora de habito diario: "quem tenho 1:1 essa semana?", "quais acoes vencem hoje?", "alertas ativos"
- **Icone do app** (macOS .icns) — identidade visual pendente
- **Font family** — inconsistencia atual (DM Sans no CSS, Inter no Tailwind). Bench de 10 fontes.
- **Action Loop surfaces restantes** — follow-ups na pauta automatico, widget de acoes no dashboard, editar prazo na UI

### Media prioridade

- **Integracao Slack MCP** — ingestao passiva de mensagens de canais do time
- **Entidade Projeto** — perfil vivo por projeto, analogo ao perfil de pessoas
- **Revisao de notas manuais pos-ciclo** — IA sugere atualizacao de notas_manuais apos gerar relatorio
- **PDI com UI dedicada** — evidence aggregation ja existe no deep pass, falta view propria
- **Caso de promocao** — gerado pela IA com base no perfil + projetos + artefatos

### Baixa prioridade / exploratoria

- **Modulo de Incidentes** — cockpit le repo git de IRs, calcula disponibilidade por BU
- **Knowledge Base de sistemas** — docs de sistemas com consulta via IA
- **Google Drive integration** — monitorar pasta de transcricoes sem download manual
- **Session learning** — log de sessao ao fechar o app (artefatos processados, temas abordados)
- **Alertas inteligentes avancados** — negligencia (atencao desigual), estagnacao (tema repetido 3+x), evolucao comprovada
- **Feed de reunioes** — timeline reversa filtavel (ja existe MeetingsFeedView, melhorar)
- **Weekly Digest** — agregacao semanal (time + eu + jira)
- **Tags de skills** — inferidas automaticamente de artefatos
- **Frameworks por cargo** — mapeamento cargo → framework em prompts

### Tecnico (backlog de qualidade)

- **T-R6.19** — Evidencias nunca triviais: guard nos prompts rejeitando "participou da reuniao"
- **T6.3** — Cycle time por pessoa no Sprint Report (dado existe, falta expor)
- **T6.4** — Lead time do time no Weekly Report (metrica nova)
- **T6.5** — Velocity trend no Monthly Report (historico de SP)
- **T6.2** — PR sem reviewer (alerta especifico no CrossAnalyzer)
- **T-R10.4** — Schema validation no retorno de dados externos (Zod)
- **T-R5.2** — Sync bidirecional acoes ↔ Jira (direcao inversa: issue → acao)

## Constraints

- **Producao:** App em uso real com dados irreversiveis — nenhuma operacao destrutiva sem confirmacao
- **Tech stack:** Electron + React + TypeScript — nao mudar
- **IA:** Exclusivamente Claude Code CLI (`claude -p`) — nunca SDK/API
- **Dados:** Workspace em disco (Markdown + YAML) — sem banco de dados
- **Schema:** Mudancas em perfil.md devem ser aditivas; nunca remover campos sem migration
- **Sem testes:** Zero coverage — priorizar mudancas cirurgicas

## Criterios de sucesso

| Metrica | Meta |
|---------|------|
| Tempo para gerar relatorio de ciclo | < 2 minutos |
| Esforco de preparacao para forum | De 2h+ → < 20min |
| Ingestao semanal apos 30 dias | >= 1 artefato/semana |
| Pauta util (gestor nao descarta) | >= 80% das pautas geradas |

---
*Last updated: 2026-04-01*
