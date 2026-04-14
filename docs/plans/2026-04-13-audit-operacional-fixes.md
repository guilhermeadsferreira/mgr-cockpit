# Audit Operacional — Plano de Correções e Melhorias

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir bugs críticos e gaps identificados na auditoria operacional de 2026-04-13, cobrindo 4 eixos: Daily automático, Relatórios, Dados Externos (Jira/GitHub), e Sustentação.

**Architecture:** Mudanças cirúrgicas em módulos existentes — sem novos arquivos, sem refactors estruturais. Cada task é independente e commitável separadamente. Ordem de execução segue impacto: primeiro data integrity (JQL/SP), depois funcionalidade core (daily auto), depois quality-of-life.

**Tech Stack:** Electron + React + TypeScript, Jira REST API v3, GitHub REST API, Claude Code CLI

---

## Wave 1 — Data Integrity (Dados Externos)

### Task 1: Corrigir escopo do JQL e cálculo de workloadScore

O bug mais crítico do produto: `issuesAbertas` e `workloadScore` contam TODAS as issues abertas do dev (incluindo backlog e sprints passados), não apenas as do sprint ativo. Além disso, o cálculo de SP usa `allIssues` (incluindo Done) em vez de `openIssues`.

**Files:**
- Modify: `src/main/external/JiraMetrics.ts:66-82` (fetchJiraMetrics + computeWorkloadScore)
- Modify: `src/main/external/JiraMetrics.ts:33-44` (JiraPersonMetrics interface)
- Modify: `src/main/external/ExternalDataPass.ts:540-555` (buildExternalSection)

**Contexto:** `JiraMetrics.fetchJiraMetrics()` já busca dados do sprint ativo na linha 122-146 via `client.getSprintIssues()`. O problema é que `issuesAbertas` e `workloadScore` são calculados a partir de `searchIssuesByAssignee()` (JQL `status != Done` sem filtro de sprint). A solução: usar `sprintAtual` (que já existe e está correto) para o workloadScore, e manter `issuesAbertas` como total mas adicionar `issuesSprintAbertas` para o sprint.

- [ ] **Step 1: Adicionar `issuesSprintAbertas` à interface JiraPersonMetrics**

Em `src/main/external/JiraMetrics.ts`, adicionar campo novo à interface e ao EMPTY_METRICS:

```typescript
// Na interface JiraPersonMetrics, após issuesAbertas:
issuesSprintAbertas: number

// Em EMPTY_METRICS, após issuesAbertas: 0:
issuesSprintAbertas: 0,
```

- [ ] **Step 2: Corrigir o SP bug e calcular workloadScore com dados de sprint**

Em `src/main/external/JiraMetrics.ts`, dentro de `fetchJiraMetrics()`:

Substituir linha 81:
```typescript
const workloadScore = computeWorkloadScore(openIssues.length, allIssues.reduce((sum, i) => sum + (i.storyPoints || 0), 0))
```
Por:
```typescript
const openSP = openIssues.reduce((sum, i) => sum + (i.storyPoints || 0), 0)
```

Após o bloco de `sprintAtual` (após linha 146), adicionar:
```typescript
// workloadScore baseado em sprint (se disponível) ou total de abertas
const sprintOpenCount = sprintAtual
  ? sprintAtual.totalIssues - sprintAtual.issuesConcluidas
  : openIssues.length
const sprintOpenSP = sprintAtual
  ? sprintAtual.comprometido - sprintAtual.entregue
  : openSP
const workloadScore = computeWorkloadScore(sprintOpenCount, sprintOpenSP)
const issuesSprintAbertas = sprintAtual
  ? sprintAtual.totalIssues - sprintAtual.issuesConcluidas
  : openIssues.length
```

No return, adicionar:
```typescript
issuesSprintAbertas,
```

- [ ] **Step 3: Atualizar buildExternalSection para mostrar ambas contagens**

