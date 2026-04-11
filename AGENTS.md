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

## User administration (`/admin/users`)

Users who hold an `AppRole` with `canManageUsers` open **User administration** from the account menu. The console supports:

- **Edit user** (pencil on a row): update **display name** (`user.name`), **directory email** (`user.email`, optional and unique when set; shown in listings and search, not the authentication mechanism), **ORCID** (`user.orcid`, validated), and **role assignments** in one save. **View profile** (eye) opens the public user page.
- **Role rules:** A user may have **multiple roles** overall, but **at most one** of the built-in lineage roles: **Administrator**, **Maintainer**, or **Contributor** (slugs `administrator`, `maintainer`, `contributor`). Any number of **custom** roles can be added on top. The UI enforces the lineage rule by replacing the previous lineage role when another is selected; `admin.updateUser` and `admin.setUserRoles` reject invalid combinations on the server.
- **Roles card (Discord-style, team-ready):** Roles use **lowercase** display names; **slugs** default from the name with **spaces to underscores** (optional manual slug). Each role has **description**, **accent color** (presets plus native color picker and hex field), optional **favicon URL** (external image), **`is_emailable`** (reserved for future team email routing), and a **JSON permission** list. **Custom** roles can be deleted when unassigned; **system** lineage roles cannot be deleted and have a **fixed permission set**, but their **appearance** (name, description, color, favicon, emailable) remains editable. Granular permissions are grouped as user, instrument, molecule, data, and Labs access in the UI; `canManageUsers` / `canAccessLabs` on each row are **derived** from permissions when roles are saved so existing admin and sandbox gates keep working until routers enforce each key explicitly.
- **Delete user** removes the account and content they created (molecules and experiments they authored), consistent with self-service deletion; deleting your own account from this table is disabled. Before the user row is removed, **molecule view** rows for that user are **detached** (`user_id` set to null) so anonymous view metadata remains; **molecule and experiment favorites** for that user are removed with the account (CASCADE). Full **account deletion** is a rare, destructive operation: it can **skew engagement and favorite-related metrics** compared to historical totals; use sparingly. A future iteration may preserve more attribution metadata without deleting the user row.
- **Last management-capable user:** Server checks prevent stripping the last user who has user-admin permissions (`user_directory` / `user_roles` / `user_delete` on any role). That guard is not fully serialized under concurrent admins; if the app ever locked everyone out, **core maintainers can restore roles** by editing `next_auth.app_role` / `next_auth.user_app_role` in **Supabase** (or direct Postgres) for the deployment.

Implementation reference: `src/server/api/routers/admin.ts` (`updateUser`, `setUserRoles`, role DTO outputs, shared validation), `src/lib/app-role-lineage.ts`, `src/lib/app-role-permissions.ts`, `src/lib/app-role-colors.ts`, and `src/lib/orcid.ts`.

**Public “core maintainers” list:** `users.getCoreMaintainers` selects users who hold a **lineage** role by **slug** (`maintainer` or `administrator`). That matches the fixed system roles in `app-role-lineage`; it is intentionally not a permission-key query.

**Admin favicon URL sampling (role accent):** The server fetches remote icons only inside **admin-only** procedures after URL validation. Residual DNS timing risk is accepted at that trust boundary; stricter pinning is optional if the threat model changes.


# Agent Memory

## Learned User Preferences

- Prefer Tailwind component classes or `@layer components` patterns for reusable styling instead of constants that store classname strings.
- Prefer compact, visible inline validation using HeroUI `ErrorMessage` (and related field primitives) over heavy bordered warning panels when surfacing missing required fields near forms or tabs.
- For substantial Prisma migrations, schema changes, and tRPC backend work, delegate to the project `backend-manager` subagent when the user requests it.
- Prefer app toast patterns over `alert()` for user-visible errors in interactive flows (profile, mutations, and similar).
- Vibe coding policy: Cursor is the only approved tool for code edits/generation; `.cursor/` is maintained by core maintainers and should not be modified in other PRs; PRs must include an `AI Role` section with levels 1-3 describing how AI was used (suggestions/minimal generation, extensive but managed generation, fully vibe-coded/disposable).
- For substantive UI changes, use the project's browser verification tooling when available instead of relying only on static code review.
- For HeroUI upgrades or broad component migrations, use the HeroUI migration MCP and migration guide during planning and implementation; browser-verify interactive flows; after navigation, wait for content to settle on slow pages before screenshots; use subagents for parallel tasks when that reduces context load.
- Prefer `bun run lint` (ESLint via `bunx eslint .`) together with `bun run typecheck` when validating changes; `bun run check` runs `next lint` plus `tsc`, which can diverge from the ESLint-only `lint` script.
- For the account profile dropdown, separate developer-oriented items from standard user actions with a visual divider; group profile, dashboard, and create-team together, and place admin-only entries such as **User administration** in their own section.
- For admin consoles such as `/admin/users`, prefer a multi-surface layout over a single dense panel; when search is central, show Command+K using HeroUI `Kbd` with `Kbd.Abbr` for the modifier and `Kbd.Content` for the key.
- When a destructive control is not allowed (for example deleting a protected user), keep the control visible in a disabled or muted state rather than removing it so users see a consistent action strip.
- On `/admin/users`, size table columns for readability without excess width; hide raw id in the default view and offer copy-id; keep per-row action icons aligned with their column.

