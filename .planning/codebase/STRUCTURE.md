# Codebase Structure

**Analysis Date:** 2026-03-26
**Focus:** Electron app — directory layout, module organization, file naming conventions

---

## Directory Layout

```
pulse-cockpit/
├── src/
│   ├── main/                       # Electron main process (Node.js)
│   │   ├── index.ts                # App entry: BrowserWindow + IPC registrations
│   │   ├── ingestion/              # Pipeline: file watching → Claude → artifact write
│   │   │   ├── IngestionPipeline.ts
│   │   │   ├── FileWatcher.ts
│   │   │   ├── ClaudeRunner.ts
│   │   │   ├── FileReader.ts       # Reads .md / .txt / .pdf (50k char cap)
│   │   │   ├── ArtifactWriter.ts   # Writes historico/ artifacts + patches perfil.md
│   │   │   ├── ProfileCompressor.ts # Trims perfil.md sections every 10 artifacts
│   │   │   ├── SchemaValidator.ts  # Validates AI JSON responses
│   │   │   ├── IngestionPipeline.test.ts
│   │   │   └── ArtifactWriter.test.ts
│   │   ├── registry/               # All workspace file CRUD
│   │   │   ├── PersonRegistry.ts   # pessoas/{slug}/config.yaml + perfil.md + artifacts
│   │   │   ├── ActionRegistry.ts   # pessoas/{slug}/actions.yaml
│   │   │   ├── CicloRegistry.ts    # gestor/ciclo/ + ciclo-log.yaml
│   │   │   ├── DemandaRegistry.ts  # gestor/demandas.yaml
│   │   │   ├── DetectedRegistry.ts # detected-people.json
│   │   │   └── SettingsManager.ts  # ~/.pulsecockpit/settings.json
│   │   ├── prompts/                # AI prompt builders (one per operation)
│   │   │   ├── ingestion.prompt.ts
│   │   │   ├── 1on1-deep.prompt.ts
│   │   │   ├── cerimonia-sinal.prompt.ts
│   │   │   ├── agenda.prompt.ts
│   │   │   ├── agenda-gestor.prompt.ts
│   │   │   ├── cycle.prompt.ts
│   │   │   ├── gestor-ciclo.prompt.ts
│   │   │   ├── autoavaliacao.prompt.ts
│   │   │   └── compression.prompt.ts
│   │   ├── migration/
│   │   │   └── ProfileMigration.ts # Lazy perfil.md schema upgrades (v1→v5)
│   │   └── workspace/
│   │       └── WorkspaceSetup.ts   # Creates workspace dirs + artifact templates
│   ├── preload/
│   │   └── index.ts                # contextBridge → window.api
│   ├── renderer/
│   │   ├── index.html              # HTML shell for BrowserWindow
│   │   └── src/
│   │       ├── main.tsx            # React entry: renders <App />
│   │       ├── App.tsx             # RouterProvider + ErrorBoundary + view routing
│   │       ├── router.tsx          # Custom router — in-memory history, no URL
│   │       ├── index.css           # Global CSS variables and base styles
│   │       ├── components/
│   │       │   ├── Layout.tsx      # Shell: Sidebar + UpdateBanner + slot for view
│   │       │   ├── Sidebar.tsx     # Navigation links
│   │       │   └── MarkdownPreview.tsx
│   │       ├── views/              # One file per route/screen
│   │       │   ├── DashboardView.tsx   # Team overview (liderado / par / gestor tabs)
│   │       │   ├── PersonView.tsx      # Individual profile + artifacts + actions
│   │       │   ├── PersonFormView.tsx  # Register / edit a person
│   │       │   ├── InboxView.tsx       # Ingestion queue + drag-drop
│   │       │   ├── MeetingsFeedView.tsx # All artifacts chronological feed
│   │       │   ├── EuView.tsx          # Módulo Eu: Demandas + Meu Ciclo
│   │       │   ├── MyCycleView.tsx
│   │       │   ├── MyDemandsView.tsx
│   │       │   ├── CycleReportView.tsx # Generate cycle report
│   │       │   ├── RefinamentosView.tsx
│   │       │   ├── SettingsView.tsx
│   │       │   └── SetupView.tsx       # First-run workspace setup
│   │       ├── types/
│   │       │   ├── ipc.ts          # SHARED types: IPC contracts, domain entities
│   │       │   └── global.d.ts     # window.api type declaration
│   │       └── lib/
│   │           └── utils.ts        # Formatting helpers (labelNivel, daysSince, etc.)
│   └── __mocks__/
│       └── electron.ts             # Electron mock for Vitest
├── .planning/
│   └── codebase/                   # GSD codebase analysis documents
├── tasks/                          # Local technical task tracking
│   ├── backlog.md
│   ├── active.md
│   ├── done.md
│   └── sequencia.md
├── electron.vite.config.ts         # electron-vite build config
├── vitest.config.ts
├── package.json
├── tsconfig.json
├── PRD_TECH.md                     # Technical PRD (living document)
└── CLAUDE.md                       # Project-level Claude instructions
```

