# NEXAFS Contribute Page Refactor

Refactor for code quality, reusability, and consistent use of HeroUI components.

## Goals

- Maximize code quality and reusability.
- Use HeroUI components where they replace custom or duplicate UI.
- Keep the page maintainable: extract hooks and presentational blocks where it helps.

## Current vs HeroUI

| Current | HeroUI / Reuse | Notes |
|--------|-----------------|------|
| `DefaultButton` (wrapper) | Already HeroUI Button under the hood | Keep; provides consistent base styling. |
| `SimpleDialog` | Headless UI | No HeroUI Modal in current deps; keep SimpleDialog for now. |
| `FormField` (text, textarea, select) | HeroUI `Input`, `Label`, `Textarea`; `Select` or custom select | Use HeroUI Input + Label in dialogs for consistency with facility/molecule pages. |
| `Tooltip` | HeroUI `Tooltip` | Already used; reduce repetition with shared content class or wrapper. |
| `ToastContainer` | Custom | Keep; no HeroUI toast in use. |
| Inline warning/status banners | HeroUI `Chip` or `Card` | Optional; current divs are fine. |
| Dataset tabs | Custom (no longer HeroUI Tabs) | Already refactored to custom tab bar. |

## Key Places for HeroUI

1. **Create Edge / Create Calibration dialogs** – Replace `FormField` with HeroUI `Input` + `Label` (+ `FieldTooltip` or `description`) so NEXAFS matches facility and molecule contribute forms.
2. **Tooltip content** – Use the shared component class `tooltip-content-panel` (defined in `@layer components` in `src/styles/globals.css`) so tooltip styling is reused via Tailwind’s component layer instead of a string constant.
3. **Submit section** – Warning banner + submit status + submit button can be a small presentational component for clarity and reuse.

## Phases

### Phase 1 (done in this pass)

- Replace `FormField` with HeroUI `Input` + `Label` in Create New Edge and Create New Calibration Method dialogs.
- Use Tailwind component-layer classes for form inputs and tooltip content: `form-input` and `tooltip-content-panel` in `globals.css` (`@layer components`) so reuse is via semantic class names, not string constants.

### Phase 2 (later)

- Extract `useNexafsDatasets` (or similar) hook to move file handling and dataset state off the page.
- Extract presentational submit block (warning + status + submit button) into `NexafsSubmitSection` or similar.
- Consider HeroUI `Modal` if the package is added; migrate SimpleDialog to it behind a shared abstraction.

### Phase 3 (optional)

- Align form input styling (e.g. `formInputClass`) across contribute pages (facility, molecule, NEXAFS) via a shared constant or component.
- Evaluate HeroUI `Select` / `Autocomplete` for any dropdowns in NEXAFS flow.

## File touch points

- `src/app/contribute/nexafs/page.tsx` – main page; dialogs, tooltips, submit section.
- `src/components/ui/form-field.tsx` – still used elsewhere; keep; NEXAFS dialogs stop using it.
- `src/components/ui/field-tooltip.tsx` – reuse next to Label in NEXAFS dialogs for tooltips.
