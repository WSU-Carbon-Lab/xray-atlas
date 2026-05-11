CREATE TABLE "public"."experiment_metrics" (
    "experiment_id" UUID NOT NULL,
    "favorite_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "has_original_data_doi" BOOLEAN NOT NULL DEFAULT false,
    "original_data_doi" VARCHAR(256),
    "quality_aggregate_score" DOUBLE PRECISION,
    "normalization_ranges_present" BOOLEAN NOT NULL DEFAULT false,
    "metrics_computed_at" TIMESTAMPTZ(6),
    "metrics_schema_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "experiment_metrics_pkey" PRIMARY KEY ("experiment_id"),
    CONSTRAINT "experiment_metrics_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE "public"."experiment_metrics_channel" (
    "experiment_id" UUID NOT NULL,
    "channel" VARCHAR(32) NOT NULL,
    "point_spacing_ev" DOUBLE PRECISION NOT NULL,
    "snr" DOUBLE PRECISION NOT NULL,
    "normalization_target_distance" DOUBLE PRECISION NOT NULL,
    "channel_contribution_score" DOUBLE PRECISION,
    "norm_pre" DOUBLE PRECISION,
    "norm_post" DOUBLE PRECISION,

    CONSTRAINT "experiment_metrics_channel_pkey" PRIMARY KEY ("experiment_id", "channel"),
    CONSTRAINT "experiment_metrics_channel_experiment_id_experiments_fkey" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "experiment_metrics_channel_experiment_id_metrics_fkey" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiment_metrics" ("experiment_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "experiment_metrics_channel_channel_check" CHECK ("channel" IN ('rawabs', 'od', 'massabsorption', 'beta'))
);
