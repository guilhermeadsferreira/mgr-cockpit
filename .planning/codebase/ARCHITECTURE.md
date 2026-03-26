# Architecture

**Analysis Date:** 2026-03-26
**Focus:** Electron app — main/renderer/preload layers, ingestion pipeline, AI prompt flow

---

## Pattern Overview

**Overall:** Electron desktop app with a strict three-process boundary (main / preload / renderer), layered registry/pipeline architecture in the main process, and a React SPA in the renderer.

**Key Characteristics:**
- All Node.js / filesystem work runs exclusively in the main process
- The renderer never has direct FS access — every operation goes through typed IPC channels
- AI calls are made by spawning `claude -p` as a child process (never the Anthropic API)
- Workspace data is a flat directory of Markdown + YAML files synced via iCloud Drive
- Profiles (`perfil.md`) are append-only living documents managed by HTML-comment-delimited blocks

---

## Layers

**Main Process:**
- Purpose: All business logic, FS I/O, Claude CLI invocations, file watching
- Location: `src/main/`
- Contains: `index.ts` (IPC registrations + app lifecycle), `ingestion/`, `registry/`, `prompts/`, `workspace/`, `migration/`
- Depends on: Node.js APIs, `chokidar`, `js-yaml`, `pdf-parse`, `electron-updater`
- Used by: Renderer (via IPC), FileWatcher events

**Preload Script:**
- Purpose: Safe bridge — exposes a typed `window.api` object to the renderer via `contextBridge`
- Location: `src/preload/index.ts`
- Contains: Typed wrappers around every `ipcRenderer.invoke()` and `ipcRenderer.on()` call
- Depends on: Electron `contextBridge`, `ipcRenderer`, `webUtils`
- Used by: Renderer exclusively

**Renderer Process:**
- Purpose: React UI — views, navigation, state via local `useState`/`useEffect`
- Location: `src/renderer/src/`
- Contains: `App.tsx`, `router.tsx`, `views/`, `components/`, `types/`, `lib/`
- Depends on: `window.api` (injected by preload), React, Lucide icons
- Used by: User interaction only

**Registry Layer (main process):**
- Purpose: All read/write operations on the workspace directory
- Location: `src/main/registry/`
- Contains: `PersonRegistry`, `ActionRegistry`, `CicloRegistry`, `DemandaRegistry`, `DetectedRegistry`, `SettingsManager`
- Depends on: `js-yaml`, Node.js `fs`, `ProfileMigration`
- Used by: IPC handlers in `src/main/index.ts`, `IngestionPipeline`

**Ingestion Layer (main process):**
- Purpose: File detection, Claude invocation, artifact writing, profile mutation
- Location: `src/main/ingestion/`
- Contains: `FileWatcher`, `IngestionPipeline`, `ClaudeRunner`, `FileReader`, `ArtifactWriter`, `ProfileCompressor`, `SchemaValidator`
- Depends on: Registry layer, `prompts/`, `chokidar`
- Used by: IPC handlers, app startup

**Prompts Layer (main process):**
- Purpose: Typed prompt builders and AI result type definitions
- Location: `src/main/prompts/`
- Contains: One `.prompt.ts` file per AI operation — exports `build*Prompt()` and `render*Markdown()` functions with typed interfaces
- Depends on: Nothing external (pure TypeScript)
- Used by: `IngestionPipeline`, IPC handlers in `index.ts`

---

## Data Flow

**Ingestion: Workspace File → Claude CLI → Artifact + Profile Update**

1. User drops `.md` / `.txt` / `.pdf` file into `{workspacePath}/inbox/`
2. `FileWatcher` detects the `add`/`change` event via `chokidar`, debounces 1 second, calls `IngestionPipeline.enqueue(filePath)`
3. `IngestionPipeline.drainQueue()` processes up to `MAX_CONCURRENT = 3` items concurrently
4. `FileReader.readFile()` extracts text (supports PDF via `pdf-parse`), truncates at 50k characters
5. `buildIngestionPrompt()` constructs the prompt with: team registry serialization, current `perfil.md` content (if exists), artifact text, today's date
6. `ClaudeRunner.runClaudePrompt()` spawns `claude -p "<prompt>"` as a child process, collects stdout, parses JSON from the output (direct parse → code fence extract → brace match)
7. `SchemaValidator.validateIngestionResult()` checks the JSON schema before acting on it
8. Result is classified by `pessoa_principal`:
   - **Identified person (registered):** `ArtifactWriter.writeArtifact()` saves `pessoas/{slug}/historico/{date}-{slug}.md`, then `ArtifactWriter.updatePerfil()` patches the living `perfil.md` using HTML-comment-delimited managed blocks
   - **Identified person (not registered):** Item held as `pending` in queue + `DetectedRegistry.upsert()` records them; when user registers the person, `syncPending()` applies cached AI result without a new Claude call
   - **Collective (pessoa_principal = null):** Written to `pessoas/_coletivo/historico/`, actions routed to per-person `ActionRegistry` or to `DemandaRegistry` for manager's own actions
