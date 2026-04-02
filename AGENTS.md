# Contributor Quickstart Guide

X-ray Atlas is a collaborative platform for sharing and exploring Near-Edge X-ray Absorption Fine Structure (NEXAFS) spectroscopy data. This guide is a quickstart for contributors to the project.

## Fundamental Concepts
NEXAFS probes the excited electronic structure of atoms and molecules. Electrons begin in core electronic states tightly bound to the nucleus, and are excited to higher energy unoccupied bound and semi-bound states. This excitation probability is determined by the alignment of the incident X-ray energy with the excitation energy, overlap between the core orbital and the excited state orbital, and the alignment between the incident X-ray polarization and the transition dipole moment. Because of this, NEXAFS spectra are sensitive to the local chemical environment, bonding geometry, electronic structure, and molecular orientation.

### Important Data Processing Concepts
NEXAFS experiments measure the absorption of X-rays as a function of incident X-ray energy and incident X-ray angle. The absorption is then normalized using one of many methods to remove background contributions and determine a quantitative measure of the excited electronic structure. There are two main types of normalization:

- Stable Monitor: Here we identify a region of the spectrum that is stable for energies associated with no absorption, below the absorption edge. We pair this with a region of relatively stable absorption values above the absorption edge. We then calculate a relative scaling factor and background shift needed to shift the spectrum such that the pre-edge region is zero, and the post-edge region is one.

- Bare Atom: Here we assume that far from the edge, the absorption is dominated by continuum dynamics described by the excitation of core electrons into unbound continuum states. In this case, the relatively stable pre- and post-edge regions more closely align with polynomial functions of energy, instead of a constant value. To normalize this, we first calculate the bare atom absorption for the molecule. Then, in the pre- and post-edge regions, we select a subset of points that relatively follow the bare atom absorption curve. We then calculate a linear fit to this subset of points to determine a scale factor and background shift needed to align the experimental spectrum with the bare atom absorption curve.

### Other Important Processing Concepts
- Another core feature of analysis is the ability to select peaks in the spectrum and assign them to different electronic states. This is often done manually by the user, with assignments that can be nearly meaningless due to the lack of exact information about the electronic structure of the molecule. For example, it is common to assign pi* transitions to all transitions before the isospectic point, and sigma* transitions to all transitions after the isospectic point.
- For angle-resolved experiments, it is often useful to calculate the difference spectrum between two different angles. This is done by subtracting the spectrum at the higher angle from the spectrum at the lower angle.

# Project Structure

## `src/app` (Next.js App Router)
`src/app` is responsible for routing composition and page-level orchestration. Treat it as the "shape of the site" layer: route groups, layouts, pages, loading states, and parallel route slots (modals).

### Root layout + metadata
- `layout.tsx` defines the shared application shell (providers, layout chrome, and any root-level UI scaffolding)
- `metadata.ts` centralizes defaults; route segments can override via their own `metadata.ts`

### Route groups (parentheses)
- Parentheses folders like `(home)`, `(auth)`, `(protected)`, `(public)` are route groups: they organize code and can apply wrappers, but they do not directly affect the URL path
- This repo uses route groups to keep URL structure stable while changing auth/protection behavior and shared wrappers

### Pages and route segments
- `page.tsx` under a route segment renders the main UI for that URL
- `loading.tsx` provides route-level loading UI (example: `src/app/(home)/loading.tsx`)
- Dynamic and nested segments live under folders like `facilities/[id]`, `molecules/[id]`, and similar

### Public HTTP endpoints (Next route handlers)
- `src/app/api/*` contains request handlers for HTTP endpoints that are not "tRPC router calls"
- Example nesting: `src/app/api/auth`, `src/app/api/physics/*`, `src/app/api/trpc/[trpc]`

### Modals (parallel routes + intercepting routes)
- The modal system is implemented via the parallel route slot `@modal`
- `src/app/@modal/default.tsx` is the default modal slot content (normally renders nothing)
- Modal content lives in `src/app/@modal/...`
- The repo uses intercepting routes inside the modal slot (example: `src/app/@modal/(.)sign-in/[[...sign-in]]/page.tsx`)
  - `(.)` indicates an intercepting route at the current level: it renders into the `@modal` slot while the underlying page remains the active base route

## `src/components` (Component Library)
`src/components` contains reusable UI components and UI-only domain display pieces. These are intended to be composed by `src/app` routes and by feature libraries in `src/features`.