Em `src/main/external/ExternalDataPass.ts`, na função `buildExternalSection()`, substituir a linha:
```typescript
lines.push(`- Issues abertas: ${jira.issuesAbertas} | Workload: ${jira.workloadScore}`)
```
Por:
```typescript
const sprintLabel = jira.issuesSprintAbertas !== jira.issuesAbertas
  ? ` (${jira.issuesSprintAbertas} no sprint, ${jira.issuesAbertas} total)`
  : ` (${jira.issuesAbertas})`
lines.push(`- Issues abertas:${sprintLabel} | Workload: ${jira.workloadScore}`)
```

Nota: `issuesSprintAbertas` pode não existir em snapshots antigos. Adicionar fallback:
```typescript
const sprintAbertas = jira.issuesSprintAbertas ?? jira.issuesAbertas
```

- [ ] **Step 4: Rodar testes**

Run: `cd /Users/guilhermeaugusto/Documents/workspace-projects/pulse-cockpit && npx vitest run`
Expected: PASS (testes existentes não cobrem JiraMetrics diretamente, mas garantir que nada quebrou)

- [ ] **Step 5: Commit**

```bash
git add src/main/external/JiraMetrics.ts src/main/external/ExternalDataPass.ts
git commit -m "fix(external): workloadScore baseado em sprint ativo, não backlog completo

- issuesAbertas mantido como total, novo issuesSprintAbertas para sprint
- SP bug corrigido: usa openIssues em vez de allIssues no cálculo
- buildExternalSection mostra ambas contagens para transparência"
```

---

### Task 2: Excluir draft PRs do count de prsAbertos

Draft PRs inflam `prsAbertos` e podem disparar falsos positivos no insight `prs_acumulando`.

**Files:**
- Modify: `src/main/external/GitHubMetrics.ts:62`

- [ ] **Step 1: Filtrar drafts**

Em `src/main/external/GitHubMetrics.ts`, substituir:
```typescript
const openPRs = prs.filter(pr => pr.state === 'open')
```
Por:
```typescript
const openPRs = prs.filter(pr => pr.state === 'open' && !pr.draft)
```

- [ ] **Step 2: Commit**

```bash
git add src/main/external/GitHubMetrics.ts
git commit -m "fix(external): excluir draft PRs da contagem de prsAbertos

Drafts não estão aguardando review e inflavam o insight prs_acumulando."
```

---

## Wave 2 — Daily Automático

### Task 3: Desacoplar daily report do guard de integrações externas

O daily report está preso dentro do bloco que exige Jira ou GitHub habilitados. Sem integrações, o daily nunca é gerado automaticamente.

**Files:**
- Modify: `src/main/external/Scheduler.ts:65-89`
- Modify: `src/main/registry/SettingsManager.ts:102-109`

- [ ] **Step 1: Reestruturar onAppStart() no Scheduler**

Em `src/main/external/Scheduler.ts`, substituir o bloco `onAppStart()` (linhas 65-144) por esta estrutura:

```typescript
async onAppStart(): Promise<void> {
    const settings = SettingsManager.load()
    const jiraEnabled = !!(settings.jiraEnabled && settings.jiraBaseUrl && settings.jiraApiToken)
    const githubEnabled = !!(settings.githubEnabled && settings.githubToken)

    const hasIntegrations = jiraEnabled || githubEnabled

    if (hasIntegrations && this.shouldRunDaily()) {
      log.info('daily trigger: iniciando refresh externo')
      await this.runForAllPeople()
      this.markDailyRun()
    } else if (!hasIntegrations) {
      log.info('integrações externas desativadas, pulando refresh de dados')
    }

    // Daily report roda independentemente das integrações
    if (this.shouldRunDaily() || !this.hasRunDailyToday()) {
      if (settings.dailyReportEnabled !== false) {
        try {
          const generator = new DailyReportGenerator(this.workspacePath)
          await generator.generate()
          log.info('daily report gerado com sucesso')
        } catch (err) {
          log.warn('daily report falhou', { error: err instanceof Error ? err.message : String(err) })
        }
      }

      // Mark daily even if only report ran (not data refresh)
      if (!hasIntegrations) {
        this.markDailyRun()
      }
    }

    // Ticket analysis automático de sustentação (após daily report)
    if (hasIntegrations && settings.jiraSupportProjectKey && settings.claudeBinPath) {
```

