# STXM dashboard NEXAFS dataset-panel parity plan

Investigation and phased roadmap for aligning the ALS 5.3.2.2 STXM ingestion processor UI with the NEXAFS browse/contribute dataset visualization shell. This document is **Phase 0** of the user-mandated five-step process; it does not implement UI beyond noting trivial quick wins.

**Branch:** `feat/dashboard-stxm-5322`  
**Related:** `docs/dashboard-stxm-integration-plan.md` (facility browser, numerics port, export)  
**Reference app:** `/Users/hduva/projects/stxm` (legacy standalone Next app; graph/table split is ad hoc, not NEXAFS-parity)

---

## Executive summary

STXM ingestion already sits on the shared `SpectrumPlot` stack with a vertical `PlotDataViewRail` (`SpectrumYChannelRail` + `STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION`). The largest gaps versus NEXAFS browse are **shell chrome** (Graph | Table tabs, Line | Scatter | Area, no Aux), **channel semantics** (Rw = computed OD, I0 sub-tray with log vs log-inverse inside the plot), **bare-atom gating** (molecule-linked formula like browse, not free-text only), **attribution/molecule picker** (contribute patterns), and **layout** (region heatmap column too wide).

Recommended order: extract a reusable visualization shell from NEXAFS, parameterize `VisualizationToggle` for STXM (hide Aux), then wire STXM table mode and molecule/bare-atom gates before attribution and layout polish.

---

## Investigation notes

### NEXAFS dataset panel (`nexafs-experiment-dataset-panel.tsx`)

| Concern | Implementation |
|---------|----------------|
| Shell | Outer card; `VisualizationToggle` for Graph / Table / Auxiliary files |
| Graph styles | `graphStyle` state (`line` \| `scatter` \| `area`); toggles on **right** of header when `mode === "graph"` |
| Plot | `SpectrumPlot` with `graphStyle`, `headerRight` = left in-plot rail, `headerAnalysis` = optical split, toolbars for inspect/zoom/pan |
| Left rail | `NexafsPlotDataRail` → `PlotDataViewRail` with `NEXAFS_PLOT_DATA_RAIL_DEFINITION` (Rw / β / δ trays) |
| Bare atom | Separate vertical toggle (step-edge icon) **above** data rail; disabled when `!chemicalFormula` from `experiments.moleculeFormulaForExperiment` |
| Bare atom compute | `buildBareAtomRepresentationMatrix`, `bareAtomReferencesForOverlay`, `bareAtomOverlaySupportedForChannel` |
| Table | `NexafsBrowseGroupedSpectrumTable` with geometry tree, channel columns (OD, mu, beta, delta, I0) |
| Aux | `DatasetAuxFilesPanel` when `visualizationMode === "aux"` — **out of scope for STXM** |

Bare-atom gate (browse):

```typescript
const browseBareAtomToggleDisabled =
  !chemicalFormula ||
  !bareAtomOverlaySupportedForChannel(model.plotChannel) ||
  moleculeFormulaQuery.isLoading;
```

Formula source: `trpc.experiments.moleculeFormulaForExperiment` → `samples.molecules.chemicalformula`.

### `VisualizationToggle` (`features/process-nexafs/ui/visualization-toggle.tsx`)

- Left cluster: Graph, Table, Auxiliary files (always three buttons today).
- Right cluster (`ml-auto`): Line / Scatter / Area when graph mode; optional `trailingSlot`, optional Edit for table.
- **STXM need:** Graph + Table only; graph styles on the right; no Aux, no table Edit (initially).

### Plot data rail machinery

| Module | Role |
|--------|------|
| `plot-data-view-rail.tsx` | Generic vertical tray segments + horizontal channel popovers + optional link strips |
| `plot-data-rail-types.ts` | `PlotDataRailDefinition`, tray/channel metadata, availability |
| `spectrum-y-channel-rail.tsx` | Thin wrapper setting `hintPlacement` / `ariaLabel` |
| `nexafs-plot-data-rail-config.ts` | NEXAFS trays: spectroscopy (Rw, 01, μ), imaginary (β…), real (δ…) |
| `nexafs-plot-data-rail.tsx` | NEXAFS-specific imaginary/real link strip |

STXM mirror:

| Module | Role |
|--------|------|
| `stxm-ingestion-plot-data-rail-config.ts` | Four trays: `signal` (Rw glyph but I0/Sm//I channels), `spectroscopy`, `imaginary`, `real` |
| `stxm-ingestion-plot-data-rail.tsx` | `SpectrumYChannelRail` + availability from raw/reduced pipeline state |
| `stxm-ingestion-display.ts` | Channel values, log-Y eligibility (`ingestionChannelAllowsLogY` = raw signal only) |

**Semantic mismatch:** NEXAFS `Rw` tray = uploaded raw absorption on spectroscopy tray. STXM `signal` tray uses tray glyph `Rw` but channels are I0 / Sample / 1/I0 (detector means), not OD. User target: **Rw tray = computed optical density** (Beer-Lambert OD), with **I0 section** as its own tray/segment with **I0 | Sm | /I** and **log vs log-inverse** plotting inside the plot field.

### Bare atom (NEXAFS vs STXM today)

| | NEXAFS browse | STXM ingestion |
|--|---------------|----------------|
| Formula source | Linked experiment → molecule `chemicalformula` | Free-text `formula` in `ingestion-tab.tsx` + `regionsMetadata.formula` |
| Overlay UI | Toggle in left rail; Henke step-edge icon | `bare_atom` channel in spectroscopy tray; `bareAtomCurve={null}` always passed |
| Compute | `buildBareAtomRepresentationMatrix` + channel matrix | `computeStxmIngestion` calls `calculateBareAtomAbsorption` when formula set |
| Gate copy | "Link a molecule with a chemical formula first." | No molecule link; mass abs works with manual formula |

**Reuse strategy:** When `dashboardSessions.linkedExperimentId` is set, load formula via `moleculeFormulaForExperiment` (or session-level molecule pick before link). Gate bare-atom tray channel and step-edge overlay on resolved formula. Keep thickness in STXM session metadata; align mass-density default with `DEFAULT_KK_MASS_DENSITY_G_CM3` / contribute norms.

### Molecule link and attribution

| Surface | Location | Notes |
|---------|----------|-------|
| Experiment link (STXM) | `experiment-link-card.tsx` | Search linkable experiments; browse/contribute links; **no molecule picker** |
| Molecule pick (contribute) | `dataset-content.tsx` | Autosuggest + `AddMoleculeModal`; sets `dataset.moleculeId` |
| Attribution | `dataset-attribution-editor.tsx` | `AvatarGroup`, ORCID search, apply-team; used on contribute upload |
| Browse dataset panel | Reads formula from experiment only | No attribution editor on browse card |

STXM export path (`stxm-upload-dialog.tsx`) mentions molecule/instrument/edge on contribute — attribution integration belongs pre-export in workspace chrome or ingestion sidebar.

### STXM ingestion UI (current)

| File | Responsibility |
|------|----------------|
| `ingestion-tab.tsx` | Orchestrates region editor + plot panel + standards + formula/thickness/norm grid |
| `stxm-ingestion-plot-panel.tsx` | Card shell, `StxmIngestionPlotHeader`, `SpectrumPlot`, left rail in `headerRight` |
| `stxm-ingestion-plot-header.tsx` | **Error kind** (Poisson / Inv count / Empirical) + **Linear / Log Y scale** — user wants **Log row removed** from this header delineation |
| `stxm-multi-region-editor.tsx` | Fixed `PLOT_WIDTH = 300`; heatmap + row-sum trace |
| `stxm-to-spectrum-plot.ts` | Maps STXM channels → `SpectrumPoint[]`, log transform, standards, bare atom reference |

**Layout (`ingestion-tab.tsx`):**

```text
md:grid-cols-[minmax(220px,2fr)_minmax(0,3fr)]
```

Region column ~40% width; user wants **narrow line-cut column**, plot majority (~75–80%).

**Plot panel gaps:**

- `graphStyle` hardcoded `"line"` — no scatter/area.
- No Graph | Table toggle.
- `StxmIngestionPlotHeader` duplicates controls that NEXAFS places in rail or visualization header.

### Duplication vs parameterization

| Duplicated | Can parameterize |
|------------|------------------|
| Card border/padding around plot | `DatasetVisualizationShell` wrapper |
| Visualization header row | `VisualizationToggle` with `modes={["graph","table"]}` |
| Rail config objects | Already separate per domain (`NEXAFS_*` vs `STXM_*`); share `PlotDataViewRail` |
| `buildStxmSpectrumPlotModel` vs NEXAFS channel builders | Shared `SpectrumPlot` input types only; keep domain builders |
| Bare atom matrix | Reuse `buildBareAtomRepresentationMatrix` + STXM channel id map |
| Table UI | **New** `StxmIngestionSpectrumTable` (not `NexafsBrowseGroupedSpectrumTable`) |

---

## Gap analysis

| NEXAFS feature | STXM today | Target |
|----------------|------------|--------|
| Graph \| Table tabs | None | Graph \| Table only (no Aux) |
| Line \| Scatter \| Area (header right) | Line only, fixed | Same `VisualizationToggle` right cluster |
| Auxiliary files tab | N/A | Explicitly omitted |
| Linear / Log in header row | `StxmIngestionPlotHeader` Y scale row | **Remove** from header; I0 log semantics in-plot |
| Vertical left data rail (Rw, β, δ) | Four trays via `SpectrumYChannelRail` | Rw = **OD** tray; I0 tray with I0/Sm//I; β/δ trays |
| I0 log vs log-inverse | Global log scale on header for raw channels | Per-I0-tray toggle: **log(I)** vs **log(1/I)** when I0 or /I active |
| Bare atom overlay + molecule gate | Manual formula; `bareAtomCurve={null}` | Linked molecule formula required; reuse NEXAFS bare-atom matrix + step-edge toggle |
| Molecule link in plot chrome | Experiment link card only | Molecule picker + link affordance like browse (formula drives bare atom) |
| Attribution editor | None | `DatasetAttributionEditor` (or slim variant) in workspace/export prep |
| Region editor width | `2fr` / `3fr` grid, 300px canvas | ~`minmax(180px,1fr)` / `minmax(0,4fr)` (~20% / 80%) |
| Table mode | None | Energy × channels grid from `result` + `regionSpectra` |
| Error kind weighting | Header row | Keep but relocate below visualization toggle or into plot tools (not competing with Graph/Table) |
| Difference / KK / normalization rails | NEXAFS editor features | Out of initial parity; STXM has norm windows in form grid |

---

## Architecture: shared abstractions to extract

### 1. `DatasetVisualizationShell` (proposed)

Location: `src/components/plots/dataset-visualization-shell.tsx` or `src/features/process-nexafs/ui/dataset-visualization-shell.tsx`.

**Owns:**

- `VisualizationToggle` (parameterized modes)
- Mode switch: graph child \| table child
- Optional `graphTrailingSlot` (CSV, etc.)

**Props sketch:**

```typescript
type DatasetVisualizationShellProps = {
  modes: Array<"graph" | "table" | "aux">;
  mode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
  graphStyle?: GraphStyle;
  onGraphStyleChange?: (style: GraphStyle) => void;
  graph: ReactNode;
  table: ReactNode;
  aux?: ReactNode;
};
```

NEXAFS dataset panel and `StxmIngestionPlotPanel` become consumers.

### 2. `VisualizationToggle` extension

Add `modes?: VisualizationMode[]` defaulting to all three; STXM passes `["graph", "table"]`.

### 3. STXM rail config revision (`stxm-ingestion-plot-data-rail-config.ts`)

Proposed tray layout:

| Tray | Glyph | Channels |
|------|-------|----------|
| `i0_signal` | I0 | `signal_i0`, `signal_sample`, `signal_inv_i0` |
| `spectroscopy` | Rw | `od`, `od_normalized`, `mass_absorption` (+ bare atom overlay toggle, not channel) |
| `imaginary` | β | `beta`, `chi` |
| `real` | δ | `delta`, `f1` |

Remove `bare_atom` as a selectable channel; expose as overlay gated on molecule formula (NEXAFS pattern).

### 4. I0 scale control (in-plot)

Add optional **link strip** or mini horizontal toggle on `i0_signal` tray (reuse `PlotDataRailLinkDefinition` pattern):

- **Log I** — `yScale = log`, channel `signal_i0` or `signal_sample`
- **Log 1/I** — `yScale = log`, channel `signal_inv_i0`

When linear, allow all three channel picks without global header log toggle.

### 5. Bare atom bridge

New helper: `src/features/dashboard/lib/stxm-bare-atom-overlay.ts`

- Input: `chemicalFormula`, `energyEv[]`, active STXM channel
- Delegate to `buildBareAtomRepresentationMatrix` with STXM→NEXAFS channel mapping for supported overlays
- Wire `ExperimentLinkCard` + optional inline molecule pick to supply formula

### 6. STXM table adapter

New: `stxm-ingestion-spectrum-table.tsx`

- Rows: energy index or one row per energy
- Columns: I0, sample, OD, norm OD, mu, beta, delta per selected region + reduced composite
- No geometry tree (unlike NEXAFS); optional region column groups

---

## I0 log / log-inverse toggle UX spec

**Placement:** Inside plot field, attached to the **I0 signal tray** segment on the left vertical rail (not in the card header).

**States:**

| User selection | Y transform | Channel |
|----------------|-------------|---------|
| I0 + Log I | `log10(I0)` | `signal_i0` |
| Sample + Log I | `log10(sample)` | `signal_sample` |
| /I + Log inv | `log10(1/I0)` | `signal_inv_i0` |
| Any + Linear | identity | selected signal channel |

**Interaction:**

- Channel picker: I0 | Sm | /I (existing three channels in signal tray).
- When any signal channel is active, show secondary toggle **Log I** | **Log 1/I**:
  - **Log I** enabled for `signal_i0` and `signal_sample`.
  - **Log 1/I** selects `signal_inv_i0` (or applies inverse transform to I0 trace).
- Disable log toggles when OD / optical-constant trays active (same rule as today `ingestionChannelAllowsLogY`).
- Tooltips: match NEXAFS `PlotToolbarRichHint` placement `right`.

**Remove:** `StxmIngestionPlotHeader` Linear | Log row entirely.

---

## Bare atom + molecule gate reuse strategy

1. **Formula resolution order**
   - Linked experiment → `moleculeFormulaForExperiment.chemicalFormula`
   - Else session `step_metadata.regions.formula` from explicit molecule pick (future)
   - Else bare-atom overlay disabled with browse-aligned copy

2. **UI gate**
   - Reuse `bareAtomOverlaySupportedForChannel` with STXM channel→NEXAFS channel map (`mass_absorption` → `mass-absorption`, `beta`, `delta`).
   - Step-edge toggle in left rail (copy from `nexafs-experiment-dataset-panel` `plotLeftRail` bare-atom block).

3. **Thickness / mass density**
   - Keep STXM thickness (cm) in session; document interaction with `DEFAULT_KK_MASS_DENSITY_G_CM3` for KK/bare-atom parity.

4. **Molecule link affordance**
   - Short term: extend `ExperimentLinkCard` with formula preview when linked.
   - Medium term: embed contribute molecule autosuggest (`dataset-content` patterns) on workspace Experiment tab or ingestion sidebar.

---

## Attribution integration points

| Phase | Integration | Files |
|-------|-------------|-------|
| 1 | Session stores `pendingAttributions[]` in `step_metadata.export` | `dashboard-processing-session.ts` |
| 2 | Reuse `DatasetAttributionEditor` in workspace chrome or pre-upload panel | `dataset-attribution-editor.tsx`, new `stxm-attribution-section.tsx` |
| 3 | Apply `attributionTeams` on export | existing teams router |
| 4 | Map to `experiment_contributors` on `createWithSpectrum` / aux upload | contribute flow |

No attribution on NEXAFS browse plot — STXM adds it for **export readiness**, mirroring contribute upload.

---

## Layout spec

| Breakpoint | Region editor | Plot |
|------------|---------------|------|
| `< md` | Full width, max height ~240px | Full width below |
| `md+` | `minmax(160px, 20%)` or fixed `max-w-[220px]` | `minmax(0, 1fr)` (~80%) |

**Implementation targets:**

- `ingestion-tab.tsx`: change grid to `md:grid-cols-[minmax(160px,1fr)_minmax(0,4fr)]` or `md:grid-cols-[220px_1fr]`.
- `stxm-multi-region-editor.tsx`: replace `PLOT_WIDTH = 300` with `width: 100%` of column; cap heatmap at `max-w-[220px]`.
- Plot card: `flex-1 min-h-0`; keep `STXM_INGESTION_SPECTRUM_HEIGHT_PX = 600` or match NEXAFS `min-h-[420px]` with flex growth.

---

## Phased implementation (user process)

### Phase 0 — Investigation and plan (this document)

**Done when:** Plan reviewed; gaps and file touch list agreed.

### Phase 1 — Refactor for extensibility (structure only, minimal behavior change)

**Goals:**

- Extend `VisualizationToggle` with configurable modes.
- Introduce `DatasetVisualizationShell`.
- Split `StxmIngestionPlotPanel` into shell + plot body; remove Linear/Log from header (temporarily default log for I0 until Phase 2 toggle).

**Files:**

- `visualization-toggle.tsx`
- New `dataset-visualization-shell.tsx`
- `stxm-ingestion-plot-panel.tsx`, `stxm-ingestion-plot-header.tsx`
- `ingestion-tab.tsx` (wire shell, layout grid tweak)

**Risks:** React state migration for `plotScaleMode`; verify log OD unchanged for reduced channels.

**Done when:** STXM shows Graph | Table chrome (table can be placeholder); header has no Linear/Log row; typecheck + lint pass.

### Phase 2 — UI implementation plan execution (core parity)

**Goals:**

- Line | Scatter | Area on graph mode.
- Revised rail trays (Rw = OD; I0 tray + log/log-inverse).
- `StxmIngestionSpectrumTable` with real data.
- Narrow region column.

**Files:**

- `stxm-ingestion-plot-data-rail-config.ts`, `stxm-ingestion-display.ts`
- `stxm-to-spectrum-plot.ts` (`graphStyle` support)
- New `stxm-ingestion-spectrum-table.tsx`
- `stxm-multi-region-editor.tsx`, `ingestion-tab.tsx`

**Risks:** Log-error bar transform when switching I0 modes; table width on many regions.

**Done when:** Browser verification matches NEXAFS browse screenshot anatomy (tabs, right graph styles, left rail trays).

### Phase 3 — Iterative features (bare atom, molecule, attribution)

**Goals:**

- Molecule formula gate + bare atom overlay.
- `ExperimentLinkCard` / molecule picker integration.
- Attribution section for export.

**Files:**

- `stxm-bare-atom-overlay.ts` (new)
- `experiment-link-card.tsx`, `als-5322-workspace-page.tsx`
- `computeStxmIngestion.ts` (align with linked formula)
- `dataset-attribution-editor.tsx` (consume, do not fork)

**Risks:** Session without linked experiment but manual formula — define precedence rules.

**Done when:** Bare-atom toggle disabled without formula; enabled with linked molecule; attribution persists on session.

### Phase 4 — Feature completion (standards, export, polish)

**Goals:**

- CSV/export actions in visualization `trailingSlot`.
- Error-kind row placement finalized.
- Region overlay legend parity.

**Done when:** Export/upload dialog receives attributed, molecule-linked spectra.

### Phase 5 — Second refactor (code quality)

**Goals:**

- Collapse duplicate plot-model builders where safe.
- Tests for rail config, I0 scale mapping, bare-atom gate.
- Thermo-nuclear maintainability pass on `ingestion-tab.tsx` size.

**Done when:** `ingestion-tab.tsx` orchestration under ~400 lines via hooks; test coverage for new libs.

---

## Immediate blockers (quick audit)

| Blocker | Severity | Notes |
|---------|----------|-------|
| No STXM table component | High | `NexafsBrowseGroupedSpectrumTable` expects DB geometry tree + `SpectrumPoint` browse model |
| `VisualizationToggle` always renders Aux | Medium | Needs `modes` prop before STXM shell |
| `bareAtomCurve` always `null` | Medium | Overlay path exists in `stxm-to-spectrum-plot.ts` but never fed |
| Rw tray semantics | Medium | Config labels `signal` tray as "Rw" glyph with I0 channels — confuses NEXAFS parity |
| `StxmIngestionPlotHeader` competes with target chrome | Low | Remove in Phase 1 |
| No `graphStyle` on STXM `SpectrumPlot` | Low | One prop + model support |
| Molecule formula not tied to `ExperimentLinkCard` | Medium | Blocks bare-atom parity with browse |

**Not blockers:** `SpectrumPlot` already supports `headerRight` rail, `graphStyle`, reference curves — STXM uses them.

---

## Recommended Phase 1 first commits

1. **`feat(dashboard): parameterize VisualizationToggle modes`** — Add `modes` prop; default `["graph","table","aux"]`; STXM unaffected until wired.

2. **`feat(dashboard): add DatasetVisualizationShell`** — Extract shell from NEXAFS panel (optional refactor NEXAFS to consume in same PR or follow-up).

3. **`refactor(dashboard): remove STXM header linear/log row`** — Delete Y scale from `StxmIngestionPlotHeader`; keep internal `plotScaleMode` default until I0 in-plot toggle lands in Phase 2.

4. **`feat(dashboard): STXM graph-table shell on ingestion plot`** — Wrap `StxmIngestionPlotPanel` with shell; table placeholder component.

5. **`style(dashboard): narrow STXM region editor column`** — Grid `220px / 1fr` + responsive heatmap width.

---

## Verification checklist (future phases)

- `bun run typecheck`, `bun run lint`
- `bun test tests/stxm-validation/` + new rail/table unit tests
- Browser: `/dashboard/instruments/als-5322` ingestion tab — DOM has Graph/Table header, not full-row link; left rail trays; trash on recent work (separate track)
- Compare side-by-side with NEXAFS browse dataset Graph tab

---

## Open questions

1. Should STXM **Error kind** weighting live in visualization header `trailingSlot`, below tabs, or inside plot bottom rail?
2. Is **manual formula** allowed when no experiment link, or hard-require molecule pick before bare atom (browse-strict)?
3. Table mode: one table per region vs single wide table with region columns?
4. Reuse NEXAFS browse panel for linked experiment preview, or keep STXM local-only until export?

---

*Phase 0 complete. No UI implementation in this pass.*
