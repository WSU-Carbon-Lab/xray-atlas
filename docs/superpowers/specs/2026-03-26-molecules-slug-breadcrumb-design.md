## Summary
Update `molecules/[id]` to use a canonical, human-readable slug derived from the molecule's primary synonym, improve navigation with breadcrumbs, and add synonym-aware resolution so users can type a synonym and still find the molecule.

When the incoming slug collides across multiple molecules (slugification collision), the route must deterministically fail with a 404-like experience that includes candidate molecule links and guidance.

## Goals
1. Make molecule detail URLs more recognizable by using a slug instead of the molecule UUID.
2. Ensure navigation breadcrumbs reflect the molecule context (primary synonym label).
3. Allow lookup by any synonym (not only the primary synonym), while keeping the URL canonical and deterministic.
4. Deterministically handle slug collisions as a 404-like error that includes candidate molecule links and a suggestion to pick the correct molecule.

## Non-Goals
1. Changing how molecule names are displayed within the page (use existing molecule name from `MoleculeView`, which already prioritizes the primary synonym).
2. Changing tracking/contribution semantics that rely on `molecule.id` (UUID).

## Proposed Behavior
### Route param semantics
- The Next.js route remains `src/app/molecules/[id]/...`, but `[id]` will represent a canonical molecule slug rather than a UUID.
- The canonical slug is computed from the molecule's primary synonym:
  - primary synonym is the synonym row with `order = 0` from `moleculesynonyms` (fallback: the first synonym, then `iupacname`).
- The UUID `molecule.id` continues to be used for all internal contexts (tracking, mutations, and any URLs that require the UUID).

### Slug algorithm (deterministic)
Normalize a synonym name into a canonical slug:
1. `trim()`
2. lowercase
3. replace any run of characters not matching `[a-z0-9]` with `-`
4. remove leading/trailing `-`

Examples (informal):
- `Iron (III) oxide` -> `iron-iii-oxide`
- `C6H12O6` -> `c6h12o6`

### Backend synonym-aware resolution
To support “any synonym is allowed” efficiently and correctly:
1. Add a `slug` column to `moleculesynonyms`
2. Backfill existing rows using the same slug algorithm
3. Index `moleculesynonyms.slug` for fast exact-match lookup

New TRPC resolver `molecules.getBySlug({ slug })`:
1. Query `moleculesynonyms` where `slug = inputSlug`
2. Group matches by `moleculeid`
3. Load the full molecule(s) for rendering candidate links and/or the final selected result

Collision handling (deterministic)
- If exactly 1 distinct molecule matches: return that molecule as the resolved result.
- If more than 1 distinct molecule matches:
  - return a deterministic “slug collision” result containing:
    - the attempted normalized slug
    - candidate molecules (each with their canonical slug and UUID)
  - the Next.js server `layout.tsx` must render a dedicated collision component using those candidates
  - the collision UI must not rely on `notFound()` + `src/app/molecules/[id]/not-found.tsx`, because that path cannot consume the attempted slug and candidates

404-like behavior UI
- Use the existing `MoleculeNotFound` pattern/components where possible, but render the collision state from `src/app/molecules/[id]/layout.tsx` with:
  - attempted normalized slug
  - candidate molecule links to `/molecules/<candidateSlug>`
  - instruction that the provided synonym maps to multiple molecules due to canonical slug collision

### Breadcrumb behavior
Update “Back to Home” in `src/components/browse/molecule-detail-layout-client.tsx` and `src/app/molecules/[id]/loading.tsx`:
1. Replace with breadcrumb nav:
   - `Home` -> `/`
   - separator
   - current crumb label -> molecule primary synonym label (i.e., `molecule.name`)
2. Preserve the existing visual style for link text (smaller muted text).

### Canonical slug display
- Breadcrumb should show the human-friendly molecule name (existing `molecule.name`).
- The canonical slug should only be used in URLs, not as the primary breadcrumb label.

## Acceptance Criteria
1. Visiting `/molecules/<primarySynonymSlug>` loads the correct molecule detail page.
2. Visiting `/molecules/<synonymSlug>` where the synonym is not primary still loads the molecule detail page.
3. Breadcrumb shows `Home` and the molecule name (primary synonym label).
4. If a slug collision occurs, the page shows a 404-like state that includes candidate links and guidance.

## Implementation Notes / Dependencies
1. Migration must be small and safe:
   - add nullable `slug` column initially if required by current migration approach
   - backfill in a single update
   - add index after backfill
2. The slug algorithm used in SQL and TRPC must be identical to avoid lookup mismatches.
3. Update all internal molecule links (`href="/molecules/<...>"`) to use canonical slug generation.
4. Keep UUID usage in internal contexts (`molecule.id`) for tracking, analytics, and mutations.

### Deterministic normalization + ordering requirements
- The incoming route param must be normalized with the same slug algorithm used for storage (trim/lower/regex replacement). Normalization must happen before performing the slug exact-match lookup.
- Collision candidate ordering must be stable:
  - primary sort: canonical slug asc
  - secondary sort: molecule UUID asc

### Degenerate slug outputs
- If slugification would produce an empty string, use a constant fallback (e.g. `molecule`) so stored slugs and lookup behavior remain deterministic.