O resto do método (`ticketAnalysis`, `brain risk`, `weekly synthesis`, `sprint polling`, `github sync`, `auto agenda`) permanece igual — todo o bloco de `// Ticket analysis automático` até o fim de `onAppStart()`.

Nota: a condição muda de `dailyReportEnabled` (truthy check) para `dailyReportEnabled !== false` (default true). Isso significa que instalações novas sem a setting terão o daily ativo por padrão.

- [ ] **Step 2: Adicionar helper hasRunDailyToday()**

Após `shouldRunDaily()` no Scheduler, adicionar:

```typescript
private hasRunDailyToday(): boolean {
  const state = this.loadState()
  const today = new Date().toISOString().slice(0, 10)
  return state.lastDailyRun === today
}
```

- [ ] **Step 3: Rodar testes**

Run: `cd /Users/guilhermeaugusto/Documents/workspace-projects/pulse-cockpit && npx vitest run`

- [ ] **Step 4: Commit**

```bash
git add src/main/external/Scheduler.ts
git commit -m "fix(scheduler): daily report roda independente de integrações Jira/GitHub

- Desacoplado do guard de integrações externas
- dailyReportEnabled default true (antes era falsy para undefined)
- Gestor sem Jira/GitHub agora recebe daily report no startup"
```

---

### Task 4: RelatoriosView recarrega lista quando daily é gerado em background

Quando o daily é gerado no startup, a UI não atualiza a lista de relatórios.

**Files:**
- Modify: `src/renderer/src/views/RelatoriosView.tsx:36-47`

- [ ] **Step 1: Chamar loadReports() no handler de done**

Em `src/renderer/src/views/RelatoriosView.tsx`, substituir:
```typescript
  useEffect(() => {
    window.api.external.onProgress((data: ReportProgress) => {
      if (data.step === 'done') {
        setProgressMsg(null)
        setProgressPct(0)
      } else {
        setProgressMsg(data.message)
        setProgressPct(data.percent)
      }
    })
    return () => window.api.external.removeProgressListener()
  }, [])
```
Por:
```typescript
  useEffect(() => {
    window.api.external.onProgress((data: ReportProgress) => {
      if (data.step === 'done') {
        setProgressMsg(null)
        setProgressPct(0)
        void loadReports()
      } else {
        setProgressMsg(data.message)
        setProgressPct(data.percent)
      }
    })
    return () => window.api.external.removeProgressListener()
  }, [])
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/views/RelatoriosView.tsx
git commit -m "fix(ui): recarregar lista de relatórios quando daily é gerado em background

Antes a lista só atualizava com click manual. Agora loadReports() roda
automaticamente quando o Scheduler conclui a geração."
```

---

## Wave 3 — Qualidade dos Insights

### Task 5: Propagar alertas cycle_time para perfil.md via AlertBridge

Alertas de `cycle_time` são escritos em `metricas.md` mas não propagam para `perfil.md`, ao contrário de `blocker` e `wip_alto`.

**Files:**
- Modify: `src/main/external/DailyReportGenerator.ts:224-225`

- [ ] **Step 1: Incluir cycle_time no filtro do AlertBridge**

Em `src/main/external/DailyReportGenerator.ts`, substituir:
```typescript
        const profileAlerts = alerts.filter(a => a.tipo === 'blocker' || a.tipo === 'wip_alto')
```
Por:
```typescript
        const profileAlerts = alerts.filter(a => a.tipo === 'blocker' || a.tipo === 'wip_alto' || a.tipo === 'cycle_time')
```

- [ ] **Step 2: Commit**

```bash
git add src/main/external/DailyReportGenerator.ts
git commit -m "fix(daily): propagar alertas cycle_time para perfil.md via AlertBridge

Antes só blocker e wip_alto alimentavam Pontos de Atenção no perfil.
Tasks travadas em um status por muito tempo agora também aparecem."
```

---

### Task 6: Adicionar disclaimer de dados externos no prompt 1on1-deep

