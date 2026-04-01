import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { PersonRegistry, type PersonConfig } from '../registry/PersonRegistry'
import { SettingsManager, type AppSettings } from '../registry/SettingsManager'
import { JiraClient, JiraConfig, type DailyStandupItem, type JiraIssue } from './JiraClient'
import { GitHubClient, GitHubConfig, type GitHubCommit, type GitHubPR, type GitHubReview, type GitHubReviewComment } from './GitHubClient'
import { Logger } from '../logging/Logger'

const log = Logger.getInstance().child('DailyReportGenerator')

// ── Data structures ────────────────────────────────────────────

interface DailyActivity {
  jiraActivity: DailyStandupItem[]
  githubCommits: GitHubCommit[]
  githubPRsMerged: GitHubPR[]
  githubReviews: GitHubReview[]
  githubReviewComments: GitHubReviewComment[]
}

interface PersonDailyData {
  nome: string
  slug: string
  activity: DailyActivity
  inProgressTasks: JiraIssue[]
  blockers: Array<{ key: string; summary: string; days: number; flagged: boolean; comments: string[] }>
  sprintSummary: { total: number; done: number; spTotal: number; spDone: number } | null
}

interface SprintOverview {
  nome: string
  inicio: string
  fim: string
  byPerson: Array<{
    nome: string
    total: number
    done: number
    spTotal: number
    spDone: number
  }>
  totalIssues: number
  totalDone: number
  totalSP: number
  totalSPDone: number
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const IN_REVIEW_STATUSES = ['in review', 'review', 'code review', 'em revisão']
const DONE_STATUSES = ['done', 'closed', 'concluído', 'resolved']

const CONCURRENCY_LIMIT = 3

// ── Main class ─────────────────────────────────────────────────

export class DailyReportGenerator {
  private workspacePath: string
  private relatoriosDir: string

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath
    this.relatoriosDir = join(workspacePath, 'relatorios')
  }

  async generate(date?: string): Promise<string> {
    const today = date ?? new Date().toISOString().slice(0, 10)
    const formattedDate = this.formatDateBR(today)
    const filePath = join(this.relatoriosDir, `Daily-${formattedDate}.md`)

    if (existsSync(filePath)) {
      log.debug('daily report já existe, pulando geração', { date: today })
      return filePath
    }

    log.info('generateDailyReport: iniciando', { date: today })

    const registry = new PersonRegistry(this.workspacePath)
    const people = registry.list().filter(p => p.relacao === 'liderado')
    const settings = SettingsManager.load()

    // 1. Fetch sprint data ONCE (not per-person)
    const { sprintOverview, sprintIssuesByPerson } = await this.fetchSprintData(people, settings)

    // 2. Fetch yesterday activity for ALL people in parallel (batches of 3)
    const personReports = await this.fetchAllPeopleData(people, settings, sprintIssuesByPerson)

    // 3. Build report
    const content = this.buildReport(personReports, sprintOverview, today)

    mkdirSync(this.relatoriosDir, { recursive: true })
    writeFileSync(filePath, content, 'utf-8')
    log.info('daily report gerado', { date: today, path: filePath })
    return filePath
  }

  // ── Sprint data (single fetch) ─────────────────────────────

