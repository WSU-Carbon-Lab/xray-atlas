ALTER TABLE "experiments" ADD COLUMN "experiment_group_id" UUID;
ALTER TABLE "experiments" ADD COLUMN "experiment_group_slug" TEXT;

UPDATE "experiments" e
SET "experiment_group_id" = g.new_group_id
FROM (
  SELECT
    sampleid,
    instrumentid,
    edgeid,
    experimenttype,
    createdat,
    COALESCE(createdby, '') AS createdby_norm,
    gen_random_uuid() AS new_group_id
  FROM "experiments"
  GROUP BY
    sampleid,
    instrumentid,
    edgeid,
    experimenttype,
    createdat,
    COALESCE(createdby, '')
) g
WHERE e.sampleid = g.sampleid
  AND e.instrumentid = g.instrumentid
  AND e.edgeid = g.edgeid
  AND e.experimenttype IS NOT DISTINCT FROM g.experimenttype
  AND e.createdat = g.createdat
  AND COALESCE(e.createdby, '') = g.createdby_norm;

UPDATE "experiments"
SET "experiment_group_slug" = 'exg-' || substring(replace("experiment_group_id"::text, '-', ''), 1, 16);

ALTER TABLE "experiments" ALTER COLUMN "experiment_group_id" SET NOT NULL;
ALTER TABLE "experiments" ALTER COLUMN "experiment_group_slug" SET NOT NULL;

CREATE INDEX "idx_experiments_experiment_group_id" ON "experiments"("experiment_group_id");
CREATE INDEX "idx_experiments_experiment_group_slug" ON "experiments"("experiment_group_slug");
