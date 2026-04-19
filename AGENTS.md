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
- Dynamic and nested segments live under folders like `facilities/[slug]`, `molecules/[id]`, and similar

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

## Branding source of truth

- `src/app/brand.ts` is the canonical source of truth for site identity, mission language, and attribution metadata.
- Reuse exported values from `brand.ts` in metadata, page copy, OpenGraph/Twitter tags, and shared UI surfaces instead of duplicating branding strings.
- Use `site.name` for reader-facing UI copy and `site.applicationName` only for machine-oriented labels that intentionally require that variant.
- Keep host and institutional attribution aligned to `attribution.*` values, and prefer mission variants in `mission.*` based on context (`heroShort`, `canonical`, `technical`, `stewardship`, `seoDescription`, `ogTitle`).

## Contributor conventions (Git)

Environment setup, PR checklist, and the full conventional-commit table live in **`CONTRIBUTING.md`**. Agents and contributors must still honor these **project conventions**:

### Wiki-only work

Wiki URLs under **`src/app/wiki`** (layouts and topic pages); shared doc chrome includes **`src/components/about/wiki-doc-shell.tsx`** and **`src/lib/wiki-doc-nav.ts`**.

- **Branches:** use the **`wiki/`** prefix (`wiki/<short-kebab-description>`). Examples: `wiki/home-copy-edit`, `wiki/platform-features-clarity`.
- **Commits:** on wiki-focused branches, every commit uses **`type(wiki): description`** per Conventional Commits (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`). Examples: `feat(wiki): add glossary anchor links`, `fix(wiki): correct schematic caption`.

Duplicate prose and examples live under **`CONTRIBUTING.md`** — Wiki contributions; update both documents together when changing those rules.

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
- For substantial Prisma migrations, schema changes, tRPC backend work, and compliance Phase 1 auth (`tmp/compliance-spec.md`), delegate to the project `backend-manager` subagent when the user requests it; track progress in `docs/compliance-implementation.md` cross-referenced with the spec. Implement passkeys through Auth.js WebAuthn and Prisma `Authenticator`, not custom `/api/passkeys/*` routes. When the user explicitly asks to apply or fix database changes through the Supabase plugin or Supabase MCP, use that path while keeping Prisma schema and repository migration SQL aligned with what is deployed. When `prisma migrate deploy` hangs on the Supabase pooler, apply DDL via Supabase MCP `apply_migration` (or direct SQL), align `_prisma_migrations`, then run `bunx prisma generate` before relying on new columns in the app. For user-led feature work, prefer informative branch names (for example `feat/orcid-compliance`) over `cursor/` unless the workflow explicitly requires that prefix.
- Prefer app toast patterns over `alert()` for user-visible errors in interactive flows (profile, mutations, and similar); on dense plot pages (for example NEXAFS contribute), keep toast surfaces on semantic token classes and stack them above in-plot overlays using the shared toast z-index layer. On **`SpectrumPlot`**, y-axis zoom/pan must mirror energy-axis behavior (marquee brush, pan, wheel, toolbar +/-)—not Shift-only or gutter-only shortcuts.
- Vibe coding policy: Cursor is the only approved tool for code edits/generation; `.cursor/` is maintained by core maintainers and should not be modified in other PRs; PRs must include an `AI Role` section with levels 1-3 describing how AI was used (suggestions/minimal generation, extensive but managed generation, fully vibe-coded/disposable).
- For substantive UI changes, HeroUI upgrades, or broad component migrations, use browser verification when available, the HeroUI migration MCP and guide during planning, wait for content to settle on slow pages before screenshots, and subagents for parallel work when that reduces context load; for avatar or attribution-row fixes, verify header, contribute **Researchers**, and browse show the same per-user identity before claiming success. For **dashboard plot viewer** (`/dashboard/plot`) iterations, use **red-green-refactor**: add or adjust tests first, implement the fix, then refactor. During dashboard or instrument-connector refactors, skip visualization-only polish unless the user explicitly requests a viz pass.
- Header and sign-in chrome: keep Sign In, theme toggle, and external links at equal height (`DefaultButton` HeroUI `size` `md` on ~40px header rows, not hardcoded `h-8`); sign-in surfaces state ORCID-first account creation with a linked https://orcid.org reference and note GitHub works after profile linking—avoid redundant footer or info boxes on modal and full-page sign-in.
- Dashboard STXM UX is **instrument-first** (`/dashboard` lists persisted Atlas **instruments** with connector readiness overlays, not hardcoded facility cards); clicking **Open workspace** enters the beamline workspace—not session-first entry. Match the standalone stxm web app flow: local folder picker, beamtime browser, grouped file grid. Reuse the NEXAFS **`DatasetVisualizationShell`** plot shell (Graph/Table tabs, Line/Scatter/Area, vertical left **`PlotDataViewRail`**—not horizontal channel bars); embed a **collapsible line-scan region tray** inside the plot card (**expanded by default**) with a compact top bar (tray toggle, +, auto wand)—not a separate page column or bulky REGIONS footer. **Ingestion tab order:** molecule field → spectra plot → sample → researchers → **Upload to Atlas** at the bottom; link Atlas **molecule** (not experiment) via NEXAFS contribute molecule picker—**no manual chemical formula**; multi-scan compare before upload. **Preview spectra** mirrors `/dashboard/plot` compare (multi-scan and per-region trace overlay, style encodings, legend).
- Dashboard and STXM processing require **auth only** (not `labs_access`); numerics run **browser-side** in `src/lib/stxm/`; raw line scans persist as **experiment auxiliary files** when uploaded; processing is **standalone** without upfront NEXAFS experiment linking—upload/link is optional later. Region editor **row-sum** strip uses integrated row totals; spectrum **reduction** uses **mean counts per pixel** per energy (standalone stxm parity), not raw band sums. De-emphasize or remove a prominent Error kind toggle; keep region editor and row-sum column narrow so the plot gets majority width. **Auto-recompute** spectra on region/settings change (no manual Recompute button); **live preview during region drag** (~75ms throttle, persist bounds on pointerup).
- File System Access API: call `requestPermission` only on explicit user click (not auto on route mount); collect filesystem access and heavy-compute consent at STXM workspace startup (`/dashboard/instruments/als-5322` onboarding gate); skip duplicate KK consent prompts when upfront compute consent is already granted.
- For substantive UI changes, use the project's browser verification tooling when available instead of relying only on static code review. For HeroUI upgrades or broad component migrations, use the HeroUI migration MCP and migration guide during planning and implementation; browser-verify interactive flows; after navigation, wait for content to settle on slow pages before screenshots; use subagents for parallel tasks when that reduces context load.
- Ephemeral NEXAFS plot tooling (inspect readouts, pinned cursors, and similar exploratory helpers) should stay client-side unless a feature explicitly calls for database persistence.
- Prefer `bun run lint` (ESLint via `bunx eslint .`) together with `bun run typecheck` when validating changes; `bun run check` runs `next lint` plus `tsc`, which can diverge from the ESLint-only `lint` script.
- Account profile dropdown: separate developer items from standard actions; group profile, dashboard, **Attribution teams**, **Create team**, and **Pending attributions** (bell count badge) together; admin entries such as **User administration** in their own section. On `/users/[orcid]` and `/admin/users`, prefer multi-surface layouts, browse-aligned cards, danger-zone-only harsh warnings, and disabled-not-hidden destructive controls when an action is forbidden.

## Learned Workspace Facts

- Use the theme provider and Hero UI v3 theming consistently across contribute and browse pages; use accent from the theme (`var(--accent)` where it applies) for selected tools and plot highlights, not removed brand tokens or ad-hoc hex colors. Prefer Hero UI components over custom or other component sets for forms, tabs, buttons, layout, and dropdowns where applicable, including migrating native `<input>`/`<select>` to Hero UI v3 `Input`/`Select`. Do not nest Hero UI `Button` inside `Dropdown.Trigger`; the trigger is already a React Aria button, so style `Dropdown.Trigger` with `buttonVariants` and `cn` from `@heroui/styles` when matching other ghost buttons. HeroUI v3 `@heroui/react` does not export `SelectItem`; use the project's `Select` pattern with `ListBox` / `ListBox.Item` (or equivalent documented API) instead; when dynamic options break `DropdownMenu` collection typing, prefer a shared `PopoverMenu` list pattern (as on browse toolbars) over ad-hoc native `<select>` unless a control is explicitly scoped as a compact fallback. Shared `PopoverMenu` clamps portaled panels to the viewport with arrow offset—apply positioning `contentStyle` on the menu shell, not inner popover content wrappers. Contribute upload **Source publication** blocks should match browse verification styling: semantic surface/border tokens, readable primary/secondary buttons, compact title+DOI rows with icon remove—not low-contrast accent CTAs. HeroUI `ButtonGroup` expects direct `Button` children; wrapping items in `Tooltip` or extra `span` layers can leak internal props (e.g. `__button_group_child`) to the DOM - use a vertical stack of consistently sized `Button`s with tooltips instead of nesting tooltips inside `ButtonGroup` when icon rails need alignment. In overflow-clipped or compact cards (e.g. NEXAFS browse rows), HeroUI `Tooltip` hover is unreliable; use HeroUI `Popover` on press with `border-border bg-surface` styling (aligned with profile menus) and `placement` toward the viewport interior (e.g. `left` for right-edge triggers) so overlays do not clip. For static name labels on avatars, a small portal hover like `AvatarWithTooltip` remains acceptable. Shared avatar identity lives in `~/components/ui/avatar.tsx` (`normalizeProfileImageUrl`, `avatarIdentitySeedFromInputs`, `ResearcherAvatar`); the same person must resolve to the same gradient/image on the header account control, contribute **Researchers** `AvatarGroup`, and browse cards. NEXAFS attribution avatars carry HeroUI `Badge` colors from `researcherAttributionBadgeStatus` in `~/lib/nexafs-attribution.ts` (red = unclaimed ORCID, yellow = Atlas user pending contribution agreement, green = agreed); non-Atlas researchers use surface-themed initials (no per-user gradient). Contribute `DatasetAttributionEditor` uses one `AvatarGroup` with overlapping avatars and trailing surface **+** (add researcher) and **Users** (apply saved team) on the same `items-center` row; display via `datasetAttributionsForAvatarDisplay` / `dedupeDatasetAttributions` (browse cards still dedupe ORCID-only with `dedupeNexafsContributorsByOrcid`). DataCite role pickers tier via `groupContributorRoleOptionsByTier` in `~/lib/datacite-contributor-types.ts` (Recommended / Other roles / Advanced); unified researcher search uses `~/lib/attribution-researcher-search.ts`. Prefer HeroUI `ScrollShadow` for wide horizontal tables and keep a visible drag scrollbar when users must scroll many upload columns. HeroUI `ColorPicker` popovers (React Aria modal overlay) clash with Headless UI modal dialogs such as `SimpleDialog` (focus trap and inert siblings); use `HexColorSelector` from `~/components/ui/hex-color-selector` (native `input[type=color]`, preset grid, optional hex field) with shared presets in `~/lib/hex-color-presets`, and use `/sandbox/color-selector` to exercise the control outside admin flows. When using HeroUI Tabs with controlled selectedKey, defer parent setState from onSelectionChange (e.g. queueMicrotask) and pass stable callbacks (useCallback) to avoid React "Maximum update depth exceeded" from React Aria commit-phase updates; render each tab's content inside `Tabs.Panel` within the same `Tabs` tree per HeroUI anatomy, not only the tab list with content driven elsewhere.
- Prisma 7, ORCID identity, and compliance auth: the CLI reads datasource URLs from root `prisma.config.ts` (explicit `.env` then `.env.local` loading); multi-file schema under `prisma/schema/`; runtime client from `~/prisma/client` with `@prisma/adapter-pg` and pooled `DATABASE_URL`. After schema changes, run `bunx prisma generate` and restart the dev server. When migrations fail on Supabase, use direct `DIRECT_URL` (not the pooler), `scripts/supabase/grant-next-auth-prisma-permissions.sql`, `orcid-pk-prepare-role-table-ownership.sql`, and `grant-public-prisma-ownership.sql` so the `prisma` role owns `next_auth` and `public` objects it must alter; use `prisma migrate resolve` for failed rows in `_prisma_migrations`, then pooler fallback via Supabase MCP `apply_migration` if deploy still hangs. ORCID PK: `bun scripts/migrate-user-orcid-pk-audit.ts` then `20260522120000_user_orcid_primary_key`; then Phase 1 migrations in order: `20260526120000_audit_event`, `20260526130000_consent_receipt`, `20260527120000_user_lifecycle_tombstone`, `20260527143000_authenticator_authjs_webauthn`, `20260527150000_session_assurance` (see `tmp/compliance-spec.md` and progress in `docs/compliance-implementation.md`). `next_auth.user.id` is bare ORCID iD (VARCHAR 19); public `/users/[orcid]` with legacy UUID redirects (`user_legacy_id_redirect`, `~/lib/user-route.ts`, `orcidUserIdSchema`). ORCID-only account creation (`openid`); GitHub secondary only when an existing `account` row is linked (`DEV_GITHUB_*` locally); Hugging Face and dev-mock auth removed; `user.email` dropped. Block `/users/` in `robots.ts` and profile metadata; set `AUTH_URL` and `WEBAUTHN_RP_ID` / `WEBAUTHN_ORIGIN` for OAuth/WebAuthn. Append-only `audit_event` via `~/server/audit/emit-audit-event.ts` (`failSilent` on auth paths). Contribution writes require `consent_receipt` and `CONTRIBUTION_AGREEMENT_VERSION` (`~/lib/contribution-agreement.ts`). `session_assurance` on ORCID sign-in stores `auth_time` / `amr` when present (`~/server/auth/session-assurance.ts`, `orcid-id-token.ts` with `jose`, `orcid-userinfo.ts`); Public API often omits `amr`. Passkeys: Auth.js `Passkey` + `next_auth.authenticator` (migration `20260527143000_authenticator_authjs_webauthn`); legacy `/api/passkeys/*` removed; `contributeWriteProcedure` / `adminProcedure` enforce enrollment (`~/server/auth/mfa-access.ts`); after enrollment, contribute writes still accept ORCID database sessions; privileged roles need hardware passkey at enrollment. `UserAppRole` uses composite `@@id([userId, roleId])`. OAuth tokens in `next_auth.account` encrypt at the Prisma adapter boundary via `~/server/auth/oauth-token-crypto.ts` (AES-256-GCM, `v1:` prefix, dual-read legacy plaintext); decrypt before GitHub and assurance reads in `~/server/auth/session-assurance.ts` and the users router; `OAUTH_TOKEN_ENCRYPTION_KEY` is a 32-byte hex or base64 key and `src/env.js` throws `OAUTH_TOKEN_ENCRYPTION_KEY_MISSING` when `NODE_ENV` is production.
- NEXAFS CSV/JSON upload and plot toolrails: treat header "mu" as absorption column; in upload-template copy, `mu` is instrument-scaled signal proportional to mass absorption under arbitrary density/thickness, `od` names the 0-1 optical-density normalization workflow, and `mass_absorption` is mass absorption normalized to 1 g/cm³ and sample thickness; guard against undefined parsed.data and csvRawData (e.g. Array.isArray) before using .length. Hero UI `Table` needs at least one `Table.Column` with `isRowHeader={true}`; use the energy column when it is visible, otherwise the first visible column. Plot toolrails use HeroUI `Toolbar` with `isAttached` pill groups and `ButtonGroup` / `ToggleButtonGroup` / `Separator`; keep unrelated clusters separate (e.g. home and download separate from inspect, zoom, and pan; delta separate from OD, mu, and beta); prefer multiple attached toolbars over one outer border around unrelated groups. When KK-derived per-point `delta` exists on the spectrum, expose it as a first-class plotted y-series alongside OD, mu, and beta (same `energyev` axis; no parallel delta-energy column). When a toolbar host layer covers the plot, use `pointer-events-none` on that wrapper and `pointer-events-auto` on grips and rail content so the SVG still receives hover, inspect, and drag events. In-plot HTML overlays (`InspectPinLayer` / `PeakPlotAnnotations` use z-[18]/z-[19]) can stack above the rail and affect hover hit-testing; spectrum plot rails wrap controls in `PlotToolbarRichHint` (`src/components/plots/toolbars/plot-toolbar-rich-hint.tsx`), portaling hover help to `document.body` at `z-max`, matching browse dataset metric hovers instead of relying on HeroUI `Tooltip` alone on those surfaces; the hint must return a single child (no fragment sibling portal), forward HeroUI `BUTTON_GROUP_CHILD` onto the real `Button`/`ToggleButton` so attached groups keep segment styling, and use `whenDisabledDescription` on disabled controls so greyed tools still show unlock copy on hover/focus. Create the portal `createRoot` only while the hint is open; defer `unmount()` with `queueMicrotask` and split open vs `anchorBox` effects so React 19 does not warn about synchronous teardown during render. On the contribute dataset plot, expose Save and Copy like browse dataset plots, and stack peaks tools above the KK rail with a horizontal `Separator` between blocks. Inside a `ToggleButtonGroup`, use segment-style corner rounding on first/last items (or shared plot-toolbar chrome classes), not `rounded-full` on every toggle, so the group reads as one connected control. NEXAFS multi-dataset UI: required molecule, instrument, and edge are selected via clickable segments in the tab title (modals); include an **experiment type** segment (TEY / PEY / FY / TRANS) with a modal and tooltips; basename **token 2** (after the edge token) reflects parsed technique - surface parse vs current selection; compact tab labels should show instrument short name only, not facility-qualified text; assignable manual peak kinds are only `pi-star` and `sigma-star`; legacy `peakKind` values can remain on stored peaks until the user picks a new kind.
- NEXAFS contribute auxiliary files live on the dataset panel **Auxiliary files** tab (`VisualizationToggle` modes `graph` | `table` | `aux`; `DatasetAuxFilesTab` in `dataset-persisted-aux-files.tsx`), not inline below the plot. Use side-by-side compact `AuxFileDropZone` (`variant="compact"`) with `StackedPageDropVisual` as the sole file list (experiment 500 MB left, sample 50 MB right): draft queues and persisted `experimentFile` / `sampleFile` rows render in the in-zone stack (count badge; horizontal scroller on hover with per-file remove), not a separate tree explorer or pill list. After first save, `persistedExperimentId` / `persistedSampleId` on `DatasetState` plus `usePersistedAuxUpload` upload immediately; add/remove gates on `experiments.canEditExperiment` (owner, collector, admin). Infer aux `kind` from extensions via `inferAuxFileKindFromFileName` / `inferAuxFileKindFromBatch` in `~/lib/aux-file-client.ts`. Global drag-drop zone IDs `nexafs-new-dataset`, `nexafs-experiment-aux`, `nexafs-sample-aux` with zone-local `ContributionFileDropOverlay` only when the aux tab is active. Aux tab layout needs an explicit min-height on the tab panel; avoid `flex-1 min-h-0 overflow-hidden` on the visualization shell without a height anchor (otherwise the aux tab collapses to zero height).
- Use the theme provider and Hero UI v3 theming consistently across contribute and browse pages; use accent from the theme (`var(--accent)` where it applies) for selected tools and plot highlights, not removed brand tokens or ad-hoc hex colors. Prefer Hero UI components over custom or other component sets for forms, tabs, buttons, layout, and dropdowns where applicable, including migrating native `<input>`/`<select>` to Hero UI v3 `Input`/`Select`. Do not nest Hero UI `Button` inside `Dropdown.Trigger`; the trigger is already a React Aria button, so style `Dropdown.Trigger` with `buttonVariants` and `cn` from `@heroui/styles` when matching other ghost buttons. HeroUI v3 `@heroui/react` does not export `SelectItem`; use the project's `Select` pattern with `ListBox` / `ListBox.Item` (or equivalent documented API) instead; when dynamic options break `DropdownMenu` collection typing, a native `select` inside a styled shell is acceptable (e.g. NEXAFS edge filter). HeroUI `ButtonGroup` expects direct `Button` children; wrapping items in `Tooltip` or extra `span` layers can leak internal props (e.g. `__button_group_child`) to the DOM - use a vertical stack of consistently sized `Button`s with tooltips instead of nesting tooltips inside `ButtonGroup` when icon rails need alignment. In overflow-clipped or compact cards (e.g. NEXAFS browse rows), HeroUI `Tooltip` hover is unreliable; use HeroUI `Popover` on press with `border-border bg-surface` styling (aligned with profile menus) and `placement` toward the viewport interior (e.g. `left` for right-edge triggers) so overlays do not clip. For static name labels on avatars, a small portal hover like `AvatarWithTooltip` remains acceptable. HeroUI `ColorPicker` popovers (React Aria modal overlay) clash with Headless UI modal dialogs such as `SimpleDialog` (focus trap and inert siblings); use `HexColorSelector` from `~/components/ui/hex-color-selector` (native `input[type=color]`, preset grid, optional hex field) with shared presets in `~/lib/hex-color-presets`, and use `/sandbox/color-selector` to exercise the control outside admin flows.
- Prisma 7 in this repo: the CLI reads datasource URLs from root `prisma.config.ts` (explicit `.env` then `.env.local` loading); `schema.prisma` keeps provider/schemas without inline URLs; runtime `PrismaClient` uses `@prisma/adapter-pg` with pooled `DATABASE_URL` from validated env; import generated client and enums from `~/prisma/client` instead of `@prisma/client`. Bulk `bun update --latest` can jump Prisma major and break `postinstall` until pins or a migration land; avoid naive project-wide string replace of `@prisma/client` that also matches `@/…` paths.
- When using HeroUI Tabs with controlled selectedKey, defer parent setState from onSelectionChange (e.g. queueMicrotask) and pass stable callbacks (useCallback) to avoid React "Maximum update depth exceeded" from React Aria commit-phase updates; render each tab's content inside `Tabs.Panel` within the same `Tabs` tree per HeroUI anatomy, not only the tab list with content driven elsewhere.
- NEXAFS CSV/JSON upload and plot toolrails: treat header "mu" as absorption column; guard against undefined parsed.data and csvRawData (e.g. Array.isArray) before using .length. Hero UI `Table` needs at least one `Table.Column` with `isRowHeader={true}`; use the energy column when it is visible, otherwise the first visible column. Plot toolrails use HeroUI `Toolbar` with `isAttached` pill groups and `ButtonGroup` / `ToggleButtonGroup` / `Separator`; keep unrelated clusters separate (e.g. home and download separate from inspect, zoom, and pan; delta separate from OD, mu, and beta); prefer multiple attached toolbars over one outer border around unrelated groups. When a toolbar host layer covers the plot, use `pointer-events-none` on that wrapper and `pointer-events-auto` on grips and rail content so the SVG still receives hover, inspect, and drag events. Inside a `ToggleButtonGroup`, use segment-style corner rounding on first/last items (or shared plot-toolbar chrome classes), not `rounded-full` on every toggle, so the group reads as one connected control.
- NEXAFS multi-dataset UI: required molecule, instrument, and edge are selected via clickable segments in the tab title (modals); include an **experiment type** segment (TEY / PEY / FY / TRANS) with a modal and tooltips; basename **token 2** (after the edge token) reflects parsed technique - surface parse vs current selection; compact tab labels should show instrument short name only, not facility-qualified text; assignable manual peak kinds are only `pi-star` and `sigma-star`; legacy `peakKind` values can remain on stored peaks until the user picks a new kind.
- Facility contribute flow uses one UI: resolve the site with a ComboBox (existing or new), step tabs **Facility | Instruments**, optional instruments, and a single submit path; registered and draft instruments use HeroUI `Accordion` with `allowsMultipleExpanded` and `variant="surface"`; keep the primary facility search control visually distinct from the facility type Select (e.g. accent-weighted ComboBox vs secondary Select styling). Shared facility and instrument form building blocks, domain types, and related hooks live under `src/components/forms` and should be consumed via that module's barrel export.
- **Supabase migrate sync checklist:** Run `bun run db:migrate:run` (validates `DIRECT_URL`, then `prisma migrate deploy`) — never `prisma migrate` against transaction pooler `:6543` or `pgbouncer=true`. After Supabase dashboard or MCP DDL, run `scripts/supabase/grant-public-prisma-ownership.sql` and `scripts/supabase/grant-next-auth-prisma-permissions.sql` before retrying migrate (Postgres `42501` when `prisma` is not table owner). Use `bunx prisma migrate resolve --applied|--rolled-back <migration>` after fixing a failed `_prisma_migrations` row (P3009 blocked deploy). When migrations rename or drop columns (for example `show_name_on_pending_attributions` → `attribution_display_preferences`), grep `src/` and raw SQL for stale names in the same PR. Before merge, run `bunx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema` and `bunx prisma generate`; do not commit unreviewed `prisma db pull` output over hand-authored schema (duplicate relation fields break P1012). Vercel builds validate `src/env.js`; Preview deploys need Supabase env vars under legacy names (`SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, etc.)—map Marketplace keys manually; local `.env` does not inject Vercel build env.
- NEXAFS-specific UI components should live in the standalone `src/components/nexafs` library (for example via `nexafs-display.tsx`) rather than being owned by `src/components/browse`; browse pages should import from the NEXAFS library. When one person has multiple `experiment_contributors` rows, dedupe by ORCID with `dedupeNexafsContributorsByOrcid` from `~/lib/nexafs-contributors.ts` before `AvatarGroup` so React keys stay unique. Browse filter/toolbar rows use `sm:flex-wrap`, bounded search width (`sm:w-auto sm:max-w-md`), `shrink-0` triggers, and static category labels on compact filters (**Instrument**, **Edge**); expose full values in popovers, **Active filters** chips, and `aria-label`. Facilities browse is search-only with `facilities.list` / `facilities.search` and pagination below. `experiments.listEdges` orders Carbon, Nitrogen, and Sulfur K-edges first. For component-library extraction or polishing, use the `component-library-orchestrator` flow (`components`, `heroui`, `accessibility` subagents); centralize shared non-prop domain types in `types.ts` and export them from the library `index.ts` when needed. NEXAFS browse lists one card per canonical experiment; the grouped DTO exposes `experimentId` (`experiments.id`), and molecule links pass `?nexafsExperiment=<uuid>`. Legacy `experiment_group_id` / `experiment_group_slug` columns were removed after consolidation migrations. Polarization angles (theta, phi) on cards come from aggregating `spectrumpoints` (`polardeg` / `azimuthdeg`) across spectrum rows tied to that experiment. Molecule detail should reuse the same NEXAFS browse patterns scoped to that molecule's datasets (not the global catalog). Multi-trace plots sort polarizations by angle (low to high) before assigning sequential colors along the grey-to-red path; bare-atom overlays use the step-edge icon (stroke width 5) on analysis rails, omit bare-atom traces from the legend, and compare experimental beta to beta consistent with bare-atom mass absorption; bare-atom reference and difference traces are independent overlays—do not clear bare-atom overlay source points when difference spectra are enabled. Henke/CXRO per-element absorption is cached in `bareAtomCalculation.ts` (`getCachedAtomBareAbsorption`, `warmBareAtomCacheForFormula`) so parallel geometries share one fetch per symbol, not one per geometry. For δ view step-edge overlay, use a single **Bare atom delta** reference on the experimental `deltaPoints` energy axis (grey dashed, same styling as μ/β overlays), not one curve per geometry; do not clear overlay state while spectrum points are refetching. Tabulated δ comes from Henke/CXRO **f1** via `calculateBareAtomDelta` (per-element makima onto the plot grid, stoichiometry sum, kkcalc refractive prefactor at 1 g/cm³)—not experimental β→KK (`buildBareAtomReferenceCurve.ts` only maps precomputed δ samples). Other channels still compute bare-atom β per visible geometry via `filterSpectrumPointsForGroupedPlot` and `groupPointsByGeometry`. Grouped dataset tables label geometry with theta and phi and omit UUID and raw polarization name from default row chrome. Copy and download actions for dataset CSV should remain reachable from the collapsed experiment card when the UX provides them. Browse spectrum-rail download menu (`nexafs-spectrum-rail-csv-dropdown.tsx`) uses HeroUI `Accordion` for **By geometry**, **Experiment auxiliary files**, and **Sample auxiliary files**, plus **All data** (`.tar.gz` of all polarization CSVs with `experiment-aux/` and `sample-aux/` folders via `datasetAllDataBundle`); bundle CSV export sets `includeBareAtom: false` so Henke bare-atom delta failures do not block aux downloads. Until normalization-fit and extended per-channel quality scores are implemented end-to-end, prefer a single concise reader-facing **more metrics coming soon** treatment on dataset metric previews (including browse card popovers) and on the dataset-quality wiki rather than greyed placeholder modality rows; keep those placeholders out of headline metric counts so totals match shipped diagnostics only. NEXAFS browse cards use `NexafsPublicationVerificationControl` (`nexafs-publication-verification-control.tsx`): grey **Shield** when unverified, blue **BookOpen** (`text-blue-600` / `dark:text-blue-400`) for linked source publications, green **BadgeCheck** for Atlas team verification; when both tiers apply show icons side-by-side at equal size—never inline DOI chips on the compact card header. Source DOIs and Atlas status live only in the badge hover popover (+ hub for editors); read-only viewers with no atlas/source data and no edit rights see **No verification on record.** Home **Popular Molecules** uses `molecules.getTopFavorited` with lexicographic ranking: total experiment (dataset) count first, then `favorite_count`, then `view_count`, then `createdat`; keep Prisma includes aligned with browse listing (`samples` with `_count.experiments`, `moleculetags`, contributors, synonyms) so `toMoleculeView` supplies `experimentCount` for `MoleculeCard`. NEXAFS grouped browse (`experiments.browseList` / `browseSearch`) defaults to sort key **`favorites`** (molecule favorite count; other keys include views, polarization **geometry** count, linked **publication** count, name, newest). Legacy URLs may still carry `sort=engagement`; `parseSortParam` maps that to `favorites`. Legacy `sort=comments` maps to **publications** (linked DOI count). Raw SQL over Prisma-mapped tables must use real Postgres names/columns (e.g. `molecule_tags` with `molecule_id` / `tag_id`, not the Prisma client field names). Client pages that derive sort or filters from the URL should not initialize React state from `useSearchParams` in a `useState` lazy initializer on the first render; use identical server and client defaults, sync search params after mount (for example in `useLayoutEffect`), and defer data queries until that sync completes so sort controls and `aria-label` text hydrate consistently.
- `s3/MOLECULES/INDEX.json` is the molecule catalog; each molecule folder holds `METADATA.json` as the per-molecule measurement index and paired spectrum `*.json` / `*.csv`. Basenames use six underscore-separated tokens: edge (e.g. `C(K)`), experiment type (`TEY`, `FY`, etc.), facility, instrument, research group, then vendor or provenance; normalize vendor spelling to the approved mapping in `s3/README.md` on import. InChI strings in `MOLECULES/INDEX.json` may lack the `InChI=` prefix; prepend `InChI=` when querying PubChem or other chemistry APIs so lookups stay reliable.
- NEXAFS experiment persistence: experiments are keyed by UUID without the old composite unique on sample, edge, instrument, and dates; `measurementdate` and sample `preparationdate` were removed - browse uses `createdat` for upload timing; `experiments.createWithSpectrum` accepts `collectedByUserIds` and Prisma maps `collectedbyuserids` to Postgres `collected_by_user_ids` (TEXT[]). Attribution uses `experiment_contributors` with DB roles `owner` (uploader/creator) and `collector` (beamtime credit from `collectedByUserIds`/filename autofill)—not site `app_role` "Contributor" and not `molecule_contributors`. Post-upload edits (aux files, `sample_aux`, source-paper DOI) gate on `~/server/nexafs/experimentEditAuthz.ts` (`userMayEditExperiment`): claimed `owner` or `collector` for the session ORCID, privileged administrator/maintainer, or legacy `createdby` when no `owner` row; initial `contribute/nexafs` submit stays on contribute-write only. Source publications persist as multiple `experimentpublications` rows with `role = 'source'` (also upsert `experimentmetrics.originaldatadoi` for browse/API DOI filter); browse/API surface them via grouped DTO `sourcePublications`, not inline card chips. Atlas team verification stores maintainer flag on `experiments.validation_summary` (`ingestVerified` on browse DTO); `experiments.setAtlasTeamVerification` uses `contributeWriteProcedure` gated by `userMayManageAtlasTeamVerification` (administrator/maintainer lineage or `labs_access` permission—not `privilegedWriteProcedure` alone). Human slug `experiments.canonical_slug` is lowercase `<molecule_synonym>-<edge_atom>-<edge_state>-<kind_token>-<seq>` with `kind_token` in `tey`|`pey`|`fy`|`trans` from `nexafsexperimentkinds.token` (contribute dataset tabs). Aux metadata: `sample_aux`, `sample_file`, `experiment_file` plus Supabase buckets `sample-aux` and `experiment-aux` (`~/server/aux-file-contract.ts`, `sampleAux`/`sampleFile`/`experimentFile` routers). **Experiment aux authz:** browse uses public `experimentFile.listCommittedForBrowse` / `getCommittedDownloadUrlForBrowse` (`committedat` not null only); contributor `list` / `getDownloadUrl` require `userMayEditExperiment`. DataCite mapping for attribution UI lives in `~/server/nexafs/experimentContributorRoles.ts` (`owner`→DataCurator/uploaded_by, `collector`→DataCollector/collected_by); contribute tab ORCID attribution should follow those contributor types for future export. Post-upload, session users who are experiment `owner` or `collector` (or admin/maintainer) edit attribution through the contribute **Contributions** ORCID editor (`dataset-attribution-editor`); saved **attribution teams** (`prisma/schema/attribution-teams.prisma`, migrations `20260603120000_attribution_teams`, `20260603130000_attribution_team_metadata`) are owner rosters at `/account/teams` (`attributionTeams` router lists only teams the session user **owns or is rostered on**, not a global catalog; edit/delete remain owner-only) with institution, research group name, `group_type` (`beamtime`|`working`), dedicated **Supervisor** and **Lead experimenter** (`ProjectLeader`) ORCID slots (`~/lib/attribution-team-roster-sync.ts`—UI labels **Supervisor** and **Lead experimenter**, not “PI”); applying a team merges roster rows without replacing unrelated attributions and keeps the session uploader as `DataCurator` (apply-team popover must stay open on mouse pick—use nested-overlay handling on the attribution editor). Molecule/dataset edit flows should reuse that editor when the user is already on the attribution list. Dataset attribution **claiming** (`experiment_contributors.claim_status`, migration `20260603160000_dataset_attribution_claiming`): new rows default **pending** and render **ORCID-only** until the attributed user accepts at `/account/attributions/pending` (decline leaves ORCID; unclaim detaches profile); accept shows name/avatar per `~/lib/dataset-attribution-claim.ts` and browse SQL in `nexafsBrowseGroups.ts`. User prefs on that page use an accordion with per-state display modes (pending / accepted / unclaimed) and `auto_accept_mode` (`off`|`all`, default **off** for everyone); **administrator/maintainer** lineage only locks pending display to name+avatar (`pendingDisplayManagedByRole`), not auto-accept. Spectrum points store `energyev` and `rawabs` from upload; optional per-point `i0`, `od`, `massabsorption`, `beta`, and `delta` from the client merge with server-derived values, with finite upload values taking precedence. Read-only browse and molecule-detail dataset views must render stored `spectrumpoints` fields as persisted without applying additional normalization or post-upload reprocessing beyond what the contributor applied at ingest. Normalization metadata on spectrum rows is nullable by design: optional pre-edge and post-edge energy windows capture contributor-supplied ranges used when (re)normalizing in-app; absent/`null` windows mean the trace was already normalized before upload (legacy path). Ingest records which absorption representation the uploaded primary trace uses among optical density, mass absorption, and beta; contributors may supply one unified window pair or separate windows per channel when applicable—optical-density workflows target flat pre/post plateaus, whereas mass absorption and beta tie pre/post selections to bare-atom-shaped references, so treat OD versus mu/beta transforms as policy-defined rather than blindly bijective. When uploads omit per-point uncertainty (`sigma`), do not fabricate error bars; persist missing uncertainty as unset/`null` explicitly. Optional client-side Kramers-Kronig δ-from-β (`src/features/kk-calc`, numerical lineage from kkcalc / Ben Watts) runs in the browser when contributors opt in at upload or when authorized users trigger dataset recalculate; prompt once per browser tab session (consent flag in `sessionStorage`) before heavy passes; production β→δ uses `computeDeltaFromBetaKkcalcStyle` (kkcalc2 KK_PP / ASP plus Henke tail extension), not the legacy hand-rolled discrete kernel in `kk-discrete-henke.ts`; LBL CXRO `.nff` URLs and parsing live in `~/lib/henke-nff-cxro.ts` and must stay aligned across server bare-atom absorption, KK Henke bundles, and the atomic-form-factor route; align KK output onto the persisted spectrum energy samples with makima (`alignKkDeltaToSpectrumEnergyAxis`) when internal KK grids differ so δ shares the same `energyev` axis as other channels. Guard Henke-merge / makima endpoint degeneracy when normalization windows are missing or edges coincide with the first or last sample (same fallback semantics as the legacy no-window path) so KK does not throw on equal merge endpoints. `experiments.kk_delta_metadata` (JSON) records δ provenance (`source`: `uploaded_column`, `kk_at_upload`, or `kk_browser_recalculate`; `calculatedAt`; optional `calculatedByUserId`; `engineLabel`); helpers live in `~/server/nexafs/kkDeltaMetadata.ts`; run `bun run db:backfill-kk-delta-metadata` once for legacy experiments that already have per-point `delta`. Browse KK recalc reads/writes spectrumpoints through a **10k row client cap**—metadata documents that recalc may be partial above that limit until a server-orchestrated path exists. GitHub issue **#80** tracks storing full raw upload channels alongside Atlas-processed canonical views. Cross-language regression checks against Python kkcalc2 live under `tests/kk-calc-validation/`, comparing **delta to delta** after kkcalc’s **f1-to-delta** step per kkcalc v2 `models/factors.py` (delta from beta and the ASF ratio on a shared energy grid), not scattering-factor f1 alone; treat exported fixture CSVs there (for example `nexafs-experiment-30539a6a-pol-86906b55-th55-ph0.csv`) as the SSOT snapshot of persisted TS-engine outputs when diffing against kkcalc2 recomputed from the beta column; optional `tests/kk-calc-validation/plot_kk_compare.py` overlays TypeScript vs kkcalc delta per polarization with residual rows.
- Molecule routes and lookups: store and query slugified names on `moleculesynonyms` (`slug`); resolve detail pages via `molecules.getBySlug` with the same slugify rules as URLs; URLs may use slug or legacy UUID (`layout` accepts both). Preserve human-readable and scientific names in data while the slug is canonical for links. If multiple molecules share the same slug, return NOT_FOUND and surface candidate molecules for disambiguation. **Molecule credit** is only `molecule_contributors.contribution_type` **`linked`** (brought the molecule into Atlas) or **`edited`** (changed molecule metadata)—migration `20260603140000_molecule_contributor_linked_edited`; do not revive legacy creator/contributor/editor labels in UI. Supabase Realtime for favorites uses the stable entity UUID in channel names (not slug). Shared client logic lives in `useRealtimeFavoriteEntity`: subscribe to both the per-entity favorites table and the aggregate row (e.g. `molecules.favorite_count`); on `CHANNEL_ERROR`, `TIMED_OUT`, or `CLOSED`, reconnect with bounded exponential backoff instead of permanently degrading to a single-stream fallback. Favorite toggles should apply the mutation response immediately for heart state and count, with realtime as eventual consistency. For correct header dataset counts on molecule detail, `molecules.getById` and the single-molecule branch of `getBySlug` must include `samples` with `_count.experiments` (same shape browse listing uses) so `toMoleculeView` can sum experiments. Structure depiction is SVG-first (`MoleculeImageSVG` rejects raster) for theme recoloring; keep canonical SVG at object-storage URLs; planned sketcher work generates SVG in-app, warns when drawn graphs diverge from tabulated or PubChem SMILES, and moves away from ad-hoc raster or hand-uploaded images.
- Wiki docs (`/wiki/*`): nested breadcrumbs use `wikiDocBreadcrumbTrail` in `wiki-doc-nav` so subsection routes (for example API OpenAPI and v1 pages) show as trails under the parent topic. Wiki shell Copy Page targets `[data-wiki-main]` (rendered article HTML) and uses the stacked-squares (`Square2Stack`) copy affordance consistent with other duplicate-style controls. New public HTTP surfaces favor `/api/v1` with thin route wrappers around shared handler modules where legacy paths remain (for example molecule search); document auth visibility and semantics in wiki API pages and keep behavior aligned with OpenAPI-oriented specs. When adding nested topics under **Platform features** (or similar grouped wiki hubs), update `wiki-doc-nav` and the header wiki menu so children render as a proper nested tree or disclosure pattern instead of a flat link list that drops intermediate sections. Under **Data representation**, ship sibling pages such as `/wiki/data-representation/input-spectroscopy` and `/wiki/data-representation/optical-constants`, keep `wiki-doc-nav` and the header About disclosure in sync with those children, and rely on redirects from retired URLs (for example `/wiki/data-representation/kramers-kronig-delta` to optical constants) instead of breaking bookmarks. Reader-facing copy on those pages should state that in-app KK follows Ben Watts / kkcalc lineage and uses makima interpolation to the uploaded spectrum energy samples.
- Dashboard STXM integration (`feat/dashboard-stxm-5322`): routes `/dashboard` (instrument connector catalog) and `/dashboard/instruments/[slug]` (beamline workspace; ALS 5.3.2.2 is `als-5322` beta). **`src/app/dashboard/layout.tsx`** breaks out of root `max-w-7xl` for a full-width dashboard shell on all nested routes. Feature UI lives in `src/features/dashboard/`; browser STXM numerics and parsers in `src/lib/stxm/`; shared plot shell via `DatasetVisualizationShell` and `VisualizationToggle` (graph/table only for STXM); shared layout dimensions in `src/features/dashboard/instrument-workspace/stxm-ingestion-layout.ts` (leaf module—region editor and plot panel must not cross-import); STXM raw channels use unified **`PlotDataViewRail` Rw tray** (I₀, Iₜ, Iₑ, Rw, 01, μ) with Signal/1/s/log transform, multi-select raw channels, and split stacking when multiple traces or linked β/δ; phased plans in `docs/dashboard-stxm-integration-plan.md` and `docs/dashboard-stxm-nexafs-parity-plan.md`. Experiment catalog writes checkpoint **`.xray-atlas-stxm-catalog.json`** per experiment folder; **`useExperimentCatalogLoad`** aborts in-flight catalog builds on folder switch; file browser is **line-scan-first** (image/focus scans in collapsed accordions). **Lazy hdr classification** via `probeHdrScanFromText` (first **4096 B** peek for `Type`); line scans classify and render first; full axis parse and non-line-scan thumbnails deferred. **Beamtime folder discovery** uses `listBeamtimeExperimentFolders`: when any child matches dated beamtime naming, **list all visible sibling directories** (standalone stxm parity), with broader date tokens and `.hdr`-child fallback via `resolveDirectoryLayout`. Local beamtime catalog builds hdr metadata first with async thumbnails; dedupe recent folders by display name. ALS BL5321 layout: beamline root folders contain month-named experiment subfolders. **Session persistence** per `scanId`: `regionsCache` for sample/izero bounds and film **normalization windows**; molecule via `resolveMoleculeMetadataForScan`; preview auto-cache in `sync-stxm-preview-cache.ts` with downsampled `regionSpectraCache` on reduce/keep-in-cache. **Preview spectra** compare hub (`stxm-preview-compare-view`, `stxm-preview-styled-traces`, selection panel) reuses plot-viewer style encodings and legend—not shareable URL state yet. **Dashboard plot viewer** at `/dashboard/plot` is the **unified catalog analysis canvas** for overlaying published NEXAFS datasets—distinct from STXM ingestion. Plot column uses tall viewport height with **`PlotContainer fillContainer`** (no forced 640px min-height floor). Code in `src/features/dashboard/plot-viewer/` with **shareable URL state** in `plot-viewer-url-state.ts` / `use-plot-viewer-url-state.ts`: `q`, `datasets`, `channel`, facet keys, `geom`, descriptor columns `desc`, style encodings `colorBy` / `lineBy` / `markerBy`, `legendPlacement` (`inplot` | `panel`), pop-out `legendDock` (`top` | `bottom` | `left` | `right`), and hidden traces `hidden`. Left **faceted checkbox picker** via `experiments.browseList`, `browseSearch`, and `facetCounts`; default scroll shows **Favorites** (Atlas experiment favorites only—no session pins); **Results** appear only after search or facet engagement (`plot-viewer-catalog-filter.ts`). **`geometry-selection.ts`** merges all geometry keys when a dataset is added until the user narrows. **Style mapping** maps dimensions to color, line style, and markers with per-experiment and per-trace overrides; experiment **fixed color** uses an Igor-inspired preset grid (`plot-viewer-fixed-color-panel.tsx`), not `HexColorSelector`. **Legend**: N-column descriptor rows with marker-aware swatches—in-plot overlay or pop-out docked panel with collapsible full-height vertical strip (`PlotViewerPopoutLegend`), not a sticky table above the plot. Reuses **`SpectrumPlot`** (`plotContext: explore`); **trayable/collapsible** left panel; high-contrast checkboxes (`plot-viewer-checkbox.tsx`); **subplot toggle** for θ/φ small multiples (`traceStackSplitView`, `TraceStackSplitSpectrumBody`). **Instrument connector registry** (`src/features/dashboard/connectors/`): `listDashboardConnectorsFromDb` emits one paginated card per `instruments` row (default page size 9), overlaying `matchInstrumentToDashboardBinding` slug/description/readiness (`beta`|`ready`|`not_ready`); unmatched instruments stay **Coming soon**. Cards link **View instrument** to `/facilities/{facilitySlug}#instrument-{instrumentId}` and workspace routes via `dashboardInstrumentWorkspaceHref`. Facility instrument pages render `InstrumentConnectorClaimSection` with GitHub issue templates `.github/ISSUE_TEMPLATE/beamline-claim.yml` and `instrument-connector-request.yml` (`~/lib/github-beamline-issues.ts`).
- **Facilities, stewards, and browse icons** (`feat/dashboard-stxm-5322`): public detail at `/facilities/[slug]` (`~/lib/facility-slug.ts`, `~/lib/facility-route.ts`); acronym aliases (`als`, `nslsii`, `ansto`) in `~/lib/facility-slug-aliases.ts` resolve before slug matching and **redirect** to the canonical slug in `src/app/facilities/[slug]/layout.tsx`; legacy UUID or other non-canonical slug segments use the same redirect. Browse cards use `facilityDetailHrefFromName`. **Beamline scientist** stewards persist on `instrument_steward` (migrations `20260608120000_instrument_steward`, `20260608140000_instrument_steward_multi`); UI copy is **beamline scientist** (not site `app_role` Contributor). Multi-select add in `AddBeamlineScientistForm` with optimistic cache merge in `~/lib/instrument-steward.ts`; authz in `~/server/instruments/instrument-steward-authz.ts`. **Facility website and favicon**: `facilities.websiteurl` / `faviconurl` (migration `20260608160000_facility_website_favicon`); `facilities.updateWebsite` and `facilities.refreshFavicon` use **`manageUsersProcedure`** (user-directory permission, **not** `adminProcedure` or passkey). Server favicon resolution in `~/server/utils/resolve-facility-favicon.ts` probes HTML `<link rel="icon">`, `/favicon.ico`, then Google hostname service with bounded safe fetches. Client **`FacilityIcon`** (`~/components/facilities/facility-icon.tsx`) shows cached favicon with **building glyph fallback** on missing URL or load error; sizes `sm`|`md`|`lg`. Admin editor `FacilityWebsiteAdminCard`; public header website link opens a **new tab** with `rel="noopener noreferrer"`. Browse facility cards pass `faviconUrl` from list/search DTOs.
- NEXAFS experiment persistence: experiments are keyed by UUID without the old composite unique on sample, edge, instrument, and dates; `measurementdate` and sample `preparationdate` were removed - browse uses `createdat` for upload timing; `experiments.createWithSpectrum` accepts `collectedByUserIds` and Prisma maps `collectedbyuserids` to Postgres `collected_by_user_ids` (TEXT[]). Spectrum points store `energyev` and `rawabs` from upload; optional per-point `i0`, `od`, `massabsorption`, and `beta` from the client merge with server-derived values, with finite upload values taking precedence. Read-only browse and molecule-detail dataset views must render stored `spectrumpoints` fields as persisted without applying additional normalization or post-upload reprocessing beyond what the contributor applied at ingest.
- Molecule routes and lookups: store and query slugified names on `moleculesynonyms` (`slug`); resolve detail pages via `molecules.getBySlug` with the same slugify rules as URLs; URLs may use slug or legacy UUID (`layout` accepts both). Preserve human-readable and scientific names in data while the slug is canonical for links. If multiple molecules share the same slug, return NOT_FOUND and surface candidate molecules for disambiguation. Supabase Realtime for favorites uses the stable entity UUID in channel names (not slug). Shared client logic lives in `useRealtimeFavoriteEntity`: subscribe to both the per-entity favorites table and the aggregate row (e.g. `molecules.favorite_count`); on `CHANNEL_ERROR`, `TIMED_OUT`, or `CLOSED`, reconnect with bounded exponential backoff instead of permanently degrading to a single-stream fallback. Favorite toggles should apply the mutation response immediately for heart state and count, with realtime as eventual consistency. For correct header dataset counts on molecule detail, `molecules.getById` and the single-molecule branch of `getBySlug` must include `samples` with `_count.experiments` (same shape browse listing uses) so `toMoleculeView` can sum experiments. Structure depiction is SVG-first (`MoleculeImageSVG` rejects raster); keep canonical SVG at object-storage URLs. The molecule sketcher lab (`src/features/molecule-sketcher`, `/sandbox/molecule-structure`) generates depiction SVG in-app using client-side framing and helpers aligned with `docs/molecule-sketcher-pipeline-plan.md`; warn when drawn graphs diverge from tabulated or PubChem SMILES and avoid ad-hoc raster or hand-uploaded images.
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
