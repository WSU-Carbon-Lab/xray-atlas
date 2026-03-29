# Molecules slug + breadcrumb implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/molecules/<uuid>` routing with `/molecules/<canonical-slug>` while keeping UUIDs for internal state, add breadcrumb navigation, support lookup by any synonym slug, and render a deterministic slug-collision page with candidate molecule links.

**Architecture:** Add a slug column + index for `moleculesynonyms`, backfill it, and introduce a `molecules.getBySlug` TRPC query. Update the molecules detail App Router layout to resolve by slug (with UUID fallback for existing links) and render either molecule content, collision UI, or existing not-found behavior. Centralize slugification in a shared utility used by link builders.

**Tech Stack:** Next.js App Router, tRPC, Prisma/Postgres, Bun, Tailwind, HeroUI (where already used).

---

## File map (create/modify)

**Backend**
- Modify: `prisma/schema.prisma` (add `moleculesynonyms.slug`)
- Create: `prisma/migrations/<timestamp>_moleculesynonyms_slug/migration.sql`
- Modify: `src/server/api/routers/molecules.ts` (add `getBySlug`)

**Shared**
- Create: `src/lib/molecule-slug.ts` (canonical slugify + helpers)

**Frontend (routing + UI)**
- Modify: `src/app/molecules/[id]/layout.tsx` (resolve by slug; UUID fallback; collision UI rendering)
- Modify: `src/components/browse/molecule-detail-layout-client.tsx` (breadcrumbs)
- Modify: `src/app/molecules/[id]/loading.tsx` (breadcrumbs skeleton)
- Modify: `src/components/molecules/molecule-display.tsx` (links use canonical slug)
- Modify: `src/components/molecules/molecule-search.tsx` (router.push uses canonical slug)
- Modify: `src/app/browse/nexafs/page.tsx` (row href uses canonical slug)
- Modify: `src/app/(home)/page.tsx` (router.push uses canonical slug)

## Task 1: Shared canonical slug utilities

**Files:**
- Create: `src/lib/molecule-slug.ts`
- Modify: `src/components/molecules/molecule-display.tsx` (import + use)
- Modify: `src/components/molecules/molecule-search.tsx` (import + use)
- Modify: `src/app/browse/nexafs/page.tsx` (import + use)
- Modify: `src/app/(home)/page.tsx` (import + use)

- [ ] **Step 1: Add canonical slugify helper**

Create `src/lib/molecule-slug.ts`:
- `slugifyMoleculeSynonym(name: string): string` implementing:
  - `trim()`, `toLowerCase()`
  - `.replace(/[^a-z0-9]+/g, "-")`
  - `.replace(/^-|-$/g, "")`
  - fallback to `"molecule"` if result is empty
- `canonicalMoleculeSlugFromView(m: { name: string; commonName?: string[]; iupacName: string }): string`
  - choose primary synonym string as `m.name` (already derived from order=0 in `toMoleculeView`)
  - fallback to first `commonName`, else `iupacName`
  - return `slugifyMoleculeSynonym(...)`

- [ ] **Step 2: Update molecule links to use canonical slug**

Update all places currently pushing/linking to `/molecules/${molecule.id}` to use `/molecules/${canonicalSlug}` instead, where canonicalSlug is computed from the molecule view object being rendered.

- [ ] **Step 3: Verify TypeScript build**

Run:
- `bun run lint`
- `bun run typecheck` (or repo equivalent)

- [ ] **Step 4: Commit**

Commit message:
- `feat: add canonical molecule slug helpers`

## Task 2: Backend migration + TRPC resolver (delegate to backend-manager)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/.../migration.sql`
- Modify: `src/server/api/routers/molecules.ts`

- [ ] **Step 1: Add `slug` column to `moleculesynonyms`**

Prisma model `moleculesynonyms`:
- add `slug String?` (nullable for rollout), with `@@index([slug])`

- [ ] **Step 2: Migration SQL**

Migration should:
- add column `slug` (text) nullable
- backfill:
  - `lower(trim(synonym))` then regex replace non `[a-z0-9]` runs with `-`, then trim `-`
  - set to `'molecule'` if empty result
