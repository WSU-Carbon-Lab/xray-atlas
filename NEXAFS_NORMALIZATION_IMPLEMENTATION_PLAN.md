# NEXAFS Multi-Channel Normalization Implementation Plan

## Goal
Implement a FAIR-aligned, minimally invasive ingestion and retrieval contract for NEXAFS datasets that supports multi-channel uploads (`od`, `massabsorption`, `beta`), optional normalization ranges, explicit provenance, bypassable validation, and quality metrics.

## Scope
- In scope:
  - Upload contract expansion for channels, errors, normalization ranges, and validation override behavior.
  - Minimal Prisma schema additions for normalization metadata, per-channel error values, provenance, validation summary, and quality scores.
  - tRPC procedure updates for ingestion, retrieval metadata, and uploader corrections.
  - UI flow updates for upload validation, remediation prompts, and provenance-aware feedback.
  - Quality metric computation and persisted score summary.
- Out of scope:
  - Full normalization history/version table.
  - Large refactors to browse architecture.
  - Replacing existing peak workflows.

## Fixed Product Decisions
1. Missing sigma/error bars are kept as `null`; no inferred errors are generated.
2. Validation remains basic and bypassable.
3. If pre/post ranges exist, use range/window checks; otherwise use single-point checks.
4. Point spacing metric direction is smaller-is-better.
5. SNR metric direction is higher-is-better.
6. Retrieval payload includes normalization/provenance metadata for reproducibility.
7. No dedicated normalization-version history table; range values plus provenance fields act as versioning surface.

## Data Model Changes

## Prisma: `experiments`
Add fields to store uploader reference normalization metadata and dataset-level derived summaries.

- `normalization_scope` (enum-like string): `unified` | `per_channel` | `none`
- `normalization_ranges` (JSON, nullable)
  - shape:
    - unified: `{ pre: [number, number] | null, post: [number, number] | null }`
    - per-channel: `{ od: {pre,post}, massabsorption: {pre,post}, beta: {pre,post} }`
- `uploaded_channels` (JSON or string[], nullable)
  - values subset: `rawabs`, `od`, `massabsorption`, `beta`
- `channel_provenance` (JSON, nullable)
  - status per channel: `uploaded_authoritative` | `derived` | `derived_with_assumptions` | `missing`
- `validation_summary` (JSON, nullable)
  - pass/warn/fail flags and bypass markers
- `quality_scores` (JSON, nullable)
  - per-channel scores + combined dataset score

Notes:
- Keep existing `spectrumpoints.od`, `spectrumpoints.massabsorption`, `spectrumpoints.beta`, and `rawabs`.
- Preserve existing ownership and update authorization behavior.

## Prisma: `spectrumpoints`
Add optional per-channel error columns:
- `rawabserr` (Float?)
- `oderr` (Float?)
- `massabsorptionerr` (Float?)
- `betaerr` (Float?)

All nullable. No automatic synthesis.

## Migration Strategy
1. Add nullable columns only; no destructive changes.
2. Backfill `uploaded_channels` and `channel_provenance` conservatively for legacy experiments:
   - infer from existing non-null columns.
   - if uncertain, mark channels as `missing` or `derived` with minimal assumptions.
3. Leave `normalization_ranges` null for legacy rows unless confidently known.

## API Contract Changes

## `experiments.createWithSpectrum` input expansion
Add optional normalized metadata and error fields while retaining compatibility.

- `spectrum.points[]` additions:
  - `rawabsError?: number`
  - `odError?: number`
  - `massabsorptionError?: number`
  - `betaError?: number`
- `experiment.normalization` (optional):
  - `scope: "none" | "unified" | "per_channel"`
  - `ranges` matching scope
- `experiment.uploadedChannels` (optional explicit declaration)
- `experiment.validationOverride` (optional):
  - `bypass: boolean`
  - `reason?: string`

Behavior:
1. Accept any subset of channels.
2. Persist provided errors directly; leave missing errors as `null`.
3. Run basic validation pipeline.
4. If warnings occur, allow override with explicit bypass flag.
5. Persist validation summary and provenance metadata.

## `experiments.getById` and browse payloads
Return normalization/provenance bundle:
- `normalization_scope`
- `normalization_ranges`
- `uploaded_channels`
- `channel_provenance`
- `validation_summary`
- `quality_scores`

## New mutation: `experiments.updateNormalizationMetadata`
Purpose: uploader/privileged correction of normalization ranges and metadata without full reupload.

Input:
- `experimentId`
- `normalization` block (`scope`, `ranges`)
- optional `reason`

Authorization:
- experiment creator or privileged role.

Behavior:
- update metadata fields.
- optional recompute of derived channels if caller requests it (`recomputeDerived?: boolean`).

## Validation and Remediation Rules

## OD checks
- If OD channel exists:
  - With ranges: compare OD to 0 target in pre range and 1 target in post range.
  - Without ranges: use one early-spectrum and one late-spectrum anchor point checks.
- Group geometry comparisons as configured by dataset geometry mapping.
- Use provided error envelopes when available; if errors are null, compute unweighted residual checks.

## Mass absorption checks
- If `massabsorption` exists:
  - With ranges: compare to bare-atom mu in pre/post ranges.
  - Without ranges: single early/late anchor checks against bare-atom mu.
- Use error envelope when present, otherwise unweighted residuals.

## Beta checks
- If both beta and mass absorption exist:
  - cross-compute expected beta from mu (or inverse) and compare.
  - if relative difference > 10%, emit warning and require remediation or override.
- If only one exists:
  - offer optional derivation of counterpart during upload.

## Missing-ranges behavior
- If no normalization ranges are provided:
  - run single-point basic checks only.
  - include warning in validation summary indicating reduced confidence.

