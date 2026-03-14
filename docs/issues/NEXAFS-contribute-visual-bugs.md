# NEXAFS Contribute: Visual bugs after adding a file

Visual bugs in the Contribute NEXAFS flow that appear once a user adds a file to be processed. Reproducible with valid CSVs (e.g. `.s3/MOLECULES/ITIC/C(K)_TEY_ANSTO_SXR_Collins_1-Material.csv`, `.s3/MOLECULES/D18/C(K)_TEY_ANSTO_SXR_Collins_Wei-You-Group.csv`) and, for validation-related layout, with invalid data (e.g. non-float strings in a numeric column).

---

## 1. Data table alignment (column names vs data)

**Symptom:** Column headers (Energy [eV], mu, theta, phi) appear centered (or left-aligned in badges) while the table body values are right-aligned, causing a visual mismatch.

**Where:** 
- Inline column mapping table: `src/components/contribute/nexafs/inline-column-mapping.tsx` (HeroUI `Table` with colored header badges and `TableCell` body).
- Fallback spectrum table: `src/components/contribute/nexafs/dataset-content.tsx` (plain `<table>` with `th` / `td`).

**Fix:** Use consistent alignment: right-align numeric columns in both header and body (design system: numeric cells use `text-right font-mono tabular-nums`). Apply the same alignment to the corresponding header cells.

---

## 2. Sidebar collapse button overlaps Delta Theta button

**Symptom:** The analysis toolbar collapse button (chevron) overlaps the right edge of the "Delta Theta" (Δϴ) button when the sidebar is expanded.

**Where:** `src/components/contribute/nexafs/analysis-toolbar.tsx`. Collapse button is `absolute top-3 right-3`; the horizontal icon toolbar row has no right padding, so the last icon (Δϴ) sits under the collapse control.

**Fix:** Reserve space for the collapse button (e.g. `pr-10` or equivalent) on the icon toolbar row so the Delta Theta button does not sit under the chevron.

---

## 3. Peak detection badge overflow when toolbar is collapsed

**Symptom:** When the analysis sidebar is collapsed, the peak-count badge on the "Identify peaks" button overflows or is misplaced instead of appearing as a proper badge (e.g. top-right of the icon).

**Where:** `src/components/contribute/nexafs/analysis-toolbar.tsx` (collapsed state uses `ToggleIconButton` with `badge={{ content: peaks.length, ... }}`). `src/components/ui/toggle-icon-button.tsx` wraps the button in HeroUI `Badge` with `placement="top-right"`. In the narrow collapsed column (`w-12`), the badge can extend outside the sidebar.

**Fix:** In collapsed state, use badge placement or styling that keeps the badge within the toolbar (e.g. `placement="top"`, or constrain the badge container so it does not overflow the narrow column).

---

## 4. Graph view with table datatype validation error: table above analysis panel

**Symptom:** When a column has invalid data (e.g. strings that cannot be cast to floats), `spectrumError` is set and spectrum points are empty. If the user then selects **Graph** view, the column-mapping table (InlineColumnMapping) still appears above the analysis panel section, with the error message in the main content area. The mapping table looks like “the table” and appears above the toolbar + content, which is confusing.

**Where:** `src/components/contribute/nexafs/dataset-content.tsx`. InlineColumnMapping is shown when `visualizationMode !== "table"` and `csvRawData`/`csvColumns` exist and (`!spectrumPoints.length` or missing required mappings). So in graph mode with `spectrumError` (no spectrum points), the mapping block renders first, then the flex with AnalysisToolbar and the content area (which correctly shows the error).

**Fix:** When `dataset.spectrumError` is set, do not show the InlineColumnMapping block above the main content (or show it only in table mode). Prefer showing the validation error in the main content area and optionally a short message that column mapping can be fixed in Table view.

---

## Reproduction

1. **Alignment:** Add a CSV (e.g. ITIC or D18) on Contribute NEXAFS, map columns, switch to Table view. Check InlineColumnMapping table and, if present, the fallback spectrum table in dataset-content.
2. **Collapse overlap:** Add a file, expand the analysis toolbar. Check the right side of the icon row (Delta Theta) vs the collapse chevron.
3. **Peak badge:** Add a file, run peak detection, collapse the analysis sidebar. Check the peak-count badge on the mountain icon.
4. **Validation + graph:** Use a CSV with a non-float value in the absorption column (or force a parse error). Select Graph view and confirm the mapping table no longer appears above the analysis panel; error should be in the main content area only.

---

## Implementation status

| Bug | Fix |
|-----|-----|
| **1. Table alignment** | InlineColumnMapping: header cells use `justify-end` and `tabular-nums`; TableCell uses `text-right font-mono tabular-nums`. dataset-content fallback table: `th` and `td` use `text-right tabular-nums`. |
| **2. Collapse vs Delta Theta** | analysis-toolbar: horizontal icon toolbar row has `pr-10` to reserve space for the collapse button. |
| **3. Peak badge when collapsed** | analysis-toolbar: collapsed column has `overflow-hidden`; peaks ToggleIconButton uses `placement: "top"` and badge `className` with `-translate-x-1/2 left-1/2` so the badge stays centered above the icon in the narrow column. |
| **4. Validation + graph** | dataset-content: InlineColumnMapping block is not rendered when `dataset.spectrumError` is set, so in graph view with a parse/validation error only the main content area shows the error (no mapping table above the analysis panel). |

---

## Test assets

- `.s3/MOLECULES/ITIC/C(K)_TEY_ANSTO_SXR_Collins_1-Material.csv`
- `.s3/MOLECULES/D18/C(K)_TEY_ANSTO_SXR_Collins_Wei-You-Group.csv`