  private async fetchSprintData(
    people: PersonConfig[],
    settings: AppSettings,
  ): Promise<{
    sprintOverview: SprintOverview | null
    sprintIssuesByPerson: Map<string, JiraIssue[]>
  }> {
    const sprintIssuesByPerson = new Map<string, JiraIssue[]>()

    if (!settings.jiraEnabled || !settings.jiraBaseUrl || !settings.jiraApiToken || !settings.jiraBoardId) {
      return { sprintOverview: null, sprintIssuesByPerson }
    }

    try {
      const jiraConfig: JiraConfig = {
        baseUrl: settings.jiraBaseUrl,
        email: settings.jiraEmail ?? '',
        apiToken: settings.jiraApiToken,
        boardId: settings.jiraBoardId,
      }
      const jiraClient = new JiraClient(jiraConfig)

      const sprint = await jiraClient.getCurrentSprint(settings.jiraBoardId)
      if (!sprint) {
        log.warn('nenhum sprint ativo encontrado para daily')
        return { sprintOverview: null, sprintIssuesByPerson }
      }

      const allSprintIssues = await jiraClient.getSprintIssues(settings.jiraBoardId, sprint.id)
      log.info('sprint issues carregadas', { sprint: sprint.name, total: allSprintIssues.length })

      // Build email→person mapping for grouping
      const emailToSlug = new Map<string, string>()
      for (const p of people) {
        if (p.jiraEmail) emailToSlug.set(p.jiraEmail.toLowerCase(), p.slug)
      }

      // Group sprint issues by person
      let totalSP = 0
      let totalSPDone = 0
      let totalDone = 0

      for (const issue of allSprintIssues) {
        const assignee = issue.assignee?.toLowerCase() ?? ''
        const matchedSlug = emailToSlug.get(assignee)
        if (matchedSlug) {
          if (!sprintIssuesByPerson.has(matchedSlug)) {
            sprintIssuesByPerson.set(matchedSlug, [])
          }
          sprintIssuesByPerson.get(matchedSlug)!.push(issue)
        }
        totalSP += issue.storyPoints ?? 0
        if (issue.statusCategory === 'done') {
          totalDone++
          totalSPDone += issue.storyPoints ?? 0
        }
      }

      // Build sprint overview
      const byPerson: SprintOverview['byPerson'] = []
      for (const person of people) {
        const issues = sprintIssuesByPerson.get(person.slug) ?? []
        if (issues.length === 0) continue
        const done = issues.filter(i => i.statusCategory === 'done').length
        const sp = issues.reduce((s, i) => s + (i.storyPoints ?? 0), 0)
        const spDone = issues.filter(i => i.statusCategory === 'done').reduce((s, i) => s + (i.storyPoints ?? 0), 0)
        byPerson.push({ nome: person.nome, total: issues.length, done, spTotal: sp, spDone })
      }

      const sprintOverview: SprintOverview = {
        nome: sprint.name,
        inicio: sprint.startDate ?? '',
        fim: sprint.endDate ?? '',
        byPerson,
        totalIssues: allSprintIssues.length,
        totalDone,
        totalSP,
        totalSPDone,
      }

      return { sprintOverview, sprintIssuesByPerson }
    } catch (err) {
      log.warn('falha ao buscar sprint data', { error: err instanceof Error ? err.message : String(err) })
      return { sprintOverview: null, sprintIssuesByPerson }
    }
  }

  // ── Parallel fetch for all people ───────────────────────────

  private async fetchAllPeopleData(
    people: PersonConfig[],
    settings: AppSettings,
    sprintIssuesByPerson: Map<string, JiraIssue[]>,
  ): Promise<PersonDailyData[]> {
    const eligible = people.filter(p => p.jiraEmail || p.githubUsername)

    const fetchPerson = async (person: PersonConfig): Promise<PersonDailyData> => {
      let activity: DailyActivity = {
        jiraActivity: [], githubCommits: [], githubPRsMerged: [],
        githubReviews: [], githubReviewComments: [],
      }

      try {
        activity = await this.fetchYesterdayActivity(person, settings)
      } catch (err) {
        log.warn('falha ao buscar atividade de ontem', { slug: person.slug, error: err instanceof Error ? err.message : String(err) })
      }

      // In-progress tasks: use statusCategory 'indeterminate' (catches Dev, In Dev, In Progress, In Review, etc.)
      const sprintIssues = sprintIssuesByPerson.get(person.slug) ?? []
      const inProgressTasks = sprintIssues.filter(i => i.statusCategory === 'indeterminate')

      // Blockers from sprint data
      const blockers = sprintIssues
        .filter(i => i.linkedBlockers.length > 0 || i.labels.some(l => l.toLowerCase().includes('blocker')))
        .filter(i => i.statusCategory !== 'done')
        .map(i => ({
          key: i.key,
          summary: i.summary,
          days: Math.floor((Date.now() - new Date(i.blockedSince || i.updated).getTime()) / 86_400_000),
          flagged: i.labels.some(l => l.toLowerCase().includes('flagged')) || i.priority.toLowerCase().includes('highest'),
          comments: [] as string[],
        }))

      // Sprint summary per person
      const sprintSummary = sprintIssues.length > 0 ? {
        total: sprintIssues.length,
        done: sprintIssues.filter(i => i.statusCategory === 'done').length,
        spTotal: sprintIssues.reduce((s, i) => s + (i.storyPoints ?? 0), 0),
        spDone: sprintIssues.filter(i => i.statusCategory === 'done').reduce((s, i) => s + (i.storyPoints ?? 0), 0),
      } : null

      return {
        nome: person.nome,
        slug: person.slug,
        activity,
        inProgressTasks,
        blockers,
        sprintSummary,
      }
    }

    return batchParallel(eligible, fetchPerson, CONCURRENCY_LIMIT)
  }

  // ── Yesterday activity (per person, returns rich data) ──────