O `agenda.prompt.ts` tem caveat sobre commits/PRs serem contexto de volume. O `1on1-deep.prompt.ts` injeta os mesmos dados sem disclaimer.

**Files:**
- Modify: `src/main/prompts/1on1-deep.prompt.ts` (buscar onde externalData é injetado)

- [ ] **Step 1: Localizar injeção de externalData**

Buscar no arquivo a string `externalData` ou `Dados Externos` e adicionar disclaimer.

- [ ] **Step 2: Adicionar disclaimer**

Após a linha que injeta externalData, adicionar:
```typescript
+ '\n> Contagens de commits e PRs são contexto de volume — não refletem impacto ou qualidade. Use-as para formular perguntas, não como evidências de desempenho.\n'
```

- [ ] **Step 3: Commit**

```bash
git add src/main/prompts/1on1-deep.prompt.ts
git commit -m "fix(prompts): adicionar disclaimer de dados externos no deep 1:1

Alinha com agenda.prompt.ts que já tem caveat sobre commits/PRs
serem volume, não performance."
```

---

## Wave 4 — Sustentação: Visibilidade

### Task 7: Renderizar análise executiva de sustentação na UI

A análise executiva do board é gerada mas nunca renderizada — o output vai para `metricas.md` e o gestor não vê.

**Files:**
- Modify: `src/main/index.ts` (handler IPC de `run-analysis`)
- Modify: `src/renderer/src/views/SustentacaoView.tsx` (renderizar análise)

- [ ] **Step 1: Verificar o que o handler retorna**

Ler o handler IPC `sustentacao:run-analysis` em `src/main/index.ts` para entender o que é retornado vs o que é descartado. O board analysis string precisa chegar ao renderer.

- [ ] **Step 2: Retornar analysis no resultado IPC**

Se o handler já retorna `{ enrichedTickets, error }`, adicionar `boardAnalysis` ao retorno:
```typescript
return { enrichedTickets: result.enrichedTickets, boardAnalysis: result.analysis, error: result.error }
```

- [ ] **Step 3: Renderizar no SustentacaoView**

Adicionar estado `boardAnalysis` e renderizar em seção colapsável após os cards de métricas:

```tsx
const [boardAnalysis, setBoardAnalysis] = useState<string | null>(null)

// No handler de análise:
const result = await window.api.sustentacao.runAnalysis()
if (result.boardAnalysis) setBoardAnalysis(result.boardAnalysis)

// No JSX, após os cards de métricas e antes da tabela de tickets:
{boardAnalysis && (
  <div className="board-analysis">
    <h3>Análise Executiva</h3>
    <MarkdownPreview content={boardAnalysis} />
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/main/index.ts src/renderer/src/views/SustentacaoView.tsx
git commit -m "fix(sustentacao): renderizar análise executiva do board na UI

Antes o output da análise IA ia para metricas.md e era invisível.
Agora aparece como seção colapsável após os cards de métricas."
```

---

### Task 8: Mostrar indicação do cap de 15 tickets na análise

O `.slice(0, 15)` descarta tickets silenciosamente. O gestor com 30 breaches acha que todos foram analisados.

**Files:**
- Modify: `src/main/index.ts` (onde o slice acontece)
- Modify: `src/renderer/src/views/SustentacaoView.tsx` (mostrar aviso)

- [ ] **Step 1: Retornar totalBreachTickets junto com enrichedTickets**

No handler IPC, antes do `.slice(0, 15)`, salvar o total e retornar:
```typescript
const totalBreachTickets = breachTickets.length
const ticketsToAnalyze = breachTickets.slice(0, 15)
// ... análise ...
return { enrichedTickets, totalBreachTickets, error }
```

- [ ] **Step 2: Mostrar aviso na UI quando há cap**

No `SustentacaoView.tsx`, se `totalBreachTickets > enrichedTickets.length`:
```tsx
{totalBreachTickets > enrichedTickets.length && (
  <div className="analysis-cap-warning">
    Analisados {enrichedTickets.length} de {totalBreachTickets} tickets em breach
    (limite por execução: 15)
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/main/index.ts src/renderer/src/views/SustentacaoView.tsx
git commit -m "fix(sustentacao): informar quando análise atinge cap de 15 tickets

Antes o gestor com 30 breaches achava que todos foram analisados.
Agora mostra 'Analisados 15 de 30 tickets'."
```