Key folders:
- `auth/`: authentication-related UI components
- `feedback/`: loading, empty, and error UI
- `forms/`: reusable form building blocks used by contribution and filtering flows
- `layout/`: application chrome (navigation/layout wrappers)
- `molecules/`: molecule display components reused across browse/detail/contribute surfaces
- `plots/`: plotting UI building blocks and toolrail/interaction primitives
- `nexafs/`: NEXAFS-focused UI components kept separate from general browse pages
- `theme/`: theme provider + theme-related UI
- `ui/`: smaller UI primitives and wrappers
- `icons.tsx`: centralized icon exports
- Top-level single-purpose files (for example `csv-upload.tsx`) should live here if they are UI-only

## `src/features` (Feature Libraries)
`src/features` holds feature-level workflow logic that is larger than a single reusable component, but is still primarily UI/interaction orchestration rather than server/data access.

Current structure:
- `process-nexafs/`
  - `components/`: feature UI blocks for each processing sub-section
  - `ui/`: presentational UI used by the processing workflow
  - `hooks/`: step orchestration hooks and client-side workflow state
  - `utils/`: processing helpers that are still safe to run in the UI layer
  - `constants.ts`: feature configuration constants
  - `types.ts`: feature-local types
  - `index.ts`: barrel exports

Design intent: keep multi-step workflow concerns in `src/features`, and keep pure processing utilities in `src/features/*/utils` (or `src/lib` if they are broader/pure enough to share across features).

## `src/hooks` (Cross-cutting React hooks)
`src/hooks` stores client-side hooks that are reused across multiple components/routes.

Current structure:
- `useRealtimeFavorites.ts`: realtime subscription for favorites lists
- `useRealtimeFavoriteEntity.ts`: realtime subscription for a single entity favorite + derived counts
- `useRealtimeExperimentFavorites.ts`: realtime subscription for experiment favorites
- `useRealtimeUpvotes.ts`: realtime subscription for upvotes

Design intent: these hooks should focus on data subscription/state synchronization, not on rendering.

## `src/lib` (Shared client/server logic)
`src/lib` contains shared helpers and small domain utilities that are reused across multiple feature/component layers. Keep it framework-agnostic where possible.

Key pieces in this repo:
- Molecule helpers
  - `molecule-slug.ts`: slug creation rules (used for consistent routing/lookups)
  - `molecule-autosuggest.ts`: autosuggest/query helper logic
- NEXAFS domain helpers
  - `normalizeSampleSubstrate.ts`: normalize substrate strings for consistent persistence
  - `resolveNexafsDefaultSubstrate.ts`: default substrate resolution
  - `nexafsResearchGroupCollectors.ts`: mapping/collectors for research group metadata
  - `rsoxs-epoch.ts`: epoch constant(s) for RSoXS-related processing
- UI-support helpers
  - `tag-colors.ts`: tag->color mapping for consistent UI styling
- Development helpers
  - `dev-mock-data.ts`, `noop.ts`

## `src/server` (Server-side domain + tRPC)
`src/server` owns server execution concerns: auth wiring, DB access, secure configuration, storage integrations, and tRPC router definitions.

Key folders/files:
- `api/`
  - `root.ts`: API router root
  - `routers/`: individual tRPC routers (`molecules.ts`, `experiments.ts`, `spectrumpoints.ts`, `facilities.ts`, `instruments.ts`, etc.)
  - `trpc.ts` and `api.ts`: tRPC wiring and exports
- `auth.ts`: auth integration configuration
- `db.ts`: Prisma client setup
- `storage.ts`: S3/storage integration for uploads/artifacts
- `nexafs/`: server-side NEXAFS domain helpers/reference logic
- `utils/`: server-side helper utilities

Design intent: `src/server` is the only place that should directly depend on secure credentials, Prisma client usage, and server-only runtimes.

## `src/trpc` (tRPC client wiring)
`src/trpc` is the client/server integration layer for using the tRPC types and hooks.

Key files:
- `client.tsx`: client-side tRPC setup/providers
- `server.ts`: server integration helpers (SSR/Server Components patterns as applicable)

## `src/types` (Shared DTOs / domain types)
`src/types` contains type-only contracts that multiple layers share.

Current types:
- `molecule.ts`: molecule DTO/type contracts used across UI and API boundaries
- `upload.ts`: upload-related payload/type contracts

Design intent: prefer `src/types` for shared domain/DTO typing rather than duplicating shapes in components/features.

## `src/utils` (Small utilities)
Small utilities that don't belong in `src/lib` but are widely reused.

Current piece:
- `getBaseUrl.ts`: base URL resolution used for absolute links/callback URLs

## `src/styles` (Global styling)
Global styling and Tailwind entry CSS.

- `globals.css`: Tailwind base layers + global CSS variables/utilities

