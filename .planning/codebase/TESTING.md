# Testing Patterns

**Analysis Date:** 2026-03-26
**Focus:** quality — test framework, coverage, patterns, untested areas

---

## Test Framework

**Runner:** Vitest ^4.1.0
**Config:** `vitest.config.ts` (project root)
**Assertion library:** Vitest built-in (`expect`)
**Environment:** `node` (not jsdom — renderer is untested)

**Run commands:**
```bash
npm test           # vitest run (single pass, no watch)
```
No watch mode or coverage scripts defined in `package.json`.

**Test file discovery:**
```typescript
// vitest.config.ts
include: ['src/**/*.test.ts'],
```
Only `.test.ts` files — `.spec.ts` pattern is not used.

**Electron mock:**
Electron is aliased to a stub at `src/__mocks__/electron.ts` so main-process tests can run in Node without the real Electron binary:
```typescript
// src/__mocks__/electron.ts
export const BrowserWindow = {
  getAllWindows: () => [],
}
```

---

## Test File Organization

**Location:** Co-located with the source file being tested.
```
src/main/ingestion/
├── ArtifactWriter.ts
├── ArtifactWriter.test.ts   ← co-located
├── IngestionPipeline.ts
└── IngestionPipeline.test.ts ← co-located
```

**Naming:** `SourceFileName.test.ts` — exact match to source file name.

**Coverage of source files:**
| File | Has Test? |
|------|-----------|
| `src/main/ingestion/IngestionPipeline.ts` | Yes — `IngestionPipeline.test.ts` |
| `src/main/ingestion/ArtifactWriter.ts` | Yes — `ArtifactWriter.test.ts` |
| `src/main/ingestion/ClaudeRunner.ts` | No |
| `src/main/ingestion/FileReader.ts` | No |
| `src/main/ingestion/FileWatcher.ts` | No |
| `src/main/ingestion/ProfileCompressor.ts` | No |
| `src/main/ingestion/SchemaValidator.ts` | No |
| `src/main/registry/PersonRegistry.ts` | No |
| `src/main/registry/ActionRegistry.ts` | No |
| `src/main/registry/SettingsManager.ts` | No |
| `src/main/registry/CicloRegistry.ts` | No |
| `src/main/registry/DemandaRegistry.ts` | No |
| `src/main/registry/DetectedRegistry.ts` | No |
| `src/main/migration/ProfileMigration.ts` | No |
| `src/main/index.ts` | No |
| `src/renderer/**/*.tsx` | No |

Only 2 of ~30 source files have test coverage.

---

## Test Structure

**Suite organization:**
```typescript
import { describe, expect, it } from 'vitest'

describe('functionName', () => {
  it('describes expected behavior in Portuguese', () => {
    expect(functionName(input)).toBe(expected)
  })
})
```

**Language:** Test descriptions are written in **Portuguese** (consistent with the overall Portuguese codebase orientation).

**Setup/teardown:** None — both existing tests target pure functions with no filesystem or network dependencies.

**Nested describes used for related scenarios:**
```typescript
describe('shouldRunPass2', () => { ... })

describe('match bidirecional de pontos resolvidos', () => {
  function isMatch(line, resolved): boolean { ... }  // helper defined inside describe
  it('...', () => { ... })
})
```

---

## Mocking

**Framework:** Vitest module aliasing (via `vitest.config.ts` `resolve.alias`) — not `vi.mock()`.

**What is mocked:**
- `electron` module → `src/__mocks__/electron.ts` stub (only `BrowserWindow.getAllWindows`)

**What is NOT mocked (and therefore NOT tested):**
- `fs` module — all registry and writer classes do real disk I/O, so they are excluded from testing
- `child_process.spawn` — `ClaudeRunner` spawns a real process; not mocked, not tested
- `js-yaml` — used directly in `PersonRegistry.get()`, not mocked

**Notable workaround in `ArtifactWriter.test.ts`:**
`normalizePointText` is not exported from `ArtifactWriter.ts`. The test file duplicates the function body locally to enable unit testing:
```typescript
// normalizePointText is not exported — test via the exported behaviour indirectly,
// but we can unit-test the logic by duplicating the pure function here.
function normalizePointText(text: string): string { ... }
```
This is a maintenance risk — if the source function changes, the test copy will silently diverge.

