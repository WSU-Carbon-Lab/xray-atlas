-- Dataset versioning, revisions, Zenodo versions and sync queue, named expiring CLI tokens.
-- Hand-written; apply with `bun run db:migrate:run` (DIRECT_URL, never the pooler).
-- After applying: run scripts/supabase/grant-public-prisma-ownership.sql and
-- scripts/supabase/grant-next-auth-prisma-permissions.sql if a later migrate fails with 42501
-- (new public tables must be owned by the `prisma` role), then `bunx prisma generate`.
SET lock_timeout = '2min';

-- 1. Dataset version columns on experiments (every existing row becomes 1.0.0).
ALTER TABLE "public"."experiments"
  ADD COLUMN IF NOT EXISTS "dataset_version_major" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "dataset_version_minor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "dataset_version_patch" INTEGER NOT NULL DEFAULT 0;

-- 2. Zenodo concept identifiers on the existing per-experiment deposit row.
ALTER TABLE "public"."experiment_zenodo_deposits"
  ADD COLUMN IF NOT EXISTS "concept_doi" VARCHAR(256),
  ADD COLUMN IF NOT EXISTS "concept_record_id" VARCHAR(32);

-- 3. Zenodo versions.
CREATE TABLE IF NOT EXISTS "public"."experiment_zenodo_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "experiment_id" UUID NOT NULL,
  "version_label" VARCHAR(32) NOT NULL,
  "doi" VARCHAR(256),
  "record_id" VARCHAR(32),
  "deposition_id" VARCHAR(32),
  "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
  "published_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "experiment_zenodo_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "experiment_zenodo_versions_status_check"
    CHECK ("status" IN ('pending', 'published', 'failed', 'unrecoverable')),
  CONSTRAINT "experiment_zenodo_versions_experiment_id_fkey"
    FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "experiment_zenodo_versions_experiment_label_key"
  ON "public"."experiment_zenodo_versions" ("experiment_id", "version_label");
CREATE INDEX IF NOT EXISTS "idx_experiment_zenodo_versions_experiment_id"
  ON "public"."experiment_zenodo_versions" ("experiment_id");

-- 4. Revisions.
CREATE TABLE IF NOT EXISTS "public"."experiment_revisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "experiment_id" UUID NOT NULL,
  "version_major" INTEGER NOT NULL,
  "version_minor" INTEGER NOT NULL,
  "version_patch" INTEGER NOT NULL,
  "actor_user_id" VARCHAR(19),
  "change_kind" VARCHAR(32) NOT NULL,
  "parameters" JSONB NOT NULL,
  "derived_checksum" VARCHAR(64) NOT NULL,
  "kk_delta" JSONB,
  "zenodo_version_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "experiment_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "experiment_revisions_change_kind_check"
    CHECK ("change_kind" IN ('baseline', 'normalization', 'kk_first_calculation',
                             'kk_recalculation', 'aux_added', 'aux_removed')),
  CONSTRAINT "experiment_revisions_experiment_id_fkey"
    FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "experiment_revisions_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "next_auth"."user"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "experiment_revisions_zenodo_version_id_fkey"
    FOREIGN KEY ("zenodo_version_id") REFERENCES "public"."experiment_zenodo_versions"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "experiment_revisions_experiment_version_key"
  ON "public"."experiment_revisions" ("experiment_id", "version_major", "version_minor", "version_patch");