---

## Wave 5 — Relatórios: Gaps de Conteúdo

### Task 9: Completar dead code do alerta B5 (task movida de volta)

O DailyReportGenerator tem um stub vazio para detectar tasks que voltaram para Dev.

**Files:**
- Modify: `src/main/external/DailyReportGenerator.ts:638-652`

- [ ] **Step 1: Implementar detecção B5**

Substituir o bloco vazio (linhas 638-652) por:

```typescript
      // B5: Task moveu pra trás (issue em Dev com daysInStatus <= 1 que teve status review no changelog)
      for (const task of report.activeTasks) {
        if (task.statusCategory === 'dev' && task.daysInStatus <= 1) {
          // Verificar se existe atividade recente de review para esta issue
          const hadReviewActivity = activity.jiraActivity.some(
            j => j.issueKey === task.key && j.status.toLowerCase().includes('review')
          )
          if (hadReviewActivity) {
            alerts.push(`🔙 **${task.key}** voltou para Dev após review — verificar se há changes requested ou rejeição`)
          }
        }
      }
```

- [ ] **Step 2: Commit**

```bash
git add src/main/external/DailyReportGenerator.ts
git commit -m "fix(daily): implementar alerta B5 — task que volta para Dev após review

Era dead code stub. Agora detecta tasks com daysInStatus <= 1 em Dev
que tiveram atividade de review no dia anterior."
```

---

### Task 10: Sprint report — preencher entregas e corrigir fallback de 30d

`entregas` é sempre array vazio. PRs/commits fazem fallback silencioso para dados de 30d.

**Files:**
- Modify: `src/main/external/SprintReportGenerator.ts:144-165`

- [ ] **Step 1: Preencher entregas com issues concluídas do sprint**

No bloco onde `sprintEntry` é construído, substituir:
```typescript
entregas: [],
```
Por:
```typescript
entregas: sprintIssues
  .filter(i => i.statusCategory === 'done')
  .map(i => `${i.key}: ${i.summary}`)
  .slice(0, 20),
```

Nota: `sprintIssues` é a variável que contém as issues do sprint para esta pessoa. Verificar o nome exato no contexto.

- [ ] **Step 2: Commit**

```bash
git add src/main/external/SprintReportGenerator.ts
git commit -m "fix(sprint-report): preencher entregas com issues concluídas do sprint

Antes entregas era sempre array vazio. Agora lista issues Done do sprint."
```

---

### Task 11: Monthly report — adicionar seção de sustentação

O Weekly tem seção de sustentação, o Monthly não. Monthly é o lugar natural para trend de SLA.

**Files:**
- Modify: `src/main/external/MonthlyReportGenerator.ts`

- [ ] **Step 1: Importar fetchSustentacaoForReport**

Adicionar import no topo:
```typescript
import { fetchSustentacaoForReport } from './SupportBoardClient'
```

- [ ] **Step 2: Buscar dados de sustentação no generate()**

Após o bloco de fetch de dados GitHub e antes de buildReport(), adicionar:
```typescript
let sustentacaoSnapshot: SupportBoardSnapshot | null = null
if (settings.jiraSupportBoardId && settings.jiraBaseUrl && settings.jiraApiToken) {
  try {
    sustentacaoSnapshot = await fetchSustentacaoForReport(settings)
  } catch (err) {
    log.warn('sustentação fetch falhou no monthly', { error: err instanceof Error ? err.message : String(err) })
  }
}
```

- [ ] **Step 3: Adicionar seção de sustentação no buildReport()**

