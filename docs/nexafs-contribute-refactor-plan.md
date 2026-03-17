# NEXAFS Contribute Refactor Plan

Refactor the NEXAFS data upload portal for high code quality and a clear layout before adding visx/D3 plotting and annotations. Goals: reusable components, single place for types/utils/API, and a thin page that only orchestrates state and composition.

---

## Current State

| Asset | Location | Size | Role |
|-------|----------|------|------|
| Page | `src/app/contribute/nexafs/page.tsx` | ~1280 lines | All state, file handling, validation, submission, dialogs, and layout |
| Dataset content | `src/components/contribute/nexafs/dataset-content.tsx` | ~1740 lines | Config, geometry list, plot, analysis toolbar, sample info, modals |
| Analysis toolbar | `src/components/contribute/nexafs/analysis-toolbar.tsx` | ~2400 lines | Config / normalize / peaks / difference tools and panels |
| Types | `src/app/contribute/nexafs/types.ts` | ~220 lines | DatasetState, CSVColumnMappings, PeakData, SampleInfo, etc. |
| Utils | `src/app/contribute/nexafs/utils.ts` + `utils/*` | Multiple files | Parsing, normalization, geometry, peak detection, bare-atom |
| Hooks | `app/.../useMoleculeSearch.ts`, `components/.../use-dataset-status.ts` | Split | Molecule search vs dataset status |

**API usage:** experiments (createWithSpectrum, listEdges, listCalibrationMethods, createEdge, createCalibrationMethod), vendors.list, instruments.list, molecules.getById, molecules.searchAdvanced.

**Plot:** `SpectrumPlot` in `components/plots/spectrum-plot.tsx` wraps `VisxSpectrumPlot`; used by dataset-content and column-mapping-modal.

---

## Target Structure

Treat NEXAFS contribute as one feature module with a single entry point and clear boundaries.

```
src/
  app/contribute/nexafs/
    page.tsx                    # Thin: layout + <NexafsContributeFlow /> only
    layout.tsx                  # Optional: shared layout for contribute/nexafs

  features/nexafs-contribute/    # Feature module (new)
    index.ts                    # Public API: flow component, types, hooks
    types.ts                    # All NEXAFS contribute types (move from app)
    constants.ts                # EXPERIMENT_TYPE_OPTIONS, PROCESS_METHOD_OPTIONS, etc.
    utils/
      index.ts
      csv.ts                    # parsePastedSpectrumText, spectrumRowsToCsv, etc.
      normalization.ts          # computeNormalizationForExperiment, computeZeroOneNormalization
      geometry.ts               # extractGeometryPairs, extractAtomsFromFormula
      filenameParser.ts
      jsonParser.ts
      bareAtomCalculation.ts
      differenceSpectra.ts
      peakDetection.ts
    hooks/
      useNexafsDatasets.ts      # Dataset list state, activeId, updateDataset, processDatasetData
      useNexafsSubmit.ts        # createWithSpectrum mutation, validation, handleSubmit
      useNexafsOptions.ts       # instruments, edges, vendors, calibration (trpc queries)
      useMoleculeSearch.ts      # (move from app)
      use-dataset-status.ts     # (move from components)
    api/
      index.ts                  # Re-export or thin wrappers: buildSubmitPayload, validateDataset
    components/
      NexafsContributeFlow.tsx  # Top-level: file drop, tabs, active content, submit
      FileUploadSection.tsx     # Upload zone + empty state
      DatasetTabsSection.tsx    # DatasetTabs + active DatasetContent
      DatasetContent.tsx        # Config strip + geometry + plot + toolbar + sample info (slim)
      ConfigStrip.tsx           # Instrument, edge, experiment type, date, calibration (reusable)
      GeometrySection.tsx       # Accordion + table + add geometry / paste
      PlotSection.tsx           # VisualizationToggle + SpectrumPlot (placeholder for visx/D3)
      AnalysisToolbar.tsx       # Strip + panel container; panels in subfolder
      analysis/
        ConfigPanel.tsx
        NormalizePanel.tsx
        PeaksPanel.tsx
        DifferencePanel.tsx
      SampleInformationSection.tsx
      ColumnMappingModal.tsx
      InlineColumnMapping.tsx
      MoleculeSelector.tsx
      VisualizationToggle.tsx
      ... (small shared pieces: QuickConfigPanelItem, SubToolButton, etc.)
    dialogs/
      AddMoleculeModal.tsx
      AddFacilityModal.tsx
      EdgeDialog.tsx
      CalibrationDialog.tsx
```

**Alternative (minimal move):** Keep `app/contribute/nexafs` and `components/contribute/nexafs` but:

- Move all types and pure utils into `src/features/nexafs-contribute/` (or keep under `app/contribute/nexafs` as the single “nexafs” module) and have both app and components import from there.
- Add a single `NexafsContributeFlow` component that receives options (instruments, edges, etc.) and dataset state/handlers from the page (or from a context provided by the page).
- Split `page.tsx` into: (1) data/options hooks, (2) submit hook, (3) JSX that composes `NexafsContributeFlow` and dialogs.

The plan below uses the feature-folder approach; the same steps can be applied with the “minimal move” layout by keeping paths under `app/contribute/nexafs` and `components/contribute/nexafs`.

---

## Phase 1: Foundation (types, utils, constants)

1. **Create feature root**  
   Add `src/features/nexafs-contribute/` with `index.ts`, `types.ts`, `constants.ts`.

2. **Move types**  
   Move `app/contribute/nexafs/types.ts` to `features/nexafs-contribute/types.ts`. Re-export from `features/nexafs-contribute/index.ts`. Update all imports to use `~/features/nexafs-contribute` (or the chosen path).

3. **Move utils**  
   Move `app/contribute/nexafs/utils.ts` and `app/contribute/nexafs/utils/*` into `features/nexafs-contribute/utils/`. Keep the same exports; add `utils/index.ts` that re-exports. Update imports across app and components.

4. **Extract constants**  
   Move `EXPERIMENT_TYPE_OPTIONS`, `PROCESS_METHOD_OPTIONS`, and any other const arrays from `types.ts` to `features/nexafs-contribute/constants.ts`. Import constants in `types.ts` if needed; export from `index.ts`.

5. **Verify**  
   Run build and tests; fix any broken imports or references.

---

## Phase 2: Data and API layer

1. **useNexafsOptions**  
   New hook that runs trpc queries for instruments, edges, vendors, calibration methods. Returns `{ instrumentOptions, edgeOptions, vendors, calibrationOptions, isLoading* }`. Used by page and by ConfigStrip / SampleInfo.

2. **useNexafsDatasets**  
   New hook that holds `datasets`, `activeDatasetId`, `setDatasets`, `setActiveDatasetId`, `updateDataset`, `processDatasetData`, `handleFilesSelected`, `handleNewDataset`, `handleDatasetRemove`, `handleDatasetRename`. File parsing (CSV/JSON) and filename parsing stay in this hook or in utils. Page (or flow) uses this hook and passes handlers and state into the UI.

3. **useNexafsSubmit**  
   New hook that takes `datasets` and options, runs validation (same rules as current handleSubmit), calls `trpc.experiments.createWithSpectrum.useMutation()`, builds payload (sample, experiment, geometry, spectrum, peaks). Returns `{ submit, status, setStatus, isPending }`. Page or flow uses this and wires submit button and status message.

4. **Optional: buildSubmitPayload / validateDataset**  
   Pure functions in `features/nexafs-contribute/api/` or `utils/` used by `useNexafsSubmit` so submission logic is testable and reusable.

5. **Move useMoleculeSearch and use-dataset-status**  
   Move into `features/nexafs-contribute/hooks/` and re-export from feature `index.ts`. Update imports in DatasetContent, MoleculeSelector, DatasetTabs.

6. **Verify**  
   Submission and validation behavior unchanged; no duplicate queries.

---

## Phase 3: Page and top-level flow

1. **NexafsContributeFlow**  
   New component that receives:  
   - `datasets`, `activeDatasetId`, `onDatasetSelect`, `onDatasetRemove`, `onDatasetRename`, `onNewDataset`, `updateDataset`, `processDatasetData` (or a single “dataset context” object).  
   - Optionally `instrumentOptions`, `edgeOptions`, etc., or have the flow use `useNexafsOptions` internally.  
   - `onSubmit`, `submitStatus`, `isSubmitting` (or use `useNexafsSubmit` inside the flow).  
   Renders: file drop overlay, upload section, dataset tabs section, active DatasetContent, submit status, submit button. Does not hold trpc or form state; that stays in the page or in hooks called by the page.

2. **Slim page**  
   `page.tsx` becomes:  
   - Call `useNexafsOptions`, `useNexafsDatasets`, `useNexafsSubmit`.  
   - Optional dialogs state (edge, calibration) and their handlers.  
   - Render: sign-in gate, back link, title, ToastContainer, `<NexafsContributeFlow ... />`, dialogs.  
   Target: page under ~200 lines.

3. **Verify**  
   E2E or manual: upload CSV, map columns, set molecule/instrument/edge, submit; same behavior as before.

