# Codebase Concerns

**Analysis Date:** 2026-03-26
**Focus:** Production Electron app — data integrity risks are highest priority

---

## Critical Concerns

### C1 — `resetGeneratedData` deletes irreplaceable data without confirmation at runtime

**Severity:** CRITICAL
**Files:** `src/main/ingestion/IngestionPipeline.ts:716–768`, `src/renderer/src/views/SettingsView.tsx:50–57`

The `resetGeneratedData` static method uses `rmSync` with `{ recursive: true }` to delete `perfil.md`, `actions.yaml`, `historico/`, and `pautas/` for every person in the workspace. The renderer calls it immediately upon `handleReingestConfirm()` without any second layer of OS-level confirmation or backup. The only protection is a UI "confirming" state — a single `await window.api.ingestion.resetData()` call wipes all derived data across all people. If `batchReingest` then fails mid-way, the workspace is left in a partially degraded state with no rollback path.

- **Impact:** Loss of all processed profiles, action history, pauta history, and artifact files for every person. Months of manager context gone.
- **Fix approach:** Create a timestamped full backup of `pessoas/` to `~/.pulsecockpit/backups/YYYY-MM-DD-HH-mm/` before any deletion. Log backup path in the confirmation UI. Only proceed with deletion after backup verification.

---

### C2 — `perfil.md` write has no rollback if `renameSync` fails

**Severity:** CRITICAL
**Files:** `src/main/ingestion/ArtifactWriter.ts:145–146`

The atomic write pattern (`writeFileSync(tmpPath) → renameSync(tmpPath, perfilPath)`) correctly uses a `.tmp` file and a `.bak` backup (`copyFileSync` at line 131). However, if `renameSync` throws (e.g. cross-device rename on some iCloud Drive mount points), the function throws before clearing `.tmp`. The `.bak` is never automatically restored on failure — the caller (`IngestionPipeline`) does not catch partial-write scenarios from `ArtifactWriter`. The `item.status` will be set to `error` but the filesystem state is left with a stale `.tmp` file and possibly a corrupt `perfil.md`.

- **Impact:** On iCloud-synced paths, transient errors during sync can leave profiles in an inconsistent state.
- **Fix approach:** Wrap the `renameSync` in a try/catch that restores from `.bak` if the rename fails.

---

### C3 — IPC event channels emitted from V2 ingestion are not exposed in `preload/index.ts`

**Severity:** CRITICAL (silent data loss)
**Files:** `src/main/ingestion/IngestionPipeline.ts:347,573,668,702`, `src/preload/index.ts`

Three new IPC push events are emitted in V2 code but never exposed to the renderer:
- `ingestion:cerimonia-sinal-aplicado` (line 347)
- `ingestion:1on1-deep-completed` (line 573)
- `ingestion:batch-progress` (line 668)
- `ingestion:batch-completed` (line 702)