## Learned Workspace Facts

- Use the theme provider and Hero UI v3 theming consistently across contribute and browse pages; use accent from the theme (`var(--accent)` where it applies) for selected tools and plot highlights, not removed brand tokens or ad-hoc hex colors.
- Prefer Hero UI components over custom or other component sets for forms, tabs, buttons, layout, and dropdowns where applicable, including migrating native `<input>`/`<select>` to Hero UI v3 `Input`/`Select`. Do not nest Hero UI `Button` inside `Dropdown.Trigger`; the trigger is already a React Aria button, so style `Dropdown.Trigger` with `buttonVariants` and `cn` from `@heroui/styles` when matching other ghost buttons. HeroUI v3 `@heroui/react` does not export `SelectItem`; use the project's `Select` pattern with `ListBox` / `ListBox.Item` (or equivalent documented API) instead; when dynamic options break `DropdownMenu` collection typing, a native `select` inside a styled shell is acceptable (e.g. NEXAFS edge filter). HeroUI `ButtonGroup` expects direct `Button` children; wrapping items in `Tooltip` or extra `span` layers can leak internal props (e.g. `__button_group_child`) to the DOM - use a vertical stack of consistently sized `Button`s with tooltips instead of nesting tooltips inside `ButtonGroup` when icon rails need alignment. In overflow-clipped or compact cards (e.g. NEXAFS browse rows), HeroUI `Tooltip` hover is unreliable; use HeroUI `Popover` on press with `border-border bg-surface` styling (aligned with profile menus) and `placement` toward the viewport interior (e.g. `left` for right-edge triggers) so overlays do not clip. For static name labels on avatars, a small portal hover like `AvatarWithTooltip` remains acceptable. HeroUI `ColorPicker` popovers (React Aria modal overlay) clash with Headless UI modal dialogs such as `SimpleDialog` (focus trap and inert siblings); use `HexColorSelector` from `~/components/ui/hex-color-selector` (native `input[type=color]`, preset grid, optional hex field) with shared presets in `~/lib/hex-color-presets`, and use `/sandbox/color-selector` to exercise the control outside admin flows.
- Prisma 7 in this repo: the CLI reads datasource URLs from root `prisma.config.ts` (explicit `.env` then `.env.local` loading); `schema.prisma` keeps provider/schemas without inline URLs; runtime `PrismaClient` uses `@prisma/adapter-pg` with pooled `DATABASE_URL` from validated env; import generated client and enums from `~/prisma/client` instead of `@prisma/client`. Bulk `bun update --latest` can jump Prisma major and break `postinstall` until pins or a migration land; avoid naive project-wide string replace of `@prisma/client` that also matches `@/…` paths.
- When using HeroUI Tabs with controlled selectedKey, defer parent setState from onSelectionChange (e.g. queueMicrotask) and pass stable callbacks (useCallback) to avoid React "Maximum update depth exceeded" from React Aria commit-phase updates; render each tab's content inside `Tabs.Panel` within the same `Tabs` tree per HeroUI anatomy, not only the tab list with content driven elsewhere.
- NEXAFS CSV/JSON upload and plot toolrails: treat header "mu" as absorption column; guard against undefined parsed.data and csvRawData (e.g. Array.isArray) before using .length. Hero UI `Table` needs at least one `Table.Column` with `isRowHeader={true}`; use the energy column when it is visible, otherwise the first visible column. Plot toolrails use HeroUI `Toolbar` with `isAttached` pill groups and `ButtonGroup` / `ToggleButtonGroup` / `Separator`; keep unrelated clusters separate (e.g. home and download separate from inspect, zoom, and pan; delta separate from OD, mu, and beta); prefer multiple attached toolbars over one outer border around unrelated groups. When a toolbar host layer covers the plot, use `pointer-events-none` on that wrapper and `pointer-events-auto` on grips and rail content so the SVG still receives hover, inspect, and drag events. Inside a `ToggleButtonGroup`, use segment-style corner rounding on first/last items (or shared plot-toolbar chrome classes), not `rounded-full` on every toggle, so the group reads as one connected control.
- NEXAFS multi-dataset UI: required molecule, instrument, and edge are selected via clickable segments in the tab title (modals); include an **experiment type** segment (TEY / PEY / FY / TRANS) with a modal and tooltips; basename **token 2** (after the edge token) reflects parsed technique - surface parse vs current selection; compact tab labels should show instrument short name only, not facility-qualified text; assignable manual peak kinds are only `pi-star` and `sigma-star`; legacy `peakKind` values can remain on stored peaks until the user picks a new kind.
- Facility contribute flow uses one UI: resolve the site with a ComboBox (existing or new), step tabs **Facility | Instruments**, optional instruments, and a single submit path; registered and draft instruments use HeroUI `Accordion` with `allowsMultipleExpanded` and `variant="surface"`; keep the primary facility search control visually distinct from the facility type Select (e.g. accent-weighted ComboBox vs secondary Select styling). Shared facility and instrument form building blocks, domain types, and related hooks live under `src/components/forms` and should be consumed via that module's barrel export.
- Browse `BrowseHeader` rows: for filter/toolbars headers, use `sm:flex-wrap` with a bounded search width (`sm:w-auto sm:max-w-md`, not `w-full` beside filters), `shrink-0` on filter triggers and dropdown wrappers, and a wrapping filter strip with a sensible `min-w` so controls move to the next line instead of overlapping the search. For `facilities` browse, use a search-only header (search spans full width) with name-ordered `facilities.list` / `facilities.search`, and place items-per-page next to pagination below the header (no facility-type or sort dropdowns). `experiments.listEdges` orders Carbon, Nitrogen, and Sulfur K-edges first (symbol or full element name), then remaining edges by target atom and core state.
- NEXAFS-specific UI components should live in the standalone `src/components/nexafs` library (for example via `nexafs-display.tsx`) rather than being owned by `src/components/browse`; browse pages should import from the NEXAFS library. For component-library extraction or polishing, use the `component-library-orchestrator` flow (`components`, `heroui`, `accessibility` subagents); centralize shared non-prop domain types in `types.ts` and export them from the library `index.ts` when needed. NEXAFS browse lists one card per canonical experiment; the grouped DTO exposes `experimentId` (`experiments.id`), and molecule links pass `?nexafsExperiment=<uuid>`. Legacy `experiment_group_id` / `experiment_group_slug` columns were removed after consolidation migrations. Polarization angles (theta, phi) on cards come from aggregating `spectrumpoints` (`polardeg` / `azimuthdeg`) across spectrum rows tied to that experiment. Molecule detail should reuse the same NEXAFS browse patterns scoped to that molecule's datasets (not the global catalog). Multi-trace plots sort polarizations by angle (low to high) before assigning sequential colors along the grey-to-red path; bare-atom overlays use the step-edge icon (stroke width 5) on analysis rails, omit bare-atom traces from the legend, and compare experimental beta to beta consistent with bare-atom mass absorption. Grouped dataset tables label geometry with theta and phi and omit UUID and raw polarization name from default row chrome. Copy and download actions for dataset CSV should remain reachable from the collapsed experiment card when the UX provides them.
- `s3/MOLECULES/INDEX.json` is the molecule catalog; each molecule folder holds `METADATA.json` as the per-molecule measurement index and paired spectrum `*.json` / `*.csv`. Basenames use six underscore-separated tokens: edge (e.g. `C(K)`), experiment type (`TEY`, `FY`, etc.), facility, instrument, research group, then vendor or provenance; normalize vendor spelling to the approved mapping in `s3/README.md` on import. InChI strings in `MOLECULES/INDEX.json` may lack the `InChI=` prefix; prepend `InChI=` when querying PubChem or other chemistry APIs so lookups stay reliable.
- NEXAFS experiment persistence: experiments are keyed by UUID without the old composite unique on sample, edge, instrument, and dates; `measurementdate` and sample `preparationdate` were removed - browse uses `createdat` for upload timing; `experiments.createWithSpectrum` accepts `collectedByUserIds` and Prisma maps `collectedbyuserids` to Postgres `collected_by_user_ids` (TEXT[]). Spectrum points store `energyev` and `rawabs` from upload; optional per-point `i0`, `od`, `massabsorption`, and `beta` from the client merge with server-derived values, with finite upload values taking precedence. Read-only browse and molecule-detail dataset views must render stored `spectrumpoints` fields as persisted without applying additional normalization or post-upload reprocessing beyond what the contributor applied at ingest.
- Molecule routes and lookups: store and query slugified names on `moleculesynonyms` (`slug`); resolve detail pages via `molecules.getBySlug` with the same slugify rules as URLs; URLs may use slug or legacy UUID (`layout` accepts both). Preserve human-readable and scientific names in data while the slug is canonical for links. If multiple molecules share the same slug, return NOT_FOUND and surface candidate molecules for disambiguation. Supabase Realtime for favorites uses the stable entity UUID in channel names (not slug). Shared client logic lives in `useRealtimeFavoriteEntity`: subscribe to both the per-entity favorites table and the aggregate row (e.g. `molecules.favorite_count`); on `CHANNEL_ERROR`, `TIMED_OUT`, or `CLOSED`, reconnect with bounded exponential backoff instead of permanently degrading to a single-stream fallback. Favorite toggles should apply the mutation response immediately for heart state and count, with realtime as eventual consistency. For correct header dataset counts on molecule detail, `molecules.getById` and the single-molecule branch of `getBySlug` must include `samples` with `_count.experiments` (same shape browse listing uses) so `toMoleculeView` can sum experiments. Structure depiction is SVG-first (`MoleculeImageSVG` rejects raster) for theme recoloring; keep canonical SVG at object-storage URLs; planned sketcher work generates SVG in-app, warns when drawn graphs diverge from tabulated or PubChem SMILES, and moves away from ad-hoc raster or hand-uploaded images.
- Home **Popular Molecules** uses `molecules.getTopFavorited` with lexicographic ranking: total experiment (dataset) count first, then `favorite_count`, then `view_count`, then `createdat`; keep Prisma includes aligned with browse listing (`samples` with `_count.experiments`, `moleculetags`, contributors, synonyms) so `toMoleculeView` supplies `experimentCount` for `MoleculeCard`. NEXAFS browse default sort is `engagement` (distinct polarization geometries, then experiment favorites, then quality comment count). Client pages that derive sort or filters from the URL should not initialize React state from `useSearchParams` in a `useState` lazy initializer on the first render; use identical server and client defaults, sync search params after mount (for example in `useLayoutEffect`), and defer data queries until that sync completes so sort controls and `aria-label` text hydrate consistently.

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

