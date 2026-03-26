# Coding Conventions

**Analysis Date:** 2026-03-26
**Focus:** quality — TypeScript strictness, code patterns, consistency

---

## TypeScript Configuration

**Strict Mode:** `"strict": true` in both `tsconfig.node.json` and `tsconfig.web.json`

**Key compiler settings:**
- `target: "ES2022"` in both configs
- `moduleResolution: "bundler"` (not `node`)
- `skipLibCheck: true`
- `composite: true` (project references model)
- No `noUnusedLocals` or `noUncheckedIndexedAccess` — only `strict` flag enabled

**Path aliases:**
- `@main/*` → `src/main/*` (node config)
- `@renderer/*` → `src/renderer/src/*` (web config)

---

## Naming Patterns

**Files:**
- Main process: `PascalCase.ts` for classes (`ArtifactWriter.ts`, `PersonRegistry.ts`), `camelCase.ts` for singletons (`index.ts`)
- Prompts: `kebab-case.prompt.ts` (e.g., `1on1-deep.prompt.ts`, `ingestion.prompt.ts`)
- Tests: `PascalCaseName.test.ts` co-located with the source file
- Renderer views: `PascalCaseView.tsx` (e.g., `SettingsView.tsx`, `DashboardView.tsx`)
- Renderer components: `PascalCase.tsx` (e.g., `MarkdownPreview.tsx`, `Sidebar.tsx`)

**Classes:**
- PascalCase: `IngestionPipeline`, `ArtifactWriter`, `PersonRegistry`, `ProfileCompressor`
- Object-literal singletons (no class needed): `SettingsManager` — exported as `const SettingsManager = { load(), save() }`

**Functions:**
- camelCase for all functions and methods
- Pure builder functions prefixed `build`: `buildIngestionPrompt`, `build1on1DeepPrompt`, `buildCyclePrompt`
- Pure renderer functions prefixed `render`: `renderCycleMarkdown`, `renderAgendaMarkdown`
- IPC handlers: inline arrow functions inside `registerIpcHandlers()` in `src/main/index.ts`

**React components:**
- Named exports using `function` keyword: `export function DashboardView()`, `export function SettingsView()`
- Hooks: camelCase with `use` prefix: `useRouter()`

**Variables and fields:**
- camelCase for TypeScript variables
- `snake_case` for domain data fields that mirror YAML/JSON schema (e.g., `total_artefatos`, `data_artefato`, `pessoa_principal`) — intentional to match AI output keys
- `SCREAMING_SNAKE_CASE` for module-level constants: `MAX_CONCURRENT`, `CURRENT_SCHEMA_VERSION`, `PERSON_SUBDIRS`
- Interface properties: camelCase for UI-layer types (`criadoEm`, `personSlug`), `snake_case` for AI/YAML types (`indicador_saude`, `alerta_estagnacao`)

**Type/Interface naming:**
- PascalCase: `PersonConfig`, `QueueItem`, `ValidationResult`, `ClaudeRunnerResult`
- Exported types in `src/renderer/src/types/ipc.ts` serve as the shared contract between main and renderer

---

## Type Safety Patterns

**`any` usage:** Minimal — only 1 confirmed instance:
- `src/main/index.ts:375` — `new ActionRegistry(workspacePath).save(action as any)` — a known gap where the IPC payload isn't narrowed before the registry call

**`unknown` for external data:** Consistent use of `unknown` for AI results and IPC inputs:
```typescript
// ClaudeRunner returns unknown data
export interface ClaudeRunnerResult {
  data?: unknown
}

// SchemaValidator always accepts unknown
export function validateIngestionResult(data: unknown): ValidationResult
```

**Type narrowing pattern:**
```typescript
// Cast to Record after null/object check
if (!data || typeof data !== 'object') {
  return { valid: false, missingFields: ['(all — not an object)'], typeErrors: [] }
}
const obj = data as Record<string, unknown>
```

**Discriminated union / literal types used extensively:**
```typescript
export type QueueItemStatus = 'queued' | 'processing' | 'done' | 'pending' | 'error'
export type HealthStatus = 'verde' | 'amarelo' | 'vermelho'
export type PersonLevel = 'junior' | 'pleno' | 'senior' | 'staff' | 'principal' | 'manager'
```

**IPC contract type duplication:** `PersonConfig` and `AppSettings` are defined separately in `src/main/registry/PersonRegistry.ts` and `src/main/registry/SettingsManager.ts`, and again in `src/renderer/src/types/ipc.ts`. These must be kept in sync manually — there is no shared source of truth.

**`Partial<>` for frontmatter:** `PerfilData.frontmatter` is typed as `Partial<PerfilFrontmatter>` — callers must guard every field access.

---

## Module Design

**Main process — class-based registries:**
Each domain area has its own registry class instantiated on demand (not singletons):
```typescript
// Pattern in src/main/index.ts:
function getRegistry(): PersonRegistry {
  const { workspacePath } = SettingsManager.load()
  return new PersonRegistry(workspacePath)
}
```
Registries: `PersonRegistry`, `ActionRegistry`, `DetectedRegistry`, `DemandaRegistry`, `CicloRegistry`