## Design Intent Summary
- `src/app` defines routing, layouts, and the modal parallel-route slot (`@modal`), including intercepting routes (`(.)`) used to render overlays.
- `src/components` is the reusable UI surface.
- `src/features` composes multiple UI components and client-side workflow logic into feature-level experiences.
- `src/server` is the server boundary (auth/DB/storage + tRPC routers).
- `src/trpc` connects client UI to the server routers.
- `src/types` carries shared DTO/type contracts.
- `src/lib` and `src/utils` hold shared helpers; use `src/lib` when broader/purer, and `src/utils` for small widely reused helpers.
- `src/styles` contains global styling only; avoid component-specific styling leakage into `globals.css`.


# Agent Memory

## Learned User Preferences

- Prefer Tailwind component classes or `@layer components` patterns for reusable styling instead of constants that store classname strings.
- Prefer compact, visible inline validation using HeroUI `ErrorMessage` (and related field primitives) over heavy bordered warning panels when surfacing missing required fields near forms or tabs.
- For substantial Prisma migrations, schema changes, and tRPC backend work, delegate to the project `backend-manager` subagent when the user requests it.
- Prefer app toast patterns over `alert()` for user-visible errors in interactive flows (profile, mutations, and similar).
- Vibe coding policy: Cursor is the only approved tool for code edits/generation; `.cursor/` is maintained by core maintainers and should not be modified in other PRs; PRs must include an `AI Role` section with levels 1-3 describing how AI was used (suggestions/minimal generation, extensive but managed generation, fully vibe-coded/disposable).

## Learned Workspace Facts

