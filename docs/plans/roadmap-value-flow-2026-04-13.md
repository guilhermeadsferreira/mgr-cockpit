# Roadmap Value Flow — Fechar os gaps de acumulacao

**Baseado em:** `docs/audits/audit-value-flow-2026-04-13.md`
**Criado:** 2026-04-13
**Status:** Planejamento
**Complementa:** `docs/plans/roadmap-v1-ajustes.md` (90% executado)

---

## Visao geral

A auditoria de value flow revelou que o motor de IA do Pulse Cockpit e mais inteligente do que o produto mostra. O sistema extrai dados sofisticados e os descarta antes de persistir. Este roadmap foca em **fechar o ultimo metro** — persistir o que ja e extraido, corrigir side effects quebrados, e completar a cadeia de acumulacao.

3 fases, ordenadas por ROI (custo de implementacao vs impacto no valor entregue):

```
Fase A: Ultimo Metro       -> "Persistir o que ja e extraido" (6 fixes, ~100 linhas)
Fase B: Side Effects        -> "Corrigir fluxos que prometem e nao entregam" (4 fixes)
Fase C: Cadeia de Ciclo     -> "O ciclo de avaliacao funciona end-to-end" (3 features)
```

**Principio:** Nenhuma feature nova. Nenhum modulo novo. So completar o que ja existe.

---

## Fase A — Ultimo Metro (persistir dados ja extraidos)

**Objetivo:** 6 campos de inteligencia que o sistema extrai e descarta passam a persistir.
**Branch:** `fix/persistir-dados-extraidos`
**Impacto:** Desbloqueia trend de engajamento, deteccao de ausencias, e enriquecimento por terceiros.
**Estimativa:** ~100 linhas de codigo total. Baixissimo risco — aditivo, sem quebrar nada.

### A.1 — Persistir `nivel_engajamento` em perfil.md

| Campo | Valor |
|-------|-------|
| **Arquivo(s)** | `ArtifactWriter.ts`, `IngestionPipeline.ts` |
| **O que fazer** | No `updateExistingPerfil()`, escrever `nivel_engajamento` (1-5) no frontmatter. Append em `saude_historico` como coluna adicional: `{date} \| {saude} \| {motivo} \| eng:{nivel}`. No `updatePerfilDeCerimonia()`, fazer o mesmo. |
| **Schema** | Frontmatter: `engajamento: 4` (ultimo valor). Historico: coluna `eng:N` ao final da linha de saude. |
| **Consumidores downstream** | RiskDetector (engajamento < 2 por 3+ artefatos = sinal), Cycle prompt (trend de engajamento), Agenda prompt (ja recebe perfilMd raw). |
| **Criterio de aceite** | Apos ingestao, `perfil.md` tem campo `engajamento` no frontmatter. `saude_historico` mostra `eng:N` por linha. |
| **Risco** | Nenhum — campo novo, aditivo. Perfis antigos sem o campo continuam funcionando. |

### A.2 — Persistir `pessoas_esperadas_ausentes` como sinal

| Campo | Valor |
|-------|-------|
| **Arquivo(s)** | `ArtifactWriter.ts` (novo metodo `appendAusencia`) |
| **O que fazer** | No `writeArtifact()`, se `result.pessoas_esperadas_ausentes.length > 0`, para cada pessoa ausente que e registrada, append em secao `## Sinais de Terceiros` do perfil da pessoa ausente: `- [{date}] Ausente em {tipo}: {titulo} (esperado presente)`. |
| **Dedup** | Por `[{date}] Ausente em` — nao duplicar se reprocessar. |
| **Consumidores** | Agenda prompt (via sinaisTerceiros), RiskDetector (3+ ausencias em 30d = sinal). |
| **Criterio de aceite** | Pessoa que faltou a reuniao coletiva tem registro em sinais de terceiros. |

### A.3 — Persistir `frequencia` de pontos de atencao

| Campo | Valor |
|-------|-------|
| **Arquivo(s)** | `ArtifactWriter.ts` — funcao `formatPontoAtencao()` |
| **O que fazer** | Alterar formato de `- {texto}` para `- {texto} (recorrente)` quando `frequencia === 'recorrente'`. |
| **Consumidores** | Agenda prompt (ao ler atencao, ve "recorrente" e prioriza). Cycle prompt (identifica padroes persistentes). |
| **Criterio de aceite** | Pontos recorrentes tem tag `(recorrente)` no perfil.md. |

