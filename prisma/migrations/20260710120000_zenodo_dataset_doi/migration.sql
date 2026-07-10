SET lock_timeout = '2min';

CREATE TYPE "public"."ZenodoDepositState" AS ENUM ('pending', 'depositing', 'published', 'failed');

ALTER TABLE "public"."experiment_metrics"
  ADD COLUMN IF NOT EXISTS "has_dataset_doi" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "dataset_doi" VARCHAR(256);

CREATE INDEX IF NOT EXISTS "idx_experiment_metrics_dataset_doi"
  ON "public"."experiment_metrics" ("dataset_doi")
  WHERE ("dataset_doi" IS NOT NULL);

CREATE TABLE IF NOT EXISTS "public"."experiment_zenodo_deposits" (
  "experiment_id" UUID NOT NULL,
  "state" "public"."ZenodoDepositState" NOT NULL DEFAULT 'pending',
  "zenodo_deposition_id" INTEGER,
  "zenodo_record_id" INTEGER,
  "doi" VARCHAR(256),
  "record_url" TEXT,
  "error_message" TEXT,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "last_attempt_at" TIMESTAMPTZ(6),
  "published_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "experiment_zenodo_deposits_pkey" PRIMARY KEY ("experiment_id")
);

CREATE INDEX IF NOT EXISTS "idx_experiment_zenodo_deposits_state"
  ON "public"."experiment_zenodo_deposits" ("state");

CREATE INDEX IF NOT EXISTS "idx_experiment_zenodo_deposits_doi"
  ON "public"."experiment_zenodo_deposits" ("doi")
  WHERE ("doi" IS NOT NULL);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'experiment_zenodo_deposits_experiment_id_fkey'
  ) THEN
    ALTER TABLE "public"."experiment_zenodo_deposits"
      ADD CONSTRAINT "experiment_zenodo_deposits_experiment_id_fkey"
      FOREIGN KEY ("experiment_id")
      REFERENCES "public"."experiments"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION;
  END IF;
END $$;
