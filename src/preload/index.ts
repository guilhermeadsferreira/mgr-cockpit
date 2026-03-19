import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('ipc:ping'),
  getFilePath: (file: File) => webUtils.getPathForFile(file),

  settings: {
    load:           ()              => ipcRenderer.invoke('settings:load'),
    save:           (data: unknown) => ipcRenderer.invoke('settings:save', data),
    detectClaude:   ()              => ipcRenderer.invoke('settings:detect-claude'),
    setupWorkspace: (path: string)  => ipcRenderer.invoke('settings:setup-workspace', path),
    selectFolder:   ()              => ipcRenderer.invoke('settings:select-folder'),
  },

  people: {
    list:       ()              => ipcRenderer.invoke('people:list'),
    get:        (slug: string)  => ipcRenderer.invoke('people:get', slug),
    save:       (data: unknown) => ipcRenderer.invoke('people:save', data),
    delete:     (slug: string)  => ipcRenderer.invoke('people:delete', slug),
    getPerfil:  (slug: string)  => ipcRenderer.invoke('people:get-perfil', slug),
    listPautas: (slug: string)  => ipcRenderer.invoke('people:list-pautas', slug),
  },

  artifacts: {
    list:    (slug: string)  => ipcRenderer.invoke('artifacts:list', slug),
    read:    (path: string)  => ipcRenderer.invoke('artifacts:read', path),
  },

  ai: {
    test:           ()               => ipcRenderer.invoke('ai:test'),
    generateAgenda: (slug: string)   => ipcRenderer.invoke('ai:generate-agenda', slug),
    cycleReport:    (params: unknown) => ipcRenderer.invoke('ai:cycle-report', params),
  },

  detected: {
    list:    ()              => ipcRenderer.invoke('detected:list'),
    dismiss: (slug: string) => ipcRenderer.invoke('detected:dismiss', slug),
  },

  shell: {
    open: (filePath: string) => ipcRenderer.invoke('shell:open', filePath),
  },

  ingestion: {
    onStarted:       (cb: (e: unknown) => void) => ipcRenderer.on('ingestion:started',   (_, d) => cb(d)),
    onCompleted:     (cb: (e: unknown) => void) => ipcRenderer.on('ingestion:completed', (_, d) => cb(d)),
    onFailed:        (cb: (e: unknown) => void) => ipcRenderer.on('ingestion:failed',    (_, d) => cb(d)),
    removeListeners: () => {
      ipcRenderer.removeAllListeners('ingestion:started')
      ipcRenderer.removeAllListeners('ingestion:completed')
      ipcRenderer.removeAllListeners('ingestion:failed')
    },
    getQueue: ()                  => ipcRenderer.invoke('ingestion:queue'),
    enqueue:  (filePath: string)  => ipcRenderer.invoke('ingestion:enqueue', filePath),
  },
})
