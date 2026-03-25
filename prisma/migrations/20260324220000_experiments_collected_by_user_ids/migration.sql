ALTER TABLE "public"."experiments"
ADD COLUMN IF NOT EXISTS "collected_by_user_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
