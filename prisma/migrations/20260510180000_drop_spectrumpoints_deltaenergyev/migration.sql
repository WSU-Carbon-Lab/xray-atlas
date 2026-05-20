-- Aligns persisted KK delta with row `energyev` only; `deltaenergyev` is redundant.
ALTER TABLE "public"."spectrumpoints" DROP COLUMN IF EXISTS "deltaenergyev";
