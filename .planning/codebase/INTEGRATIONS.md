# External Integrations

**Analysis Date:** 2026-03-26

## APIs & External Services

**AI / LLM:**
- Claude Code CLI — the sole AI provider for all AI features
  - Not an SDK: invoked via `child_process.spawn(claudeBin, ['-p', prompt])`
  - Implementation: `src/main/ingestion/ClaudeRunner.ts`
  - Binary path: detected at startup via `zsh -l -c "which claude"` (or bash fallback)
  - Path stored in: `~/.pulsecockpit/settings.json` → `claudeBinPath`
  - Invocation: `claude -p "<prompt>"` — stdin closed, stdout/stderr piped
  - Response contract: Claude must return JSON (raw, markdown-fenced, or embedded in text)
  - Retry policy: 1 retry with exponential backoff (capped at 30s)
  - Timeouts per operation:
    - `ai:test` → 30s
    - `ai:generate-agenda` → 90s
    - `ai:cycle-report` → 120s
    - `ciclo:ingest-artifact` → 90s
    - `ciclo:autoavaliacao` → 120s
    - Ingestion pipeline (standard pass) → 60s (configured in `IngestionPipeline.ts`)
    - 1on1 deep pass → separate concurrency limit (`MAX_CONCURRENT_1ON1 = 2`)

**Auto-Update:**
- GitHub Releases via `electron-updater` 6.8.3
  - Provider: `github`
  - Owner: `guilhermeadsferreira`
  - Repo: `Pulse-Cockpit`
  - Config: `package.json` → `"build"."publish"`
  - Implementation: `src/main/index.ts` → `setupAutoUpdater()`
  - Only active in packaged builds (`app.isPackaged` guard)
  - Auto-downloads and installs on quit
  - Pushes status events to renderer via `update:status` (one-way IPC push)
  - Error logs: `{userData}/logs/updater.log`

## Data Storage

**Databases:**
- None. No database engine.

**Filesystem (primary storage):**
- All data stored as files under a configurable workspace path
- Default workspace: `~/PulseCockpit/` (or iCloud-synced `~/Library/Mobile Documents/com~apple~CloudDocs/PulseCockpit/`)
- Workspace structure:
  ```
  {workspacePath}/
  ├── inbox/                    # Drop zone: .md, .txt, .pdf files for ingestion
  │   ├── processados/          # Files moved here after successful ingestion
  │   └── pending-queue.json    # Persisted queue for items awaiting person registration
  ├── pessoas/                  # One directory per person (keyed by slug)
  │   └── {slug}/
  │       ├── config.yaml       # PersonConfig schema — parsed by js-yaml
  │       ├── perfil.md         # AI-managed living profile with YAML frontmatter
  │       ├── historico/        # Processed artifact .md files
  │       └── pautas/           # Generated 1:1 agenda files
  ├── artefatos/                # Artifact templates by type
  │   └── {tipo}/template.md   # Types: 1on1, reuniao, daily, planning, retro, feedback
  ├── exports/                  # Generated cycle reports and self-assessments
  ├── gestor/
  │   └── ciclo/               # Manager's own artifact cycle files
  ├── refinamentos/             # Refinement docs saved by manager
  └── pessoas/_coletivo/historico/  # Collective/team-wide artifacts
  ```
- Person config YAML managed by: `src/main/registry/PersonRegistry.ts`
- Artifact files written by: `src/main/ingestion/ArtifactWriter.ts`
- Workspace initialized by: `src/main/workspace/WorkspaceSetup.ts`

**App Settings:**
- Location: `~/.pulsecockpit/settings.json`
- Schema: `{ workspacePath, claudeBinPath, managerName?, managerRole? }`
- Managed by: `src/main/registry/SettingsManager.ts`

**File Caching:**
- `inbox/pending-queue.json` — persists queued items (including cached AI results) across app restarts
- Managed by: `src/main/ingestion/IngestionPipeline.ts` → `savePendingQueue()` / `restorePending()`

## Authentication & Identity

**Auth Provider:**
- None — single-user local desktop app with no accounts, login, or auth layer

**Claude CLI Auth:**
- Claude Code CLI handles its own authentication (OAuth/session stored by the CLI itself)
- The app only detects and invokes the binary; it never manages Claude credentials

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Rollbar, or similar)