- add index on `slug`
- optionally set `slug` to NOT NULL after backfill (if safe)

- [ ] **Step 3: Add TRPC `molecules.getBySlug`**

Add query `getBySlug` that:
- normalizes the input slug using the same algorithm used in TS (`slugifyMoleculeSynonym`)
- queries `moleculesynonyms` for matching `slug`
- dedupes to distinct molecule IDs
- if 0: throw `NOT_FOUND`
- if 1: return `toMoleculeView(...)` for that molecule (same include as `getById`)
- if >1: return a structured collision result:
  - `kind: "slug_collision"`
  - `slug: normalizedSlug`
  - `candidates: Array<{ id: string; name: string; iupacName: string; slug: string }>` sorted by `slug` asc then `id` asc

- [ ] **Step 4: Add backwards-compatible UUID support**

During route resolution, we must support old shared links:
- if the incoming param is a UUID, resolve via existing `getById`
- else resolve via `getBySlug`

- [ ] **Step 5: Commit**

Commit message:
- `feat: add moleculesynonyms slug and getBySlug resolver`

## Task 3: App Router layout resolution + collision UI

**Files:**
- Modify: `src/app/molecules/[id]/layout.tsx`
- Modify: `src/app/molecules/[id]/not-found.tsx` (optional: keep generic; collision UI rendered from layout)
- Create: `src/app/molecules/[id]/slug-collision.tsx` (or co-located component) (server-safe)

- [ ] **Step 1: Update layout param typing**

Keep `params: Promise<{ id: string }>` but interpret as `routeId`.

- [ ] **Step 2: Resolve molecule by UUID-or-slug**

Algorithm:
- `routeId = (await params).id`
- if UUID: `api.molecules.getById({ id: routeId })`
- else:
  - call `api.molecules.getBySlug({ slug: routeId })`
  - if `kind === "slug_collision"`: render collision UI (do NOT call `notFound()`)
  - else render `MoleculeDetailLayoutClient` with:
    - `molecule={resolvedMolecule}`
    - `moleculeId={resolvedMolecule.id}` (UUID, not the route slug)

- [ ] **Step 3: Collision UI**

Render a 404-like state with:
- title: `Molecule name collision`
- message including attempted slug
- list of candidate links to `/molecules/<candidateSlug>`
- secondary link to `/browse/molecules`

- [ ] **Step 4: Verify molecule detail page still works**

Smoke checks:
- Add NEXAFS card still links with UUID query param (`moleculeId=<uuid>`)
- view tracking still uses UUID (mutation uses `molecule.id`)

- [ ] **Step 5: Commit**

Commit message:
- `feat: resolve molecules by slug with collision page`

## Task 4: Breadcrumbs (Home -> Molecule)

**Files:**
- Modify: `src/components/browse/molecule-detail-layout-client.tsx`
- Modify: `src/app/molecules/[id]/loading.tsx`

- [ ] **Step 1: Replace “Back to Home” link with breadcrumb nav**

In `MoleculeDetailLayoutClient` header area:
- `nav aria-label="Breadcrumb"`
- `Home` link to `/`
- separator
- current crumb label: `molecule.name`

- [ ] **Step 2: Update loading skeleton**

Replace the “Back to Home” link with a breadcrumb skeleton matching the new layout.

- [ ] **Step 3: Commit**

Commit message:
- `feat: add molecule breadcrumbs`

## Task 5: Verification

- [ ] **Step 1: Run lint + typecheck**

Run:
- `bun run lint`
- `bun run typecheck`

- [ ] **Step 2: Run Next build**

Run:
- `bun run build`

- [ ] **Step 3: Manual smoke in dev**

With `bun dev`:
- Navigate to molecule detail from:
  - home popular molecules
  - browse molecules list
  - browse NEXAFS experiment card
- Confirm URL uses slug, page loads, breadcrumbs show `Home / <molecule>`
- If you can create a collision (optional), confirm collision page shows candidate links