<!-- DO NOT EDIT THIS BLOCK IT IS MANAGED BY DOTAGENTS -->

# General

## General Structure

This codebase is maintained by contributors with physics PhDs and extensive backgrounds in scientific and engineering software, including numerical computing, data analysis, instrumentation, simulation, and research-grade reproducibility. Maintainers are highly mathematically literate, comfortable with linear algebra and statistics, and expect rigorous numerics with explicit type handling—silent coercion and imprecise computations are not acceptable.

## Operating principles

- Prefer the smallest coherent change set that satisfies the stated specification. Avoid drive-by refactors, unrelated formatting sweeps, and scope expansion.
- Treat the repository’s existing patterns as the default contract. Match naming, module boundaries, error-handling style, and test layout unless the user explicitly requests a migration.
- Default to production-grade output: complete, runnable, and reviewable. Do not ship placeholder text such as ellipses, “the rest of the implementation here”, “TODO: implement”, or “fill in later” inside code or patches unless the user explicitly authorizes a stub.
- Remain non-lazy: if a command fails, diagnose, adjust, and retry with a different approach when reasonable. Do not stop after the first error without analysis.
- Do not use emoji in code, comments, documentation strings, commit messages, or user-facing text unless the user explicitly requests emoji.

## Communication and documentation outside code