Antes da seção de bloqueios/riscos, adicionar:
```typescript
if (sustentacaoSnapshot) {
  lines.push('## Sustentação do Mês')
  lines.push(`- Tickets abertos: ${sustentacaoSnapshot.ticketsAbertos}`)
  lines.push(`- Em breach: ${sustentacaoSnapshot.ticketsEmBreach}`)
  lines.push(`- Compliance SLA: ${sustentacaoSnapshot.complianceRate7d}%`)
  if (sustentacaoSnapshot.porAssignee) {
    lines.push('### Carga por Pessoa')
    for (const [assignee, data] of Object.entries(sustentacaoSnapshot.porAssignee)) {
      lines.push(`- **${assignee}**: ${data.total} tickets (${data.breach} breach)`)
    }
  }
  lines.push('')
}
```

- [ ] **Step 4: Commit**

```bash
git add src/main/external/MonthlyReportGenerator.ts
git commit -m "feat(monthly-report): adicionar seção de sustentação

Alinha com Weekly que já tem sustentação. Monthly é o lugar natural
para análise de trend de SLA e carga de suporte."
```

---

## Wave 6 — Sustentação: Integração com Produto

### Task 12: Injetar carga de sustentação na pauta de 1:1

O gestor prepara 1:1 sem saber que o dev está sobrecarregado de tickets de suporte.

**Files:**
- Modify: `src/main/prompts/agenda.prompt.ts` (adicionar sustentação ao prompt)
- Modify: `src/main/index.ts` (buscar dados de sustentação ao gerar pauta)

- [ ] **Step 1: Verificar como externalData é construído para a pauta**

Ler o handler IPC de geração de pauta em `index.ts` para entender onde `externalData` é montado e injetado no prompt.

- [ ] **Step 2: Adicionar dados de sustentação ao bloco de dados externos**

No handler de geração de pauta, após buscar `externalData` do perfil.md, buscar a carga de sustentação da pessoa via `porAssignee` do snapshot de sustentação mais recente:

```typescript
// Buscar carga de sustentação se disponível
let sustentacaoContext = ''
if (settings.jiraSupportBoardId) {
  try {
    const cachePath = join(settings.workspacePath, '..', 'cache', 'sustentacao-snapshot.json')
    if (existsSync(cachePath)) {
      const snapshot = JSON.parse(readFileSync(cachePath, 'utf-8'))
      const person = registry.get(slug)
      const jiraEmail = person?.jiraEmail?.toLowerCase()
      if (jiraEmail && snapshot.porAssignee) {
        const assigneeData = Object.entries(snapshot.porAssignee)
          .find(([key]) => key.toLowerCase() === jiraEmail)
        if (assigneeData) {
          const [, data] = assigneeData as [string, { total: number; breach: number }]
          sustentacaoContext = `\n### Sustentação\n- Tickets atribuídos: ${data.total} (${data.breach} em breach)\n`
        }
      }
    }
  } catch { /* sustentação é best-effort */ }
}
```

Injetar `sustentacaoContext` junto com `externalData` no prompt.

- [ ] **Step 3: Commit**

```bash
git add src/main/index.ts
git commit -m "feat(agenda): injetar carga de sustentação na pauta de 1:1

Gestor agora vê tickets de suporte atribuídos ao dev ao preparar 1:1.
Best-effort: se cache de sustentação não existe, ignora silenciosamente."
```

---

## Resumo de Execução

| Wave | Tasks | Impacto | Risco |
|------|-------|---------|-------|
| **1 — Data Integrity** | T1, T2 | Crítico — restaura confiança nos insights | Baixo — JiraMetrics já tem sprint data |
| **2 — Daily Auto** | T3, T4 | Alto — funcionalidade core quebrada | Baixo — mudança aditiva |
| **3 — Qualidade Insights** | T5, T6 | Médio — melhora precisão dos dados no perfil | Trivial |
| **4 — Sustentação Visibilidade** | T7, T8 | Alto — feature existente mas invisível | Médio — requer wiring IPC |
| **5 — Relatórios Gaps** | T9, T10, T11 | Médio — completa dead code e alinha relatórios | Baixo |
| **6 — Sustentação Integração** | T12 | Médio — conecta sustentação à pauta | Baixo — best-effort |

**Branch:** `fix/audit-operacional-2026-04-13`
**Commits:** 12 commits atômicos, um por task
**Testes:** `npx vitest run` após cada wave
