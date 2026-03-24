DROP INDEX IF EXISTS "public"."idx_experiment_lookup";

ALTER TABLE "public"."experiments" DROP CONSTRAINT IF EXISTS "experiments_sampleid_edgeid_instrumentid_polarizationid_measurementdate_key";
ALTER TABLE "public"."experiments" DROP CONSTRAINT IF EXISTS "experiments_sampleid_edgeid_instrumentid_measurementdate_key";

ALTER TABLE "public"."experiments" DROP COLUMN IF EXISTS "measurementdate";

ALTER TABLE "public"."samples" DROP COLUMN IF EXISTS "preparationdate";

CREATE INDEX "idx_experiment_lookup" ON "public"."experiments"("sampleid", "edgeid", "instrumentid");
