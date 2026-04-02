import { JiraClient, type JiraConfig } from './JiraClient'
import { Logger } from '../logging/Logger'
import type { SupportBoardSnapshot, SupportTicket } from '../../renderer/src/types/ipc'

const log = Logger.getInstance().child('SupportBoardClient')

const DEFAULT_SLA_DIAS = 5
const BREACH_COMMENTS_MAX = 3
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const TOP_N = 5

export interface SupportBoardInput {
  config: JiraConfig
  projectKey: string
  slaThresholds?: Record<string, number>
}

function ageDias(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
}

function topN(counts: Record<string, number>, n: number): Array<{ key: string; count: number }> {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }))
}

export async function fetchSupportBoardMetrics(input: SupportBoardInput): Promise<SupportBoardSnapshot> {
  const { config, projectKey, slaThresholds = {} } = input
  const client = new JiraClient(config)

  // JQL sem filtro de assignee — busca todos os tickets do projeto
  const jql = `project = "${projectKey}" AND created >= -90d ORDER BY created DESC`

  log.info('SupportBoardClient: buscando tickets', { projectKey })

  const issues = await client.searchIssuesByAssignee('', jql)

  log.info('SupportBoardClient: resultado', { projectKey, totalIssues: issues.length })

  const now = Date.now()
  const thirtyDaysAgo = now - THIRTY_DAYS_MS

  const abertos = issues.filter((i) => i.statusCategory !== 'done')
  const fechados30d = issues.filter(
    (i) => i.statusCategory === 'done' && i.resolved && new Date(i.resolved).getTime() >= thirtyDaysAgo
  )

  // Contagens por tipo e label (somente tickets abertos)
  const tipoCounts: Record<string, number> = {}
  const labelCounts: Record<string, number> = {}
  const assigneeCounts: Record<string, number> = {}

  for (const issue of abertos) {
    tipoCounts[issue.type] = (tipoCounts[issue.type] ?? 0) + 1

    for (const label of issue.labels) {
      labelCounts[label] = (labelCounts[label] ?? 0) + 1
    }

    const key = issue.assignee ?? 'sem_assignee'
    assigneeCounts[key] = (assigneeCounts[key] ?? 0) + 1
  }

  // Detectar tickets em SLA breach
  const breachedIssues = abertos.filter((i) => {
    const threshold = slaThresholds[i.type] ?? DEFAULT_SLA_DIAS
    return ageDias(i.created) > threshold
  })

  // Buscar comentários recentes para cada ticket em breach
  const ticketsEmBreach: SupportTicket[] = []
  for (const issue of breachedIssues) {
    let recentComments: Array<{ author: string; body: string; created: string }> = []
    try {
      const comments = await client.getIssueComments(issue.key, BREACH_COMMENTS_MAX)
      recentComments = comments.map((c) => ({ author: c.author, body: c.body, created: c.created }))
    } catch (err) {
      log.warn('SupportBoardClient: falha ao buscar comentários (graceful)', {
        issueKey: issue.key,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    ticketsEmBreach.push({
      key: issue.key,
      summary: issue.summary,
      type: issue.type,
      labels: issue.labels,
      assignee: issue.assignee,
      ageDias: ageDias(issue.created),
      status: issue.status,
      slaBreached: true,
      recentComments,
    })
  }

  const topTipos = topN(tipoCounts, TOP_N).map(({ key, count }) => ({ tipo: key, count }))
  const topLabels = topN(labelCounts, TOP_N).map(({ key, count }) => ({ label: key, count }))

  return {
    atualizadoEm: new Date().toISOString(),
    ticketsAbertos: abertos.length,
    ticketsFechadosUltimos30d: fechados30d.length,
    topTipos,
    topLabels,
    ticketsEmBreach,
    porAssignee: assigneeCounts,
  }
}
