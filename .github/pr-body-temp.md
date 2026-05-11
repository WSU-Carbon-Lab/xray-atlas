## Summary

Persists NEXAFS normalization metadata and optional per-point errors on experiments, splits Prisma into a multi-file schema layout, and adds `experiment_metrics` / `experiment_metrics_channel` with Supabase RLS aligned to catalog reads (select when parent experiment exists; no anon/authenticated writes).

## Changes

- Server and router support for normalization validation summary, per-point errors, and quality scores JSON on experiments (issue #75 contract).
- Prisma schema reorganized under `prisma/schema/` with `prisma.config.ts` datasource wiring.
- New tables: `experiment_metrics`, `experiment_metrics_channel`; follow-up migration for nullable channel metrics and four normalization window snapshot columns; RLS migration with FORCE RLS and public SELECT policies tied to `experiments`.
- `NEXAFS_NORMALIZATION_IMPLEMENTATION_PLAN.md` captures implementation notes.

## Test Plan

- [x] Tested locally (`prisma validate`, `prisma generate`, targeted tests where applicable)
- [ ] Tested OAuth flow (if auth changes)
- [ ] Tested on mobile (if UI changes)

## AI Role (required)

Choose one of the following and briefly justify it:

- [ ] Level 1: Mostly suggestions, tab completion, and minimal code generation
- [x] Level 2: Extensive code generation, but heavily managed; business and scientific logic was dictated by the contributor
- [ ] Level 3: Fully vibe coded; PRs using this level will likely be thrown away, but may contain nuggets a maintainer chooses to review

If you selected Level 2 or Level 3, include at least one sentence describing how you validated correctness (tests, types, manual verification, scientific sanity checks).

Validated with Prisma schema validation/generate, migration SQL review, and existing normalization metadata tests where touched; migrations applied on linked Supabase project for metrics/RLS DDL.

## Screenshots (if UI changes)

Before | After
--- | ---
n/a | n/a