## Bypass behavior
- Validation warnings/failures can be bypassed by uploader override.
- Persist `bypassed: true` and `reason`.

## Quality Metrics

Persist per-channel and total metrics in `experiments.quality_scores`.

Per-channel components:
1. `point_spacing_score` (smaller spacing is better)
2. `snr_score` (higher is better)
3. `doi_present` boolean
4. `normalization_ranges_present` boolean
5. `normalization_target_distance` (distance in error bars where applicable)

Rules:
- If DOI is present, missing ranges do not hard-penalize and can only provide positive boost when present.
- If ranges are absent, metric (5) is `null` and excluded from weighted aggregate.
- Store both raw component values and normalized aggregate score.

## Implementation Phases

## Phase 0: Contracts and types
Files:
- `src/features/process-nexafs/types.ts`
- `src/components/plots/types.ts` (if needed for error props)
- `src/server/api/routers/experiments.ts` (zod input/output contracts)

Tasks:
1. Add TS types for normalization scope/ranges/provenance/validation summary/quality score.
2. Extend upload schemas with per-point error fields and normalization metadata.
3. Ensure public exported types have TSDoc/JSDoc.

Done when:
- Typecheck passes.
- Existing upload callers compile with backward compatibility.

## Phase 1: Prisma schema and migration
Files:
- `prisma/schema/` (multi-file layout; experiment-related models live in `nexafs.prisma`)
- `prisma/migrations/<timestamp>_nexafs_normalization_metadata/migration.sql`

Tasks:
1. Add experiment metadata fields and spectrumpoint error columns.
2. Generate migration SQL.
3. Add conservative backfill SQL for `uploaded_channels`/`channel_provenance` when possible.

Done when:
- Prisma schema validates.
- Migration applies cleanly in local dev DB.

## Phase 2: Server ingestion and validation pipeline
Files:
- `src/server/api/routers/experiments.ts`
- `src/server/nexafs/computeSpectrumDerivedColumns.ts`
- `src/server/nexafs/*` (new small validation helpers as needed)

Tasks:
1. Persist error columns and normalization metadata from upload input.
2. Implement basic validation checks with range-aware and fallback single-point modes.
3. Implement bypass and remediation flags in persisted summary.
4. Set channel provenance states based on uploaded vs derived availability.

Done when:
- Upload endpoint returns persisted metadata.
- Validation summary returned and stored.
- No automatic sigma inference occurs.

## Phase 3: Retrieval payload and correction mutation
Files:
- `src/server/api/routers/experiments.ts`
- `src/server/api/routers/spectrumpoints.ts` (if shape extension required)

Tasks:
1. Add normalization/provenance/quality fields to read responses used by browse/detail.
2. Add `updateNormalizationMetadata` mutation with existing auth model.
3. Optional controlled derived recompute path.

Done when:
- Client can fetch provenance bundle per experiment.
- Uploader can update normalization metadata with auth checks.

## Phase 4: Upload UI remediation and warnings
Files:
- `src/features/process-nexafs/hooks/useNexafsSubmit.ts`
- `src/features/process-nexafs/ui/dataset-content.tsx`
- `src/features/process-nexafs/hooks/useNexafsDatasets.ts`

Tasks:
1. Add UI controls for normalization scope/ranges (unified or per-channel).
2. Add per-channel error-column mapping support.
3. Present validation warnings with bypass/override action.
4. Add optional mu<->beta derivation choice when only one is supplied.

Done when:
- User can complete upload with warnings and explicit bypass.
- Payload includes selected metadata and errors.

## Phase 5: Quality scoring and display
Files:
- `src/server/nexafs/*` (quality metric helper)
- `src/components/nexafs/nexafs-experiment-dataset-panel.tsx` (or related details view)

Tasks:
1. Compute per-channel quality components.
2. Persist aggregate and components in `quality_scores`.
3. Display concise score and breakdown in experiment detail surfaces.

Done when:
- Scores are visible and traceable to stored components.

## Test Plan

## Type/lint gates
- `bun run typecheck`
- `bun run lint`

## Unit tests
Add targeted tests for:
1. Validation behavior:
   - with ranges
   - without ranges fallback
   - with and without error envelopes
2. Mu/Beta cross-check threshold warning (`> 10%`).
3. Provenance state assignment.
4. Quality metric directionality (spacing lower better, SNR higher better).

Suggested locations:
- `src/server/nexafs/__tests__/...`
- `src/features/process-nexafs/utils/__tests__/...` (if client-side helpers are added)

## Integration tests
1. Upload dataset with OD only and no ranges -> basic checks + remediation prompt path.
2. Upload with mu+beta disagreement >10% -> warning + bypass workflow.
3. Fetch experiment -> includes normalization/provenance/quality metadata.

## Rollout and Backward Compatibility
- Keep new fields nullable.
- Preserve old client behavior when metadata absent.
- Treat missing metadata as legacy mode.

## Risks and Mitigations
1. Risk: Validation noise from sparse datasets.
   - Mitigation: keep checks basic, surface warnings, allow bypass.
2. Risk: Ambiguity in channel provenance for legacy rows.
   - Mitigation: conservative defaults and explicit legacy flag in validation summary.
3. Risk: Scope creep from versioning/history.
   - Mitigation: avoid history table; use metadata fields only.

## Definition of Done
1. Upload supports channels + per-channel errors + normalization metadata.
2. No sigma inference when errors missing.
3. Basic validation runs and is bypassable.
4. Provenance and normalization metadata are returned by fetch APIs.
5. Quality scores are persisted and exposed.
6. Lint and typecheck pass.
7. Issue #75 checklist is fully mapped to implemented behavior.