- Avoid standalone documentation files or long narrative write-ups unless the user asks for them or the repository already uses them for the same purpose.
- Prefer editing the code and tests that enforce behavior over adding parallel prose that can drift out of date.
- When the user asks for explanation, keep it precise and tied to the change set.

## Public API documentation (language-agnostic)

- Every **public** function, method, or type exported from a library module carries documentation appropriate to the language (for example Python docstrings, Rust `///` on public items, TSDoc/JSDoc on exported symbols).
- Documentation states the **surface**: name, purpose, parameters, return value, and thrown or returned error shapes when that is part of the contract.
- Prefer **prescriptive** voice that states what the symbol **does** and **means** for callers. Prefer “Maximum `foo` grouped by `bar` using a stable sort on `bar`.” over “Returns the max of foo by bar.” or "Computes the maximum `foo` grouped by `bar` using a stable sort on `bar`." or "Returns the maximum `foo` grouped by `bar` using a stable sort on `bar`."
- For each parameter: name, type as used in the project, allowed ranges or invariants when non-obvious, and interaction with other parameters.
- For results: type, semantics, units when relevant, ordering guarantees, and stability promises when they matter for science or reproducibility.
- Describe **what** the function does at the abstraction level of the API, **how** only when algorithmic choices affect correctness, performance contracts, or numerical stability, and **why** that approach is chosen when trade-offs are non-obvious (for example streaming vs materializing, online vs batch statistics).
- **Internal** helpers omit the long-form contract unless complexity warrants a short note. **Private** helpers keep documentation minimal (a phrase or single sentence at most).

## Module and package documentation

- Each library module (or the closest equivalent in the language’s module system) includes a short module-level description of responsibility: what problems it solves, what it explicitly does not handle, and which invariants callers should respect.
- Module docs are prescriptive about intent and boundaries so new contributors and agents do not duplicate concerns across modules.

## Tooling, skills, and continued learning

- Use project rules, agent skills, and MCP documentation tools when they apply to the task. Prefer authoritative library and framework documentation over memory when behavior, defaults, or breaking changes matter.
- When touching unfamiliar APIs, verify signatures, deprecations, and error modes against current docs or source in the dependency before guessing.
- Prefer file-scoped or package-scoped commands when the repository documents them (typecheck, lint, format, test on a single path) to shorten feedback loops.
- State permission-sensitive actions clearly (dependency installs, destructive commands, credential access) and follow the user’s safety expectations for the workspace.

## Task shape (goal, context, constraints, completion)

- Restate the goal in terms of observable outcomes: behavior, tests, or interfaces that change.
- Ground work in the relevant files, modules, and existing tests named by the user or discovered through search.
- Honor explicit constraints (performance, numerics, compatibility, style) before proposing alternatives.
- Stop when the completion criteria are met: tests pass where applicable, edge cases called out by the user are handled, and no placeholder implementation remains.

## Quality bar for agent output

- Do not substitute templates, pseudocode, or abbreviated implementations when the user asked for working code.
- If scope is too large for one pass, propose a staged plan and complete the first stage fully rather than leaving partial files full of omissions.

# TypeScript

## TypeScript

For **Next.js / T3 / HeroUI** web work, also load the **TypeScript web** bundle guidance and its related skills/rules by name.

Minimum bundle load for TypeScript/JavaScript:
- Load skills: `general-typescript` and `typescript-types` (as needed).
- Enable rule `typescript-base.mdc` for TypeScript/TSX/MTS/CTS sources.
- When diffs need deeper help, consider delegating to subagents: `typescript-reviewer`, `typescript-types`, and `typescript-refactor`.

The following applies to **TypeScript** and **JavaScript** work in this repository: libraries, CLIs, services, and shared tooling, with emphasis on strict typing, reproducible **Bun**-based workflows where the project adopts Bun, and editor integration (skills, subagents, rules) consistent with the **Python** bundle style.