  private async fetchYesterdayActivity(person: PersonConfig, settings: AppSettings): Promise<DailyActivity> {
    const yesterday = this.getYesterday()
    const jiraEmail = person.jiraEmail
    const githubUsername = person.githubUsername

    const promises: Promise<void>[] = []

    let jiraActivity: DailyStandupItem[] = []
    let githubCommits: GitHubCommit[] = []
    let githubPRsMerged: GitHubPR[] = []
    let githubReviews: GitHubReview[] = []
    let githubReviewComments: GitHubReviewComment[] = []

    // Jira: issues updated yesterday
    if (settings.jiraEnabled && settings.jiraBaseUrl && settings.jiraApiToken && jiraEmail) {
      promises.push((async () => {
        try {
          const boardId = person.jiraBoardId ?? settings.jiraBoardId
          const jiraConfig: JiraConfig = {
            baseUrl: settings.jiraBaseUrl!,
            email: jiraEmail,
            apiToken: settings.jiraApiToken!,
            projectKey: settings.jiraProjectKey,
            boardId,
          }
          const jiraClient = new JiraClient(jiraConfig)
          const standupData = await jiraClient.getDailyStandupData([jiraEmail])
          jiraActivity = standupData[0]?.recentActivity ?? []
        } catch (err) {
          log.warn('Falha ao buscar standup Jira', { slug: person.slug, error: err instanceof Error ? err.message : String(err) })
        }
      })())
    }

    // GitHub: commits, PRs, reviews, review comments from yesterday
    if (settings.githubEnabled && settings.githubToken && githubUsername && settings.githubRepos) {
      promises.push((async () => {
        try {
          const githubConfig: GitHubConfig = {
            token: settings.githubToken!,
            org: settings.githubOrg ?? '',
            repos: settings.githubRepos!,
          }
          const githubClient = new GitHubClient(githubConfig)

          const [commits, prs, reviews, reviewComments] = await Promise.all([
            githubClient.getCommitsByUser(githubUsername, yesterday),
            githubClient.getPRsByUser(githubUsername, yesterday),
            githubClient.getReviewsByUser(githubUsername, yesterday),
            githubClient.getReviewCommentsByUser(githubUsername, yesterday),
          ])

          githubCommits = commits
          githubPRsMerged = prs.filter(p => p.merged)
          githubReviews = reviews
          githubReviewComments = reviewComments
        } catch (err) {
          log.warn('Falha ao buscar atividade GitHub', { slug: person.slug, error: err instanceof Error ? err.message : String(err) })
        }
      })())
    }

    await Promise.all(promises)

    return { jiraActivity, githubCommits, githubPRsMerged, githubReviews, githubReviewComments }
  }

  // ── Date helpers ────────────────────────────────────────────

  private getYesterday(): string {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  }

  private formatDateBR(dateStr: string): string {
    const [, month, day] = dateStr.split('-')
    return `${day}-${month}-${dateStr.slice(0, 4)}`
  }

  private formatDateLong(dateStr: string): string {
    const [year, month, day] = dateStr.split('-')
    const monthNum = parseInt(month, 10)
    return `${parseInt(day, 10)} de ${MESES[monthNum - 1]} de ${year}`
  }

  // ── Report builder ──────────────────────────────────────────