---

## Workspace Directory (Runtime Data — NOT in repo)

The workspace is separate from the codebase. Default path: `~/PulseCockpit/` (configurable, synced via iCloud Drive).

```
{workspacePath}/
├── inbox/                          # Drop zone for new artifacts
│   ├── *.md / *.txt / *.pdf        # Raw input files (watched by FileWatcher)
│   ├── processados/                # Moved here after successful ingestion
│   └── pending-queue.json          # Persisted queue items awaiting person registration
├── pessoas/
│   ├── {slug}/                     # One directory per registered person
│   │   ├── config.yaml             # PersonConfig (schema_version: 1)
│   │   ├── perfil.md               # Living profile (schema_version: 5, managed blocks)
│   │   ├── actions.yaml            # Action[] list (ActionRegistry)
│   │   ├── historico/
│   │   │   └── {YYYY-MM-DD}-{slug}.md  # Processed artifact files (append-only)
│   │   └── pautas/
│   │       └── {YYYY-MM-DD}-pauta.md   # Generated meeting agendas
│   └── _coletivo/
│       └── historico/              # Artifacts for collective meetings
│           └── {YYYY-MM-DD}-coletivo-{id}.md
├── gestor/
│   ├── ciclo/                      # Manager's own cycle artifacts (.md files)
│   │   └── {YYYY-MM-DD}-{tipo}-gestor-{id}.md
│   ├── demandas.yaml               # Demanda[] list (DemandaRegistry)
│   └── ciclo-log.yaml              # CicloEntry[] log (CicloRegistry)
├── artefatos/                      # User-editable artifact templates
│   ├── 1on1/template.md
│   ├── reuniao/template.md
│   ├── daily/template.md
│   ├── planning/template.md
│   ├── retro/template.md
│   └── feedback/template.md
├── exports/                        # Generated reports (cycle reports, autoavaliacao)
│   └── {YYYY-MM-DD}-{slug}-ciclo.md
├── refinamentos/                   # User-saved documents (read from settings view)
│   └── {YYYY-MM-DD}-{name}.md
└── detected-people.json            # DetectedRegistry — people found in artifacts but not registered
```

**App Settings (outside workspace):**
```
~/.pulsecockpit/
└── settings.json                   # { workspacePath, claudeBinPath, managerName, managerRole }
```

---

## Directory Purposes

**`src/main/ingestion/`:**
- Purpose: End-to-end artifact processing pipeline
- All classes that read files and invoke Claude live here
- Tests colocated: `*.test.ts` next to the implementation file

**`src/main/registry/`:**
- Purpose: All reads and writes to workspace data files
- Each class owns one type of data (person configs, actions, ciclo entries, etc.)
- Stateless — no caching; classes are instantiated per IPC call in `index.ts`
- Key files: `PersonRegistry.ts` (most complex — handles perfil migration, team rollup, artifacts listing)

**`src/main/prompts/`:**
- Purpose: AI prompt construction and result type definitions
- Naming: `{operation}.prompt.ts` — each file exports `build{Operation}Prompt()`, a typed result interface, and usually `render{Operation}Markdown()` for output formatting
- Pure TypeScript — no imports from Node or Electron; safe to test without mocking

**`src/main/migration/`:**
- Purpose: Perfil schema evolution
- Single file `ProfileMigration.ts` with `CURRENT_SCHEMA_VERSION` constant and `migrateProfileContent()` function
- Called lazily on every `PersonRegistry.getPerfil()` read

**`src/main/workspace/`:**
- Purpose: Idempotent workspace directory and template initialization
- `WorkspaceSetup.ts` called on app startup and on workspace path change

**`src/renderer/src/views/`:**
- Purpose: One file per navigable screen
- Each view manages its own loading state via `useState`/`useEffect`; data fetched from `window.api` on mount
- Naming: `{ScreenName}View.tsx` in PascalCase

**`src/renderer/src/types/`:**
- Purpose: Shared type contracts between main and renderer
- `ipc.ts` is the canonical source for all domain entities — imported by main process IPC handlers and renderer views
- `global.d.ts` declares `window.api` type using the preload shape

---

## Key File Locations

**Entry Points:**
- `src/main/index.ts`: Electron main process — all IPC handlers + app lifecycle
- `src/renderer/src/main.tsx`: React bootstrap
- `src/renderer/src/App.tsx`: View routing (object map `ViewName → JSX`)
- `src/preload/index.ts`: Full `window.api` surface

**Configuration:**
- `electron.vite.config.ts`: Build configuration
- `vitest.config.ts`: Test runner configuration
- `tsconfig.json`: TypeScript strict config

**Core Pipeline:**
- `src/main/ingestion/IngestionPipeline.ts`: Queue, locks, multi-pass orchestration
- `src/main/ingestion/ArtifactWriter.ts`: All workspace write operations
- `src/main/ingestion/ClaudeRunner.ts`: Claude CLI spawn and JSON parsing
- `src/main/registry/PersonRegistry.ts`: Person CRUD + perfil access

