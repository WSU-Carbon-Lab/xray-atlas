# Molecule vendor assignment (S3 backlog)

Generated from `s3/MOLECULES/*/METADATA.json` `source` and spectrum file basename token 6. Canonical names match `s3/README.md` **Approved vendor normalization set**.

| Molecule folder | Raw `source` (METADATA) | Raw filename vendor segment | Canonical vendor(s) | Notes |
|---|---|---|---|---|
| D18 | `Wei-You-Group` | `Wei-You-Group` | `Wei You Group` | — |
| ITIC | `1-Material` | `1-Material` | `1-Material` | — |
| N2200 | `1-Material` | `1-Material` | `1-Material` | — |
| P3HT | `Wei-You-Group` | `Wei-You-Group` | `Wei You Group` | — |
| PBDB-T | `Sigma-Aldrich` | `Sigma Aldrich`, `Sigma-Aldrich` | `Sigma-Aldrich` | — |
| PBTTT | `1-Material` | `1-Material` | `1-Material` | — |
| PC61BM | `Nano-C-nanostructured-carbon` | `Nano-C-nanostructured-carbon` | `Nano-C, Inc.` | — |
| PC71BM | `Nano-C-nanostructured-carbon` | `Nano-C-nanostructured-carbon` | `Nano-C, Inc.` | — |
| Y11 | `1-Material` | `1-Material` | `1-Material` | — |
| Y6 | `1-Material` | `1-Material` | `1-Material` | — |

## Standalone vendor upserts (Prisma)

The `vendors` table only stores `name` (required, unique) and optional `url`. Rows do not require samples. After approval, upsert the canonical backlog vendors with Prisma (idempotent on `name`):

```bash
bun run db:upsert:backlog-vendors
```

Implementation: `scripts/upsert-backlog-vendors.ts` uses `prisma.vendors.upsert` for each canonical `name` and sets `url` on create and update. Link `samples.vendorid` only when creating samples.