### A.4 — Persistir `temas` e `impacto_potencial` de sinal-terceiro

| Campo | Valor |
|-------|-------|
| **Arquivo(s)** | `ArtifactWriter.ts` — funcao `appendSinalTerceiro()` |
| **O que fazer** | Adicionar `impacto_potencial` e `temas` ao formato de cada sinal. Formato: `- [{date}] Via {fonte} ({relacao}): {resumo}\n  Sugestao: {sugestao}\n  Impacto: {impacto_potencial} \| Temas: {temas.join(', ')} \| {categoria}, {confianca}`. |
| **Side effect adicional** | Se `impacto_potencial === 'critico'`, setar `necessita_1on1: true` no frontmatter da pessoa mencionada. |
| **Criterio de aceite** | Sinais de terceiros mostram impacto e temas. Sinal critico seta flag de 1:1 urgente. |

### A.5 — Persistir sentimentos de cerimonia em perfil.md

| Campo | Valor |
|-------|-------|
| **Arquivo(s)** | `IngestionPipeline.ts` — funcao `updatePerfilDeCerimonia()` |
| **O que fazer** | Escrever `sentimentos` na linha de `saude_historico` (mesmo formato do artefato individual: `[sent1, sent2]` ao final da linha). Escrever `nivel_engajamento` conforme A.1. |
| **Criterio de aceite** | Apos cerimonia (daily, retro, etc.), perfil do participante mostra sentimentos e engajamento no historico de saude. |

### A.6 — Persistir `tendencia_emocional` como historico (nao so ultimo valor)

| Campo | Valor |
|-------|-------|
| **Arquivo(s)** | `ArtifactWriter.ts` — funcao `update1on1Results()` |
| **O que fazer** | Alem de escrever `tendencia_emocional` no frontmatter (ultimo valor), append em nova secao `## Historico de Tendencia` com formato: `{date} \| {tendencia} \| {nota}`. Criar secao se nao existir (entre `saude_historico` e `insights_1on1`). |
| **Consumidores** | Cycle prompt (curva emocional completa ao longo do periodo). |
| **Criterio de aceite** | Apos 3 ingestoes de 1:1, secao `Historico de Tendencia` tem 3 linhas com datas e valores. |

### Criterio de aceite da fase

- `npx vitest run` passa (testes existentes nao quebram)
- Novo artefato ingerido gera `engajamento` no frontmatter
- Ponto de atencao recorrente tem tag `(recorrente)`
- Sinal de terceiro mostra impacto e temas
- Cerimonia registra sentimentos no historico de saude
- Tendencia emocional tem historico com 3+ entradas apos 3 1:1s

---

## Fase B — Side Effects Quebrados

**Objetivo:** Corrigir 4 fluxos que prometem algo na UI e nao entregam no backend.
**Branch:** `fix/side-effects-quebrados`
**Impacto:** Feedback loop funcional, modulo Eu completo, crash resolvido.

### B.1 — Fix: Override de saude deve persistir em perfil.md

| Campo | Valor |
|-------|-------|
| **Arquivo(s)** | `PersonView.tsx`, novo IPC handler em `index.ts`, `PersonRegistry.ts` |
| **Problema** | Override de saude e React state local — perde ao navegar, nao alimenta IA. |
| **O que fazer** | 1) Criar IPC handler `people:override-saude` que recebe `(slug, novoValor)`. 2) No handler: ler perfil.md, atualizar frontmatter `saude` para novo valor, append em `saude_historico`: `{date} \| {valor} \| Override manual do gestor`. 3) Setar frontmatter `saude_override: true` (flag para IA saber que e manual). 4) Na proxima ingestao, se `saude_override === true`, manter valor manual a menos que IA retorne confianca `alta` e valor diferente — nesse caso, sobrescrever e limpar flag. |
| **UI** | Badge "manual" ao lado do indicador quando `saude_override === true`. Botao "reverter para IA" que limpa flag e re-exibe ultimo valor da IA. |
| **Criterio de aceite** | Override persiste apos navegar e reabrir app. saude_historico mostra "Override manual". Proxima ingestao com confianca alta pode sobrescrever. |

### B.2 — Fix: addToCiclo em DemandaRegistry