**Prompt modules — function-based:**
Each prompt file exports:
1. Input params interface: `export interface XxxPromptParams`
2. AI result interface: `export interface XxxAIResult`
3. Builder function: `export function buildXxxPrompt(params): string`
4. Optional renderer: `export function renderXxxMarkdown(...): string`

Example: `src/main/prompts/cycle.prompt.ts`, `src/main/prompts/agenda.prompt.ts`

**Renderer — no global state management:**
No Redux, Zustand, or React Context for app state. Each view manages its own `useState` and fetches via `window.api.*` in `useEffect`. Router state is managed by a minimal custom `RouterProvider` using a history stack in `src/renderer/src/router.tsx`.

**Exports:**
- No barrel `index.ts` files — all imports use direct file paths
- Named exports only — no default exports found in source files

---

## Error Handling

**Main process — silent catch with fallback:**
```typescript
// Registry pattern: return null or [] on error
get(slug: string): PersonConfig | null {
  try {
    const parsed = yaml.load(readFileSync(configPath, 'utf-8'))
    return parsed as PersonConfig
  } catch {
    return null
  }
}
```

**IPC handlers — not wrapped in try/catch:**
Most IPC handlers in `src/main/index.ts` do not have individual try/catch blocks. Errors propagate as unhandled rejections. Only a few handlers (e.g., `artifacts:read`) wrap in try/catch.

**ClaudeRunner — structured error return:**
```typescript
// Never throws — always returns ClaudeRunnerResult
resolve({ success: false, error: err.message })
```

**Renderer — inline error state:**
Views use local `useState` for error display: `const [error, setError] = useState<string | null>(null)`. No error boundary components present.

---

## Logging

**Pattern:** `console.log/warn/error` with `[ClassName]` prefix tags — used in main process only:
```typescript
console.log(`[IngestionPipeline] processing: ${item.fileName}`)
console.warn('[ProfileCompressor] validação falhou para "${slug}"')
console.error('[IngestionPipeline] failed to save pending queue:', err)
```

**Note:** The global rule "no console.log in production code" is NOT followed in this project. The main process uses `console.*` extensively as the primary diagnostic tool (no structured logger). This is intentional for an Electron app where the main process output is the primary debug channel, but violates the project-level global rule.

**Renderer:** No `console.*` calls found in renderer code.

---

## Import Organization

**Order (observed):**
1. Node built-ins (`path`, `fs`, `os`, `child_process`)
2. Electron (`electron`)
3. Internal project modules (`./ClaudeRunner`, `../registry/PersonRegistry`)
4. Types via `import type` (always separated from value imports)

**`import type` used consistently:**
```typescript
import type { IngestionAIResult } from '../prompts/ingestion.prompt'
import type { CycleReportParams } from '../renderer/src/types/ipc'
```

---

## Comments

**JSDoc used on:**
- Class methods that have non-obvious behavior or safety properties
- Module-level constants when purpose is not self-evident

**Inline comments used for:**
- YAML/markdown section markers and their semantics
- Business logic caveats and edge cases
- TODO markers (1 found: `src/main/index.ts:233`)

**Section separators in `index.ts`:**
```typescript
// ── Settings ──────────────────────────────────────────────
// ── People ────────────────────────────────────────────────
```
Consistent unicode box-drawing dashes used throughout `index.ts` for IPC handler grouping.

---

## Inline Styles (Renderer)

Views use inline `React.CSSProperties` style objects defined at module top level — not Tailwind classes. Tailwind is configured but appears used only via CSS variables (CSS custom properties) referenced in inline styles.

**Pattern:**
```typescript
// Defined once at module top level
const styles = {
  btnPrimary: {
    padding: '8px 14px', background: 'var(--accent)', ...
  } as React.CSSProperties,
}
// Used in JSX
<button style={styles.btnPrimary}>
```

This is inconsistent with Tailwind being in the stack — the `cn()` utility exists in `src/renderer/src/lib/utils.ts` but views use inline styles almost exclusively.

---

## Key Observations

1. **TypeScript strict mode is on** — the codebase is meaningfully type-safe at the boundaries that matter (AI results, IPC contracts, schema validation).

2. **`unknown` over `any` as the default** — external data enters as `unknown` and is narrowed before use. The one `as any` cast at `src/main/index.ts:375` is the exception.

3. **IPC type contract is manually duplicated** — types in `src/main/registry/SettingsManager.ts` and `src/renderer/src/types/ipc.ts` must be kept in sync by hand. Risk of drift.

4. **`console.*` is the logging strategy** — heavily used in main process with class-prefixed tags. Accepted tradeoff for Electron dev visibility, but breaks the global no-console rule.

5. **No error boundaries in renderer** — unhandled promise rejections from `window.api.*` calls will silently fail unless each view has local error state (inconsistently implemented).

6. **Inline styles vs Tailwind inconsistency** — `tailwindcss` is a dependency and CSS variables are defined, but views use inline style objects. The `cn()` utility is present but underused.

7. **No lint config found** — `eslint` is a devDependency and `lint` script exists in `package.json`, but no `.eslintrc` or `eslint.config.*` was found in the repo root. Lint may not be enforced.