- Use the theme provider and Hero UI v3 theming consistently across contribute and browse pages; use accent from the theme (`var(--accent)` where it applies) for selected tools and plot highlights, not removed brand tokens or ad-hoc hex colors.
- Prefer Hero UI components over custom or other component sets for forms, tabs, buttons, layout, and dropdowns where applicable, including migrating native `<input>`/`<select>` to Hero UI v3 `Input`/`Select`. Do not nest Hero UI `Button` inside `Dropdown.Trigger`; the trigger is already a React Aria button, so style `Dropdown.Trigger` with `buttonVariants` and `cn` from `@heroui/styles` when matching other ghost buttons. HeroUI v3 `@heroui/react` does not export `SelectItem`; use the project's `Select` pattern with `ListBox` / `ListBox.Item` (or equivalent documented API) instead; when dynamic options break `DropdownMenu` collection typing, a native `select` inside a styled shell is acceptable (e.g. NEXAFS edge filter). HeroUI `ButtonGroup` expects direct `Button` children; wrapping items in `Tooltip` or extra `span` layers can leak internal props (e.g. `__button_group_child`) to the DOM - use a vertical stack of consistently sized `Button`s with tooltips instead of nesting tooltips inside `ButtonGroup` when icon rails need alignment. In overflow-clipped or compact cards (e.g. NEXAFS browse rows), HeroUI `Tooltip` hover is unreliable; use HeroUI `Popover` on press with `border-border bg-surface` styling (aligned with profile menus) and `placement` toward the viewport interior (e.g. `left` for right-edge triggers) so overlays do not clip. For static name labels on avatars, a small portal hover like `AvatarWithTooltip` remains acceptable.
- For component-library extraction or polishing, use the `component-library-orchestrator` flow (`components`, `heroui`, `accessibility` subagents); centralize shared non-prop domain types in `types.ts` and export them from the library `index.ts` when needed.
- When using HeroUI Tabs with controlled selectedKey, defer parent setState from onSelectionChange (e.g. queueMicrotask) and pass stable callbacks (useCallback) to avoid React "Maximum update depth exceeded" from React Aria commit-phase updates; render each tab's content inside `Tabs.Panel` within the same `Tabs` tree per HeroUI anatomy, not only the tab list with content driven elsewhere.
- NEXAFS CSV/JSON upload and plot toolrails: treat header "mu" as absorption column; guard against undefined parsed.data and csvRawData (e.g. Array.isArray) before using .length. Hero UI `Table` needs at least one `Table.Column` with `isRowHeader={true}`; use the energy column when it is visible, otherwise the first visible column. Plot toolrails use HeroUI `Toolbar` with `isAttached` pill groups and `ButtonGroup` / `ToggleButtonGroup` / `Separator`; keep unrelated clusters separate (e.g. home and download separate from inspect, zoom, and pan; delta separate from OD, mu, and beta); prefer multiple attached toolbars over one outer border around unrelated groups. When a toolbar host layer covers the plot, use `pointer-events-none` on that wrapper and `pointer-events-auto` on grips and rail content so the SVG still receives hover, inspect, and drag events. Inside a `ToggleButtonGroup`, use segment-style corner rounding on first/last items (or shared plot-toolbar chrome classes), not `rounded-full` on every toggle, so the group reads as one connected control.
- NEXAFS multi-dataset UI: required molecule, instrument, and edge are selected via clickable segments in the tab title (modals); include an **experiment type** segment (TEY / PEY / FY / TRANS) with a modal and tooltips; basename **token 2** (after the edge token) reflects parsed technique - surface parse vs current selection; compact tab labels should show instrument short name only, not facility-qualified text; assignable manual peak kinds are only `pi-star` and `sigma-star`; legacy `peakKind` values can remain on stored peaks until the user picks a new kind.
- Facility contribute flow uses one UI: resolve the site with a ComboBox (existing or new), step tabs **Facility | Instruments**, optional instruments, and a single submit path; registered and draft instruments use HeroUI `Accordion` with `allowsMultipleExpanded` and `variant="surface"`; keep the primary facility search control visually distinct from the facility type Select (e.g. accent-weighted ComboBox vs secondary Select styling). Shared facility and instrument form building blocks, domain types, and related hooks live under `src/components/forms` and should be consumed via that module's barrel export.
- Browse `BrowseHeader` rows: for filter/toolbars headers, use `sm:flex-wrap` with a bounded search width (`sm:w-auto sm:max-w-md`, not `w-full` beside filters), `shrink-0` on filter triggers and dropdown wrappers, and a wrapping filter strip with a sensible `min-w` so controls move to the next line instead of overlapping the search. For `facilities` browse, use a search-only header (search spans full width) with name-ordered `facilities.list` / `facilities.search`, and place items-per-page next to pagination below the header (no facility-type or sort dropdowns). `experiments.listEdges` orders Carbon, Nitrogen, and Sulfur K-edges first (symbol or full element name), then remaining edges by target atom and core state.
- NEXAFS-specific UI components should live in the standalone `src/components/nexafs` library (for example via `nexafs-display.tsx`) rather than being owned by `src/components/browse`; browse pages should import from the NEXAFS library. NEXAFS browse lists one card per canonical experiment; the grouped DTO exposes `experimentId` (`experiments.id`), and molecule links pass `?nexafsExperiment=<uuid>`. Legacy `experiment_group_id` / `experiment_group_slug` columns were removed after consolidation migrations. Polarization angles (theta, phi) on cards come from aggregating `spectrumpoints` (`polardeg` / `azimuthdeg`) across spectrum rows tied to that experiment.
- `s3/MOLECULES/INDEX.json` is the molecule catalog; each molecule folder holds `METADATA.json` as the per-molecule measurement index and paired spectrum `*.json` / `*.csv`. Basenames use six underscore-separated tokens: edge (e.g. `C(K)`), experiment type (`TEY`, `FY`, etc.), facility, instrument, research group, then vendor or provenance; normalize vendor spelling to the approved mapping in `s3/README.md` on import. InChI strings in `MOLECULES/INDEX.json` may lack the `InChI=` prefix; prepend `InChI=` when querying PubChem or other chemistry APIs so lookups stay reliable.
- NEXAFS experiment persistence: experiments are keyed by UUID without the old composite unique on sample, edge, instrument, and dates; `measurementdate` and sample `preparationdate` were removed - browse uses `createdat` for upload timing; `experiments.createWithSpectrum` accepts `collectedByUserIds` and Prisma maps `collectedbyuserids` to Postgres `collected_by_user_ids` (TEXT[]). Spectrum points store `energyev` and `rawabs` from upload; optional per-point `i0`, `od`, `massabsorption`, and `beta` from the client merge with server-derived values, with finite upload values taking precedence.
- Molecule routes and lookups: store and query slugified names on `moleculesynonyms` (`slug`); resolve detail pages via `molecules.getBySlug` with the same slugify rules as URLs; URLs may use slug or legacy UUID (`layout` accepts both). Preserve human-readable and scientific names in data while the slug is canonical for links. If multiple molecules share the same slug, return NOT_FOUND and surface candidate molecules for disambiguation. Supabase Realtime for favorites uses the stable entity UUID in channel names (not slug). Shared client logic lives in `useRealtimeFavoriteEntity`: subscribe to both the per-entity favorites table and the aggregate row (e.g. `molecules.favorite_count`); on `CHANNEL_ERROR`, `TIMED_OUT`, or `CLOSED`, reconnect with bounded exponential backoff instead of permanently degrading to a single-stream fallback. Favorite toggles should apply the mutation response immediately for heart state and count, with realtime as eventual consistency.

<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'); Gateway is already default in the AI SDK. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->