| Campo | Valor |
|-------|-------|
| **Arquivo(s)** | `DemandaRegistry.ts`, `CicloRegistry.ts`, `index.ts` (IPC handler) |
| **Problema** | Checkbox "Adicionar ao Meu Ciclo" no UI chama `updateDemandaStatus(id, 'done', addToCiclo)` mas `DemandaRegistry.updateStatus()` ignora o terceiro argumento. |
| **O que fazer** | 1) `DemandaRegistry.updateStatus()` deve aceitar `addToCiclo?: boolean`. 2) Se `addToCiclo === true`, chamar `CicloRegistry.addFromDemanda(demanda)` que cria entrada de ciclo com: titulo = demanda.titulo, tipo = 'entrega', data = hoje, fonte = 'demanda', descricao = demanda.descricao. |
| **Criterio de aceite** | Concluir demanda com checkbox marcado → entrada aparece em Meu Ciclo. Autoavaliacao inclui a entrega. |

### B.3 — Fix: Crash `keys2.join is not a function` em SustentacaoView

| Campo | Valor |
|-------|-------|
| **Arquivo(s)** | `SustentacaoView.tsx` (linha ~894) |
| **Problema** | `byBlocker` values podem ser nao-array se AI retornar output malformado. `.join()` em nao-array = TypeError. `keys2` e nome minificado. |
| **O que fazer** | Adicionar guard: `(Array.isArray(keys) ? keys : []).join(', ')`. |
| **Criterio de aceite** | SustentacaoView nao crasha com dados malformados de ticket analysis. |

### B.4 — Fix: Sprint report GitHub data alinhada ao sprint

| Campo | Valor |
|-------|-------|
| **Arquivo(s)** | `SprintReportGenerator.ts` |
| **Problema** | Usa `commits30d` e `prsMerged30d` do snapshot rolling — nao reflete o periodo do sprint. |
| **O que fazer** | Substituir snapshot por chamadas period-scoped: `GitHubClient.getCommitsByUser(user, sprintStart, sprintEnd)` e `GitHubClient.getPRsByUser(user, sprintStart, sprintEnd)`. Mesmo pattern que `WeeklyReportGenerator` ja usa. |
| **Criterio de aceite** | Sprint report de 2 semanas mostra commits/PRs daquele periodo, nao dos ultimos 30 dias. |

### Criterio de aceite da fase

- Override de saude sobrevive a navegacao e reload
- Demanda concluida com addToCiclo aparece em Meu Ciclo
- SustentacaoView nao crasha com byBlocker malformado
- Sprint report com GitHub scoped ao sprint

---

## Fase C — Cadeia de Ciclo (cycle report end-to-end)

**Objetivo:** O ciclo de avaliacao funciona como cadeia completa, nao como output isolado.
**Branch:** `feat/cadeia-ciclo`
**Impacto:** Cycle report se torna reutilizavel, comparavel, e alimenta fluxos downstream.

### C.1 — Cycle report per-person (nao em exports/ flat)

| Campo | Valor |
|-------|-------|
| **Arquivo(s)** | `index.ts` (handler `ai:cycle-report`), `PersonRegistry.ts` |
| **O que fazer** | 1) Salvar cycle report em `pessoas/{slug}/ciclos/{date}-ciclo.md` (alem de exports/). 2) Criar `PersonRegistry.listCycleReports(slug)` que retorna lista de ciclos com data e path. 3) Criar `PersonRegistry.getLastCycleReport(slug)` que retorna o mais recente. |
| **Side effect downstream** | Na proxima geracao de cycle report, injetar ultimo ciclo como input do prompt: secao "Ciclo anterior" com resumo + flag de promovibilidade anterior. O prompt pode comparar evolucao. |
| **Criterio de aceite** | Cycle report salvo per-person. Segundo ciclo do mesmo liderado cita evolucao desde o ciclo anterior. |

### C.2 — Source attribution no cycle report

| Campo | Valor |
|-------|-------|
| **Arquivo(s)** | `cycle.prompt.ts` |
| **O que fazer** | Adicionar regra no prompt: cada bullet em `entregas_e_conquistas`, `padroes_de_comportamento`, `evidencias_promovibilidade` deve incluir `[artefato: {date}]` ou `[fonte: dados_externos]` ou `[fonte: sinal_terceiro]` indicando de onde veio a evidencia. |
| **Formato** | `"Liderou migração do auth [artefato: 2026-02-15], reduzindo incidents em 40% [fonte: dados_externos]"` |
| **Criterio de aceite** | Cycle report gerado tem source tags em >80% dos bullets. Gestor pode rastrear cada afirmacao ate o artefato original. |

