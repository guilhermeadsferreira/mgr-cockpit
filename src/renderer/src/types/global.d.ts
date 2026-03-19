import type { AppSettings, PersonConfig, ArtifactMeta, PerfilData, QueueItem, CycleReportParams, DetectedPerson, PautaMeta } from './ipc'

declare global {
  interface Window {
    api: {
      ping: () => Promise<{ ok: boolean; ts: number }>

      settings: {
        load:           () => Promise<AppSettings>
        save:           (data: AppSettings) => Promise<void>
        detectClaude:   () => Promise<string>
        setupWorkspace: (path: string) => Promise<void>
        selectFolder:   () => Promise<string | null>
      }

      people: {
        list:       () => Promise<PersonConfig[]>
        get:        (slug: string) => Promise<PersonConfig | null>
        save:       (data: PersonConfig) => Promise<void>
        delete:     (slug: string) => Promise<void>
        getPerfil:  (slug: string) => Promise<PerfilData | null>
        listPautas: (slug: string) => Promise<PautaMeta[]>
      }

      artifacts: {
        list: (slug: string) => Promise<ArtifactMeta[]>
        read: (path: string) => Promise<string>
      }

      ingestion: {
        onStarted:       (cb: (e: unknown) => void) => void
        onCompleted:     (cb: (e: unknown) => void) => void
        onFailed:        (cb: (e: unknown) => void) => void
        removeListeners: () => void
        getQueue:        () => Promise<QueueItem[]>
        enqueue:         (filePath: string) => Promise<void>
      }

      ai: {
        test:           () => Promise<ClaudeTestResult>
        generateAgenda: (slug: string) => Promise<unknown>
        cycleReport:    (params: CycleReportParams) => Promise<unknown>
      }

      detected: {
        list:    () => Promise<DetectedPerson[]>
        dismiss: (slug: string) => Promise<void>
      }

      shell: {
        open: (filePath: string) => Promise<void>
      }
    }
  }

  interface ClaudeTestResult {
    success: boolean
    data?: unknown
    rawOutput?: string
    error?: string
  }
}

export {}