### Conventions

- Target **modern ECMAScript** and **ES modules** unless the repository explicitly compiles to CommonJS for compatibility; keep `package.json` **`"type": "module"`** when the project standard is ESM.
- Treat **`tsconfig.json`** (and any solution references) as authoritative for **module resolution**, **strictness**, and **emit**; do not relax compiler options in individual files to hide errors without team agreement.
- Use **exhaustive handling** for discriminated unions and string/number unions (`switch` with **`never`** exhaustiveness check, or a small helper) so new variants fail at compile time.
- Keep **public exports** explicitly typed (return types on exported functions and methods, stable types on exported constants) so refactors surface clear breakage at call sites.
- Document **public library surfaces** with **JSDoc** or **TSDoc** where the project already does so (parameters, returns, thrown errors, `@deprecated` when applicable); avoid long narrative **inline comments**—prefer names, small functions, and focused module docs.
- Prefer **pure, synchronous** cores where possible; push **async I/O** to the edges and make **error propagation** explicit (`Result`-style types, typed errors, or documented `throw` contracts).
- **Imports**: keep **static imports at the top** of the file; avoid dynamic or inline imports solely to work around circular dependencies—fix the dependency graph instead when cycles appear.
- **Barrel files** (`index.ts` re-exports): use sparingly in application code when they create hard-to-trace cycles or slow typechecking; for libraries, keep public `package.json` **`exports`** aligned with intentional surfaces.

### Interfaces, type aliases, enums, `any`, and `unknown`

This section is **non-optional** for agents and contributors: naming and structuring types is as important as runtime correctness.

#### `interface` vs `type`

- **`interface`**: Use for **object-shaped** contracts—records of named properties, optional/required fields, and types that may be **`implements`**’d by classes. Treat as the default for **stable public object APIs** when you do not need a union or mapped-type expression.
- **`type`**: Use when **`interface` is insufficient**: **unions** (`A | B`), **intersections** that combine unions, **mapped** / **conditional** types, **tuples**, **template literal** types, or any alias that must be built from **type-level computation**.

Do not duplicate the same object shape as both `interface` and `type` without reason; pick one style per concept.

#### `enum`

- Prefer **`as const` object literals** plus a derived **string union** for fixed sets of string values (no reverse-mapping surprises, tree-shakes cleanly).
- **`enum`** is acceptable when the project or an integration **already** standardizes on enums; if you introduce one, prefer **string enums** over **numeric** enums unless there is a documented interop need.

#### `any` (never)

- **Do not use `any`.** It turns off checking for that value and infects callers.
- Fix the real type, introduce a **generic** with a **`extends`** bound, use a **discriminated union**, parse with **Zod** (or similar) at the boundary, or use a **single-line `@ts-expect-error`** with justification when the ecosystem truly provides no types (last resort).

#### `unknown` (explicit user approval)

- **`unknown`** is the only acceptable **top type** when something is truly untyped at compile time—but **not** by default on shared or exported surfaces.
- **Before** using **`unknown`** on a **public** API (exported parameters, shared context fields, library entrypoints), the **user must explicitly say that `unknown` is allowed** for that contract (or the repo’s written policy must already allow it). If unclear, **ask**; do not assume.
- Every **`unknown`** value must be **narrowed** (guards, **`zod.parse`**, discriminant checks) before use—no unchecked assertions to a concrete type.

#### `satisfies` and inference

- Use **`satisfies`** to keep **literal** inference while still checking assignability to a wider type; use it to avoid **`as` casts** when shaping config or constants.

### Tooling (Bun)

