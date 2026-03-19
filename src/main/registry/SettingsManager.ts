import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'

export interface AppSettings {
  workspacePath: string
  claudeBinPath: string
  alert1on1Days: number
  managerName?: string
  managerRole?: string
}

const SETTINGS_DIR  = join(homedir(), '.mgrcockpit')
const SETTINGS_FILE = join(SETTINGS_DIR, 'settings.json')

function detectClaudeBin(): string {
  try {
    return execSync('which claude', { encoding: 'utf-8' }).trim()
  } catch {
    return ''
  }
}

const DEFAULTS: AppSettings = {
  workspacePath:  join(homedir(), 'MgrCockpit'),
  claudeBinPath:  detectClaudeBin(),
  alert1on1Days:  21,
  managerName:    '',
  managerRole:    '',
}

export const SettingsManager = {
  load(): AppSettings {
    if (!existsSync(SETTINGS_FILE)) return { ...DEFAULTS }
    try {
      const raw = readFileSync(SETTINGS_FILE, 'utf-8')
      return { ...DEFAULTS, ...JSON.parse(raw) }
    } catch {
      return { ...DEFAULTS }
    }
  },

  save(settings: AppSettings): void {
    if (!existsSync(SETTINGS_DIR)) {
      mkdirSync(SETTINGS_DIR, { recursive: true })
    }
    writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
  },

  detectClaudeBin,
}
