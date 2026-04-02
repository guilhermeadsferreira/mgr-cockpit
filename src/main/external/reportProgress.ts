import { BrowserWindow } from 'electron'

export interface ReportProgressPayload {
  type: string          // 'daily' | 'weekly' | 'monthly' | 'sprint'
  step: string          // identificador do passo
  message: string       // mensagem legível pro usuário
  percent: number       // 0-100
}

export function notifyReportProgress(payload: ReportProgressPayload): void {
  const wins = BrowserWindow.getAllWindows()
  for (const win of wins) {
    if (!win.isDestroyed()) win.webContents.send('report:progress', payload)
  }
}