9. File moved to `inbox/processados/`, renderer notified via `mainWindow.webContents.send('ingestion:completed', ...)`

**1:1 Deep Pass (Pass 2 — fired after Pass 1 for tipo=1on1):**

1. After `ArtifactWriter.writeArtifact()` completes, `IngestionPipeline.run1on1DeepPass()` fires asynchronously (fire-and-forget)
2. `build1on1DeepPrompt()` sends artifact content + perfil + open actions by owner + sinais de terceiros + health history
3. Claude returns `OneOnOneResult` with: `followup_acoes`, `acoes_liderado`, `acoes_gestor`, `insights_1on1`, `tendencia_emocional`, `sugestoes_gestor`
4. `ArtifactWriter.update1on1Results()` patches `perfil.md` sections: Insights de 1:1, Sinais de Terceiros, tendência emocional
5. `ActionRegistry.updateFromFollowup()` closes/cancels tracked actions based on follow-up result
6. `ActionRegistry.createFrom1on1Result()` adds new actions; `DemandaRegistry.save()` routes manager actions to Eu module

**Ceremony Signal Pass (collective meetings only):**

1. After collective artifact is written, `runCerimoniaSignalsForPeople()` fires per-participant (fire-and-forget)
2. `buildCerimoniaSinalPrompt()` sends ceremony content + per-person profile + team registry
3. `ArtifactWriter.updatePerfilDeCerimonia()` patches `perfil.md` with soft/hard skills, development points, health signals extracted from the ceremony
4. Batched in groups of `MAX_CONCURRENT = 3` per-person Claude spawns

**AI-Generated Report Flow (Agenda / Cycle Report):**

1. Renderer calls `window.api.ai.generateAgenda(slug)` or `window.api.ai.cycleReport(params)`
2. IPC handler in `src/main/index.ts` loads config + perfil + artifacts + actions from registries
3. Calls `build*Prompt()` to assemble prompt, passes to `runClaudePrompt()`
4. `render*Markdown()` formats AI result to Markdown
5. Result written to `pessoas/{slug}/pautas/{date}-pauta.md` (agenda) or `exports/{date}-{slug}-ciclo.md` (cycle)

**State Management (renderer):**
- No global state store; each view manages its own state with `useState` / `useEffect`
- Navigation state via custom `RouterContext` in `src/renderer/src/router.tsx` — in-memory history stack, no URL routing

---

## Key Abstractions

**IngestionPipeline (`src/main/ingestion/IngestionPipeline.ts`):**
- Purpose: Orchestrates the full multi-pass AI analysis workflow
- Pattern: Queue-based with concurrency limits; per-person `Promise`-based locks prevent concurrent writes to the same `perfil.md`; semaphore limits concurrent 1:1 deep pass slots (`MAX_CONCURRENT_1ON1 = 2`)
- Pending items are serialized to `inbox/pending-queue.json` so they survive app restarts

**ArtifactWriter (`src/main/ingestion/ArtifactWriter.ts`):**
- Purpose: All write operations to workspace files
- Pattern: Named HTML-comment blocks demarcate managed sections within `perfil.md`; each block has a unique open+close marker defined in `SECTION` constant. Block update strategy varies: `resumo` is overwritten each ingestion; `historico`, `conquistas`, `atencao` are append-only; `temas` is deduplicating overwrite
- Schema: Frontmatter is YAML, body is Markdown with managed sections

**PersonRegistry (`src/main/registry/PersonRegistry.ts`):**
- Purpose: CRUD on `pessoas/{slug}/config.yaml` + read access to perfil, artifacts, pautas
- Pattern: Stateless class (no in-memory cache); instantiated fresh per IPC call via `getRegistry()`; reads YAML with `js-yaml`; runs `migrateProfileContent()` on every `getPerfil()` read (applies in-place migration if version is stale)

**ClaudeRunner (`src/main/ingestion/ClaudeRunner.ts`):**
- Purpose: Single point of contact for Claude CLI invocations
- Pattern: `child_process.spawn(['claude', '-p', prompt])`, collects stdout, parses JSON via three fallback strategies (direct → fenced code block → brace extraction). Exponential backoff retry with jitter (capped at 30s). Timeouts: 30s (test), 60s (ceremony), 90s (agenda/ingest), 120s (cycle/compress/autoavaliacao), 180s (1:1 deep pass)

