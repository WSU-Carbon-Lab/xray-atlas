# Agent Memory

## Learned User Preferences

- Prefer Tailwind component classes or `@layer components` patterns for reusable styling instead of constants that store classname strings.
- Prefer compact, visible inline validation using HeroUI `ErrorMessage` (and related field primitives) over heavy bordered warning panels when surfacing missing required fields near forms or tabs.

## Learned Workspace Facts

- Use the theme provider and Hero UI v3 theming consistently across contribute and browse pages; use accent from the theme (`var(--accent)` where it applies) for selected tools and plot highlights, not removed brand tokens or ad-hoc hex colors.
- Prefer Hero UI components over custom or other component sets for forms, tabs, buttons, and layout where applicable, including migrating native `<input>`/`<select>` to Hero UI v3 `Input`/`Select`.
- For component-library extraction/polishing, prefer a dedicated orchestration flow using the `components`, `heroui`, and `accessibility` subagents (via `component-library-orchestrator`).
- When building a component library, centralize shared non-prop domain types in `types.ts` and export them from the library `index.ts` when needed.
- When using HeroUI Tabs with controlled selectedKey, defer parent setState from onSelectionChange (e.g. queueMicrotask) and pass stable callbacks (useCallback) to avoid React "Maximum update depth exceeded" from React Aria commit-phase updates; render each tab’s content inside `Tabs.Panel` within the same `Tabs` tree per HeroUI anatomy, not only the tab list with content driven elsewhere.
- NEXAFS CSV/JSON upload: treat header "mu" as absorption column; guard against undefined parsed.data and csvRawData (e.g. Array.isArray) before using .length.
- Spectrum and NEXAFS plot toolrails: use HeroUI `Toolbar` with `isAttached` pill groups and `ButtonGroup` / `ToggleButtonGroup` / `Separator`; keep unrelated clusters separate (e.g. home and download separate from inspect, zoom, and pan; delta separate from OD, mu, and beta); prefer multiple attached toolbars over one outer border around unrelated groups. When a toolbar host layer covers the plot, use `pointer-events-none` on that wrapper and `pointer-events-auto` on grips and rail content so the SVG still receives hover, inspect, and drag events.
- NEXAFS multi-dataset UI: required molecule, instrument, and edge are selected via clickable segments in the tab title (modals); compact tab labels should show instrument short name only, not facility-qualified text.
- HeroUI v3 `@heroui/react` does not export `SelectItem`; use the project’s `Select` pattern with `ListBox` / `ListBox.Item` (or equivalent documented API) instead.
- In the NEXAFS contribute plot, assignable manual peak kinds are only π* and σ* (`pi-star`, `sigma-star`); legacy `peakKind` values can remain on stored peaks until the user picks a new kind.
- Facility contribute flow uses one UI: resolve the site with a ComboBox (existing or new), step tabs **Facility | Instruments**, optional instruments, and a single submit path; registered and draft instruments use HeroUI `Accordion` with `allowsMultipleExpanded` and `variant="surface"`; keep the primary facility search control visually distinct from the facility type Select (e.g. accent-weighted ComboBox vs secondary Select styling).
- Shared facility and instrument form building blocks, domain types, and related hooks for contribute flows live under `src/components/forms` and should be consumed via that module’s barrel export.
