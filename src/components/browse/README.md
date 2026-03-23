# Browse UI

Shared building blocks and routes for public discovery. The app surfaces three ordered sections:

1. **Molecules** (`/browse/molecules`) – Paginated catalog with optional tag filters, compact or grid layout, and search (autosuggest when typing).
2. **NEXAFS** (`/browse/nexafs`) – Paginated experiment rows (spectrum datasets). **Layout (aligned with Molecules browse):** `BrowseHeader` holds the search field on the left and, on the right, **Molecule** (searchable dropdown of molecules that have spectra), **Edge** (native select + tooltip), then **Sort** (dropdown, hidden while search text is active), then **More filters** (modal for instrument and acquisition mode). Active molecule/edge/instrument/mode appear as chips below the header. Results per page and pagination sit under the list. Text search still combines with molecule/edge/instrument/mode via `experiments.browseSearch` when a query is set. Each row links to `/molecules/[id]`.
3. **Facilities** (`/browse/facilities`) – Paginated facilities with type filter and search by name, city, or country.

## URL query conventions

| Route | Parameters | Notes |
| --- | --- | --- |
| `/browse/molecules` | `q`, `page`, `tags` (comma-separated UUIDs) | Tags are mirrored when changing search. |
| `/browse/nexafs` | `q`, `page`, `sort`, `molecule`, `edge`, `instrument`, `type` | `molecule` is a molecule UUID (samples for that molecule only). `edge` / `instrument` / `type` as before. Sort + More filters UI are hidden while `q` is non-empty; molecule and edge stay in the header and still apply to search results. |
| `/browse/facilities` | `q`, `page` | Facility type and sort are client state only (not in URL). |

The root `/browse` route redirects to `/browse/molecules`.

## Components

- `browse-page-layout.tsx` – Title, subtitle, and max-width content wrapper (`BROWSE_CONTENT_CLASS`).
- `browse-header.tsx` – Search field with optional shortcut hint (`SearchField` from HeroUI). Optional trailing slot (`children`) for extra controls; omitted on NEXAFS so search uses full width.
- `browse-empty-state.tsx` – Empty and “no search results” messaging with optional CTA slot.
- `items-per-page-select.tsx` – Shared page size control; supports `compact` + tooltip (NEXAFS list toolbar).
- `nexafs-molecule-filter-dropdown.tsx` – Molecule picker (typeahead list from `experiments.browseMoleculeOptions`).
- `nexafs-edge-filter-dropdown.tsx` – Edge select (styled like other browse selects).
- `nexafs-browse-refine-dialog.tsx` – Modal for instrument and acquisition mode only.
- `nexafs-browse-active-filters.tsx` – Chip strip for applied refinements.
- `tag-filter-bar.tsx`, `tags-dropdown.tsx` – Molecule tag filtering only.
- `nexafs-dataset-card.tsx` – Compact row card for one NEXAFS experiment in browse results.

## API (tRPC)

NEXAFS browse uses `experiments.browseList` and `experiments.browseSearch` (both accept optional `moleculeId`, `edgeId`, `instrumentId`, `experimentType`), plus `experiments.browseMoleculeOptions` / `browseMoleculeSummary` for the molecule filter. Legacy `experiments.list` remains cursor-based for other clients.