---

## Phase 4: Split DatasetContent and AnalysisToolbar

1. **ConfigStrip**  
   Extract instrument, edge, experiment type, date, calibration into a reusable `ConfigStrip` component used by DatasetContent (and later by any plot-config UI). Props: values, options, onChange, loading flags.

2. **GeometrySection**  
   Extract geometry accordion + table + “Add geometry” / paste into `GeometrySection`. Props: groups (theta/phi + points), onDeleteGeometry, onPaste, normalization regions if needed for display.

3. **PlotSection**  
   Wrap current VisualizationToggle + SpectrumPlot in `PlotSection`. Props: view mode (graph/table), graph style, points (or multi-series), normalization regions, onSelectionChange, etc. This is the placeholder for the future visx/D3 plot and annotations.

4. **DatasetContent**  
   Compose ConfigStrip, GeometrySection, PlotSection, AnalysisToolbar, SampleInformationSection, molecule selector, and modals. Keep only composition and minimal local state (e.g. panel open/close). Target: under ~400 lines.

5. **AnalysisToolbar**  
   Keep strip in `AnalysisToolbar.tsx`; move each panel (Config, Normalize, Peaks, Difference) into `analysis/ConfigPanel.tsx`, etc. Toolbar imports panels and renders the active panel. Share types and peak/difference utils from the feature module. Target: each panel under ~400 lines, toolbar under ~200.

6. **Verify**  
   All tools (config, normalize, peaks, difference) and plot behavior unchanged.

---

## Phase 5: Dialogs and shared UI

1. **Edge and calibration dialogs**  
   Extract from page into `dialogs/EdgeDialog.tsx` and `dialogs/CalibrationDialog.tsx`. Page only holds open state and passes `onClose`, `onSuccess`, and mutation callbacks.

2. **Reusable form building blocks**  
   Ensure `QuickConfigPanelItem`, `SubToolButton`, and any shared form snippets live under the feature (or under `components/ui` if they are generic). Used by ConfigStrip and analysis panels.

3. **Column mapping**  
   Keep `ColumnMappingModal` and `InlineColumnMapping` in the feature; they depend on NEXAFS types and utils. Optionally split preview (SpectrumPlot) into a small `ColumnMappingPreview` component.

4. **Verify**  
   Create edge, create calibration, add molecule, add facility still work from the same entry points.

---

## Phase 6: Cleanup and exports

1. **Public API**  
   `features/nexafs-contribute/index.ts` exports:  
   - `NexafsContributeFlow`  
   - Types used by the rest of the app (`DatasetState`, `CSVColumnMappings`, etc.)  
   - Hooks: `useNexafsOptions`, `useNexafsDatasets`, `useNexafsSubmit`, `useMoleculeSearch`, `useDatasetStatus`  
   - Constants and any shared utils needed by browse or other features.

2. **Remove duplication**  
   Delete or redirect old paths: `app/contribute/nexafs/types.ts`, `app/contribute/nexafs/utils.ts`, `app/contribute/nexafs/utils/*`, `app/contribute/nexafs/hooks/useMoleculeSearch.ts`. Keep `app/contribute/nexafs/page.tsx` as the thin page that imports from the feature.

3. **Lint and tests**  
   Run project lint and typecheck; add or adjust unit tests for validation and payload building if needed.

---

## Backend / API Notes

- **experiments.createWithSpectrum**  
  Input: sample (moleculeId, vendor, sample metadata), experiment (instrumentId, edgeId, experimentType, …), geometry (mode: fixed | csv, fixed theta/phi or csvGeometries), spectrum.points, optional peaksets. No changes required for refactor; keep using it from `useNexafsSubmit`.

- **moleculetags error**  
  The “relation `moleculetags` does not exist” error is a separate DB/schema issue (e.g. molecule tag feature or migration). Refactor does not fix it; address with a migration or by guarding that query.

- **Reusability**  
  ConfigStrip, PlotSection, and normalization/geometry utils are designed to be reused when adding visx/D3 plotting and annotations; the same options and dataset state can drive the new plot components.

---

## Success Criteria

- Single place for NEXAFS contribute types and pure utils (feature module or single app subfolder).
- Page is a thin orchestrator (~200 lines or less).
- DatasetContent and AnalysisToolbar are split into smaller, named components with clear props.
- All NEXAFS-specific trpc usage goes through a small set of hooks (options, datasets, submit) or the feature API layer.
- No behavior change for upload, mapping, config, normalization, peaks, difference, or submit.
- Clear extension point for replacing or wrapping the current plot with visx/D3 and annotations.
