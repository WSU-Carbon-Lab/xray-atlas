-- Short opaque Atlas dataset ids for /d/{id} citation URLs (pre-DataCite).
ALTER TABLE "public"."experiments"
  ADD COLUMN IF NOT EXISTS "atlas_dataset_id" VARCHAR(16);

CREATE UNIQUE INDEX IF NOT EXISTS "experiments_atlas_dataset_id_key"
  ON "public"."experiments" ("atlas_dataset_id")
  WHERE ("atlas_dataset_id" IS NOT NULL);

CREATE INDEX IF NOT EXISTS "idx_experiments_atlas_dataset_id"
  ON "public"."experiments" ("atlas_dataset_id")
  WHERE ("atlas_dataset_id" IS NOT NULL);
