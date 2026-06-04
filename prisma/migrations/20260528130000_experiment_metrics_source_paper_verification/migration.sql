ALTER TABLE "public"."experiment_metrics"
ADD COLUMN "source_paper_doi_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "source_paper_doi_verified_at" TIMESTAMPTZ(6),
ADD COLUMN "source_paper_doi_verified_by" VARCHAR(19);

CREATE INDEX "idx_experiment_metrics_original_data_doi"
ON "public"."experiment_metrics" ("original_data_doi")
WHERE "original_data_doi" IS NOT NULL;
