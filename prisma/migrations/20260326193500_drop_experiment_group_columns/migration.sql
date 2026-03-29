DROP INDEX IF EXISTS "public"."idx_experiments_experiment_group_id";
DROP INDEX IF EXISTS "public"."idx_experiments_experiment_group_slug";

ALTER TABLE "public"."experiments"
DROP COLUMN IF EXISTS "experiment_group_id",
DROP COLUMN IF EXISTS "experiment_group_slug";
