CREATE TABLE "public"."sample_aux" (
    "sample_id" UUID NOT NULL,
    "spin_speed_rpm" DOUBLE PRECISION,
    "spin_acceleration_rpm_per_s" DOUBLE PRECISION,
    "spin_duration_s" DOUBLE PRECISION,
    "blade_speed_mm_per_s" DOUBLE PRECISION,
    "blade_gap_um" DOUBLE PRECISION,
    "blade_temperature_c" DOUBLE PRECISION,
    "deposition_rate_angstrom_per_s" DOUBLE PRECISION,
    "base_pressure_torr" DOUBLE PRECISION,
    "working_pressure_torr" DOUBLE PRECISION,
    "source_temperature_c" DOUBLE PRECISION,
    "substrate_temperature_c" DOUBLE PRECISION,
    "concentration_mg_per_ml" DOUBLE PRECISION,
    "solution_stirring_time_h" DOUBLE PRECISION,
    "solution_stirring_temperature_c" DOUBLE PRECISION,
    "filter_size_um" DOUBLE PRECISION,
    "substrate_orientation" TEXT,
    "substrate_lot" TEXT,
    "oxide_thickness_nm" DOUBLE PRECISION,
    "deposition_atmosphere" TEXT,
    "glovebox_o2_ppm" DOUBLE PRECISION,
    "glovebox_h2o_ppm" DOUBLE PRECISION,
    "annealing_temperature_c" DOUBLE PRECISION,
    "annealing_time_min" DOUBLE PRECISION,
    "annealing_atmosphere" TEXT,
    "annealing_ramp_c_per_min" DOUBLE PRECISION,
    "preparation_description" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sample_aux_pkey" PRIMARY KEY ("sample_id"),
    CONSTRAINT "sample_aux_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "public"."samples" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE "public"."sample_file" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sample_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "kind" VARCHAR(64) NOT NULL,
    "description" TEXT,
    "checksum_sha256" CHAR(64),
    "created_by" VARCHAR(19) NOT NULL,
    "committed_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sample_file_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sample_file_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "public"."samples" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_sample_file_sample_id" ON "public"."sample_file" ("sample_id");
CREATE INDEX "idx_sample_file_created_by" ON "public"."sample_file" ("created_by");
CREATE INDEX "idx_sample_file_active" ON "public"."sample_file" ("sample_id") WHERE "deleted_at" IS NULL;

CREATE TABLE "public"."experiment_file" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "experiment_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "kind" VARCHAR(64) NOT NULL,
    "description" TEXT,
    "checksum_sha256" CHAR(64),
    "created_by" VARCHAR(19) NOT NULL,
    "committed_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiment_file_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "experiment_file_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_experiment_file_experiment_id" ON "public"."experiment_file" ("experiment_id");
CREATE INDEX "idx_experiment_file_created_by" ON "public"."experiment_file" ("created_by");
CREATE INDEX "idx_experiment_file_active" ON "public"."experiment_file" ("experiment_id") WHERE "deleted_at" IS NULL;
