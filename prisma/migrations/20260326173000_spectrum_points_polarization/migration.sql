ALTER TABLE "public"."spectrumpoints"
ADD COLUMN "polarizationid" UUID;

ALTER TABLE "public"."spectrumpoints"
ADD CONSTRAINT "spectrumpoints_polarizationid_fkey"
FOREIGN KEY ("polarizationid") REFERENCES "public"."polarizations"("id")
ON DELETE NO ACTION
ON UPDATE NO ACTION;

UPDATE "public"."spectrumpoints" sp
SET "polarizationid" = e."polarizationid"
FROM "public"."experiments" e
WHERE sp."experimentid" = e."id"
  AND sp."polarizationid" IS NULL
  AND e."polarizationid" IS NOT NULL;

ALTER TABLE "public"."spectrumpoints"
DROP CONSTRAINT IF EXISTS "spectrumpoints_experimentid_energyev_key";

CREATE UNIQUE INDEX IF NOT EXISTS "spectrumpoints_experimentid_energyev_null_pol_key"
ON "public"."spectrumpoints"("experimentid", "energyev")
WHERE "polarizationid" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "spectrumpoints_experimentid_polarizationid_energyev_key"
ON "public"."spectrumpoints"("experimentid", "polarizationid", "energyev")
WHERE "polarizationid" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_spectrum_experiment_polarization_energy"
ON "public"."spectrumpoints"("experimentid", "polarizationid", "energyev");

CREATE INDEX IF NOT EXISTS "idx_spectrum_polarization_experiment"
ON "public"."spectrumpoints"("polarizationid", "experimentid");
