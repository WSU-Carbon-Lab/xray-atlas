# Process NEXAFS: three-layer orchestration plan

## Target architecture (three sections)

| Layer | Path | Responsibility |
|-------|------|----------------|
| **Feature library** | `src/features/process-nexafs/` | NEXAFS **contribution pipeline**: `DatasetState`, hooks (`useNexafsDatasets`, `useNexafsSubmit`, `useNexafsOptions`, `useMoleculeSearch`), utils (CSV/JSON/normalization/bare atom/beta/difference/peaks), constants, types, **`NexafsContributeFlow`**, and **pipeline-specific UI** (former `components/contribute/nexafs/*`) colocated under the feature (e.g. `ui/`). |
| **App route** | `src/app/contribute/nexafs/` | **Page shell only**: `page.tsx`, optional minimal route-only glue (SEO, auth layout props). No duplicate utils/types re-export trees; import from `~/features/process-nexafs`. |
| **Plotting library** | `src/components/plots/` | **Dumb / reusable** visualization: `SpectrumPlot`, visx layers, generic hooks (`usePeakVisualization`), toolbars without NEXAFS product rules. No imports from `app/contribute/nexafs`. Shared types like `SpectrumPoint` stay here; feature imports these types. |

## Renames

- `src/features/nexafs-contribute/` -> `src/features/process-nexafs/`
- Public import path: `~/features/nexafs-contribute` -> `~/features/process-nexafs` (update `tsconfig` paths if used).

## Three `component-library-orchestrator` runs

Each run follows the orchestrator contract: **components** (extract/polish) -> **heroui** -> **accessibility** on the files touched in that phase, with scope handoff only to modified files.

### Orchestrator 1 — Feature rename + consolidate app shims

**Mode:** Polish + extract into feature.

**Scope:**

1. Rename directory `nexafs-contribute` -> `process-nexafs`.
2. Move **all** logic currently living under `src/app/contribute/nexafs/` except `page.tsx` into the feature:
   - `utils/betaIndex.ts`, `utils/normalizationDefaults.ts`, `utils/autoDetectPeaksFromSpectrum.ts`, `utils.ts` aggregations, `utils/*.ts` that are not pure re-exports.
   - Remove thin re-export files (`utils/bareAtomCalculation.ts`, `utils/jsonParser.ts`, etc.) after callers import from the feature barrel or `~/features/process-nexafs/utils`.
   - `hooks/useMoleculeSearch.ts` re-export -> delete; import feature hook directly.
   - `types.ts` -> reduce to **only** what the page truly needs re-exporting, or delete and import types from the feature everywhere.
3. Update **every** `~/features/nexafs-contribute` import to `~/features/process-nexafs`.
4. Update consumers: `page.tsx`, `lib/molecule-autosuggest.ts`, `components/contribute/nexafs/*` (until Phase 2 moves them), `components/plots/*` that still pointed at app utils.

**Verification:** `bunx tsc --noEmit`, `bunx eslint` on changed paths, `bun test` for moved tests (e.g. `betaIndex.test.ts`).

---

### Orchestrator 2 — Migrate `components/contribute/nexafs` into the feature

**Mode:** Extract from `src/components/contribute/nexafs/` -> `src/features/process-nexafs/ui/` (or `components/` inside the feature).

**Scope:**

1. Relocate: `DatasetContent`, `DatasetTabs`, `FileUploadZone`, `ColumnMappingModal`, modals, `SampleInformationSection`, `VisualizationToggle`, etc., into the feature package.
2. Update `NexafsContributeFlow` to import from `~/features/process-nexafs/...` (not `@/components/contribute/nexafs`).
3. Trim or remove `src/components/contribute/nexafs/` and update `src/components/contribute/index.ts` (and any barrels) to re-export from the feature **only if** you want a stable alias; prefer direct `~/features/process-nexafs` imports.
4. Keep **plot-specific** presentational pieces that are truly generic in `src/components/plots/` (Phase 3 refines boundaries).

**Verification:** same as Phase 1 + smoke the contribute NEXAFS page.

---

### Orchestrator 3 — Plots library boundary + generic helpers

**Mode:** Polish `src/components/plots/`.

**Scope:**

1. Eliminate remaining imports from `~/app/contribute/nexafs` (e.g. `generateGaussianPeak` / peak helpers): move **generic** numerical helpers into `src/components/plots/utils` or `src/features/process-nexafs/utils` based on whether they are plot-only or pipeline-specific.
2. Document or enforce: plots depend on `~/components/plots/types` + optional generic utils; **no** app routes.
3. HeroUI / accessibility pass on files touched in this phase.

**Verification:** `bunx tsc --noEmit`, `bunx eslint` on `src/components/plots`.

## Dependency order

**Orchestrator 1 -> Orchestrator 2 -> Orchestrator 3** (strictly sequential to avoid conflicting edits and broken imports).

## Success criteria

- Single feature entry: `~/features/process-nexafs`.
- `src/app/contribute/nexafs/` contains essentially `page.tsx` (+ tests colocated if desired).
- No plotting math **ownership** split across app re-exports; plots stay dumb and dependency direction is **feature -> plots**, not **plots -> app**.

---

## Orchestration runs (completed)

Three `component-library-orchestrator` passes were executed in order:

1. **Phase 1** — Renamed `nexafs-contribute` to `process-nexafs`; moved app-route utils (`betaIndex`, `normalizationDefaults`, `autoDetectPeaksFromSpectrum`, etc.) into the feature; removed app shims; rewired imports (`page.tsx`, plots, `lib/molecule-autosuggest`, etc.).
2. **Phase 2** — Moved `src/components/contribute/nexafs/*` to `src/features/process-nexafs/ui/`; updated `NexafsContributeFlow` and `src/components/contribute/index.ts`; removed the old `components/contribute/nexafs` tree.
3. **Phase 3** — Moved `generateGaussianPeak` into `src/components/plots/utils/generateGaussianPeak.ts`; plots import from the plots library only; feature `utils` no longer exports that helper.

**Verify locally:** `bunx tsc --noEmit`, `bunx eslint` on touched areas, `bun test src/features/process-nexafs/utils/betaIndex.test.ts`.
