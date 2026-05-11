ALTER TABLE "public"."experiment_metrics_channel"
  ALTER COLUMN "point_spacing_ev" DROP NOT NULL,
  ALTER COLUMN "snr" DROP NOT NULL,
  ALTER COLUMN "normalization_target_distance" DROP NOT NULL;

ALTER TABLE "public"."experiment_metrics_channel"
  DROP COLUMN IF EXISTS "norm_pre",
  DROP COLUMN IF EXISTS "norm_post";

ALTER TABLE "public"."experiment_metrics_channel"
  ADD COLUMN IF NOT EXISTS "norm_pre_start_ev" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "norm_pre_end_ev" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "norm_post_start_ev" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "norm_post_end_ev" DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "idx_experiment_metrics_channel_experiment" ON "public"."experiment_metrics_channel" ("experiment_id");