**SettingsManager (`src/main/registry/SettingsManager.ts`):**
- Purpose: App-level settings persistence
- Location: `~/.pulsecockpit/settings.json`
- Fields: `workspacePath`, `claudeBinPath`, `managerName`, `managerRole`
- Pattern: Stateless singleton object; detects `claudeBinPath` by spawning `zsh -l -c "which claude"` to get login shell PATH

**ProfileMigration (`src/main/migration/ProfileMigration.ts`):**
- Purpose: Lazy in-place migration of `perfil.md` files
- Current version: 5 (schema_version tracked in frontmatter)
- Strategy: Called on every `getPerfil()` read; if version < current, migrates and writes file immediately (non-destructive — only adds/renames fields, never removes data)

**ProfileCompressor (`src/main/ingestion/ProfileCompressor.ts`):**
- Purpose: Trim bloat from `perfil.md` body sections as artifact count grows
- Trigger: Fire-and-forget every 10 artifacts ingested per person
- Safety: Creates `.bak` backup before write; validates active attention points are preserved; uses atomic `.tmp` → rename pattern

---

## Entry Points

**App Startup (`src/main/index.ts` → `app.whenReady()`):**
- Loads settings via `SettingsManager.load()`
- Calls `setupWorkspace(workspacePath)` — creates directory scaffold idempotently
- Calls `registerIpcHandlers()` — registers all `ipcMain.handle()` channels
- Creates `BrowserWindow` with preload and `contextIsolation: true`
- Creates `FileWatcher` and starts it (also calls `restorePending()` to recover cross-session queue)
- Calls `setupAutoUpdater()` (production only)

**Renderer Entry (`src/renderer/src/main.tsx`):**
- Bootstraps React into `#root`
- `App.tsx` wraps with `RouterProvider` + `ErrorBoundary`
- Routes rendered via simple object lookup on `view` string from router context

---

## Error Handling

**Strategy:** Defensive — every registry read is wrapped in `try/catch` returning safe defaults; Claude failures propagate as `{ success: false, error: string }` to IPC callers; renderer receives structured error payloads.

**Patterns:**
- Registry reads return `null` / `[]` on failure, never throw
- IPC handlers return typed result objects with `success: boolean`
- Ingestion pipeline marks items as `status: 'error'` and notifies renderer via `ingestion:failed` event
- `ProfileCompressor` aborts on validation failure rather than writing corrupt data
- `ErrorBoundary` component in renderer catches React render errors and displays recovery UI

---

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.warn` / `console.error` with `[ClassName]` prefixes in main process; no structured logging library.

**Validation:** `SchemaValidator` (`src/main/ingestion/SchemaValidator.ts`) validates AI JSON responses before any file write; checks required fields and types.

**Authentication:** None — local-only app; Claude CLI authenticates independently.

**Concurrency:** Per-person `Promise`-based write locks in `IngestionPipeline.personLocks`; semaphore for 1:1 deep passes; batch size cap of `MAX_CONCURRENT = 3` for ceremony signal passes.

---

## Key Observations

1. **Two-pass ingestion for 1:1s.** Pass 1 (ingestion prompt) writes the artifact and updates the profile summary/health signals. Pass 2 (`1on1-deep` prompt) runs fire-and-forget and overlays deeper extracted data — follow-up status, insights, emotional trend. This is the V2 quality improvement introduced in the current branch.

2. **Pending queue persistence.** Items that identified an unregistered person are held in `inbox/pending-queue.json` with the full AI result cached. On person registration, `syncPending()` applies the cached result to disk without re-calling Claude. On app restart, `restorePending()` reloads these items.

3. **Profile as append-only living document.** `perfil.md` is never fully rewritten. Each ingestion targets specific HTML-comment-delimited blocks with different strategies (overwrite / append / deduplicate). Schema migrations are applied lazily on read. This design means a corrupted write can leave partial state — the managed blocks must remain syntactically intact.

4. **No state persistence in renderer.** Each view fetches fresh data from the main process on mount. There is no client-side cache or reactive store. This keeps the renderer simple but means every navigation triggers IPC calls.

5. **IPC contract is the public API.** All cross-boundary communication is typed in `src/renderer/src/types/ipc.ts`, which is imported by both main and renderer. This file is the source of truth for shared types.

6. **Claude CLI path detection.** At startup, `SettingsManager` shells out to `zsh -l -c "which claude"` to find the binary path in the user's login shell `PATH`. The resolved path is saved to `~/.pulsecockpit/settings.json`. Without it, all AI features return a `claudeBinPath` error.

---

*Architecture analysis: 2026-03-26*
