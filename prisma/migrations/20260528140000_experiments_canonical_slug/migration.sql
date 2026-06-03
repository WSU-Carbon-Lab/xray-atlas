ALTER TABLE "public"."experiments"
ADD COLUMN "canonical_slug" TEXT;

CREATE UNIQUE INDEX "experiments_canonical_slug_key"
ON "public"."experiments" ("canonical_slug")
WHERE "canonical_slug" IS NOT NULL;