---

## What IS Tested

### `IngestionPipeline.test.ts`
Tests the exported `shouldRunPass2()` function — a pure business-logic gate that decides whether a second AI pass should run:
- Returns `true` when person has sufficient history (`total_artefatos >= 2`) and artifact is long (`> 300 chars`)
- Returns `false` for `_coletivo` slug regardless of inputs
- Returns `false` for new people (`total_artefatos < 2`)
- Returns `false` for short artifacts (`<= 300 chars`)
- Handles malformed frontmatter (`{}`, non-numeric `total_artefatos`)

**Boundary values tested explicitly** — the tests cover the exact threshold values (300, 301, 2, 1).

### `ArtifactWriter.test.ts`
Tests `normalizePointText` (duplicated pure function) and a `isMatch` helper defined in-test:
- Removes date prefixes from markdown lines (`**2026-03-10:**`)
- Removes markdown bold markers
- Removes strikethrough resolved items
- Bidirectional substring matching for fuzzy deduplication
- Short-text guard (`< 15 chars` returns false)
- Strikethrough lines normalize to empty and therefore never match

---

## What is NOT Tested (Coverage Gaps)

**High risk — writes to user filesystem:**

- `src/main/ingestion/ArtifactWriter.ts` — `writeArtifact()`, `updatePerfil()`, `appendToBlock()` write to `pessoas/{slug}/historico/` and `perfil.md`. No integration tests.
- `src/main/registry/PersonRegistry.ts` — `save()`, `delete()`, `getPerfil()` operate on real disk. No tests.
- `src/main/migration/ProfileMigration.ts` — schema migrations (v1→v5) run on production data. No tests. High impact if broken.
- `src/main/ingestion/ProfileCompressor.ts` — modifies `perfil.md` sections with backup. No tests.

**High risk — core pipeline logic:**

- `src/main/ingestion/IngestionPipeline.ts` — Only `shouldRunPass2()` is exported and tested. The main `processItem()` method, queue management, person-lock semaphore, and `batchReingest()` are not tested.
- `src/main/ingestion/SchemaValidator.ts` — Validates all AI responses before they touch disk. No tests despite being complex and critical.
- `src/main/ingestion/ClaudeRunner.ts` — Retry logic, timeout, JSON extraction from Claude output. Not tested.

**Medium risk — business logic:**

- `src/main/registry/ActionRegistry.ts` — action deduplication, status updates. No tests.
- `src/main/registry/CicloRegistry.ts` — cycle entry management. No tests.
- `src/main/registry/DetectedRegistry.ts` — deduplication of auto-detected people. No tests.

**No tests at all:**

- Renderer layer (`src/renderer/src/**`) — all views and components untested
- IPC handlers (`src/main/index.ts`) — no integration or smoke tests
- Prompt builders (`src/main/prompts/`) — no tests for prompt template generation

---

## Coverage Configuration

No coverage threshold configured. Coverage reporting is not set up in `vitest.config.ts` and no `coverage` script exists in `package.json`.

To run coverage manually (not scripted):
```bash
npx vitest run --coverage
```

---

## Key Observations

1. **Testing is nascent** — only 2 test files exist covering 2 pure functions. The ratio of tested to untested code is very low (~5% of source files).

2. **Only pure functions are currently tested** — `shouldRunPass2` and the `normalizePointText` logic are stateless and dependency-free. All stateful, I/O-bound code is untested.

3. **The highest-risk untested code is `ProfileMigration.ts`** — it runs on user production data (perfil.md files accumulated over months) and a regression here causes silent data corruption. It is pure string transformation, making it straightforwardly testable.

4. **`SchemaValidator.ts` is an ideal test target** — it is already a pure function with well-defined inputs/outputs. Adding tests here would prevent regressions in AI response validation with zero mocking complexity.

5. **Function export hygiene blocks testing** — `normalizePointText` in `ArtifactWriter.ts` is not exported, so the test file duplicates the implementation. Any new logic to be tested must be exported or extracted to a testable helper.

6. **No renderer tests** — the React layer has no test setup (no jsdom, no React Testing Library). This is a common tradeoff for Electron apps but means all UI logic is tested only by hand.

7. **No CI enforcement** — the `test` script runs `vitest run` but there is no evidence of CI configuration running this automatically.
