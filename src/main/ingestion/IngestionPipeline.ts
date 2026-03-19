import { basename, join } from 'path'
import { BrowserWindow } from 'electron'
import { readFile } from './FileReader'
import { ArtifactWriter } from './ArtifactWriter'
import { runClaudePrompt } from './ClaudeRunner'
import { buildIngestionPrompt, type IngestionAIResult } from '../prompts/ingestion.prompt'
import { PersonRegistry } from '../registry/PersonRegistry'
import { DetectedRegistry } from '../registry/DetectedRegistry'
import { SettingsManager } from '../registry/SettingsManager'
import { existsSync, readFileSync, mkdirSync, renameSync } from 'fs'
import { join as pathJoin, dirname, normalize } from 'path'

export type QueueItemStatus = 'queued' | 'processing' | 'done' | 'pending' | 'error'

export interface QueueItem {
  id:          string
  filePath:    string
  fileName:    string
  status:      QueueItemStatus
  personSlug?: string
  tipo?:       string
  summary?:    string
  error?:      string
  startedAt?:  number
  finishedAt?: number
  pessoasIdentificadas?: string[]
  naoCadastradas?:       string[]
  novasNomes?:           Record<string, string>  // slug → nome for detected people
  // Cached data for pending items — avoids re-calling Claude on sync
  cachedAiResult?:       IngestionAIResult
  cachedText?:           string
}

export class IngestionPipeline {
  private queue: QueueItem[] = []
  private processing = false

  constructor(private workspacePath: string) {}

