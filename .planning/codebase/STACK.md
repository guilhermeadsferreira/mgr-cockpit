# Technology Stack

**Analysis Date:** 2026-03-26

## Languages

**Primary:**
- TypeScript 5.7.3 — all source code (main process, renderer, preload)
- TSX — React renderer components

**Secondary:**
- JavaScript — config files only (`tailwind.config.js`, `postcss.config.js`)

## Runtime

**Environment:**
- Node.js (Electron runtime — bundled with Electron 34)
- Targets: macOS arm64 and x64

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Electron 34.0.0 — desktop shell, main/renderer process split, IPC
- React 18.3.1 — renderer UI
- React DOM 18.3.1 — renderer mounting

**Build/Dev:**
- electron-vite 3.0.0 — unified dev server + build tool (wraps Vite for all three Electron contexts)
  - Config: `electron.vite.config.ts`
  - Main process alias: `@main` → `src/main`
  - Renderer alias: `@renderer` → `src/renderer/src`
- electron-builder 25.1.8 — packages and distributes macOS `.dmg` + `.zip`
  - Config: inline in `package.json` under `"build"` key
  - Output: `dist/`
  - GitHub releases: owner `guilhermeadsferreira`, repo `Pulse-Cockpit`

**Styling:**
- Tailwind CSS 3.4.17 — utility classes, custom design tokens
  - Config: `tailwind.config.js`
  - Content: `src/renderer/index.html`, `src/renderer/src/**/*.{ts,tsx}`
  - Custom colors: `bg`, `surface`, `surface-2`, `surface-3`, `border`, `accent`, health status variants
- tailwindcss-animate 1.0.7 — animation utilities
- class-variance-authority 0.7.1 — component variant management
- clsx 2.1.1 — conditional class merging
- tailwind-merge 2.6.0 — Tailwind class conflict resolution
- PostCSS — config: `postcss.config.js`
- Autoprefixer 10.4.20

**UI Components:**
- lucide-react 0.475.0 — icon library

**Markdown:**
- react-markdown 10.1.0 — render markdown in renderer (`src/renderer/src/components/MarkdownPreview.tsx`)
- remark-gfm 4.0.1 — GitHub-Flavored Markdown support

**Testing:**
- Vitest 4.1.0 — test runner
  - Config: `vitest.config.ts`
  - Environment: `node`
  - Includes: `src/**/*.test.ts`
  - Electron mocked via `src/__mocks__/electron.ts`

## Key Dependencies

**Critical:**
- `chokidar` 3.6.0 — filesystem watcher for `inbox/` directory; core of the ingestion pipeline (`src/main/ingestion/FileWatcher.ts`)
- `js-yaml` 4.1.0 — parses YAML frontmatter in person configs and artifact files (`src/main/registry/PersonRegistry.ts`)
- `pdf-parse` 1.1.1 — extracts text from PDF artifacts (`src/main/ingestion/FileReader.ts`, dynamically required to avoid bundling issues)
- `electron-updater` 6.8.3 — auto-update via GitHub Releases (`src/main/index.ts` — `setupAutoUpdater()`)

**Infrastructure:**
- `@vitejs/plugin-react` 4.3.4 — Vite React transform plugin for renderer
- `@types/node` 20.17.0 — Node.js type definitions for main process

## Configuration

**Environment:**
- No `.env` files — the app has no external API keys or secrets
- All user config stored at runtime in `~/.pulsecockpit/settings.json`
- Settings schema: `{ workspacePath, claudeBinPath, managerName?, managerRole? }`
- Managed by: `src/main/registry/SettingsManager.ts`

**Build:**
- `electron.vite.config.ts` — build configuration for main, preload, and renderer
- `tsconfig.json` — composite root, references `tsconfig.node.json` and `tsconfig.web.json`
- `tsconfig.node.json` — main process TS config (strict mode implied via project references)
- `tsconfig.web.json` — renderer process TS config

## Platform Requirements

**Development:**
- macOS (primary; app uses macOS-specific window chrome: `titleBarStyle: 'hiddenInset'`, `trafficLightPosition`)
- Node.js and npm installed
- Claude Code CLI installed and on `$PATH` (detected via `which claude` in a login shell)
- Run dev server: `npm run dev` (builds then starts electron-vite dev server)

**Production:**
- macOS arm64 or x64
- Distributed as `.dmg` and `.zip` via GitHub Releases
- Auto-update enabled in packaged builds only (`app.isPackaged` guard in `src/main/index.ts`)
- Workspace synced via iCloud Drive (default: `~/PulseCockpit/`)
- Updater logs written to `{userData}/logs/updater.log`

## Scripts

```bash
npm run dev        # Build + start electron-vite dev (opens DevTools in detached mode)
npm run build      # electron-vite build only
npm run package    # Build + electron-builder (produces dist/)
npm run release    # bash scripts/release.sh
npm run lint       # ESLint on .ts/.tsx (ignores .gitignore paths)
npm test           # vitest run (single pass)
```

## Key Observations

- **No external API keys.** The app deliberately avoids the Anthropic SDK. All AI calls go through the locally installed Claude Code CLI binary (`claude -p`), making the app self-contained and offline-capable (except for Claude CLI's own auth).
- **pdf-parse is dynamically required** in `FileReader.ts` (`require('pdf-parse')`) to avoid electron-vite bundling issues with binary native dependencies.
- **Tailwind custom design system** is fully defined in `tailwind.config.js` — any new UI work must use those semantic tokens (`surface`, `accent`, `health.*`) rather than raw Tailwind color classes.
- **TypeScript strict via project references** — the root `tsconfig.json` delegates entirely to `tsconfig.node.json` (main + preload) and `tsconfig.web.json` (renderer).
- **Vitest mocks Electron** (`src/__mocks__/electron.ts`) so main process classes can be unit tested in a pure Node environment without an Electron runtime.

---

*Stack analysis: 2026-03-26*