### C.3 — Aumentar cap de sinais de terceiros para 50

| Campo | Valor |
|-------|-------|
| **Arquivo(s)** | `ArtifactWriter.ts` — funcao `appendSinalTerceiro()` |
| **O que fazer** | Mudar FIFO cap de 20 para 50. Alternativa: manter 20 ativos + mover excedentes para `sinais_terceiros_arquivados` (secao nova). Cycle prompt le ambas secoes. |
| **Justificativa** | Com reunioes semanais, 20 sinais cobrem ~5 meses. Em 6 meses de ciclo, sinais do Q1 ja sumiram. Com 50, cobre 1 ano+. |
| **Criterio de aceite** | Perfil com 30 sinais de terceiros nao perde os mais antigos. Cycle report de 6 meses tem acesso a todos os sinais do periodo. |

### Criterio de aceite da fase

- Cycle report salvo em `pessoas/{slug}/ciclos/`
- Segundo cycle report cita evolucao desde o anterior
- Bullets com source attribution rastreavel
- Sinais de terceiros retidos por pelo menos 12 meses

---

## Dependencias entre fases

```
Fase A (Ultimo Metro) ──→ independente, pode comecar imediatamente
Fase B (Side Effects) ──→ independente, pode comecar imediatamente
Fase C (Cadeia Ciclo) ──→ A.6 (tendencia historico) desejavel antes de C.2

Execucao paralela: A e B podem rodar em paralelo (branches diferentes)
Fase C apos A (para que cycle report tenha dados enriquecidos)
```

---

## Comparativo: antes vs depois

| Metrica | Antes (auditoria 04/13) | Apos Fase A+B+C |
|---------|-------------------------|-----------------|
| Campos extraidos e descartados | 7 (engajamento, ausencias, frequencia, temas terceiro, impacto, sentimentos cerimonia, tendencia historico) | 0 |
| Override de saude funcional | Nao (cosmetico) | Sim (persiste + alimenta IA) |
| addToCiclo funcional | Nao (backend ignora) | Sim (demanda → ciclo → autoavaliacao) |
| Cycle report reutilizavel | Nao (exports/ flat, terminal) | Sim (per-person, comparavel, com sources) |
| Sprint report GitHub alinhado | Nao (30d rolling) | Sim (sprint-bounded) |
| Sinais de terceiros retidos | 20 max (~5 meses) | 50 max (~12 meses) |
| Crash SustentacaoView | Possivel (byBlocker malformado) | Guard aplicado |
| Scorecard medio por fluxo | 3.4/5 | ~4.1/5 (estimado) |

---

## Prioridade de execucao recomendada

```
Semana 1:  Fase A (6 tasks, ~100 linhas, maximo ROI)
           + B.3 (fix crash, 1 linha)
Semana 2:  Fase B (B.1, B.2, B.4)
Semana 3:  Fase C (C.1, C.2, C.3)
```

**Total: ~3 semanas, 13 tasks.**

Fase A e a mais importante: custo minimo, impacto maximo. Todo o investimento em IA ja foi feito na extracao — falta so o ultimo metro de persistencia.

---

## Items do roadmap V1 ainda pendentes

Para referencia, estes items do roadmap original (abril 9) ainda nao estao completos:

| Item | Status | Nota |
|------|--------|------|
| 4.3.1 Override de saude | PARTIAL | Absorbido por B.1 deste plano |
| Catch-up de sintese semanal | NAO FEITO | Considerar para roadmap futuro |
| Trigger manual para sintese semanal | NAO FEITO | Considerar para roadmap futuro |
| Enriquecer gestor-upward agenda | NAO FEITO | Considerar para roadmap futuro |
| Monthly report sem sustentacao | NAO FEITO | Considerar para roadmap futuro |
| LogsView acessivel no menu | NAO FEITO | Considerar para roadmap futuro |

Estes items tem impacto menor que as 3 fases acima e podem ser endereçados num roadmap posterior.

---

*Documento vivo — atualizar conforme tasks forem concluidas.*