**IPC Contract:**
- `src/renderer/src/types/ipc.ts`: All shared domain types
- `src/renderer/src/types/global.d.ts`: `window.api` TypeScript declaration

**Testing:**
- `src/main/ingestion/IngestionPipeline.test.ts`
- `src/main/ingestion/ArtifactWriter.test.ts`
- `src/__mocks__/electron.ts`: Electron module mock for Vitest

---

## Naming Conventions

**Files:**
- Main process classes: PascalCase (`PersonRegistry.ts`, `ArtifactWriter.ts`)
- Prompt builders: `{operation}.prompt.ts` — lowercase with dot-prefix
- Tests: `{ClassName}.test.ts` — colocated with implementation
- Views: `{ScreenName}View.tsx`
- Components: PascalCase (`Layout.tsx`, `Sidebar.tsx`)

**Directories:**
- Main process subdirectories: lowercase (`ingestion/`, `registry/`, `prompts/`, `migration/`, `workspace/`)
- Renderer subdirectories: lowercase (`views/`, `components/`, `types/`, `lib/`)

**IPC Channels:**
- Pattern: `{domain}:{action}` (e.g., `people:get`, `ai:generate-agenda`, `ingestion:batch-reingest`)
- Push events (main → renderer): same pattern (`ingestion:completed`, `update:status`)

**Workspace Files:**
- Artifact files: `{YYYY-MM-DD}-{slug}.md`
- Pauta files: `{YYYY-MM-DD}-pauta.md`
- Export files: `{YYYY-MM-DD}-{slug}-ciclo.md`
- Collective artifacts: `{YYYY-MM-DD}-coletivo-{id}.md`

---

## Where to Add New Code

**New AI operation (e.g., new prompt type):**
- Prompt builder: `src/main/prompts/{operation}.prompt.ts` — export `build{Operation}Prompt()`, result interface, and `render{Operation}Markdown()`
- IPC handler: add `ipcMain.handle('{domain}:{action}', ...)` in `registerIpcHandlers()` in `src/main/index.ts`
- Preload bridge: add entry under appropriate namespace in `src/preload/index.ts`
- Renderer call: add typed method to `window.api` in `src/renderer/src/types/global.d.ts`

**New registry (new data type persisted to workspace):**
- Create `src/main/registry/{Entity}Registry.ts`
- Storage location: decide on a file under `{workspacePath}/` (YAML for structured lists, JSON for simple arrays, `.md` for human-readable content)
- Add to `WorkspaceSetup.ts` if a new directory is needed
- Wire IPC handlers in `src/main/index.ts`

**New view/screen:**
- Create `src/renderer/src/views/{Name}View.tsx`
- Add `ViewName` type to `src/renderer/src/router.tsx`
- Add to the routing object in `src/renderer/src/App.tsx`
- Add navigation link to `src/renderer/src/components/Sidebar.tsx`

**New shared type:**
- Add to `src/renderer/src/types/ipc.ts` — this file is imported by both main and renderer

**New workspace directory:**
- Add to the `dirs` array in `src/main/workspace/WorkspaceSetup.ts`

---

## Special Directories

**`src/__mocks__/`:**
- Purpose: Vitest module mocks
- Contains: `electron.ts` — mocks `ipcMain`, `BrowserWindow`, `app` for unit tests
- Generated: No — manually authored
- Committed: Yes

**`inbox/processados/` (workspace):**
- Purpose: Archive of successfully ingested source files
- Generated: Yes (by IngestionPipeline at runtime)
- Committed: No (workspace is separate from repo)

**`.planning/codebase/` (repo):**
- Purpose: GSD codebase analysis documents for Claude Code tooling
- Generated: Yes (by `/gsd:map-codebase`)
- Committed: Yes

---

## Key Observations

1. **`src/renderer/src/types/ipc.ts` is the cross-boundary contract.** It defines every entity that travels between main and renderer. When adding a new IPC operation, always start by defining the types here before touching `index.ts` or the preload.

2. **One prompt file per AI operation.** The `src/main/prompts/` directory has no shared utility file — each prompt is self-contained with its builder, result types, and markdown renderer. This makes prompts easy to edit in isolation without affecting other operations.

3. **Views are coarse-grained; no component library.** Shared components (`Layout`, `Sidebar`, `MarkdownPreview`) are minimal. Most display logic lives directly in view files using inline styles and Lucide icons. There is no component design system or Storybook.

4. **Registry classes are instantiated fresh per IPC call.** `getRegistry()` in `src/main/index.ts` constructs a new `PersonRegistry` on each call. This is intentional (avoids stale state between calls) but means no in-memory caching of workspace data.

5. **The workspace path is reconfigurable at runtime.** When the user changes the workspace path in Settings, the `FileWatcher` is stopped and restarted pointing at the new path. All registry classes derive their paths from `SettingsManager.load().workspacePath` at call time, so no restart is needed.

---

*Structure analysis: 2026-03-26*