When this repository is **Bun-based** (lockfile **`bun.lock`**, scripts invoking **`bun`**, or documented choice of Bun), use **[Bun](https://bun.sh/docs)** for installs, scripts, and tests unless a different tool is already fixed for a subsystem.

- **Dependencies**: add, upgrade, and remove with **`bun add`**, **`bun add <pkg>@latest`**, **`bun remove`**—do **not** hand-edit version ranges in **`package.json`** for routine dependency changes.
- **Install**: **`bun install`** after clone or when the lockfile changes; prefer **`--frozen-lockfile`** (or CI equivalents) in automated pipelines when the project defines them.
- **Execution**: **`bun run <script>`** for `package.json` scripts; **`bun <file.ts>`** for one-off TypeScript execution when the project allows it.
- **One-off CLIs**: **`bunx <package>`** for ad-hoc tools (analogous to **`npx`**); prefer pinned or project-local versions when reproducibility matters.
- **Tests**: use **`bun test`** when it is the project standard; otherwise match **Vitest**, **Node test**, or another runner already wired in **`package.json`** and CI—do not introduce a second default runner.
- **Monorepos**: follow the repo’s **workspace** layout (`workspaces` in `package.json` or [Bun workspaces](https://bun.sh/docs/pm/workspaces)); add a dependency to a member by running **`bun add`** from that package’s directory (or follow the repo’s documented workspace workflow—**`bun add`** does not yet mirror **`pnpm --filter`** for targeting a member from the root in all setups).

If a **Bun** command differs by version, use **`bun --help`** or the [Bun documentation](https://bun.sh/docs).

### Quality gates

- Run **`tsc --noEmit`** (or the project’s typecheck script) on changed code; fix root causes rather than **`@ts-expect-error`** without a short justification and owner.
- Align with the project’s **lint** and **format** stack (**ESLint** + **typescript-eslint**, **Biome**, **Prettier**, etc.); enable or respect **`no-explicit-any`** (or equivalent) so **`any`** cannot land unnoticed; do not disable rules broadly—use the narrowest suppression when unavoidable.
- Catch **floating promises** and **misused promises** in async code; ensure **`async`** functions either `await` or return the promise intentionally.
- Keep **`eslint-disable` / `@ts-ignore`** rare and local; prefer code structure that satisfies the rule.

### Testing

- Prefer **fast, deterministic** unit tests; mock **network**, **filesystem**, and **time** at stable boundaries.
- **Regression tests** for fixed bugs; for async code, assert **resolution and rejection** paths explicitly.
- Match **snapshot** and **fixture** conventions already in the tree; avoid churning large snapshots without review.

### Cursor: skills

Load these **skills** by **name** when the task matches (each skill’s own `SKILL.md` and references hold the full detail). Installed skills usually live under `.cursor/skills/` (or your editor’s equivalent).

| Skill | Use it for |
|-------|------------|
| **general-typescript** | Hub: **Bun** workflow, **tsc** / **tsconfig**, **interface** / **type** / **enum** choices, **no `any`**, **`unknown` only with explicit approval**, ESM, lint/test, JSDoc/TSDoc, pointers to **typescript-types**. |
| **typescript-types** | Deep **TypeScript**: discriminated unions, **exhaustive** `switch`, generics, **`satisfies`**, branding, conditional types at maintainable complexity, fixing checker output without widening. |

### Cursor: subagents

Delegate by **subagent name** when a focused pass is better than inline editing. Subagents usually live under `.cursor/agents/` (or your editor’s equivalent).

| Subagent | Use it for |
|----------|------------|
| **typescript-reviewer** | Reviewing changes: Bun hygiene, **strict** typing, async correctness, tests, public API clarity. |
| **typescript-types** | Deep typing: generics, unions, inference fixes, exhaustive handling, `tsc` errors. |
| **typescript-refactor** | Structure: cycles, barrel files, oversized modules, clear sync vs async layering. |

### Cursor: rules

- A **TypeScript** Cursor **rule** applies to TypeScript and JavaScript sources (typically `**/*.{ts,tsx,mts,cts}` and sometimes `**/*.js` when configured). It restates **Bun** usage where applicable, **strict** expectations, **no `any`**, **`unknown` only with explicit user/repo approval**, **interface** / **type** / **enum** guidance, async and import hygiene, and points to **general-typescript**, **typescript-types**, and the subagents above.
- **Rule text is authoritative for “always on” editor hints**; **skills** carry the long-form patterns and examples. When the two differ on a detail, follow **this spec** and **`tsconfig.json` / `package.json`**, then the **rule**, then skill nuance.

### External references

- [TypeScript handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [typescript-eslint](https://typescript-eslint.io/)
- [Bun](https://bun.sh/docs)
- [TSDoc](https://tsdoc.org/)

# TypeScript - Web

## TypeScript web (T3 stack, App Router)

### Stack (non-negotiable roles)

Treat these as **fixed responsibilities**. Do not substitute parallel libraries for the same job (for example, no second component kit, no alternate ORM, no REST hand-rolled where **tRPC** is the contract).

| Layer | Tool | Role |
|--------|------|------|
| Framework | **Next.js** (App Router) | Routing, RSC/SSR, metadata, layouts, streaming, route handlers |
| End-to-end API | **tRPC** | Type-safe procedures, routers, and client; server/client boundary for app data fetching |
| Persistence | **Prisma** | Schema, migrations, queries, transactions; **only** ORM for database access |
| Validation | **Zod** | Runtime parsing and static inference for **tRPC inputs**, **forms**, **env**, **URL search params**, and cross-boundary DTOs |
| Styling | **Tailwind CSS** | Utility layout and spacing; **design tokens** come from theme variables, not ad-hoc hex/rgb sprawl |
| Components | **HeroUI** | **Only** allowed component library for interactive and styled primitives (buttons, inputs, modals, etc.) |

Optional T3-adjacent pieces (auth, analytics, etc.) follow whatever this repository already wires; they must not replace **Prisma**, **tRPC**, **Zod**, **Tailwind**, or **HeroUI** in those rows.

### Styling: `globals.css` and HeroUI theme

- **`src/styles/globals.css`** (or the project’s equivalent global stylesheet imported from the root layout) is the **primary source of truth** for **theme-level** decisions: CSS variables HeroUI and Tailwind consume, dark mode tokens, radius, font stacks, and semantic colors.
- **HeroUI theme configuration** that lives alongside or inside that global layer (design tokens, `@theme`, or documented HeroUI v3 theming hooks) **overrides** one-off component styling when there is a conflict: **normalize at the theme**, do not fork divergent colors per screen.
- Use **Tailwind** for **composition** (flex, grid, gap, responsive breakpoints) and **token-backed** utilities (`bg-primary`, semantic classes tied to variables). Avoid **inline styles** and **arbitrary values** (`bg-[#...]`, `text-[13px]`) unless there is no token yet—then **add a token** in the global theme first.
- Do not introduce **CSS-in-JS** libraries, **styled-components**, or a second utility framework for app UI.

### Next.js App Router

- All **user-facing routes** live under **`src/app/`** (or `app/` at project root if that is the repo convention). Use the **App Router** file conventions only: **`page.tsx`**, **`layout.tsx`**, **`loading.tsx`**, **`error.tsx`**, **`not-found.tsx`**, **`route.ts`** (or `.js`), **`template.tsx`** when needed.
- Next.js App Router is a file-system based router built around React capabilities like **Server Components**, **Suspense**, and **Server Functions**. In practice, that means your route tree should lean on Server Components for data and composition, and use Client Components only when you need client interactivity, browser APIs, or local state.
- **Layouts and pages** define the UI tree and shared boundaries.
- **Linking and navigation** should use Next.js patterns (e.g. `Link`) so the App Router can optimize navigation.
- **Server vs client components** determine where you can fetch data and where you can attach event handlers.
- **Fetching and caching** should be explicit: data needed for initial render belongs on the server, and caching/revalidation must match the product’s freshness requirements.
- **Mutating data** should use the repo’s backend contract (tRPC procedures / server actions / REST bridge when present) instead of ad-hoc client fetches.
- **Error handling** should be explicit per segment (`error.tsx`, plus API-layer error mapping) rather than hidden behind generic fallbacks.
- **Metadata and OG images** should be generated with the segment that owns the data to keep SEO consistent.
- **Route handlers** (`route.ts`) exist for HTTP contracts that need URL-addressable endpoints outside tRPC.
- **Every route segment** must be **well defined**:
  - **`page.tsx`**: the route’s default UI; explicit about **Server vs Client** (`"use client"` only when required).
  - **`layout.tsx`**: shared chrome, providers that wrap children, and **metadata** boundaries where appropriate.
  - **`loading.tsx` / `error.tsx` / `not-found.tsx`**: define **streaming**, **failure**, and **missing** UX for that segment when the product cares—do not rely on implicit Next.js fallbacks for important flows without intent.
  - **Metadata**: use the **Metadata API** (`export const metadata` / `generateMetadata`) for titles and SEO on **server** pages; keep **dynamic** metadata colocated with the segment that owns the data.
- **Route groups** `(folder)` organize without affecting the URL; use them for **cohorts** of routes (marketing vs app shell) and **layout splits**, not as a junk drawer.
- **Server Components** by default: push **`"use client"`** to **leaves** (HeroUI widgets, local state, browser APIs). **Data fetching** for the initial render belongs in **Server Components** or **tRPC server callers** invoked from the server, not scattered `useEffect` fetches for the same data.
- **Route Handlers** (`route.ts`) are for **webhooks**, **OAuth callbacks**, **file uploads**, and **third-party HTTP** contracts that must be URL-addressable outside tRPC.
  - Export named handlers that match HTTP verbs (e.g. `GET`, `POST`, `PUT`, `PATCH`, `DELETE`), and keep their behavior aligned with the HTTP semantics (read-only vs write, safe vs idempotent).
  - Parse all inputs explicitly: `request.json()` for bodies and `request.url.searchParams` for query strings, then validate with **Zod** before calling domain logic.
  - Enforce **authentication** and **resource-level authorization** on every protected handler. For authenticated-only requests, reject with 401 (unauthenticated) or 403 (authenticated but forbidden); never trust client-controlled ids/tenant fields.
  - Return JSON with predictable error semantics (stable error codes/messages) and correct status codes (`401`, `403`, `404`, `422`, `409`, `500` as appropriate).
  - For list/search UX, ensure `GET` handlers accept the same query-string keys that your UI uses (so a shared URL produces the same filtered view, modulo auth).

### URL state and shareable links

- Treat **search params** as part of the **public contract** for list, search, and filter experiences: a user should be able to **copy the URL** from the address bar and get the **same view** (modulo auth), within sensible defaults for missing keys.
- Define a **single Zod schema** (or layered schemas) for **`searchParams`** per route family; parse in **Server Components** (`page` props) or in a small shared parser used by both server and client navigations.
- Prefer **stable, readable** query keys (`q`, `page`, `sort`, `filter`, namespaced keys for complex filters). Avoid encoding large opaque blobs in the URL; persist heavy state elsewhere when needed.
- When updating filters from the client, use **`router.push` / `Link`** with constructed query strings (or the project’s URL-state helper, e.g. **nuqs**) so the **server render** and **client navigation** stay in sync.
- **Authenticated-only** views still use real URLs: the **page** may redirect unauthenticated users, but **authorized** users keep bookmarkable addresses.

### tRPC and backend integration

- Define **routers** and **procedures** under **`src/server`** (see folder table). **Inputs** (and **outputs** when enforced) use **Zod** via `.input()` / `.output()`.
- **Context** must include everything needed to enforce **authentication** and **authorization** (session user, roles, tenant id). Procedures that expose user-specific or tenant-specific data **must** check **resource ownership** or equivalent—not only “is logged in.”
- **Naming and semantics** (align with HTTP intuition for maintainers and future REST consumers of the same domain):
  - **Queries**: read-only, **idempotent** side effects only; safe to repeat. Suitable for “GET-like” usage patterns.
  - **Mutations**: create/update/delete or any operation with **lasting** side effects; explicit validation and authz.
- **Errors**: use **tRPC error codes** consistently (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST`, `CONFLICT`, etc.); never leak **secrets** or **stack traces** to the client. Map **Prisma** errors to stable, user-safe messages where appropriate.
- **Client** access goes through the project’s **tRPC React** or **server caller** setup—no parallel **`fetch("/api/...")`** for the same contract unless migrating intentionally.
- **REST route handlers** (any App Router `route.ts` HTTP bridge, when present) should follow **explicit HTTP methods** (**GET** for reads, **POST** for creates, **PUT**/**PATCH** for updates, **DELETE** for deletes), **Zod-validated** bodies and query strings, and the same **authz** rules as analogous tRPC procedures.
  - Do not duplicate business logic: **extract** shared validation and domain functions used by both tRPC and REST layers when both exist.

### Prisma

- **Schema** and **migrations** are the single source of truth for the database shape. **Queries** use the **Prisma Client** from a **server-only** module (singleton pattern as the repo already implements).
- Do not embed **raw SQL** unless necessary; when used, keep it **localized**, **parameterized**, and **reviewed**. No second ORM or query builder for the same database.

### Zod

- **tRPC procedure inputs** (and outputs when enforced) are **Zod schemas**.
- **Environment variables** are validated with Zod in the **documented** env module (e.g. `src/env` or `src/lib/env`), not read ad hoc with unchecked `process.env`.
- **Forms** and **URL search params** should parse through **Zod** before business logic runs.

### `src/` folder conventions

Use these folders consistently. If the repo uses `src/`, all paths below are under **`src/`**; otherwise map the same names at the project root.

| Folder | Purpose | Put here | Do not put here |
|--------|---------|----------|-----------------|
| **`app/`** | App Router **filesystem** | `page`, `layout`, `loading`, `error`, `not-found`, `route`, `template`; colocated tests if the project allows; **minimal** logic—compose from **features** / **components** | Heavy Prisma queries; large reusable UI; generic string helpers |
| **`features/`** | **Vertical slices** by product domain | Feature UI sections, feature hooks, feature types, thin wrappers calling **tRPC** or server actions | Generic design-system primitives; global singletons |
| **`components/`** | **Shared UI** with **HeroUI** | Reusable presentational pieces, layout primitives, HeroUI wrappers with app tokens | Domain business rules; direct **Prisma** |
| **`server/`** | **Server-only** orchestration | **tRPC** setup, **routers**, **procedures**, context, auth wiring, server actions touching **Prisma** | React components; client hooks |
| **`lib/`** | **App wiring** | **tRPC** client/provider, **Prisma** export, `cn()`, validated **env** | Feature screens; raw UI |
| **`utils/`** | **Small pure** helpers | Pure functions: formatting, ids—**no** React, **Prisma**, **tRPC** | Database; JSX |
| **`common/`** | **Cross-feature contracts** | Shared types, enums, error code unions, DTO types not inferred from Zod when needed | React components; raw Prisma models as “the” API type |
| **`styles/`** | **Global** presentation | **`globals.css`**, Tailwind `@import` chain, HeroUI theme hooks | One-off component CSS unless standardized |

**Import direction (ideal):** **`app`** and **`features`** may import **`components`**, **`lib`**, **`utils`**, **`common`**, and **`server`** (types only from server where split). **`utils`** and **`common`** stay low—no imports from **`features`** or **`app`**. **`server`** must not import client-only modules.

### Accessibility and UX defaults

- **HeroUI** and **Next.js** do not remove the need for **labels**, **focus order**, and **keyboard** paths. Compose HeroUI primitives with **semantic** structure (headings, landmarks) and test **interactive** flows.
- **Loading** and **error** UI should be **predictable** per route segment (see App Router section).

### Cursor: skills

| Skill | Use it for |
|-------|------------|
| **general-typescript** | Bun, strict TS, tests, ESM, async |
| **typescript-types** | Deep typing at the tRPC/Zod boundary |
| **typescript-web** | This spec: RSC/client boundaries, stack overview |
| **web-trpc-api** | Auth context, queries vs mutations, Zod, errors, REST bridge |
| **web-url-search-state** | `searchParams`, shareable URLs, Zod parsers |
| **heroui-components** | HeroUI-only UI, theme tokens, v3 imports |

### Cursor: subagents

| Subagent | Use it for |
|----------|------------|
| **web-ui-reviewer** | HeroUI, forms, loading/empty states, component boundaries |
| **web-api-reviewer** | tRPC authz, Zod, Prisma usage, REST handlers |
| **heroui-implementation** | HeroUI import/version/compound-component consistency |

### Cursor: rules

- **heroui-theme.mdc**, **web-app-router.mdc**, **web-trpc-api.mdc**, **web-accessibility.mdc** apply to TSX and server/API paths per their globs when the TypeScript web bundle is installed and rule globs are enabled.
- **Rule text** is for always-on hints; **skills** hold long-form patterns. Resolve conflicts using **this spec**, then project **`tsconfig` / `package.json`**, then rules, then skills.

### External references

- [T3 Stack](https://create.t3.gg/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [tRPC](https://trpc.io/docs)
- [Prisma](https://www.prisma.io/docs)
- [Zod](https://zod.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [HeroUI](https://www.heroui.com/) (match the version pinned in this repo)

<!-- END OF MANAGED SECTION -->