**Logs:**
- Auto-updater errors logged to file: `{app.getPath('userData')}/logs/updater.log`
- Runtime logs via `console.log` / `console.error` (development only; no production log sink)
- `[ClaudeRunner]`, `[FileWatcher]`, `[IngestionPipeline]` prefixes used for identifiable log lines

## CI/CD & Deployment

**Hosting:**
- GitHub Releases (macOS `.dmg` + `.zip` for arm64 and x64)

**CI Pipeline:**
- Not detected (no `.github/workflows/` directory found)

**Release Script:**
- `scripts/release.sh` — invoked via `npm run release`

## IPC Channels (Main ↔ Renderer)

All IPC uses `ipcMain.handle` / `ipcRenderer.invoke` (request-response) or `webContents.send` / `ipcRenderer.on` (one-way push). Context isolation is enabled; `nodeIntegration: false`. The preload bridge is at `src/preload/index.ts`, exposing `window.api`.

The renderer type contract is at `src/renderer/src/types/global.d.ts`. Shared request/response types are at `src/renderer/src/types/ipc.ts`.

### Request-Response (invoke/handle)

| Channel | Direction | Description |
|---|---|---|
| `ipc:ping` | R→M | Health check, returns `{ ok: true, ts }` |
| `settings:load` | R→M | Load `AppSettings` from `~/.pulsecockpit/settings.json` |
| `settings:save` | R→M | Persist `AppSettings` to disk |
| `settings:detect-claude` | R→M | Run `which claude` in login shell, return path |
| `settings:setup-workspace` | R→M | Create workspace directory structure |
| `settings:select-folder` | R→M | Open native folder picker dialog |
| `people:list` | R→M | List all registered `PersonConfig[]` |
| `people:get` | R→M | Get single `PersonConfig` by slug |
| `people:save` | R→M | Save `PersonConfig`, trigger pending re-sync if new |
| `people:delete` | R→M | Delete person by slug |
| `people:get-perfil` | R→M | Get `PerfilData` (raw + frontmatter), injects computed fields |
| `people:list-pautas` | R→M | List `PautaMeta[]` for a person |
| `artifacts:list` | R→M | List `ArtifactMeta[]` for a person |
| `artifacts:feed` | R→M | List `ArtifactFeedItem[]` across all people |
| `artifacts:read` | R→M | Read raw markdown content of an artifact file |
| `ingestion:queue` | R→M | Get current `QueueItem[]` state |
| `ingestion:enqueue` | R→M | Manually enqueue a file path |
| `ingestion:batch-reingest` | R→M | Re-ingest multiple processed files |
| `ingestion:reset-data` | R→M | Clear all AI-generated data |
| `ingestion:list-processados` | R→M | List file paths in `inbox/processados/` |
| `ai:test` | R→M | Test Claude CLI connectivity |
| `ai:generate-agenda` | R→M | Generate 1:1 agenda for a person (calls Claude) |
| `ai:cycle-report` | R→M | Generate cycle report for a person (calls Claude) |
| `detected:list` | R→M | List `DetectedPerson[]` (people mentioned by AI but not registered) |
| `detected:dismiss` | R→M | Dismiss a detected person |
| `actions:list` | R→M | List `Action[]` for a person |
| `actions:save` | R→M | Save an `Action` |
| `actions:update-status` | R→M | Update action status (`open`/`done`/`cancelled`) |
| `demandas:list` | R→M | List all `Demanda[]` (manager's own demands) |
| `demandas:save` | R→M | Save a `Demanda` |
| `demandas:delete` | R→M | Delete a `Demanda` by id |
| `demandas:update-status` | R→M | Update demand status, optionally add to ciclo |
| `ciclo:list` | R→M | List `CicloEntry[]` (manager's cycle log) |
| `ciclo:add-manual` | R→M | Add a manual cycle entry |
| `ciclo:delete` | R→M | Delete a cycle entry by id |
| `ciclo:ingest-artifact` | R→M | Ingest a file into the manager's own ciclo (calls Claude) |
| `ciclo:autoavaliacao` | R→M | Generate self-assessment document (calls Claude) |
| `shell:open` | R→M | Open a file path using the OS default application |
| `update:install` | R→M | Quit and install downloaded update |
| `update:get-status` | R→M | Get last known `UpdateStatus` |
| `refinamentos:list` | R→M | List `DocItem[]` from `refinamentos/` directory |
| `refinamentos:save` | R→M | Copy a file into `refinamentos/` |
| `refinamentos:read` | R→M | Read raw content of a refinamento file |
| `refinamentos:delete` | R→M | Delete a refinamento file |

### One-Way Push (webContents.send / ipcRenderer.on)

| Channel | Direction | Payload | Description |
|---|---|---|---|
| `ingestion:started` | M→R | `{ filePath, fileName }` | File ingestion began |
| `ingestion:completed` | M→R | `{ filePath, personSlug, tipo, summary }` | File ingestion succeeded |
| `ingestion:failed` | M→R | `{ filePath, error, rawOutput? }` | File ingestion failed |
| `update:status` | M→R | `{ phase, version?, progress?, error? }` | Auto-updater state change |

## Ingestion Data Flow

```
User drops .md/.txt/.pdf into inbox/
        ↓
FileWatcher (chokidar) detects file add/change
        ↓
IngestionPipeline.enqueue(filePath)
        ↓
Pass 1: runClaudePrompt(ingestion.prompt)
   → Returns IngestionAIResult (tipo, slug, resumo, acoes, saude...)
        ↓
Pass 2 (if 1:1): runClaudePrompt(cerimonia-sinal.prompt)
   → Returns CerimoniaSinalResult (sentimento, saude, skills...)
        ↓
Pass 3 (if 1:1): runClaudePrompt(1on1-deep.prompt)
   → Returns OneOnOneResult (insights, sinais terceiros...)
        ↓
ArtifactWriter.writeArtifact() → pessoas/{slug}/historico/{date}-{slug}.md
ArtifactWriter.updatePerfil()  → pessoas/{slug}/perfil.md (section-based atomic update)
ActionRegistry.save()          → pessoas/{slug}/actions.json
        ↓
File moved to inbox/processados/
        ↓
ipcMain pushes ingestion:completed to renderer
```

## AI Prompt Inventory

All prompts are in `src/main/prompts/`. Each exports a `build*Prompt()` function returning a string and a `render*Markdown()` function for the output document.

| File | Prompt purpose | Called from |
|---|---|---|
| `ingestion.prompt.ts` | Core artifact ingestion (tipo, slug, resumo, acoes, saude) | `IngestionPipeline.ts` |
| `cerimonia-sinal.prompt.ts` | 1:1 signal extraction (sentimento, engajamento, skills) | `IngestionPipeline.ts` |
| `1on1-deep.prompt.ts` | 1:1 deep analysis (insights, sinais de terceiros) | `IngestionPipeline.ts` |
| `agenda.prompt.ts` | Generate 1:1 agenda for liderado/par/stakeholder | `index.ts` → `ai:generate-agenda` |
| `agenda-gestor.prompt.ts` | Generate agenda for meeting with manager (team rollup) | `index.ts` → `ai:generate-agenda` |
| `cycle.prompt.ts` | Generate cycle report for a person | `index.ts` → `ai:cycle-report` |
| `gestor-ciclo.prompt.ts` | Ingest artifact into manager's own ciclo | `index.ts` → `ciclo:ingest-artifact` |
| `autoavaliacao.prompt.ts` | Generate manager self-assessment | `index.ts` → `ciclo:autoavaliacao` |
| `compression.prompt.ts` | Compress/summarize profile sections (ProfileCompressor) | `ProfileCompressor.ts` |

## Webhooks & Callbacks

**Incoming:** None — the app has no HTTP server or webhook endpoints.

**Outgoing:** None — the app makes no outbound HTTP requests except via GitHub Releases (electron-updater auto-update check).

## Key Observations

- **Zero external network dependencies at runtime** except auto-update checks against GitHub. No API keys, no cloud services, no telemetry.
- **Claude CLI is the only AI integration.** It is a local binary, not a cloud SDK. The app never calls `api.anthropic.com` directly.
- **All persistent state is plain files.** No SQLite, no embedded database. Person configs are YAML, profiles are Markdown with YAML frontmatter, artifact history is Markdown.
- **IPC is the full API surface** between renderer and main process. The preload contract (`src/preload/index.ts`) and type definitions (`src/renderer/src/types/global.d.ts`, `src/renderer/src/types/ipc.ts`) are the authoritative source of truth for what the renderer can call.
- **Push events are limited to two domains:** ingestion lifecycle (`ingestion:started/completed/failed`) and auto-update status (`update:status`). All other state is fetched on demand via invoke.
- **No n8n, no Supabase, no external auth** — this project uses none of the other services from the global workspace stack.

---

*Integration audit: 2026-03-26*