The preload only exposes `ingestion:started`, `ingestion:completed`, and `ingestion:failed`. The renderer has no way to react to deep-pass completions or batch progress. The UI will not update when ceremony signals are applied or when the 1:1 deep pass finishes enriching the profile. The `global.d.ts` typing also omits the `eu` namespace entirely (the preload exposes it but the type declaration doesn't include it).

- **Impact:** Stale UI after 1:1 deep pass and cerimônia signal application. Users see old profile data until manual refresh. Batch reingest has no progress feedback.
- **Fix approach:** Add the missing IPC events to `preload/index.ts` and `src/renderer/src/types/global.d.ts`. Add `eu` namespace to the global type declaration.

---

### C4 — Manager slug resolution is a fragile, lowercased heuristic with no validation

**Severity:** HIGH
**Files:** `src/main/ingestion/IngestionPipeline.ts:185,972`, `src/main/index.ts:154`

The manager slug is derived by `settings.managerName?.trim().toLowerCase().replace(/\s+/g, '-')` in at least three separate call sites. This is compared against AI-generated `responsavel` strings to route actions to `DemandaRegistry` vs `ActionRegistry`. If the manager's name in settings has accents, different spacing, or the AI returns a different rendering (e.g. "Guilherme A." vs "Guilherme Augusto"), actions silently go to the wrong registry. There is no test covering this routing logic.

- **Impact:** Manager actions silently land in a liderado's `ActionRegistry` or are orphaned. Data corruption that is hard to detect.
- **Fix approach:** Centralize slug derivation in a single utility function. Add normalization (accents, punctuation) to both sides before comparison.

---

## Medium Concerns

### M1 — `sandbox: false` in `BrowserWindow` webPreferences

**Severity:** MEDIUM
**Files:** `src/main/index.ts:43`

`sandbox: false` disables the Chromium sandbox for the renderer process. Combined with `contextIsolation: true` (which is correct), this is not a code-execution risk for trusted local content. However, if any user-supplied content (e.g. a malicious `.md` file placed in the inbox) were to trigger XSS via the markdown renderer, the lack of sandboxing would grant filesystem access. This setting appears necessary for `pdf-parse` (requires Node.js access), but the risk is not documented.

- **Impact:** Potential filesystem access if renderer XSS is achieved via malicious artifact.
- **Fix approach:** Document why `sandbox: false` is required. Ensure `react-markdown` sanitizes output. Explore whether a preload-based PDF bridge could allow sandboxing.

---

### M2 — `require()` calls inside ESM/TypeScript module code

**Severity:** MEDIUM
**Files:** `src/main/index.ts:185–191`, `src/main/ingestion/FileReader.ts:40`, `src/main/ingestion/IngestionPipeline.ts:720`

Three locations use `require()` inside TypeScript files that otherwise use ES `import`:
- `src/main/index.ts:185–191`: `require('path')` and `require('fs')` inside an IPC handler
- `src/main/ingestion/FileReader.ts:40`: `require('pdf-parse')` (commented as intentional for bundling)
- `src/main/ingestion/IngestionPipeline.ts:720`: `require('fs')` inside a static method

The `pdf-parse` case has a documented reason (electron-vite bundling). The others are inconsistent and suggest these sections were written hastily. They bypass TypeScript tree-shaking and create confusion about module boundaries.

- **Fix approach:** Replace `require('path')` and `require('fs')` with top-level imports. Only keep `require('pdf-parse')` with its justification comment.

---

### M3 — Fire-and-forget deep passes have no error surfacing to the user

**Severity:** MEDIUM
**Files:** `src/main/ingestion/IngestionPipeline.ts:1012–1015`, `src/main/ingestion/IngestionPipeline.ts:263–264`

Both `run1on1DeepPass` and `runCerimoniaSignalsForPeople` are called with `.catch((err) => console.warn(...))`. If the deep pass fails (e.g. Claude timeout, schema validation error), the main ingestion item is already marked `done` and moved to `processados/`. The user sees a successful ingestion but the profile is missing insights, tendência emocional, followup updates, and ceremony signals. There is no indication in the UI or queue item that the secondary pass failed.

- **Impact:** Silently degraded profile quality after 1:1 ingestion. Manager can't tell whether deep enrichment ran.
- **Fix approach:** Track deep-pass status separately (e.g. a `deepPassStatus` field on `QueueItem`). Surface warnings in the queue UI when a secondary pass fails.

---

### M4 — `fuzzyRemapSlugs` mutates `aiResult` in-place by first-name only

**Severity:** MEDIUM
**Files:** `src/main/ingestion/IngestionPipeline.ts:828–880`

The fuzzy slug resolution logic remaps AI-generated slugs to registered people when the first name is unambiguous. This mutation happens before validation and writes. The "unambiguous first name" assumption breaks when:
1. Two registered people share a first name (correctly handled — returns `null`)
2. The AI generates a slug for an unregistered person with the same first name as a registered person (silently remaps to wrong person)

No tests cover this logic. A false positive remap means artifacts are written to the wrong person's `historico/` and profile.

- **Impact:** Artifact written to wrong person's profile. Irreversible without manual cleanup.
- **Fix approach:** Add test coverage for ambiguous and partial-match cases. Consider requiring minimum confidence (both first and last name partial match) before fuzzy remapping.

---

### M5 — `ProfileCompressor` triggers on every 10th artifact without idempotency

**Severity:** MEDIUM
**Files:** `src/main/ingestion/IngestionPipeline.ts:610–617`, `src/main/ingestion/ProfileCompressor.ts`

The compressor fires when `totalArtefatos % 10 === 0` (i.e. on the 10th, 20th, 30th ingestion). If the same artifact is re-ingested (batch reingest scenario) the counter increments again and compression may run twice on the same content. Compression calls Claude with up to 3 active attention points — if fewer are returned, it aborts (line 54–59 of `ProfileCompressor.ts`). However, the validation compares `activePoints.length < compressedPoints.length` which has the comparison direction reversed: it checks if fewer were returned than existed, but uses `<` not `>`. The abort condition is `compressedPoints.length < activePoints.length` — this is correct, but on a compressed profile where `pontosAtencao` is already a shorter list, re-compression may silently produce a degraded result.

- **Impact:** Profile compression can run on already-compressed profiles and silently reduce context.
- **Fix approach:** Store a `ultima_compressao_em` timestamp in frontmatter. Skip compression if last compression was after last ingestion.

---

### M6 — `batchReingest` in `SettingsView` does not validate file order

**Severity:** MEDIUM
**Files:** `src/renderer/src/views/SettingsView.tsx:45–57`, `src/main/index.ts:183–192`

`ingestion:list-processados` returns files sorted alphabetically (commented as "alphabetical = chronological when filenames start with date"). If a file lacks the `YYYY-MM-DD` date prefix, it sorts incorrectly. The batch reingest then processes files in wrong chronological order, which corrupts the `resumo_evolutivo` that integrates history cumulatively. There is no validation that file names match the expected date pattern before sorting.

- **Impact:** Corrupted `resumo_evolutivo` history after reingest if any artifact file was named without the date prefix.
- **Fix approach:** Filter out files that don't match the date pattern before passing to `batchReingest`, or sort by file modification time as a fallback.

---

### M7 — `updateFrontmatter` uses regex string replacement on YAML, not YAML parse/serialize

**Severity:** MEDIUM
**Files:** `src/main/ingestion/ArtifactWriter.ts:295–361`

The `updateFrontmatter` method updates `perfil.md` frontmatter using a series of `fm.replace(/field:.*/,  ...)` regex substitutions. This approach is fragile:
1. If a field value contains a newline (YAML multiline), the regex matches only the first line
2. If a new field is added between existing fields, the regex positional assumptions break
3. The method appends new fields to the end of `fm` (`fm += '\nnew_field: value'`) without checking for duplicate insertion (could happen if called twice without schema version bump)

The migration history (`ProfileMigration.ts`) shows 5 schema versions all requiring these same regex patches — indicating this pattern accumulates technical debt with every new field.

- **Fix approach:** Replace regex-based frontmatter mutation with `js-yaml` parse/modify/serialize. The `js-yaml` dependency is already present in `package.json`.

---

## Low Concerns / Technical Debt

### L1 — `console.log` / `console.warn` used throughout production code

**Severity:** LOW
**Files:** Throughout `src/main/` — every module uses `console.log` and `console.warn`

Per global conventions (`CLAUDE.md`): "Sem console.log em código de produção." The main process is saturated with `console.log` calls, including sensitive context like person slugs, action descriptions, and file paths. There is no structured logging framework (no log levels, no log rotation, no log file output except in `logUpdaterError`).

- **Fix approach:** Replace with a structured logger (e.g. `electron-log`) that writes to `app.getPath('logs')` in production and `console` only in development.

---

### L2 — TODO comment for Fase 5 feature (gestor agenda enrichment)

**Severity:** LOW
**Files:** `src/main/index.ts:233`

```
// TODO Fase 5: enrich gestor agenda with tendencias, correlações, riscos compostos
```

This feature is planned but the code path currently uses a limited `liderados` rollup from `getTeamRollup()`. The `AgendaGestorAIResult` type is built without tendência emocional, correlation signals, or composite risks.

- **Impact:** Gestor 1:1 agenda is lower quality than the V2 plan intends.

---

### L3 — `global.d.ts` is missing the `eu` namespace type declaration

**Severity:** LOW
**Files:** `src/renderer/src/types/global.d.ts`, `src/preload/index.ts:47–57`

The preload exposes `window.api.eu` with 7 methods (`listDemandas`, `saveDemanda`, `deleteDemanda`, `updateDemandaStatus`, `listCiclo`, `addManualEntry`, `deleteCicloEntry`, `ingestArtifact`, `gerarAutoavaliacao`). None of these appear in `global.d.ts`. Renderer code calling these methods has no TypeScript type safety — any typo or wrong argument type is a runtime error only.

- **Fix approach:** Add the complete `eu` namespace with typed signatures to `global.d.ts`.

---

### L4 — `IngestionPipeline.test.ts` tests only one exported function

**Severity:** LOW
**Files:** `src/main/ingestion/IngestionPipeline.test.ts`, `src/main/ingestion/ArtifactWriter.test.ts`

`IngestionPipeline.test.ts` tests only `shouldRunPass2` — a pure decision function. The `ArtifactWriter.test.ts` is the only other test file in the ingestion module. The following critical paths have zero test coverage:
- `fuzzyRemapSlugs` (wrong-person artifact routing)
- `syncItemToPerson` (core write path)
- `updateFrontmatter` (regex-based YAML mutation)
- `resetGeneratedData` (destructive delete)
- `ProfileCompressor.compress` (compression validation logic)
- All `ActionRegistry` write paths
- `migrateProfileContent` (only tested implicitly)

---

### L5 — `DetectedRegistry` upsert writes on every ingestion with no debounce

**Severity:** LOW
**Files:** `src/main/ingestion/IngestionPipeline.ts:977–987`, `src/main/registry/DetectedRegistry.ts`

For every ingestion that identifies an unregistered person, `detectedRegistry.upsert()` is called for both `novas_pessoas_detectadas` entries and `naoCadastradas` entries. On a batch reingest of 20+ artifacts, this triggers many small disk writes to `detected.yaml`. No file locking is in place for `DetectedRegistry`.

---

### L6 — `InboxView` removes all ingestion event listeners on unmount

**Severity:** LOW
**Files:** `src/renderer/src/views/InboxView.tsx:29`

`window.api.ingestion.removeListeners()` removes all listeners for `ingestion:started`, `ingestion:completed`, and `ingestion:failed`. If any other component is also listening to these events (e.g. a sidebar badge counter), unmounting `InboxView` silently removes their listeners too. `ipcRenderer.removeAllListeners` is a global operation.

- **Fix approach:** Use named listener functions stored per-component and call `ipcRenderer.removeListener` with the specific callback.

---

### L7 — `pdf-parse` is an unmaintained dependency (last release 2018)

**Severity:** LOW
**Files:** `package.json:69`, `src/main/ingestion/FileReader.ts:40`

`pdf-parse@1.1.1` was last published in 2018. It has known issues with newer PDF formats and requires the `require()` dynamic-import workaround (documented in `FileReader.ts`). It is the only dependency without a recent release date in the production dependency list.

- **Impact:** Poor extraction quality on modern PDFs. Potential breakage on future Node.js/Electron versions.
- **Fix approach:** Evaluate `pdfjs-dist` (Mozilla) or `pdf2json` as alternatives.

---

## TODOs / FIXMEs Found

| File | Line | Content |
|------|------|---------|
| `src/main/index.ts` | 233 | `// TODO Fase 5: enrich gestor agenda with tendencias, correlações, riscos compostos` |

---

## V2 Implementation Status

Based on `briefing-v2.md` and the current codebase state, the following V2 phases are complete or in-flight:

| Phase | Description | Status |
|-------|-------------|--------|
| Pass 1+2 with perfil context | `IngestionPipeline.ts` passes perfil to Claude on pass 2 | Done |
| Schema V5 migration | `ProfileMigration.ts` at `CURRENT_SCHEMA_VERSION = 5` | Done |
| 1:1 deep pass | `run1on1DeepPass` implemented with followup, insights, tendência | Done |
| Ceremony signal extraction | `runCerimoniaSignalsForPeople` + gestor variant | Done |
| Person-level write locks | `acquirePersonLock` semaphore | Done |
| Collective meeting routing | `syncItemToCollective` with action routing | Done |
| Gestor agenda enrichment (Fase 5) | TODO comment, not implemented | Pending |
| IPC events for new V2 passes | Missing in preload and global.d.ts | Gap (see C3) |

---

## Summary

**Highest priority (data safety):**
- **C1** — `resetGeneratedData` deletes all workspace data without backup; one click away from catastrophic loss
- **C2** — `perfil.md` atomic write has no auto-restore on `renameSync` failure
- **C3** — V2 IPC events not exposed to renderer; deep pass completions are invisible to the UI

**High priority (correctness):**
- **C4** — Manager slug routing relies on fragile heuristic; actions can silently land in wrong registry
- **M4** — Fuzzy slug remap can write artifacts to the wrong person

**Medium priority (robustness):**
- **M3** — Fire-and-forget deep passes fail silently with no UI feedback
- **M7** — Frontmatter mutation via regex instead of YAML parse/serialize
- **M6** — Batch reingest file ordering can be wrong if filename lacks date prefix

**Low priority (code quality):**
- **L1** — `console.log` throughout production code violates project conventions
- **L3** — `eu` namespace missing from `global.d.ts` (no TypeScript safety on 9 IPC methods)
- **L4** — Critical ingestion paths have no test coverage
- **L7** — `pdf-parse` dependency is 7+ years unmaintained

---

*Concerns audit: 2026-03-26*
