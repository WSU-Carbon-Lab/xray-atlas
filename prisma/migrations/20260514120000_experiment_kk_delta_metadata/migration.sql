ALTER TABLE "public"."experiments"
ADD COLUMN "kk_delta_metadata" JSONB;

COMMENT ON COLUMN "public"."experiments"."kk_delta_metadata" IS 'Provenance for spectrumpoints.delta: source (upload vs KK), calculatedAt UTC, engine label, and reader note when delta was last persisted.';