CREATE INDEX IF NOT EXISTS "idx_experiment_revisions_experiment_created"
  ON "public"."experiment_revisions" ("experiment_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_experiment_revisions_zenodo_version_id"
  ON "public"."experiment_revisions" ("zenodo_version_id");

-- 5. Zenodo sync queue.
CREATE TABLE IF NOT EXISTS "public"."zenodo_sync_jobs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "experiment_id" UUID NOT NULL,
  "target_version_label" VARCHAR(32) NOT NULL,
  "mode" VARCHAR(16) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_error" TEXT,
  "status" VARCHAR(16) NOT NULL DEFAULT 'queued',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "zenodo_sync_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "zenodo_sync_jobs_mode_check" CHECK ("mode" IN ('files', 'metadata')),
  CONSTRAINT "zenodo_sync_jobs_status_check"
    CHECK ("status" IN ('queued', 'running', 'done', 'dead')),
  CONSTRAINT "zenodo_sync_jobs_experiment_id_fkey"
    FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "zenodo_sync_jobs_experiment_version_mode_key"
  ON "public"."zenodo_sync_jobs" ("experiment_id", "target_version_label", "mode");
CREATE INDEX IF NOT EXISTS "idx_zenodo_sync_jobs_status_next_attempt"
  ON "public"."zenodo_sync_jobs" ("status", "next_attempt_at");
CREATE INDEX IF NOT EXISTS "idx_zenodo_sync_jobs_experiment_id"
  ON "public"."zenodo_sync_jobs" ("experiment_id");

-- 6. Aux edit sessions.
CREATE TABLE IF NOT EXISTS "public"."experiment_aux_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "experiment_id" UUID NOT NULL,
  "actor_user_id" VARCHAR(19) NOT NULL,
  "changes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TIMESTAMPTZ(6),
  CONSTRAINT "experiment_aux_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "experiment_aux_sessions_experiment_id_fkey"
    FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "experiment_aux_sessions_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "next_auth"."user"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_experiment_aux_sessions_experiment_closed"
  ON "public"."experiment_aux_sessions" ("experiment_id", "closed_at");
CREATE INDEX IF NOT EXISTS "idx_experiment_aux_sessions_actor_user_id"
  ON "public"."experiment_aux_sessions" ("actor_user_id");

-- 7. Baseline revision (1.0.0) for every existing experiment.
-- derived_checksum is an empty-string placeholder: the SHA-256 over canonical JSON of the derived
-- columns is computed in application code and cannot be reproduced in SQL. Application code treats
-- an empty checksum as "baseline, not yet fingerprinted" and fills it on the first versioned change.
INSERT INTO "public"."experiment_revisions"
  ("experiment_id", "version_major", "version_minor", "version_patch", "actor_user_id",
   "change_kind", "parameters", "derived_checksum", "created_at")
SELECT
  e."id", 1, 0, 0, NULL, 'baseline',
  jsonb_build_object(
    'normalizationRanges', e."normalization_ranges",
    'channelProvenance', e."channel_provenance",
    'uploadedChannels', e."uploaded_channels",
    'kkDeltaMetadata', e."kk_delta_metadata"
  ),
  '',
  COALESCE(e."createdat", CURRENT_TIMESTAMP)
FROM "public"."experiments" e
ON CONFLICT ("experiment_id", "version_major", "version_minor", "version_patch") DO NOTHING;

-- 8. CLI tokens: many named, expiring tokens per user with a scopes list.
-- `name` already exists NOT NULL (20261018120000_cli_access_token) and is kept as-is.
-- The legacy single-value `scope` column stays for now; its read-only CHECK is dropped so that
-- the auth worker can issue broader scopes through `scopes`. No per-user uniqueness exists in DB.
ALTER TABLE "next_auth"."cli_access_token"
  ADD COLUMN IF NOT EXISTS "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "kind" VARCHAR(16) NOT NULL DEFAULT 'standard';

ALTER TABLE "next_auth"."cli_access_token"
  DROP CONSTRAINT IF EXISTS "cli_access_token_scope_check";

-- Existing rows: read-only, expire 30 days after this migration runs.
UPDATE "next_auth"."cli_access_token"
SET "scopes" = ARRAY['read']::TEXT[]
WHERE cardinality("scopes") = 0;

UPDATE "next_auth"."cli_access_token"
SET "expires_at" = CURRENT_TIMESTAMP + INTERVAL '30 days'
WHERE "expires_at" IS NULL;

ALTER TABLE "next_auth"."cli_access_token"
  ALTER COLUMN "expires_at" SET NOT NULL;