  private buildReport(
    personReports: PersonDailyData[],
    sprintOverview: SprintOverview | null,
    today: string,
  ): string {
    const lines: string[] = []
    const formattedDate = this.formatDateLong(today)
    const collectedAt = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    lines.push(`# Daily Report — ${formattedDate}`, '')
    lines.push(`> Dados coletados às ${collectedAt}.`, '')

    // ── Sprint Overview ───────────────────────────────────────
    if (sprintOverview) {
      lines.push(`## Sprint: ${sprintOverview.nome}`, '')
      lines.push(`> ${sprintOverview.totalDone}/${sprintOverview.totalIssues} issues concluídas | ${sprintOverview.totalSPDone}/${sprintOverview.totalSP} SP entregues`, '')

      if (sprintOverview.byPerson.length > 0) {
        lines.push('| Pessoa | Tasks (done/total) | SP (done/total) |')
        lines.push('|--------|-------------------|-----------------|')
        for (const p of sprintOverview.byPerson) {
          lines.push(`| ${p.nome} | ${p.done}/${p.total} | ${p.spDone}/${p.spTotal} |`)
        }
        lines.push('')
      }
    }

    // ── Per-person sections ───────────────────────────────────
    const allBlockers: Array<{
      person: string
      key: string
      summary: string
      days: number
      flagged: boolean
    }> = []

    for (const report of personReports) {
      lines.push(`## ${report.nome}`, '')

      const { activity } = report

      // ── O que fez ontem ──
      lines.push('### O que fez ontem', '')
      let hasActivity = false

      // Jira activity (issues with status transitions) — sem limite
      if (activity.jiraActivity.length > 0) {
        for (const item of activity.jiraActivity) {
          lines.push(`- **${item.issueKey}**: ${item.summary} → _${item.status}_`)
          hasActivity = true
        }
      }

      // GitHub commits (with repo and message) — sem limite
      if (activity.githubCommits.length > 0) {
        for (const commit of activity.githubCommits) {
          const msg = commit.message.length > 120 ? commit.message.slice(0, 117) + '...' : commit.message
          lines.push(`- 🔨 \`${commit.repo}\`: ${msg}`)
          hasActivity = true
        }
      }

      // GitHub reviews (with PR number, repo and state) — sem limite
      if (activity.githubReviews.length > 0) {
        // Group review comments by PR for enrichment
        const commentsByPR = new Map<string, GitHubReviewComment[]>()
        for (const c of activity.githubReviewComments) {
          const key = `${c.repo}#${c.prNumber}`
          if (!commentsByPR.has(key)) commentsByPR.set(key, [])
          commentsByPR.get(key)!.push(c)
        }

        for (const review of activity.githubReviews) {
          const stateLabel = review.state === 'approved' ? 'approved'
            : review.state === 'changes_requested' ? 'changes requested'
            : 'commented'
          lines.push(`- 👀 Review em \`${review.repo}#${review.prNumber}\` — ${stateLabel}`)
          hasActivity = true

          // Show review comments for this PR
          const prKey = `${review.repo}#${review.prNumber}`
          const comments = commentsByPR.get(prKey) ?? []
          for (const comment of comments) {
            const body = comment.body.replace(/\n/g, ' ').trim()
            const truncated = body.length > 150 ? body.slice(0, 147) + '...' : body
            if (truncated) {
              lines.push(`  > "${truncated}"`)
            }
          }
        }
      }

      if (!hasActivity) {
        lines.push('- *Sem atividade registrada ontem*')
      }
      lines.push('')

      // ── O que avançou ──
      lines.push('### O que avançou', '')
      const advanced: string[] = []

      // Issues that moved to Done/Review yesterday
      const doneOrReviewActivity = activity.jiraActivity.filter(item => {
        const status = item.status.toLowerCase()
        return DONE_STATUSES.some(s => status.includes(s)) ||
               IN_REVIEW_STATUSES.some(s => status.includes(s))
      })

      for (const item of doneOrReviewActivity) {
        const isDone = DONE_STATUSES.some(s => item.status.toLowerCase().includes(s))
        const icon = isDone ? '✅' : '🔄'
        advanced.push(`- ${icon} **${item.issueKey}**: ${item.summary} → _${item.status}_`)
      }

      // PRs merged
      for (const pr of activity.githubPRsMerged) {
        advanced.push(`- 🚀 PR merged \`${pr.repo}#${pr.number}\`: ${pr.title}`)
      }

      if (advanced.length > 0) {
        lines.push(...advanced)
      } else {
        lines.push('- *Nenhum avanço registrado*')
      }
      lines.push('')

      // ── Trabalhando agora ──
      lines.push('### Trabalhando agora', '')
      if (report.inProgressTasks.length > 0) {
        for (const task of report.inProgressTasks) {
          const sp = task.storyPoints ? ` (${task.storyPoints} SP)` : ''
          const isReview = IN_REVIEW_STATUSES.some(s => task.status.toLowerCase().includes(s))
          const statusIcon = isReview ? '🔄' : '🔵'
          lines.push(`- ${statusIcon} **${task.key}**: ${task.summary}${sp} — _${task.status}_`)
        }
      } else {
        lines.push('- *Nenhuma task em andamento*')
      }
      lines.push('')

      // ── Impedimentos ──
      lines.push('### Impedimentos', '')
      if (report.blockers.length > 0) {
        for (const b of report.blockers) {
          const flagIcon = b.flagged ? ' 🚩' : ''
          lines.push(`- 🔴 **${b.key}** — "${b.summary}" (há ${b.days} dias)${flagIcon}`)
          allBlockers.push({
            person: report.nome,
            key: b.key,
            summary: b.summary,
            days: b.days,
            flagged: b.flagged,
          })
        }
      } else {
        lines.push('- *Nenhum impedimento*')
      }
      lines.push('')
    }

    // ── Team-level sections ───────────────────────────────────

    if (allBlockers.length > 0) {
      lines.push('## Bloqueios do Time', '')
      for (const b of allBlockers) {
        const severity = b.days > 3 ? '🔴' : b.days > 1 ? '🟡' : '🔵'
        const flag = b.flagged ? ' 🚩' : ''
        lines.push(`- ${severity} ${b.key} (${b.person}) — há ${b.days} dias${flag}`)
      }
      lines.push('')
    }

    return lines.join('\n')
  }
}

// ── Helpers ─────────────────────────────────────────────────────

async function batchParallel<T, R>(items: T[], fn: (item: T) => Promise<R>, batchSize: number): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}
