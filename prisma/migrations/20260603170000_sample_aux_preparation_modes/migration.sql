ALTER TABLE "public"."sample_aux"
ADD COLUMN "processing_mode" VARCHAR(16),
ADD COLUMN "wet_method" VARCHAR(16),
ADD COLUMN "dry_method" VARCHAR(16),
ADD COLUMN "wet_method_other" TEXT,
ADD COLUMN "dry_method_other" TEXT,
ADD COLUMN "vase_thickness_nm" DOUBLE PRECISION,
ADD COLUMN "roughness_nm" DOUBLE PRECISION,
ADD COLUMN "orientation_notes" TEXT;