  enqueue(filePath: string): void {
    const fileName = basename(filePath)

    // Deduplicate: don't add if already queued, processing, or pending
    const exists = this.queue.some((i) => i.filePath === filePath && (i.status === 'queued' || i.status === 'processing' || i.status === 'pending'))
    if (exists) return

    const item: QueueItem = {
      id:       `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      filePath,
      fileName,
      status:   'queued',
    }

    this.queue.unshift(item)
    this.notifyRenderer('ingestion:started', { filePath, fileName })
    console.log(`[IngestionPipeline] enqueued: ${fileName}`)

    this.drainQueue()
  }

  getQueue(): QueueItem[] {
    return this.queue.slice(0, 50) // return last 50 items
  }

  /**
   * Called when a new person is registered.
   * Syncs pending items whose pessoa_principal matches the new slug.
   * Pure file operation — no Claude call, uses cached AI result.
   */
  syncPending(registeredSlug: string): number {
    const matching = this.queue.filter(
      (i) =>
        i.status === 'pending' &&
        (i.personSlug === registeredSlug || i.naoCadastradas?.includes(registeredSlug))
    )
    if (matching.length === 0) return 0

    console.log(`[IngestionPipeline] syncing ${matching.length} pending item(s) for "${registeredSlug}"`)

    for (const item of matching) {
      try {
        this.syncItemToPerson(item, registeredSlug)
        console.log(`[IngestionPipeline] synced: ${item.fileName} → ${registeredSlug}`)
      } catch (err) {
        console.error(`[IngestionPipeline] sync error: ${item.fileName}`, err)
      }
    }
    return matching.length
  }

  /**
   * Writes artifact + updates perfil for a given item using its cached AI result.
   * No Claude call — pure file I/O.
   */
  private syncItemToPerson(item: QueueItem, slug: string): void {
    if (!item.cachedAiResult || !item.cachedText) return

    const writer = new ArtifactWriter(this.workspacePath)
    const artifactFileName = writer.writeArtifact(slug, item.cachedAiResult, item.cachedText)
    writer.updatePerfil(slug, item.cachedAiResult, artifactFileName)

    item.status         = 'done'
    item.finishedAt     = Date.now()
    item.naoCadastradas = item.naoCadastradas?.filter((s) => s !== slug)
    // Free cached data
    item.cachedAiResult = undefined
    item.cachedText     = undefined
    this.moveToProcessados(item.filePath)

    this.notifyRenderer('ingestion:completed', {
      filePath: item.filePath, personSlug: slug,
      tipo: item.tipo, summary: item.summary, novas: [],
    })
  }

  private async drainQueue(): Promise<void> {
    if (this.processing) return
    this.processing = true

    try {
      while (true) {
        const next = this.queue.find((i) => i.status === 'queued')
        if (!next) break
        await this.processItem(next)
      }
    } finally {
      this.processing = false
    }
  }

  private async processItem(item: QueueItem): Promise<void> {
    item.status    = 'processing'
    item.startedAt = Date.now()
    console.log(`[IngestionPipeline] processing: ${item.fileName}`)

    try {
      const settings         = SettingsManager.load()
      const registry         = new PersonRegistry(this.workspacePath)
      const detectedRegistry = new DetectedRegistry(this.workspacePath)
      const teamRegistry     = registry.serializeForPrompt()

      // Read file content
      const { text } = await readFile(item.filePath)

      // Read current perfil.md if there's a likely person match
      // (we'll figure out the person after AI analysis)
      const today = new Date().toISOString().slice(0, 10)
      const prompt = buildIngestionPrompt({
        teamRegistry,
        perfilMdRaw: null, // first pass without perfil — AI will identify the person
        artifactContent: text,
        today,
      })

      if (!settings.claudeBinPath) {
        throw new Error('Claude CLI não configurado. Configure o caminho em Settings.')
      }

      const result = await runClaudePrompt(settings.claudeBinPath, prompt, 90_000)

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Claude não retornou dados válidos')
      }

      const aiResult = result.data as IngestionAIResult

      // Identify which people are registered vs unknown
      const pessoasIdentificadas = aiResult.pessoas_identificadas ?? []
      const naoCadastradas = pessoasIdentificadas.filter((s) => !registry.get(s))
      const principal = aiResult.pessoa_principal

      // Store newly detected (unregistered) people so the user can promote them
      const novas = aiResult.novas_pessoas_detectadas ?? []
      // Build a slug→nome map from novas for name lookups
      const novasNomeMap: Record<string, string> = {}
      for (const p of novas) {
        novasNomeMap[p.slug] = p.nome
        if (!registry.get(p.slug)) {
          detectedRegistry.upsert(p.slug, p.nome, item.fileName)
        }
      }
      // Also store naoCadastradas that the AI matched from pessoas_identificadas
      for (const slug of naoCadastradas) {
        // Use the real name from novas if available, otherwise keep the slug
        const nome = novasNomeMap[slug] || slug
        detectedRegistry.upsert(slug, nome, item.fileName)
      }

      // Common fields for both done and pending
      item.tipo                = aiResult.tipo
      item.summary             = aiResult.resumo
      item.pessoasIdentificadas = pessoasIdentificadas
      item.naoCadastradas      = [...new Set([...naoCadastradas, ...novas.map((p) => p.slug)])]
      item.novasNomes          = novasNomeMap
      item.finishedAt          = Date.now()

      // Always cache the AI result and the original text
      item.personSlug     = principal ?? undefined
      item.cachedAiResult = aiResult
      item.cachedText     = text

      // If pessoa_principal is registered → sync immediately
      if (principal && registry.get(principal)) {
        this.syncItemToPerson(item, principal)
        console.log(`[IngestionPipeline] done: ${item.fileName} → ${principal}`)
      } else {
        // pessoa_principal não cadastrada ou ausente → pending, file stays in inbox
        item.status = 'pending'
        this.notifyRenderer('ingestion:completed', {
          filePath: item.filePath, personSlug: undefined,
          tipo: item.tipo, summary: item.summary, novas,
        })
        console.log(`[IngestionPipeline] pending: ${item.fileName} → pessoa "${principal ?? '(nenhuma)'}" não cadastrada`)
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err)
      item.status     = 'error'
      item.error      = error
      item.finishedAt = Date.now()

      this.notifyRenderer('ingestion:failed', {
        filePath: item.filePath,
        error,
      })

      console.error(`[IngestionPipeline] error: ${item.fileName} —`, error)
    }
  }

  private moveToProcessados(filePath: string): void {
    const inboxDir = normalize(pathJoin(this.workspacePath, 'inbox'))
    const normalizedPath = normalize(filePath)

    // Only move files that live directly inside inbox/
    if (dirname(normalizedPath) !== inboxDir) return
    if (!existsSync(normalizedPath)) return

    const processadosDir = pathJoin(inboxDir, 'processados')
    mkdirSync(processadosDir, { recursive: true })

    const dest = pathJoin(processadosDir, basename(normalizedPath))
    try {
      renameSync(normalizedPath, dest)
      console.log(`[IngestionPipeline] moved to processados: ${basename(normalizedPath)}`)
    } catch (err) {
      console.error(`[IngestionPipeline] failed to move file:`, err)
    }
  }

  private notifyRenderer(channel: string, payload: unknown): void {
    const wins = BrowserWindow.getAllWindows()
    for (const win of wins) {
      if (!win.isDestroyed()) win.webContents.send(channel, payload)
    }
  }
}
